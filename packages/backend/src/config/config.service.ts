// packages/backend/src/config/config.service.ts
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { IVRSystemConfigSchema } from './schema';
import type { IVRSystemConfig } from '@ha-yemot/shared';

export class ConfigService {
  private static instance: ConfigService;
  private config!: IVRSystemConfig;
  private readonly configPath = path.join(process.cwd(), 'data', 'config.json');

  private constructor() {}

  // Singleton pattern to ensure only one instance manages the file
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Loads and validates the config.json file from disk.
   * Runs on server boot.
   */
  public async loadConfig(): Promise<void> {
    try {
      // 1. Check if the data folder exists, if not, create it
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });

      // 2. Read the file
      const rawData = await fs.readFile(this.configPath, 'utf-8');
      const parsedJson = JSON.parse(rawData);

      // 3. Validate using Zod
      // If validation fails, it throws a highly detailed error indicating exactly which field is broken.
      this.config = IVRSystemConfigSchema.parse(parsedJson);
      
      logger.info('IVR Configuration loaded and validated successfully.');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.error(`Config file not found at ${this.configPath}. Please create one using the GUI.`);
        // We do not crash here, so the GUI can still boot up and let the admin create the first config!
        this.config = this.getDefaultConfig();
      } else {
        logger.fatal({ err: error }, 'Failed to parse or validate config.json. The schema is invalid.');
        process.exit(1); // Crash the app if the config is fundamentally broken
      }
    }
  }

  /**
   * Returns the current validated configuration from memory.
   */
  public getConfig(): IVRSystemConfig {
    return this.config;
  }

  /**
   * Saves a new configuration (coming from the Vue GUI) to disk and updates memory.
   */
  public async saveConfig(newConfig: IVRSystemConfig): Promise<void> {
    try {
      // Validate the incoming config before saving it
      const validatedConfig = IVRSystemConfigSchema.parse(newConfig);
      
      // Write to disk beautifully formatted
      await fs.writeFile(this.configPath, JSON.stringify(validatedConfig, null, 2), 'utf-8');
      
      // Update the in-memory cache
      this.config = validatedConfig;
      logger.info('New IVR Configuration saved successfully.');
    } catch (error) {
      logger.error({ err: error }, 'Failed to save new configuration');
      throw error;
    }
  }

  /**
   * Generates a blank default config if the file doesn't exist yet.
   */
  private getDefaultConfig(): IVRSystemConfig {
    return {
      version: '1.0.0',
      host: 'http://homeassistant.local:8123',
      token: 'YOUR_LONG_LIVED_ACCESS_TOKEN',
      nodes: {},
      rootNodeId: '',
    };
  }
}

// Export a ready-to-use instance
export const configManager = ConfigService.getInstance();