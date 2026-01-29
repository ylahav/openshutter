import { IsOptional, IsBoolean, IsArray, IsString, IsObject } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for updating an existing photo.
 * Used by PUT /api/admin/photos/:id.
 */
export class UpdatePhotoDto {
	@IsOptional()
	title?: string | MultiLangText;
	
	@IsOptional()
	description?: string | MultiLangText;
	
	@IsBoolean()
	@IsOptional()
	isPublished?: boolean;
	
	@IsBoolean()
	@IsOptional()
	isLeading?: boolean;
	
	@IsBoolean()
	@IsOptional()
	isGalleryLeading?: boolean;
	
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	tags?: string[];
	
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	people?: string[];
	
	@IsString()
	@IsOptional()
	location?: string | null;
	
	@IsObject()
	@IsOptional()
	exif?: Record<string, unknown>;
	
	@IsObject()
	@IsOptional()
	metadata?: Record<string, unknown>;
}
