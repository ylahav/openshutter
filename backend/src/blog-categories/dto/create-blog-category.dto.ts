import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { MultiLangText, MultiLangHTML } from '../../types/multi-lang';

/**
 * DTO for creating a new blog category.
 * Used by POST /api/admin/blog-categories.
 */
export class CreateBlogCategoryDto {
	title: string | MultiLangText;
	
	@IsOptional()
	description?: string | MultiLangHTML;
	
	@IsString()
	@IsOptional()
	leadingImage?: string;
	
	@IsBoolean()
	@IsOptional()
	isActive?: boolean;
	
	@IsNumber()
	@IsOptional()
	sortOrder?: number;
	
	@IsString()
	@IsOptional()
	alias?: string;
}
