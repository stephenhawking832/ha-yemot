// packages/backend/src/ha/ha.controller.ts
import { Controller, Get, Route, Tags, Security } from 'tsoa';
import { haService } from './ha.service';
import type { RichEntity } from '@ha-yemot/shared';

@Route('api/ha')
@Tags('Home Assistant')
@Security('jwt') // 🔒 Protects all endpoints in this class
export class HaController extends Controller {
  
  /**
   * Retrieves a rich array of all Home Assistant entities.
   * Includes live state, friendly names, and area assignments.
   * Used by the Vue GUI to populate entity selection dropdowns.
   */
  @Get('entities')
  public async getEntities(): Promise<RichEntity[]> {
    return haService.getRichEntities();
  }

  /**
   * Checks the connection status to Home Assistant.
   * Useful for the Vue GUI to display a green/red connection indicator.
   */
  @Get('status')
  public async gethaStatus(): Promise<{ connected: boolean }> {
    return { connected: haService.isConnected() };
  }
}