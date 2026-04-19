FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# -----------------------------------
# STAGE 1: Build the Monorepo
# -----------------------------------
FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app

# Install all dependencies using pnpm cache
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build everything (shared -> frontend -> backend)
RUN pnpm run -r build

# Extract the backend with ONLY production dependencies
RUN pnpm deploy --filter @ha-yemot/backend --prod /prod/backend

# -----------------------------------
# STAGE 2: The Final Appliance
# -----------------------------------
FROM base AS final

# Install Infrastructure: Nginx, Supervisor, Certbot, and Tailscale
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    certbot \
    python3-certbot-nginx \
    curl \
    && curl -fsSL https://tailscale.com/install.sh | sh \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy the built backend
COPY --from=build /prod/backend /app/backend

# Copy the compiled Vue GUI static files
COPY --from=build /usr/src/app/packages/frontend/dist /app/frontend

# Copy our custom infrastructure scripts and configs
COPY docker /app/docker

# Make the bootstrapper script executable
RUN chmod +x /app/docker/entrypoint.sh

# Ensure persistent data directories exist
RUN mkdir -p /app/backend/data /var/log/supervisor /var/run/tailscale

WORKDIR /app/backend

EXPOSE 80 443

ENTRYPOINT["/app/docker/entrypoint.sh"]