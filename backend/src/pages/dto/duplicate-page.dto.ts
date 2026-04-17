import { IsArray, IsOptional, IsString, IsIn } from 'class-validator';

/**
 * POST /api/admin/pages/:id/duplicate
 * For pages with a reserved `pageRole`, `frontendTemplates` (or legacy `frontendTemplate`) is required in the body
 * so the copy does not collide with the original role+pack pair.
 */
export class DuplicatePageDto {
	/** Target pack: `noir` | `studio` | `atelier`, or omit / empty string for the default variant. */
	@IsOptional()
	@IsString()
	frontendTemplate?: string;

	/** Target packs (preferred over legacy `frontendTemplate`). Empty array means default variant. */
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@IsIn(['noir', 'studio', 'atelier'], { each: true })
	frontendTemplates?: string[];

	@IsOptional()
	@IsString()
	alias?: string;

	@IsOptional()
	@IsString()
	slug?: string;
}
