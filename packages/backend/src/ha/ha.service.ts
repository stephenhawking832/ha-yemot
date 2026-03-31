// packages/backend/src/ha/ha.service.ts

import {
  createConnection,
  createLongLivedTokenAuth,
  Connection,
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
} from 'home-assistant-js-websocket';
import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { configManager } from '../config/config.service';

// Node.js doesn't have a native global WebSocket object like browsers do.
// We must map it globally for the HA library to use.
(global as any).WebSocket = WebSocket;

export class HomeAssistantService {
  private static instance: HomeAssistantService;
  private connection: Connection | null = null;
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): HomeAssistantService {
    if (!HomeAssistantService.instance) {
      HomeAssistantService.instance = new HomeAssistantService();
    }
    return HomeAssistantService.instance;
  }

  /**
   * Initializes the connection to Home Assistant.
   */
  public async connect(): Promise<void> {
    if (this.connection || this.isConnecting) return;
    this.isConnecting = true;

    const config = configManager.getConfig();

    if (!config.host || !config.token || config.token === 'YOUR_LONG_LIVED_ACCESS_TOKEN') {
      logger.warn('HA Host or Token is not configured. HA Service will not connect. Please configure via GUI.');
      this.isConnecting = false;
      return;
    }

    try {
      logger.info(`Attempting to connect to Home Assistant at ${config.host}...`);

      const auth = createLongLivedTokenAuth(config.host, config.token);

      this.connection = await createConnection({
        auth,
        setupRetry: 10, // The library handles exponential backoff internally!
      });

      this.isConnecting = false;
      logger.info('✅ Successfully connected to Home Assistant WebSocket API!');

      this.registerConnectionEvents();
      
      // TODO: (Piece 3) We will call this.initializeStateCache() here later!

    } catch (err) {
      this.isConnecting = false;
      if (err === ERR_CANNOT_CONNECT) {
        logger.error('Failed to connect to Home Assistant. Check your host URL.');
      } else if (err === ERR_INVALID_AUTH) {
        logger.error('Invalid Home Assistant Long-Lived Access Token. Please update it in the GUI.');
      } else {
        logger.error({ err }, 'Unknown error occurred while connecting to HA');
      }
    }
  }

  /**
   * Registers event listeners to monitor the connection health.
   * This ensures our Docker container doesn't crash if HA restarts.
   */
  private registerConnectionEvents() {
    if (!this.connection) return;

    this.connection.addEventListener('disconnected', () => {
      logger.warn('⚠️ Lost connection to Home Assistant. Attempting to reconnect in the background...');
    });

    this.connection.addEventListener('ready', () => {
      logger.info('🔄 Reconnected to Home Assistant successfully.');
    });
  }

  /**
   * Helper to check if HA is currently online and ready to execute commands.
   * We will use this in the Yemot Router before trying to send an Action.
   */
  public isConnected(): boolean {
    return this.connection !== null && this.connection.connected;
  }
  
  /**
   * Expose the raw connection if internal methods need it later
   */
  public getConnection(): Connection | null {
    return this.connection;
  }
}

export const haService = HomeAssistantService.getInstance();