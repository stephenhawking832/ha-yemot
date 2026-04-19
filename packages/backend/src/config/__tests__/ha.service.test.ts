// packages/backend/src/ha/__tests__/ha.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { haService } from '../../ha/ha.service';
import * as haWebsocket from 'home-assistant-js-websocket';

// 1. Mock the entire home-assistant-js-websocket module
vi.mock('home-assistant-js-websocket', () => ({
  createConnection: vi.fn(),
  createLongLivedTokenAuth: vi.fn(),
  subscribeEntities: vi.fn(),
  callService: vi.fn(),
  ERR_CANNOT_CONNECT: 1,
  ERR_INVALID_AUTH: 2,
}));

describe('Phase 2: Home Assistant Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeAction', () => {
    it('should throw an error if trying to execute before connecting', async () => {
      // haService is a singleton and starts disconnected
      await expect(
        haService.executeAction('light', 'turn_on', ['light.living_room'])
      ).rejects.toThrow('Cannot execute action: Not connected to Home Assistant');
    });

    it('should call home-assistant-js-websocket callService properly', async () => {
      // Fake a connection by forcibly injecting a mock object
      const mockConnection = { addEventListener: vi.fn(), sendMessagePromise: vi.fn() };
      (haService as any).connection = mockConnection;

      // Make the mock resolve successfully
      vi.mocked(haWebsocket.callService).mockResolvedValueOnce(undefined);

      // Fire the executor
      await haService.executeAction('climate', 'set_temperature', ['climate.ac'], { temperature: 24 });

      // Verify the library was called with the exact right arguments
      expect(haWebsocket.callService).toHaveBeenCalledWith(
        mockConnection,
        'climate',
        'set_temperature',
        { temperature: 24 }, // The payload
        { entity_id: ['climate.ac'] } // The formatted target
      );
    });
  });
});