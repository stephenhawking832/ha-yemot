// packages/backend/src/server.ts
import { logger } from './utils/logger';
import { configManager } from './config/config.service';
import { haService } from './ha/ha.service';
import { authManager } from './auth/auth.service';
import { app } from './app';

async function bootstrap() {
  try {
    // 1. Initialize Auth
    await authManager.initialize();
  
    // 2. Load the config.json (Phase 1)
    await configManager.loadConfig();

    // 3. Connect to Home Assistant (Phase 2)
    await haService.connect();

    // 4. Start Express (We will add this in Phase 3/4)
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`👉 API endpoint: http://localhost:${PORT}/api`);
    });
    
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to bootstrap the backend server.');
    process.exit(1);
  }
}

bootstrap();