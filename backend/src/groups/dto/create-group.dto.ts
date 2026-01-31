import { IsString, IsNotEmpty, Allow } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for creating a new group.
 * Used by POST /api/admin/groups.
 */
export class CreateGroupDto {
	@IsString()
	@IsNotEmpty()
	alias: string;

	/** Name is validated in controller (string or MultiLangText with at least one language). */
	@Allow()
	name: string | MultiLangText;
}
