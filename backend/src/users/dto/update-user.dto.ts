import { IsString, IsOptional, IsArray, IsBoolean, IsIn, MinLength } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for updating an existing user.
 * Used by PUT /api/admin/users/:id.
 */
export class UpdateUserDto {
	@IsOptional()
	name?: string | MultiLangText;
	
	@IsString()
	@IsOptional()
	username?: string;
	
	@IsString()
	@IsOptional()
	@MinLength(6)
	password?: string;
	
	@IsString()
	@IsIn(['admin', 'owner', 'guest'])
	@IsOptional()
	role?: 'admin' | 'owner' | 'guest';
	
	@IsArray()
	@IsOptional()
	groupAliases?: string[];
	
	@IsBoolean()
	@IsOptional()
	blocked?: boolean;
	
	@IsArray()
	@IsOptional()
	allowedStorageProviders?: string[];
}
