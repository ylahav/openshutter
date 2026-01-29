import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for updating an existing group (alias is immutable).
 * Used by PUT /api/admin/groups/:id.
 */
export class UpdateGroupDto {
	name: string | MultiLangText;
}
