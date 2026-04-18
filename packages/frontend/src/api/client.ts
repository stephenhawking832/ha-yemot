// packages/frontend/src/api/client.ts

/**
 * A lightweight wrapper around native fetch that automatically 
 * handles JSON and attaches the JWT authorization header.
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('jwt_token');

  const headers = new Headers(options.headers);
  
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });
  // Handle 401 Unauthorized globally (e.g., token expired)
  if (response.status === 401) {
    localStorage.removeItem('jwt_token');
    window.location.hash = '#/login'; // Simple redirect (we'll set up Vue Router later)
    throw new Error('Unauthorized. Please log in again.');
  }

  // Parse JSON response
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `API Error: ${response.status}`);
  }

  return data as T;
}