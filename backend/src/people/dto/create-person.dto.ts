import { IsOptional, IsBoolean, IsArray, IsDateString } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for creating a new person.
 * Used by POST /api/admin/people.
 */
export class CreatePersonDto {
	firstName: string | MultiLangText;
	lastName: string | MultiLangText;
	
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
