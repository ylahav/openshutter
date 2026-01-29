import { connectToDatabase } from '$lib/mongodb'
import type { AuditAction, AuditLogEntry, UserRole } from '$lib/types'

export async function writeAuditLog(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  const { db } = await connectToDatabase()
  const doc: AuditLogEntry = {
    ...entry,
    timestamp: new Date()
  }
  await db.collection('audit_logs').insertOne(doc as any)
}

export interface AuditLogQuery {
  action?: AuditAction | AuditAction[]
  userId?: string
  resourceType?: 'album' | 'photo'
  resourceId?: string
  since?: Date
  until?: Date
}

export async function findAuditLogs(query: AuditLogQuery, limit = 100, skip = 0) {
  const { db } = await connectToDatabase()
  const q: any = {}
  if (query.action) q.action = Array.isArray(query.action) ? { $in: query.action } : query.action
  if (query.userId) q.userId = query.userId
  if (query.resourceType) q.resourceType = query.resourceType
  if (query.resourceId) q.resourceId = query.resourceId
  if (query.since || query.until) {
    q.timestamp = {}
    if (query.since) q.timestamp.$gte = query.since
    if (query.until) q.timestamp.$lte = query.until
  }
  return db.collection('audit_logs')
    .find(q)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()
}


