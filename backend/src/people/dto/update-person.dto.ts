import { IsOptional, IsBoolean, IsArray, IsDateString } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for updating an existing person.
 * Used by PUT /api/admin/people/:id.
 */
export class UpdatePersonDto {
	@IsOptional()
	firstName?: string | MultiLangText;
	
	@IsOptional()
	lastName?: string | MultiLangText;
	
	@IsOptional()
	nickname?: string | MultiLangText;
	
	@IsDateString()
	@IsOptional()
	birthDate?: string;
	
	@IsOptional()
	description?: string | MultiLangText;
	
	@IsArray()
	@IsOptional()
	tags?: string[];
	
	@IsBoolean()
	@IsOptional()
	isActive?: boolean;
}
