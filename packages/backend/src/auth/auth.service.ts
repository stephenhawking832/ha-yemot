// packages/backend/src/auth/auth.service.ts
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import * as jsonwebtoken from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '../utils/logger';
if (process.env.NODE_ENV !== 'production') {
  // Use a dynamic import or require so it doesn't break if the package is missing
  import('dotenv').then((dotenv) => dotenv.config());
}
// 1. Zod Schema for the auth.json file
const AuthFileSchema = z.object({
  username: z.string(),
  passwordHash: z.string(),
  jwtSecret: z.string(),
  hashedApiKey: z.string(),
  allowedPhones: z.array(z.string()),
});

type AuthFile = z.infer<typeof AuthFileSchema>;

export class AuthService {
  private static instance: AuthService;
  private readonly authFilePath = path.join(process.cwd(), 'data', 'auth.json');
  
  // In-memory cache of the auth data
  private authData: AuthFile | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initializes the Auth Service.
   * If auth.json exists, it loads it.
   * If it doesn't, it creates it using ENV variables.
   */
  public async initialize(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.authFilePath), { recursive: true });

      // Check if file exists
      try {
        const rawData = await fs.readFile(this.authFilePath, 'utf-8');
        this.authData = AuthFileSchema.parse(JSON.parse(rawData));
        logger.info('🔐 Auth Manager initialized from auth.json');
        return; // Success! Exit early.
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          logger.fatal({ err }, 'auth.json is corrupted or unreadable.');
          process.exit(1);
        }
      }

      // If we reach here, auth.json does NOT exist. We must bootstrap from ENV.
      logger.info('No auth.json found. Bootstrapping admin credentials from Environment Variables...');

      const envUsername = process.env.ADMIN_USERNAME;
      const envPassword = process.env.ADMIN_PASSWORD;
      const envJwtSecret = process.env.JWT_SECRET;

      if (!envUsername || !envPassword || !envJwtSecret) {
        logger.fatal(
          'Missing ADMIN_USERNAME, ADMIN_PASSWORD, or JWT_SECRET in environment variables. Cannot bootstrap system.'
        );
        process.exit(1);
      }

      // Hash the password securely
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(envPassword, salt);

      this.authData = {
        username: envUsername,
        passwordHash,
        jwtSecret: envJwtSecret,
        hashedApiKey: "",
        allowedPhones: [],
      };

      // Save to disk
      await fs.writeFile(this.authFilePath, JSON.stringify(this.authData, null, 2), 'utf-8');
      
      logger.info('✅ Admin credentials bootstrapped and securely saved to auth.json.');

      // Security measure: Clear the env vars here.
      delete process.env.ADMIN_USERNAME;
      delete process.env.ADMIN_PASSWORD;
      delete process.env.JWT_SECRET;

    } catch (error) {
      logger.fatal({ err: error }, 'Failed to initialize Auth Manager.');
      process.exit(1);
    }
  }

  /**
   * Verifies a plain-text password against the stored hash.
   */
  public async verifyCredentials(username: string, plainTextPassword: string): Promise<boolean> {
    if (!this.authData) throw new Error('AuthManager not initialized');
    
    if (username !== this.authData.username) return false;
    
    return bcrypt.compare(plainTextPassword, this.authData.passwordHash);
  }

  /**
   * Generates a signed JWT for the GUI session.
   * Valid for 24 hours.
   */
  public generateToken(): string {
    if (!this.authData) throw new Error('AuthManager not initialized');
    
    return jsonwebtoken.sign(
      { username: this.authData.username, role: 'admin' },
      this.authData.jwtSecret,
      { expiresIn: '24h' }
    );
  }

  /**
   * Verifies an incoming JWT from an API request.
   */
  public verifyToken(token: string): any {
    if (!this.authData) throw new Error('AuthManager not initialized');
    
    return jsonwebtoken.verify(token, this.authData.jwtSecret);
  }

  /**
   * Generates a new API Key, hashes it, saves it, and returns the plaintext.
   * This is called by the GUI when the user clicks "Generate New Key".
   */
  public async generateNewApiKey(): Promise<string> {
    if (!this.authData) throw new Error('AuthManager not initialized');

    const newApiKey = crypto.randomBytes(32).toString('hex');
    this.authData.hashedApiKey = await bcrypt.hash(newApiKey, 10);

    await fs.writeFile(this.authFilePath, JSON.stringify(this.authData, null, 2), 'utf-8');
    logger.info('A new Yemot API key was generated via the API.');
    
    return newApiKey;
  }

  /**
   * Verifies an incoming API key from a Yemot Webhook.
   */
  public async verifyApiKey(providedKey: string): Promise<boolean> {
    if (!this.authData) return false;
    return bcrypt.compare(providedKey, this.authData.hashedApiKey);
  }

  /**
   * Updates the allowed phones whitelist and saves to disk.
   */
  public async updateAllowedPhones(phones: string[]): Promise<void> {
    if (!this.authData) throw new Error('AuthManager not initialized');
    
    this.authData.allowedPhones = phones;
    await fs.writeFile(this.authFilePath, JSON.stringify(this.authData, null, 2), 'utf-8');
    logger.info('Phone whitelist updated successfully.');
  }

  /**
   * Returns the current phone whitelist.
   */
  public getAllowedPhones(): string[] {
    if (!this.authData) return [];
    return this.authData.allowedPhones;
  }
}

export const authManager = AuthService.getInstance();