// packages/backend/src/utils/logger.ts
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // In development, use pino-pretty for formatted, colorful terminal output.
  // In production, output raw JSON for Docker/log aggregators.
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// Helper to log unhandled promise rejections / uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.fatal(err, 'Uncaught Exception detected');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal(reason, 'Unhandled Promise Rejection detected');
  process.exit(1);
});