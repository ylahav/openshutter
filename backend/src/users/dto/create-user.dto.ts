import { IsString, IsNotEmpty, IsArray, IsBoolean, IsIn, MinLength, IsOptional, Allow } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for creating a new user.
 * Used by POST /api/admin/users.
 */
export class CreateUserDto {
	/** Name is validated in controller (string or MultiLangText with at least one language). */
	@Allow()
	name: string | MultiLangText;

	@IsString()
	@IsNotEmpty()
	username: string;

	/** Optional. If omitted, a secure password is generated and sent via welcome email (if configured). */
	@IsString()
	@IsOptional()
	@MinLength(6)
	password?: string;
	
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

	@IsString()
	@IsOptional()
	preferredLanguage?: string;
}
