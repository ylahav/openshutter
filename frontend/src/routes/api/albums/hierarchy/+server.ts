import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

interface AlbumNode {
	_id: string;
	name: string;
	alias: string;
	description?: string;
	isPublic: boolean;
	isFeatured: boolean;
	storageProvider: string;
	storagePath: string;
	level: number;
	order: number;
	photoCount: number;
	createdBy: string;
	children?: AlbumNode[];
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const { db } = await connectToDatabase();
		const searchParams = url.searchParams;

		const includePrivate = searchParams.get('includePrivate') === 'true';
		const storageProvider = searchParams.get('storageProvider');

		// Build query
		const query: any = {};

		if (!includePrivate) {
			query.isPublic = true;
		}

		if (storageProvider) {
			query.storageProvider = storageProvider;
		}

		// Get all albums using native MongoDB driver
		const collection = db.collection('albums');
		const albums = await collection
			.find(query)
			.sort({ level: 1, order: 1, name: 1 })
			.project({
				_id: 1,
				name: 1,
				alias: 1,
				description: 1,
				isPublic: 1,
				isFeatured: 1,
				storageProvider: 1,
				storagePath: 1,
				parentAlbumId: 1,
				level: 1,
				order: 1,
				photoCount: 1,
				createdBy: 1
			})
			.toArray();

		// Build hierarchy tree
		const buildTree = (parentId: string | null = null): AlbumNode[] => {
			const nodes: AlbumNode[] = [];

			for (const album of albums) {
				const albumParentId = album.parentAlbumId
					? album.parentAlbumId instanceof ObjectId
						? album.parentAlbumId.toString()
						: String(album.parentAlbumId)
					: null;
				const compareParentId = parentId ? String(parentId) : null;

				if (albumParentId === compareParentId) {
					const node: AlbumNode = {
						_id: album._id instanceof ObjectId ? album._id.toString() : String(album._id),
						name: album.name,
						alias: album.alias,
						description: album.description,
						isPublic: album.isPublic,
						isFeatured: album.isFeatured,
						storageProvider: album.storageProvider,
						storagePath: album.storagePath,
						level: album.level,
						order: album.order,
						photoCount: album.photoCount || 0,
						createdBy:
							album.createdBy instanceof ObjectId
								? album.createdBy.toString()
								: String(album.createdBy),
						children: buildTree(album._id)
					};
					nodes.push(node);
				}
			}

			return nodes.sort((a, b) => a.order - b.order);
		};

		const tree = buildTree();

		return json({
			success: true,
			data: tree
		});
	} catch (error) {
		console.error('Failed to get album hierarchy:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album hierarchy: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
