import { IsArray, ValidateNested, IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/** Single album reorder item: id, optional parent, and new order index. */
export class AlbumReorderItemDto {
	@IsString()
	id: string;

	@IsString()
	@IsOptional()
	parentAlbumId?: string | null;

	@IsNumber()
	order: number;
}

/**
 * DTO for reordering albums.
 * Used by PUT /api/admin/albums/reorder.
 */
export class ReorderAlbumsDto {
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => AlbumReorderItemDto)
	updates: AlbumReorderItemDto[];
}
