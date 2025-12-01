import mongoose from 'mongoose'

export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'upload'
  | 'download';

export interface AuditLogEntry {
  action: AuditAction
  userId?: string
  resourceType?: string
  resourceId?: string
  details?: any
  ipAddress?: string
  timestamp: Date
}

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  userId: String,
  resourceType: String,
  resourceId: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now }
});

const AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

export async function writeAuditLog(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  await AuditLogModel.create({
    ...entry,
    timestamp: new Date()
  });
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
  return AuditLogModel
    .find(q)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}
