import { IsNumber, Min, Max } from 'class-validator';

/**
 * DTO for cropping a photo.
 * Used by POST /api/admin/photos/:id/crop.
 */
export class CropPhotoDto {
	@IsNumber()
	@Min(0)
	x: number;

	@IsNumber()
	@Min(0)
	y: number;

	@IsNumber()
	@Min(1)
	width: number;

	@IsNumber()
	@Min(1)
	height: number;
}
