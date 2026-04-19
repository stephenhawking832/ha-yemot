#!/bin/bash
set -e

echo "🚀 Bootstrapping HA-IVR Appliance..."

# 1. TAILSCALE INITIALIZATION (Optional)
if [ -n "$TAILSCALE_AUTH_KEY" ]; then
    echo "🔒 Starting Tailscale userspace networking..."
    tailscaled --tun=userspace-networking --socks5-server=localhost:1055 &
    sleep 3
    tailscale up --authkey=$TAILSCALE_AUTH_KEY --hostname=ivr-driver --accept-dns=false
fi

# 2. SSL & NGINX INITIALIZATION
if [ -n "$DOMAIN_NAME" ] && [ -n "$ADMIN_EMAIL" ]; then
    echo "🌐 Domain configured: $DOMAIN_NAME"
    
    # Check if SSL certs already exist for this domain (from a persistent volume)
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN_NAME" ]; then
        echo "📜 No SSL certificates found. Requesting initial Let's Encrypt certificate..."
        # Request certs using standalone server before Nginx takes port 80
        certbot certonly --standalone -d "$DOMAIN_NAME" --non-interactive --agree-tos -m "$ADMIN_EMAIL"
    fi
    
    # Inject the domain name into the Nginx template and activate it
    sed "s/DOMAIN_PLACEHOLDER/$DOMAIN_NAME/g" /app/docker/nginx.conf.template > /etc/nginx/sites-available/default
else
    echo "⚠️ WARNING: DOMAIN_NAME or ADMIN_EMAIL not set! HTTPS will not be enabled."
    # Fallback to a basic HTTP-only Nginx config if user is testing locally
    cat <<EOF > /etc/nginx/sites-available/default
server {
    listen 80;
    location / { root /app/frontend; try_files \$uri \$uri/ /index.html; }
    location /api/ { proxy_pass http://127.0.0.1:3000/api/; }
    location /ivr/ { proxy_pass http://127.0.0.1:3000/ivr/; }
}
EOF
fi

# 3. START SUPERVISORD
echo "⚙️ Starting Process Manager (Node + Nginx)..."
exec /usr/bin/supervisord -c /app/docker/supervisord.conf