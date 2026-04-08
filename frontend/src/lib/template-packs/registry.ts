import type { TemplatePack } from './types'
import { logger } from '$lib/utils/logger'

import NoirHome from '$lib/templates/noir/Home.svelte'
import NoirGallery from '$lib/templates/noir/Gallery.svelte'
import NoirAlbum from '$lib/templates/noir/Album.svelte'
import NoirLogin from '$lib/templates/noir/Login.svelte'
import NoirHeader from '$lib/templates/noir/components/Header.svelte'
import NoirFooter from '$lib/templates/noir/components/Footer.svelte'

import StudioHome from '$lib/templates/studio/Home.svelte'
import StudioGallery from '$lib/templates/studio/Gallery.svelte'
import StudioAlbum from '$lib/templates/studio/Album.svelte'
import StudioLogin from '$lib/templates/studio/Login.svelte'
import StudioHeader from '$lib/templates/studio/components/Header.svelte'
import StudioFooter from '$lib/templates/studio/components/Footer.svelte'

import AtelierHome from '$lib/templates/atelier/Home.svelte'
import AtelierGallery from '$lib/templates/atelier/Gallery.svelte'
import AtelierAlbum from '$lib/templates/atelier/Album.svelte'
import AtelierLogin from '$lib/templates/atelier/Login.svelte'
import AtelierHeader from '$lib/templates/atelier/components/Header.svelte'
import AtelierFooter from '$lib/templates/atelier/components/Footer.svelte'

/** Built-in pack ids (must match registry keys and backend theme baseTemplate allowlist). */
export const TEMPLATE_PACK_IDS = ['noir', 'studio', 'atelier'] as const

export type TemplatePackId = (typeof TEMPLATE_PACK_IDS)[number]

/** Old installs / DB rows may still reference removed packs — map to a current id. */
const LEGACY_PACK_ID_MAP: Record<string, TemplatePackId> = {
	default: 'noir',
	minimal: 'noir',
	simple: 'noir',
	modern: 'noir',
	elegant: 'noir'
}

export function normalizeTemplatePackId(id: string | null | undefined): TemplatePackId {
	const k = String(id ?? '')
		.trim()
		.toLowerCase()
	if ((TEMPLATE_PACK_IDS as readonly string[]).includes(k)) return k as TemplatePackId
	const mapped = LEGACY_PACK_ID_MAP[k]
	if (mapped) return mapped
	return 'noir'
}

export function isKnownTemplatePack(name: string | null | undefined): boolean {
	const k = String(name ?? '')
		.trim()
		.toLowerCase()
	if ((TEMPLATE_PACK_IDS as readonly string[]).includes(k)) return true
	return k in LEGACY_PACK_ID_MAP
}

const packs: Record<TemplatePackId, TemplatePack> = {
	noir: {
		name: 'noir',
		pages: { Home: NoirHome, Gallery: NoirGallery, Album: NoirAlbum, Login: NoirLogin },
		components: { Header: NoirHeader, Footer: NoirFooter }
	},
	studio: {
		name: 'studio',
		pages: { Home: StudioHome, Gallery: StudioGallery, Album: StudioAlbum, Login: StudioLogin },
		components: { Header: StudioHeader, Footer: StudioFooter }
	},
	atelier: {
		name: 'atelier',
		pages: { Home: AtelierHome, Gallery: AtelierGallery, Album: AtelierAlbum, Login: AtelierLogin },
		components: { Header: AtelierHeader, Footer: AtelierFooter }
	}
}

export function getTemplatePack(templateName: string | null | undefined): TemplatePack {
	const key = normalizeTemplatePackId(templateName)
	const pack = packs[key]
	if (pack) return pack

	logger.warn(`[TemplatePacks] Unknown pack "${templateName}", falling back to noir`)
	return packs.noir
}

export function listTemplatePacks(): TemplatePack[] {
	return Object.values(packs)
}
