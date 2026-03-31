export type BlogCategoryLayoutConfig = {
	title?: string | Record<string, string>;
	/** Optional filter to show one category alias only */
	categoryAlias?: string;
	layout?: 'chips' | 'list';
	showCount?: boolean;
	maxItems?: number;
	sortBy?: 'name' | 'count';
	linkToArticles?: boolean;
	articlesListPath?: string;
};
