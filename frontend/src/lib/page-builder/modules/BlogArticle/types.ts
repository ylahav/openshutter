export type BlogArticleLayoutConfig = {
	/** Optional heading above the list / article */
	title?: string | Record<string, string>;
	mode?: 'list' | 'single';
	/** Filter list by category alias (same value as article `category` field) */
	categoryAlias?: string;
	/**
	 * When true (default), list mode uses `?category=` from the current page URL
	 * if `categoryAlias` is not set (pairs with Blog categories links to `/blog?category=`).
	 */
	syncCategoryFromPageUrl?: boolean;
	/** Single mode: article slug */
	slug?: string;
	limit?: number;
	showImage?: boolean;
	showExcerpt?: boolean;
	showMeta?: boolean;
	/** Base path for links to full article (public route) */
	articlePathPrefix?: string;
};
