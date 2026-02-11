import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn, IsArray, Allow } from 'class-validator';
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
 * DTO for creating a new page.
 * Used by POST /api/admin/pages.
 */
export class CreatePageDto {
	@Allow()
	title: string | MultiLangText;

	@IsString()
	@IsNotEmpty()
	alias: string;
	
	@IsString()
	@IsOptional()
	slug?: string;
	
	@IsOptional()
	subtitle?: string | MultiLangText;
	
	@IsString()
	@IsOptional()
	leadingImage?: string;
	
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
