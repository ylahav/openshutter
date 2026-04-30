import { siteConfigData } from './site-config-store';
import { currentLanguage } from './language';
import { fromStore, toStore, type Readable } from 'svelte/store';
import { getProductName } from '$lib/utils/productName';
import { getPublicLogo, getPublicFavicon } from '$lib/utils/public-branding';

const configRef = fromStore(siteConfigData);
const langRef = fromStore(currentLanguage);

const productNameDerived = $derived.by(() =>
	getProductName(configRef.current ?? null, langRef.current)
);

const publicLogoDerived = $derived.by(() => getPublicLogo(configRef.current ?? null));
const publicFaviconDerived = $derived.by(() => getPublicFavicon(configRef.current ?? null));

/** @see getProductName — white-label / site title for `<title>` and chrome */
export const productName: Readable<string> = toStore(() => productNameDerived);

/** Public gallery header / page-builder logo */
export const publicSiteLogo: Readable<string> = toStore(() => publicLogoDerived);

/** Browser favicon href */
export const publicSiteFavicon: Readable<string> = toStore(() => publicFaviconDerived);
