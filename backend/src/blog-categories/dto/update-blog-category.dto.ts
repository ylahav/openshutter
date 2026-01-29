import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { MultiLangText, MultiLangHTML } from '../../types/multi-lang';

/**
 * DTO for updating an existing blog category.
 * Used by PUT /api/admin/blog-categories/:id.
 */
export class UpdateBlogCategoryDto {
	@IsOptional()
	title?: string | MultiLangText;
	
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
