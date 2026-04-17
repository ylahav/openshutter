import type { MultiLangText, MultiLangHTML } from '$lib/types/multi-lang';

export interface Page {
	_id: string;
	title: MultiLangText | string;
	subtitle?: MultiLangText | string;
	alias: string;
	slug?: string;
	pageRole?: 'home' | 'gallery' | 'login' | 'search' | 'blog' | 'album' | 'blog-category' | 'blog-article';
	parentPageId?: string | null;
	routeParams?: string[];
	/** Optional per-page template pack override (`noir` | `studio` | `atelier`). */
	frontendTemplate?: string;
	/** Optional multi-pack assignment (`noir` | `studio` | `atelier`). Empty = default fallback. */
	frontendTemplates?: string[];
	leadingImage?: string;
	introText?: MultiLangHTML | string;
	content?: MultiLangHTML | string;
	layout?: {
		zones?: string[];
	};
	category: 'system' | 'site';
	isPublished?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface PageCategoryOption {
	value: string;
	label: string;
}
