import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for updating an existing tag.
 * Used by PUT /api/admin/tags/:id.
 */
export class UpdateTagDto {
	@IsOptional()
	name?: string | MultiLangText;
	
	@IsOptional()
	description?: string | MultiLangText;
	
	@IsString()
	@IsOptional()
	color?: string;
	
	@IsString()
	@IsIn(['general', 'location', 'event', 'object', 'mood', 'technical', 'custom'])
	@IsOptional()
	category?: 'general' | 'location' | 'event' | 'object' | 'mood' | 'technical' | 'custom';
	
	@IsBoolean()
	@IsOptional()
	isActive?: boolean;
}
