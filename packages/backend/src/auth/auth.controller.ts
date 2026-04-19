// packages/backend/src/auth/auth.controller.ts
import { Controller, Get, Post, Body, Route, Tags, SuccessResponse, Security } from 'tsoa';
import { authManager } from './auth.service';

// The exact JSON body the Vue frontend will send
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface ApiKeyResponse {
  newApiKey: string;
  warning: string;
}

export interface PhonesRequest {
  phones: string[];
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

    /**
   * Generates a new Yemot API Key. 
   * WARNING: The old key will be instantly invalidated.
   */
  @Post('api-key')
  @Security('jwt')
  @SuccessResponse('200', 'New Key Generated')
  public async generateApiKey(): Promise<ApiKeyResponse> {
    const newApiKey = await authManager.generateNewApiKey();
    return {
      newApiKey,
      warning: "Copy this key immediately. You will not be able to view it again.",
    };
  }

  /**
   * Gets the current allowed phones whitelist.
   */
  @Get('phones')
  @Security('jwt')
  public getPhones(): string[] {
    return authManager.getAllowedPhones();
  }

  /**
   * Updates the allowed phones whitelist.
   * Send an empty array to allow ALL phones.
   */
  @Post('phones')
  @Security('jwt')
  @SuccessResponse('200', 'Phones Updated')
  public async updatePhones(@Body() requestBody: PhonesRequest): Promise<{ message: string }> {
    await authManager.updateAllowedPhones(requestBody.phones);
    return { message: "Whitelist updated successfully" };
  }
}