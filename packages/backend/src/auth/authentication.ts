// packages/backend/src/auth/authentication.ts
import * as express from 'express';
import { authManager } from './auth.service';

/**
 * This function is automatically called by TSOA-generated routes 
 * whenever a controller method has @Security('jwt')
 */
export async function expressAuthentication(
  request: express.Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  if (securityName === 'jwt') {
    // 1. Check for Authorization header: "Bearer <token>"
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Promise.reject(new Error('No token provided'));
    }

    const token = authHeader.split(' ')[1];

    try {
      // 2. Verify the token using our Auth Service
      const decoded = authManager.verifyToken(token);
      
      // 3. (Optional) Check scopes if we had multiple user roles
      // For now, any valid token is an admin.

      // Returning the decoded payload injects it into `request.user`
      return Promise.resolve(decoded);
    } catch (err) {
      return Promise.reject(new Error('Invalid or expired token'));
    }
  }
  
  return Promise.reject(new Error('Unknown security type'));
}