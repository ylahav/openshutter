import type { MultiLangText, MultiLangHTML } from '$lib/types/multi-lang';

export interface Page {
	_id: string;
	title: MultiLangText | string;
	subtitle?: MultiLangText | string;
	alias: string;
	slug?: string;
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
