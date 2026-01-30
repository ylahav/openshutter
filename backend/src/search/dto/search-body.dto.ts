import { IsString, IsOptional, IsIn, IsInt, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for POST /api/search request body.
 * Search/filter criteria in the body instead of query params.
 */
export class SearchBodyDto {
	@IsString()
	@IsOptional()
	q?: string;

	@IsString()
	@IsIn(['photos', 'albums', 'people', 'locations', 'all'])
	@IsOptional()
	type?: 'photos' | 'albums' | 'people' | 'locations' | 'all';

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(50)
	limit?: number;

	@IsString()
	@IsOptional()
	albumId?: string;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	tags?: string[];

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	people?: string[];

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	locationIds?: string[];

	@IsString()
	@IsOptional()
	dateFrom?: string;

	@IsString()
	@IsOptional()
	dateTo?: string;

	@IsString()
	@IsIn(['date', 'uploadedAt'])
	@IsOptional()
	sortBy?: string;

	@IsString()
	@IsIn(['asc', 'desc'])
	@IsOptional()
	sortOrder?: 'asc' | 'desc';
}
