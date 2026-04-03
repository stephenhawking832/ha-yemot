// packages/backend/src/server.ts
import { logger } from './utils/logger';
import { configManager } from './config/config.service';
import { haService } from './ha/ha.service';

async function bootstrap() {
  try {
    // 1. Load the config.json (Phase 1)
    await configManager.loadConfig();

    // 2. Connect to Home Assistant (Phase 2)
    await haService.connect();

    // 3. Start Express (We will add this in Phase 3/4)
    logger.info('🚀 Backend Bootstrapper completed successfully.');
    
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to bootstrap the backend server.');
    process.exit(1);
  }
}

bootstrap();