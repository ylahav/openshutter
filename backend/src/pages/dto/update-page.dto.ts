import { IsString, IsOptional, IsBoolean, IsIn, IsArray } from 'class-validator';
import { MultiLangText, MultiLangHTML } from '../../types/multi-lang';

/** Layout zones and grid dimensions for a page. */
export class PageLayoutDto {
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	zones?: string[];

	@IsOptional()
	gridRows?: number;

	@IsOptional()
	gridColumns?: number;

	@IsOptional()
	urlParams?: string;
}

/**
 * DTO for updating an existing page.
 * Used by PUT /api/admin/pages/:id.
 */
export class UpdatePageDto {
	@IsOptional()
	title?: string | MultiLangText;
	
	@IsString()
	@IsOptional()
	alias?: string;
	
	@IsString()
	@IsOptional()
	slug?: string;

	@IsString()
	@IsIn(['home', 'gallery', 'login', 'search', 'blog', 'album', 'blog-category', 'blog-article'])
	@IsOptional()
	pageRole?: string | null;

	@IsString()
	@IsOptional()
	parentPageId?: string | null;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	routeParams?: string[];
	
	@IsOptional()
	subtitle?: string | MultiLangText;
	
	@IsString()
	@IsOptional()
	leadingImage?: string;

	/** Optional per-page template pack override. */
	@IsString()
	@IsIn(['noir', 'studio', 'atelier'])
	@IsOptional()
	frontendTemplate?: string;

	/** Optional multi-pack assignment. Empty / omitted means default fallback variant. */
	@IsArray()
	@IsString({ each: true })
	@IsIn(['noir', 'studio', 'atelier'], { each: true })
	@IsOptional()
	frontendTemplates?: string[];
	
	@IsOptional()
	introText?: string | MultiLangHTML;
	
	@IsOptional()
	content?: string | MultiLangHTML;
	
	@IsString()
	@IsIn(['system', 'site'])
	@IsOptional()
	category?: 'system' | 'site';
	
	@IsBoolean()
	@IsOptional()
	isPublished?: boolean;
	
	@IsOptional()
	layout?: PageLayoutDto;
}
