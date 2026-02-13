import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for creating a new album.
 * Used by POST /api/admin/albums.
 */
export class CreateAlbumDto {
	@IsNotEmpty()
	name: string | MultiLangText;

	@IsString()
	@IsNotEmpty()
	alias: string;

	@IsOptional()
	description?: string | MultiLangText;

	@IsBoolean()
	@IsOptional()
	isPublic?: boolean;

	@IsBoolean()
	@IsOptional()
	isPublished?: boolean;

	@IsBoolean()
	@IsOptional()
	isFeatured?: boolean;

	@IsString()
	@IsNotEmpty()
	storageProvider: 'google-drive' | 'aws-s3' | 'local' | 'backblaze' | 'wasabi';

	@IsString()
	@IsOptional()
	parentAlbumId?: string | null;

	@IsArray()
	@IsOptional()
	tags?: string[];

	@IsArray()
	@IsOptional()
	allowedGroups?: string[];

	@IsArray()
	@IsOptional()
	allowedUsers?: string[];
}
