// packages/backend/src/config/config.controller.ts
import { Controller, Get, Post, Body, Route, Tags, Security, SuccessResponse } from 'tsoa';
import { configManager } from './config.service';
import type { IVRSystemConfig } from '@ha-yemot/shared';

@Route('api/config')
@Tags('Configuration')
@Security('jwt') // 🔒 Protects all endpoints in this class
export class ConfigController extends Controller {
  
  /**
   * Retrieves the current IVR configuration tree.
   * Used by the Vue GUI on initial load to populate the Tree Editor.
   */
  @Get('/')
  public async getConfig(): Promise<IVRSystemConfig> {
    return configManager.getConfig();
  }

  /**
   * Saves a new IVR configuration tree to disk.
   * Used by the Vue GUI when the Admin clicks "Save".
   */
  @Post('/')
  @SuccessResponse('200', 'Saved Successfully')
  public async saveConfig(
    @Body() newConfig: IVRSystemConfig
  ): Promise<{ message: string }> {
    try {
      await configManager.saveConfig(newConfig);
      return { message: 'Configuration saved successfully' };
    } catch (error: any) {
      this.setStatus(400); // Bad Request
      throw new Error(`Invalid configuration: ${error.message}`);
    }
  }
}