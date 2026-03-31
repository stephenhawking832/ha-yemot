// packages/backend/src/ha/ha.service.ts

import {
  createConnection,
  createLongLivedTokenAuth,
  Connection,
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
  subscribeEntities,
  type HassEntities,
} from 'home-assistant-js-websocket';
import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { configManager } from '../config/config.service';
import type { RichEntity } from '@ha-yemot/shared';

// Node.js doesn't have a native global WebSocket object like browsers do.
// We must map it globally for the HA library to use.
(global as any).WebSocket = WebSocket;

export class HomeAssistantService {
  private static instance: HomeAssistantService;
  private connection: Connection | null = null;
  private isConnecting = false;
  private entities: HassEntities = {};
  private entityRegistry: any[] = [];
  private areaRegistry: any[] = [];

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
      
      this.registerConnectionEvents();
      await this.initializeStateCache();

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

   /**
   * Subscribes to live state changes and fetches the static registries for the GUI.
   */
  private async initializeStateCache(): Promise<void> {
    if (!this.connection) return;

    try {
      // 1. Subscribe to live state updates (this callback runs every time a light turns on/off)
      subscribeEntities(this.connection, (entities) => {
        this.entities = entities;
      });

      // 2. Fetch the Entity Registry (tells us which Area ID an entity belongs to)
      this.entityRegistry = await this.connection.sendMessagePromise({
        type: 'config/entity_registry/list',
      });

      // 3. Fetch the Area Registry (translates Area ID to "Living Room")
      this.areaRegistry = await this.connection.sendMessagePromise({
        type: 'config/area_registry/list',
      });

      logger.info('📦 Home Assistant state cache and registries initialized.');
    } catch (err) {
      logger.error({ err }, 'Failed to initialize HA state cache or registries.');
    }
  }

  /**
   * Retrieves a rich array of all entities, merged with their Area and Friendly Name.
   * This will be used by the Express API to serve the Vue GUI dropdowns.
   */
  public getRichEntities(): RichEntity[] {
    const richEntities: RichEntity[] = [];

    // Create a quick lookup map for Areas
    const areaMap = new Map(this.areaRegistry.map((a) => [a.area_id, a.name]));

    // Create a quick lookup map for Entity Registries
    const entityRegMap = new Map(this.entityRegistry.map((e) => [e.entity_id, e]));

    // Merge live state with registry data
    for (const [entity_id, stateObj] of Object.entries(this.entities)) {
      const regObj = entityRegMap.get(entity_id);
      const area_id = regObj?.area_id || null;
      const area_name = area_id ? areaMap.get(area_id) || null : null;

      richEntities.push({
        entity_id,
        state: stateObj.state,
        friendly_name: stateObj.attributes.friendly_name || entity_id,
        domain: entity_id.split('.')[0],
        area_id,
        area_name,
      });
    }

    return richEntities;
  }

  /**
   * Instantly gets the live state of a single entity.
   * This is used by the IVR `ReadNode` during a phone call.
   */
  public getEntityState(entityId: string) {
    return this.entities[entityId] || null;
  }
}

export const haService = HomeAssistantService.getInstance();