import { IsString, IsNotEmpty, IsArray, IsBoolean, IsIn, MinLength, IsOptional } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for creating a new user.
 * Used by POST /api/admin/users.
 */
export class CreateUserDto {
	name: string | MultiLangText;
	
	@IsString()
	@IsNotEmpty()
	username: string;
	
	@IsString()
	@IsNotEmpty()
	@MinLength(6)
	password: string;
	
	@IsString()
	@IsIn(['admin', 'owner', 'guest'])
	role: 'admin' | 'owner' | 'guest';
	
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
