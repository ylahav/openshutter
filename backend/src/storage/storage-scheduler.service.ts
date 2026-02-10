import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { StorageManager } from '../services/storage/manager'
import { StorageProviderId } from '../services/storage/types'

/**
 * Scheduled tasks for storage providers.
 * - Renews Google Drive OAuth access token before expiry (cron every 30 min).
 */
@Injectable()
export class StorageSchedulerService {
  private readonly logger = new Logger(StorageSchedulerService.name)

  @Cron('0 */30 * * * *', { name: 'google-drive-token-refresh' })
  async refreshGoogleDriveToken(): Promise<void> {
    const manager = StorageManager.getInstance()
    const active = await manager.getActiveProviders()
    if (!active.includes('google-drive' as StorageProviderId)) {
      return
    }
    try {
      const service = await manager.getProvider('google-drive' as StorageProviderId)
      if (typeof service.refreshTokenIfNeeded === 'function') {
        await service.refreshTokenIfNeeded()
        this.logger.debug('Google Drive token refresh completed (cron)')
      }
    } catch (error) {
      this.logger.warn(
        `Google Drive token refresh (cron) failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
