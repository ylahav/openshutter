/**
 * Narrow Mongo-style types for legacy audit-log code paths that still call
 * `connectToDatabase()` (stub always throws). Keeps `unknown` db from the stub usable without `any`.
 */
import type { AuditAction, AuditLogEntry } from '$lib/types'

export type AuditLogMongoFilter = {
	action?: AuditAction | { $in: AuditAction[] }
	userId?: string
	resourceType?: 'album' | 'photo'
	resourceId?: string
	timestamp?: { $gte?: Date; $lte?: Date }
}

type AuditLogsFindCursor = {
	sort: (spec: Record<string, number>) => AuditLogsFindCursor
	skip: (n: number) => AuditLogsFindCursor
	limit: (n: number) => AuditLogsFindCursor
	toArray: () => Promise<AuditLogEntry[]>
}

type AuditLogsCollection = {
	insertOne: (doc: AuditLogEntry) => Promise<unknown>
	find: (q: AuditLogMongoFilter) => AuditLogsFindCursor
}

export function getAuditLogsCollection(db: unknown): AuditLogsCollection {
	return (db as { collection: (name: string) => AuditLogsCollection }).collection('audit_logs')
}
