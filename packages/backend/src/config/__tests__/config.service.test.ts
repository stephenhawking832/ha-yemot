import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { configManager, ConfigService } from '../config.service';
import { IVRSystemConfigSchema } from '../schema';

// 1. Mock the File System
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// A mock valid configuration based on our strict Shared Types
const validMockConfig = {
  version: '1.0.0',
  host: 'http://homeassistant.local:8123',
  token: 'mock-token',
  rootNodeId: 'node-1',
  nodes: {
    'node-1': {
      id: 'node-1',
      name: 'Main Menu',
      type: 'menu',
      ttsPrompt: 'Press 1 for AC',
      valName: 'main_menu_choice',
      choices: { '1': 'node-2' },
    },
  },
};

describe('Phase 1: Configuration & Schema Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Zod Schema Validation', () => {
    it('should successfully parse a valid IVR config', () => {
      const result = IVRSystemConfigSchema.safeParse(validMockConfig);
      expect(result.success).toBe(true);
    });

    it('should fail if a required field is missing (e.g., host)', () => {
      const brokenConfig = { ...validMockConfig, host: undefined };
      const result = IVRSystemConfigSchema.safeParse(brokenConfig);
      expect(result.success).toBe(false);
    });

    it('should fail if an ActionNode is missing targetVariableName', () => {
      const brokenConfig = {
        ...validMockConfig,
        nodes: {
          'node-2': {
            id: 'node-2',
            name: 'Broken Action',
            type: 'action',
            // Missing targetVariableName!
            successTts: 'Done',
          },
        },
      };
      const result = IVRSystemConfigSchema.safeParse(brokenConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('ConfigService Singleton', () => {
    it('should return the exact same instance every time', () => {
      const instance1 = ConfigService.getInstance();
      const instance2 = ConfigService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should load config from disk successfully', async () => {
      // Make fs.readFile return our valid JSON string
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(validMockConfig));

      await configManager.loadConfig();
      
      expect(fs.readFile).toHaveBeenCalled();
      expect(configManager.getConfig().rootNodeId).toBe('node-1');
    });

    it('should fallback to default config if file does not exist (ENOENT)', async () => {
      // Simulate file not found
      const noFileError = new Error('File not found') as NodeJS.ErrnoException;
      noFileError.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValueOnce(noFileError);

      await configManager.loadConfig();

      const config = configManager.getConfig();
      // It shouldn't crash, it should load the defaults
      expect(config.host).toBe('http://homeassistant.local:8123');
      expect(config.rootNodeId).toBe('');
    });
  });
});