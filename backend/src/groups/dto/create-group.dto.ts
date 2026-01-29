import { IsString, IsNotEmpty } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for creating a new group.
 * Used by POST /api/admin/groups.
 */
export class CreateGroupDto {
	@IsString()
	@IsNotEmpty()
	alias: string;

	name: string | MultiLangText;
}
