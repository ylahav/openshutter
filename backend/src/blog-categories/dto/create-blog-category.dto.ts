import { Allow, IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { MultiLangText, MultiLangHTML } from '../../types/multi-lang';

/**
 * DTO for creating a new blog category.
 * Used by POST /api/admin/blog-categories.
 */
export class CreateBlogCategoryDto {
	/**
	 * Required; validated in controller. Must use @Allow() so global ValidationPipe
	 * (whitelist: true) does not strip this property before the controller runs.
	 */
	@Allow()
	title!: string | MultiLangText;

	@Allow()
	@IsOptional()
	description?: string | MultiLangHTML;

	/** Admin UI sends an object { url, alt?, storageProvider, storagePath }; legacy may use string */
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
