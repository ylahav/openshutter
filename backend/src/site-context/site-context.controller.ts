import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { SiteContext } from '../middleware/site-context.middleware';

@Controller('site-context')
export class SiteContextController {
  /**
   * GET /api/site-context
   * Returns the resolved site context for the current request (global vs owner-site).
   * Used by the SvelteKit frontend to adjust behaviour based on owner domains.
   */
  @Get()
  getSiteContext(@Req() req: Request): SiteContext {
    const siteContext = (req as any).siteContext as SiteContext | undefined;
    return siteContext ?? ({ type: 'global' } as SiteContext);
  }
}

