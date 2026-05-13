import { IsString, IsOptional, IsBoolean, IsIn, ValidateNested, IsNumber, Min, Max, Allow, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { MultiLangText } from '../../types/multi-lang';
import { AreaBoundsDto } from './area-bounds.dto';

/** Latitude/longitude for a location. */
export class CoordinatesDto {
	@IsNumber()
	@Min(-90)
	@Max(90)
	latitude: number;
	
	@IsNumber()
	@Min(-180)
	@Max(180)
	longitude: number;
}

/**
 * DTO for creating a new location.
 * Used by POST /api/admin/locations.
 */
export class CreateLocationDto {
	@IsString()
	@IsIn(['place', 'area'])
	@IsOptional()
	locationKind?: 'place' | 'area';

	@ValidateIf((_, v) => v !== null && v !== undefined)
	@ValidateNested()
	@Type(() => AreaBoundsDto)
	@IsOptional()
	areaBounds?: AreaBoundsDto;

	/** Name is validated in controller (string or MultiLangText with at least one language). */
	@Allow()
	name: string | MultiLangText;
	
	@IsOptional()
	description?: string | MultiLangText;
	
	@IsString()
	@IsOptional()
	address?: string;
	
	@IsString()
	@IsOptional()
	city?: string;
	
	@IsString()
	@IsOptional()
	state?: string;
	
	@IsString()
	@IsOptional()
	country?: string;
	
	@IsString()
	@IsOptional()
	postalCode?: string;
	
	@ValidateNested()
	@Type(() => CoordinatesDto)
	@IsOptional()
	coordinates?: CoordinatesDto;
	
	@IsString()
	@IsOptional()
	placeId?: string;
	
	@IsString()
	@IsIn(['city', 'colony', 'village', 'kibbutz', 'landmark', 'venue', 'outdoor', 'indoor', 'travel', 'home', 'work', 'custom'])
	@IsOptional()
	category?:
		| 'city'
		| 'colony'
		| 'village'
		| 'kibbutz'
		| 'landmark'
		| 'venue'
		| 'outdoor'
		| 'indoor'
		| 'travel'
		| 'home'
		| 'work'
		| 'custom';
	
	@IsBoolean()
	@IsOptional()
	isActive?: boolean;
}
