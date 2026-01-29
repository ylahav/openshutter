import { IsString, IsOptional, IsIn } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for creating a new tag.
 * Used by POST /api/admin/tags.
 */
export class CreateTagDto {
	name: string | MultiLangText;
	
	@IsOptional()
	description?: string | MultiLangText;
	
	@IsString()
	@IsOptional()
	color?: string;
	
	@IsString()
	@IsIn(['general', 'location', 'event', 'object', 'mood', 'technical', 'custom'])
	@IsOptional()
	category?: 'general' | 'location' | 'event' | 'object' | 'mood' | 'technical' | 'custom';
}
