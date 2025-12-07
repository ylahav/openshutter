// Stub file - MongoDB connections are now handled by the NestJS backend
// This file exists to prevent build errors for legacy service files that aren't used in active routes

export async function connectToDatabase(): Promise<{ client: any; db: any }> {
	throw new Error(
		'MongoDB direct connections are no longer supported. Use the NestJS backend API instead.'
	);
}

export async function closeDatabaseConnection(): Promise<void> {
	// No-op
}

export async function connectMongoose() {
	throw new Error(
		'Mongoose connections are no longer supported. Use the NestJS backend API instead.'
	);
}

export default Promise.resolve(null);
