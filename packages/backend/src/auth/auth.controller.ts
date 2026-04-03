// packages/backend/src/auth/auth.controller.ts
import { Controller, Post, Body, Route, Tags, SuccessResponse } from 'tsoa';
import { authManager } from './auth.service';

// The exact JSON body the Vue frontend will send
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

@Route('api/auth')
@Tags('Authentication')
export class AuthController extends Controller {
  
  /**
   * Validates admin credentials and returns a JWT Bearer token.
   */
  @Post('login')
  @SuccessResponse('200', 'Success')
  public async login(@Body() requestBody: LoginRequest): Promise<LoginResponse> {
    const isValid = await authManager.verifyCredentials(requestBody.username, requestBody.password);

    if (!isValid) {
      this.setStatus(401);
      throw new Error('Invalid username or password');
    }

    const token = authManager.generateToken();
    return { token };
  }
}