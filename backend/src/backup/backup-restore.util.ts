import { Types } from 'mongoose';

const OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/;

export function isObjectIdHex(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_HEX.test(value);
}

/** Convert a backup JSON value to BSON-friendly ObjectId where appropriate. */
export function toRestoreValue(value: unknown): unknown {
  if (value == null) return value;
  if (isObjectIdHex(value)) return new Types.ObjectId(value);
  if (Array.isArray(value)) return value.map((item) => toRestoreValue(item));
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$oid === 'string' && OBJECT_ID_HEX.test(obj.$oid)) {
      return new Types.ObjectId(obj.$oid);
    }
    if (typeof obj.$date === 'string') {
      return new Date(obj.$date);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = toRestoreValue(v);
    }
    return out;
  }
  return value;
}

const REF_FIELDS_BY_COLLECTION: Record<string, string[]> = {
  albums: ['parentAlbumId', 'coverPhotoId', 'createdBy'],
  photos: ['albumId', 'uploadedBy', 'location'],
  pages: ['createdBy', 'updatedBy'],
  page_modules: ['pageId'],
  groups: [],
  users: [],
  tags: [],
  people: [],
  locations: [],
  themes: ['modifiedBy'],
  templateconfigs: ['modifiedBy', 'templateId'],
  blogarticles: ['categoryId', 'authorId'],
  blogcategories: [],
  albumcomments: ['albumId', 'photoId', 'userId', 'parentCommentId'],
  albumtasks: ['albumId', 'assignedTo', 'createdBy'],
  collaborationactivities: ['albumId', 'userId', 'photoId'],
  inappnotifications: ['userId', 'albumId', 'photoId'],
  analytics_events: ['userId', 'resourceId'],
  apikeys: ['userId'],
  contactsubmissions: [],
  audit_logs: ['userId', 'resourceId'],
  auditlogs: ['userId', 'resourceId'],
  sessions: ['userId'],
};

const ARRAY_REF_FIELDS_BY_COLLECTION: Record<string, string[]> = {
  albums: ['tags', 'allowedUsers'],
  photos: ['tags', 'people'],
  users: ['groupAliases'],
};

function convertRefFields(collectionName: string, doc: Record<string, unknown>): Record<string, unknown> {
  const out = { ...doc };

  for (const field of REF_FIELDS_BY_COLLECTION[collectionName] ?? []) {
    if (field in out && out[field] != null) {
      out[field] = toRestoreValue(out[field]);
    }
  }

  for (const field of ARRAY_REF_FIELDS_BY_COLLECTION[collectionName] ?? []) {
    if (!Array.isArray(out[field])) continue;
    out[field] = (out[field] as unknown[]).map((item) => toRestoreValue(item));
  }

  return out;
}

/** Prepare a single document from JSON backup for MongoDB insert. */
export function documentForRestore(collectionName: string, doc: Record<string, unknown>): Record<string, unknown> {
  const withId = {
    ...doc,
    _id: doc._id != null ? new Types.ObjectId(String(doc._id)) : doc._id,
  };
  return convertRefFields(collectionName, withId);
}
