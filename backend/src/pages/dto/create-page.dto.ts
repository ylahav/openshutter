import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn, IsArray } from 'class-validator';
import { MultiLangText, MultiLangHTML } from '../../types/multi-lang';

/** Layout zones for a page. */
export class PageLayoutDto {
	@IsArray()
	@IsString({ each: true })
	zones?: string[];
}

/**
 * DTO for creating a new page.
 * Used by POST /api/admin/pages.
 */
export class CreatePageDto {
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
