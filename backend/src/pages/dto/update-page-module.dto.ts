import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

/**
 * DTO for updating a page module.
 * Used by PUT /api/admin/pages/:id/modules/:moduleId.
 */
export class UpdatePageModuleDto {
	@IsString()
	@IsOptional()
	type?: string;
	
	@IsObject()
	@IsOptional()
	props?: Record<string, unknown>;
	
	@IsString()
	@IsOptional()
	zone?: string;
	
	@IsNumber()
	@IsOptional()
	order?: number;
	
	@IsNumber()
	@IsOptional()
	rowOrder?: number;
	
	@IsNumber()
	@IsOptional()
	columnIndex?: number;
	
	@IsNumber()
	@IsOptional()
	columnProportion?: number;
}
