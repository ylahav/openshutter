import { Allow, IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { MultiLangText, MultiLangHTML } from '../../types/multi-lang';

/**
 * DTO for updating an existing blog category.
 * Used by PUT /api/admin/blog-categories/:id.
 */
export class UpdateBlogCategoryDto {
	@Allow()
	@IsOptional()
	title?: string | MultiLangText;

	@Allow()
	@IsOptional()
	description?: string | MultiLangHTML;

	@Allow()
	@IsOptional()
	leadingImage?: string | Record<string, unknown>;
	
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
