import { IsNumber, Min, Max } from 'class-validator';

/** Geographic box for area map thumbnails (south/west/north/east). */
export class AreaBoundsDto {
	@IsNumber()
	@Min(-90)
	@Max(90)
	south: number;

	@IsNumber()
	@Min(-90)
	@Max(90)
	north: number;

	@IsNumber()
	@Min(-180)
	@Max(180)
	west: number;

	@IsNumber()
	@Min(-180)
	@Max(180)
	east: number;
}
