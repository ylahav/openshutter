import { Allow } from 'class-validator';
import { MultiLangText } from '../../types/multi-lang';

/**
 * DTO for updating an existing group (alias is immutable).
 * Used by PUT /api/admin/groups/:id.
 */
export class UpdateGroupDto {
	/** Name is validated in controller (string or MultiLangText with at least one language). */
	@Allow()
	name: string | MultiLangText;
}
