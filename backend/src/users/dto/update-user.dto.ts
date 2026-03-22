import { IsString, IsOptional, IsArray, IsBoolean, IsIn, MinLength, Allow, ValidateIf, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { MultiLangText } from '../../types/multi-lang';

/** Nested DTO for owner Google Drive storage config (per-user override). */
export class GoogleDriveStorageConfigDto {
	@IsOptional()
	@IsString()
	@MaxLength(128)
	rootFolderId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(128)
	sharedDriveId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(256)
	folderPrefix?: string;

	@IsOptional()
	@IsString()
	@MaxLength(32)
	authMethod?: string;

	@IsOptional()
	@IsString()
	@MaxLength(256)
	clientId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(256)
	clientSecret?: string;

	@IsOptional()
	@IsString()
	@MaxLength(1024)
	refreshToken?: string;

	@IsOptional()
	@IsString()
	@MaxLength(32)
	storageType?: string;

	@IsOptional()
	@IsString()
	@MaxLength(128)
	folderId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(20000)
	serviceAccountJson?: string;
}

/** Nested DTO for owner Wasabi storage config (per-user override). */
export class WasabiStorageConfigDto {
	@IsOptional()
	@IsString()
	@MaxLength(512)
	endpoint?: string;

	@IsOptional()
	@IsString()
	@MaxLength(128)
	bucketName?: string;

	@IsOptional()
	@IsString()
	@MaxLength(64)
	region?: string;

	@IsOptional()
	@IsString()
	@MaxLength(256)
	accessKeyId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(256)
	secretAccessKey?: string;
}

/** Nested DTO for owner storage config (which provider overrides to use). */
export class UserStorageConfigDto {
	@IsOptional()
	@IsBoolean()
	useAdminConfig?: boolean;

	@IsOptional()
	@ValidateNested()
	@Type(() => GoogleDriveStorageConfigDto)
	googleDrive?: GoogleDriveStorageConfigDto;

	@IsOptional()
	@ValidateNested()
	@Type(() => WasabiStorageConfigDto)
	wasabi?: WasabiStorageConfigDto;
}

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

	/** When true (owners only), albums/photos use `owner_storage_configs` instead of global site storage. */
	@IsBoolean()
	@IsOptional()
	useDedicatedStorage?: boolean;
	
	@IsArray()
	@IsOptional()
	allowedStorageProviders?: string[];

	@IsBoolean()
	@IsOptional()
	forcePasswordChange?: boolean;

	@IsString()
	@IsOptional()
	preferredLanguage?: string;

	/** Owner storage: use main-domain config vs own connection. Validated nested shape. */
	@IsOptional()
	@ValidateNested()
	@Type(() => UserStorageConfigDto)
	storageConfig?: UserStorageConfigDto;
}
