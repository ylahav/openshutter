import { IsString, IsOptional, IsArray, IsBoolean, IsIn, MinLength, Allow, ValidateIf } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for updating an existing user.
 * Used by PUT /api/admin/users/:id.
 */
export class UpdateUserDto {
	/** Name is validated in controller (string or MultiLangText with at least one language). */
	@Allow()
	@IsOptional()
	name?: string | MultiLangText;

	@IsString()
	@IsOptional()
	username?: string;

	/** Only validate length when a new password is provided (non-empty). Omit or leave empty to keep current password. */
	@IsOptional()
	@ValidateIf((o) => o.password != null && String(o.password).trim() !== '')
	@IsString()
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

	@IsBoolean()
	@IsOptional()
	forcePasswordChange?: boolean;

	@IsString()
	@IsOptional()
	preferredLanguage?: string;

	/** Owner storage: use main-domain config vs own connection. Used when allowedStorageProviders includes google-drive, wasabi, etc. */
	@Allow()
	@IsOptional()
	storageConfig?: {
		useAdminConfig?: boolean;
		googleDrive?: {
			rootFolderId?: string;
			sharedDriveId?: string;
			folderPrefix?: string;
			authMethod?: string;
			clientId?: string;
			clientSecret?: string;
			refreshToken?: string;
			storageType?: string;
			folderId?: string;
			serviceAccountJson?: string;
		};
		wasabi?: {
			endpoint?: string;
			bucketName?: string;
			region?: string;
			accessKeyId?: string;
			secretAccessKey?: string;
		};
	};
}
