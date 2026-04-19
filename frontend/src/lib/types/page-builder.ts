import type { MultiLangHTML, MultiLangText } from './multi-lang';

export interface PageData {
	_id: string;
	title: MultiLangText | string;
	subtitle?: MultiLangText | string;
	alias?: string;
	slug?: string;
	pageRole?: 'home' | 'gallery' | 'login' | 'search' | 'blog' | 'album' | 'blog-category' | 'blog-article';
	parentPageId?: string | null;
	routeParams?: string[];
	/** Optional per-page template pack override (`noir` | `studio` | `atelier`). */
	frontendTemplate?: string;
	layout?: {
		zones?: string[];
	};
	introText?: MultiLangHTML | string;
	content?: MultiLangHTML | string;
	isPublished?: boolean;
}

export interface PageModuleData {
	_id: string;
	pageId: string;
	type: string;
	zone?: string; // Legacy support
	order?: number; // Legacy support
	rowOrder?: number; // Row index (0-based) - new layout system
	columnIndex?: number; // Column index within row (0-based) - new layout system
	columnProportion?: number; // Proportion value (e.g., 1, 2, 3) - new layout system
	rowSpan?: number; // Number of rows this module spans (default 1)
	colSpan?: number; // Number of columns this module spans (default 1)
	/**
	 * Module-specific props. May include optional `placement` (see `module-cell-placement.ts`).
	 * Cell `className` is scoped per active pack: tokens become `{packPrefix}-{token}` (e.g. `header` → `a-header`),
	 * see `$lib/template/packs/class-prefix.ts`. Set `classNameNoPackPrefix: true` to skip (e.g. raw Tailwind).
	 * Optional `wrapperClassByPack` / `classNameByPack` overrides per pack id, same prefix rules.
	 * For `layoutShell`: optional `gridTemplateColumns` (e.g. `auto auto 1fr auto auto`) uses CSS grid for rows instead of equal flex columns.
	 */
	props: Record<string, any>;
	createdAt?: string;
	updatedAt?: string;
}
