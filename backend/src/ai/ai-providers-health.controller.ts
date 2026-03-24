import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { LocalAIProvider } from '../services/ai-tagging/providers/local.provider';
import { GoogleVisionProvider } from '../services/ai-tagging/providers/google-vision.provider';
import { ClipAIProvider } from '../services/ai-tagging/providers/clip.provider';

type ProviderName = 'google-vision' | 'clip' | 'local';

@Controller('admin/ai/providers')
@UseGuards(AdminGuard)
export class AIProvidersHealthController {
  @Get('health')
  async health() {
    const local = new LocalAIProvider();
    const google = new GoogleVisionProvider();
    const clip = new ClipAIProvider();

    const [localAvailable, googleAvailable, clipAvailable] = await Promise.all([
      local.isAvailable(),
      google.isAvailable(),
      clip.isAvailable(),
    ]);

    const envProvider = (process.env.AI_TAGGING_PROVIDER || 'auto').trim();
    const order: ProviderName[] =
      envProvider === 'google-vision'
        ? ['google-vision']
        : envProvider === 'clip'
          ? ['clip']
          : envProvider === 'local'
            ? ['local']
            : ['google-vision', 'clip', 'local'];

    const availableMap: Record<ProviderName, boolean> = {
      'google-vision': googleAvailable,
      clip: clipAvailable,
      local: localAvailable,
    };
    const activeProvider = order.find((p) => availableMap[p]) || null;

    return {
      success: true,
      data: {
        configuredProvider: envProvider || 'auto',
        autoOrder: order,
        activeProvider,
        providers: {
          'google-vision': {
            available: googleAvailable,
            reason: googleAvailable
              ? 'API key configured'
              : 'Missing GOOGLE_CLOUD_VISION_API_KEY or provider check failed',
          },
          clip: {
            available: clipAvailable,
            reason: clipAvailable ? 'Model pipeline available' : 'CLIP/BTAG model pipeline unavailable',
          },
          local: {
            available: localAvailable,
            reason: localAvailable
              ? 'tfjs-node + MobileNet available'
              : local.getLastLoadError?.() || 'Local provider unavailable',
          },
        },
      },
    };
  }
}

