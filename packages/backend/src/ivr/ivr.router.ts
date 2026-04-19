// packages/backend/src/ivr/ivr.router.ts
import { YemotRouter, Call } from '../../node_modules/yemot-router2';
import { logger } from '../utils/logger';
import { authManager } from '../auth/auth.service';
import { configManager } from '../config/config.service';
import { processNode } from './engine'; 

/*
1. Initialize the Yemot Router
  We set removeInvalidChars globally because HA entity names or TTS might contain dots/quotes.
  Note: yemot-router2 acts as an Express Router, but in TS it needs to accessed via `.asExpressRouter`.
 */
export const ivrRouter = YemotRouter({
  printLog: process.env.NODE_ENV !== 'production', // Detailed yemot logs only in dev
  timeout: 30000, // 30 seconds wait time for user input
  defaults: {
    removeInvalidChars: true,
  },
  uncaughtErrorHandler: (error: Error, call: Call) => {
    logger.error({ err: error, callId: call.callId }, 'Uncaught IVR Error in Call');
    try {
      // Play a fallback message to the caller instead of a dead silence
      call.id_list_message([{ type: 'text', data: 'אירעה שגיאה פנימית במערכת הבית החכם.' }]);
    } catch (e) {
      // Ignore if call is already hung up
    }
  }
}).asExpressRouter;

/**
 * 2. The Global Entry Point Middleware
 * Every incoming Yemot webhook hits this '/' route first.
 */
ivrRouter.post('/', async (call: Call) => {
  const callId = call.callId;
  const callerPhone = call.values.ApiPhone;
  const providedAuthKey = call.values.auth_key;

  logger.info({ callId, callerPhone }, '📞 Incoming call from Yemot');

  // --- SECURITY LAYER 1: API KEY VALIDATION ---
  if (!providedAuthKey) {
    logger.warn({ callId }, 'Call rejected: Missing auth_key in payload');
    return call.hangup(); // Hang up silently
  }

  const isValidKey = await authManager.verifyApiKey(providedAuthKey);
  if (!isValidKey) {
    logger.warn({ callId }, 'Call rejected: Invalid auth_key provided');
    return call.hangup();
  }

  // --- SECURITY LAYER 2: PHONE WHITELIST VALIDATION ---
  const allowedPhones = authManager.getAllowedPhones();
  
  // If array is NOT empty, we enforce the whitelist
  if (allowedPhones.length > 0 && !allowedPhones.includes(callerPhone)) {
    logger.warn({ callId, callerPhone }, 'Call rejected: Phone number not in whitelist');
    // Play a friendly rejection message
    await call.id_list_message([{ type: 'text', data: 'המספר ממנו חייגת אינו מורשה במערכת.' }]);
    return;
  }

  // --- START THE ENGINE ---
  try {
    const config = configManager.getConfig();
    const rootNodeId = config.rootNodeId;

    if (!rootNodeId || !config.nodes[rootNodeId]) {
      logger.error({ callId }, 'No Root Node defined in configuration.');
      await call.id_list_message([{ type: 'text', data: 'הגדרות המערכת אינן תקינות.' }]);
      return;
    }

    logger.info({ callId }, 'Authentication successful. Starting IVR Engine.');
    
    // Start the recursive engine!
    return processNode(rootNodeId, call, {});

  } catch (err) {
    logger.error({ err, callId }, 'Error executing call flow');
    return call.hangup();
  }
});