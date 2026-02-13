import { IsString, IsOptional, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for updating an existing album.
 * Used by PUT /api/admin/albums/:id.
 */
export class UpdateAlbumDto {
	@IsOptional()
	name?: string | MultiLangText;

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

	@IsBoolean()
	@IsOptional()
	showExifData?: boolean;

	@IsNumber()
	@IsOptional()
	order?: number;

	@IsArray()
	@IsOptional()
	tags?: string[];

	@IsArray()
	@IsOptional()
	people?: string[];

	@IsString()
	@IsOptional()
	location?: string | null;

	/** Restrict access: user IDs that can access this album (when private). */
	@IsArray()
	@IsOptional()
	allowedUsers?: string[];

	/** Restrict access: group aliases that can access this album (when private). */
	@IsArray()
	@IsOptional()
	allowedGroups?: string[];

	@IsOptional()
	metadata?: Record<string, unknown>;
}
