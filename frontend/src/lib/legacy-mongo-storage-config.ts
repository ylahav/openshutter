/**
 * Narrow Mongo-style types for legacy storage config code that still calls
 * `connectToDatabase()` (stub always throws). Use with `db: unknown` from the stub.
 */
type StorageConfigsCollection = {
	find: (filter: Record<string, unknown>) => {
		toArray: () => Promise<unknown[]>
	}
	updateOne: (
		filter: Record<string, unknown>,
		update: Record<string, unknown>
	) => Promise<{ matchedCount: number }>
	bulkWrite: (operations: unknown[]) => Promise<unknown>
	insertMany: (docs: unknown[]) => Promise<unknown>
}

export function getStorageConfigsCollection(db: unknown): StorageConfigsCollection {
	return (db as { collection: (name: string) => StorageConfigsCollection }).collection(
		'storage_configs'
	)
}
