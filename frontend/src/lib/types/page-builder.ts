import type { MultiLangHTML, MultiLangText } from './multi-lang';

export interface PageData {
	_id: string;
	title: MultiLangText | string;
	subtitle?: MultiLangText | string;
	alias?: string;
	slug?: string;
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
	props: Record<string, any>;
	createdAt?: string;
	updatedAt?: string;
}
