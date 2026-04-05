// packages/backend/src/ivr/__tests__/ivr.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { authManager } from '../../auth/auth.service';
import { configManager } from '../../config/config.service';
import { haService } from '../../ha/ha.service';
import type { IVRSystemConfig } from '@ha-yemot/shared';

// 1. Mock the Services
vi.mock('../../auth/auth.service', () => ({
  authManager: {
    verifyApiKey: vi.fn(),
    getAllowedPhones: vi.fn(),
  },
}));

vi.mock('../../config/config.service', () => ({
  configManager: {
    getConfig: vi.fn(),
  },
}));

vi.mock('../../ha/ha.service', () => ({
  haService: {
    executeAction: vi.fn(),
  },
}));

// 2. Create a Mock IVR Tree (Target Node -> Action Node)
const mockTree: IVRSystemConfig = {
  version: '1.0',
  host: '',
  token: '',
  rootNodeId: 'node-target',
  nodes: {
    'node-target': {
      id: 'node-target',
      name: 'Choose AC',
      type: 'target',
      ttsPrompt: 'Press 1 for Living Room',
      valName: 'raw_device_input',           // What Yemot sends back
      variableName: 'parsed_devices',        // What our Engine saves in state
      entityMap: { '1': 'climate.living_room' },
      nextNodeId: 'node-action',
    },
    'node-action': {
      id: 'node-action',
      name: 'Turn On AC',
      type: 'action',
      targetVariableName: 'parsed_devices',  // Read from state!
      hardcodedAction: 'climate.turn_on',
      successTts: 'AC Turned On',
    },
  },
};

describe('Phase 4: IVR Engine Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup Mock Returns
    vi.mocked(authManager.verifyApiKey).mockResolvedValue(true);
    vi.mocked(authManager.getAllowedPhones).mockReturnValue([]); // Allow all
    vi.mocked(configManager.getConfig).mockReturnValue(mockTree);
    vi.mocked(haService.executeAction).mockResolvedValue();
  });

  it('should reject calls without a valid auth_key', async () => {
    vi.mocked(authManager.verifyApiKey).mockResolvedValue(false);

    const response = await request(app).post('/ivr/').send({
      ApiCallId: 'call-1',
      ApiPhone: '0501234567',
      auth_key: 'wrong_key',
    });

    // yemot-router2 hangs up rejected calls by sending specific Yemot text
    expect(response.status).toBe(200);
    expect(response.text).toContain('hangup'); 
  });

  it('should execute a full call flow (Target -> Action) and call HA', async () => {
    // --- STEP 1: INITIAL CALL (Yemot dials in) ---
    const initialResponse = await request(app).post('/ivr/').send({
      ApiCallId: 'call-123',
      ApiPhone: '0501234567',
      auth_key: 'correct_key',
    });

    expect(initialResponse.status).toBe(200);
    // Expect the engine to hit the TargetNode and ask for input using 'raw_device_input'
    expect(initialResponse.text).toContain('raw_device_input');

    // --- STEP 2: USER PRESSES '1' (Yemot sends accumulated data) ---
    // In yemot-router2, Yemot appends the answer to the body and sends it again.
    const step2Response = await request(app).post('/ivr/').send({
      ApiCallId: 'call-123',
      ApiPhone: '0501234567',
      auth_key: 'correct_key',
      raw_device_input: '1', // The user pressed 1!
    });

    expect(step2Response.status).toBe(200);
    
    // The engine should have moved to ActionNode, fired the HA command, and played successTts
    expect(step2Response.text).toContain('AC Turned On');

    // Verify that the Engine correctly mapped "1" to "climate.living_room"
    // and correctly fired the HA executeAction command!
    expect(haService.executeAction).toHaveBeenCalledTimes(1);
    expect(haService.executeAction).toHaveBeenCalledWith(
      'climate', 
      'turn_on', 
      ['climate.living_room'], // Cleanly parsed!
      {}
    );
  });
});