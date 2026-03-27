import type { TemplatePack } from './types'
import { logger } from '$lib/utils/logger'

import DefaultHome from '$lib/templates/default/Home.svelte'
import DefaultGallery from '$lib/templates/default/Gallery.svelte'
import DefaultAlbum from '$lib/templates/default/Album.svelte'
import DefaultLogin from '$lib/templates/default/Login.svelte'
import DefaultHeader from '$lib/templates/default/components/Header.svelte'
import DefaultFooter from '$lib/templates/default/components/Footer.svelte'

import ModernHome from '$lib/templates/modern/Home.svelte'
import ModernGallery from '$lib/templates/modern/Gallery.svelte'
import ModernAlbum from '$lib/templates/modern/Album.svelte'
import ModernLogin from '$lib/templates/modern/Login.svelte'
import ModernHeader from '$lib/templates/modern/components/Header.svelte'
import ModernFooter from '$lib/templates/modern/components/Footer.svelte'

import MinimalHome from '$lib/templates/minimal/Home.svelte'
import MinimalGallery from '$lib/templates/minimal/Gallery.svelte'
import MinimalAlbum from '$lib/templates/minimal/Album.svelte'
import MinimalLogin from '$lib/templates/minimal/Login.svelte'
import MinimalHeader from '$lib/templates/minimal/components/Header.svelte'
import MinimalFooter from '$lib/templates/minimal/components/Footer.svelte'

import ElegantHome from '$lib/templates/elegant/Home.svelte'
import ElegantGallery from '$lib/templates/elegant/Gallery.svelte'
import ElegantAlbum from '$lib/templates/elegant/Album.svelte'
import ElegantLogin from '$lib/templates/elegant/Login.svelte'
import ElegantHeader from '$lib/templates/elegant/components/Header.svelte'
import ElegantFooter from '$lib/templates/elegant/components/Footer.svelte'

const packs: Record<string, TemplatePack> = {
  default: {
    name: 'default',
    pages: { Home: DefaultHome, Gallery: DefaultGallery, Album: DefaultAlbum, Login: DefaultLogin },
    components: { Header: DefaultHeader, Footer: DefaultFooter }
  },
  minimal: {
    name: 'minimal',
    pages: { Home: MinimalHome, Gallery: MinimalGallery, Album: MinimalAlbum, Login: MinimalLogin },
    components: { Header: MinimalHeader, Footer: MinimalFooter }
  },
  modern: {
    name: 'modern',
    pages: { Home: ModernHome, Gallery: ModernGallery, Album: ModernAlbum, Login: ModernLogin },
    components: { Header: ModernHeader, Footer: ModernFooter }
  },
  elegant: {
    name: 'elegant',
    pages: { Home: ElegantHome, Gallery: ElegantGallery, Album: ElegantAlbum, Login: ElegantLogin },
    components: { Header: ElegantHeader, Footer: ElegantFooter }
  }
}

export function getTemplatePack(templateName: string | null | undefined): TemplatePack {
  const key = String(templateName || 'default').toLowerCase()
  const pack = packs[key]
  if (pack) return pack

  logger.warn(`[TemplatePacks] Unknown pack "${templateName}", falling back to default`)
  return packs.default
}

export function listTemplatePacks(): TemplatePack[] {
  return Object.values(packs)
}

