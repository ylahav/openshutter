import { Injectable, Logger } from '@nestjs/common';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';

export interface SearchFilters {
	q?: string;
	type?: 'photos' | 'albums' | 'people' | 'locations' | 'all';
	page?: number;
	limit?: number;
	albumId?: string;
	tags?: string[];
	people?: string[];
	locationIds?: string[];
	dateFrom?: string;
	dateTo?: string;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
	photos: any[];
	albums: any[];
	people: any[];
	locations: any[];
	totalPhotos: number;
	totalAlbums: number;
	totalPeople: number;
	totalLocations: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

@Injectable()
export class SearchService {
	private readonly logger = new Logger(SearchService.name);

	async search(filters: SearchFilters): Promise<SearchResult> {
		await connectDB();
		const db = mongoose.connection.db;
		if (!db) throw new Error('Database connection not established');

		const page = Math.max(1, filters.page ?? 1);
		const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
		const type = filters.type || 'photos';
		const skip = (page - 1) * limit;

		const result: SearchResult = {
			photos: [],
			albums: [],
			people: [],
			locations: [],
			totalPhotos: 0,
			totalAlbums: 0,
			totalPeople: 0,
			totalLocations: 0,
			page,
			limit,
			hasMore: false,
		};

		const run = type === 'all' || type === 'photos';
		if (run) {
			const { photos, total } = await this.searchPhotos(db, filters, skip, limit);
			result.photos = photos;
			result.totalPhotos = total;
			result.hasMore = skip + photos.length < total;
		}

		if (type === 'all' || type === 'albums') {
			const albumsLimit = type === 'all' ? 10 : limit;
			const { albums, total } = await this.searchAlbums(db, filters.q, albumsLimit);
			result.albums = albums;
			result.totalAlbums = total;
		}

		if (type === 'all' || type === 'people') {
			const peopleLimit = type === 'all' ? 10 : limit;
			const { people, total } = await this.searchPeople(db, filters.q, peopleLimit);
			result.people = people;
			result.totalPeople = total;
		}

		if (type === 'all' || type === 'locations') {
			const locationsLimit = type === 'all' ? 10 : limit;
			const { locations, total } = await this.searchLocations(db, filters.q, locationsLimit);
			result.locations = locations;
			result.totalLocations = total;
		}

		return result;
	}

	private async searchPhotos(
		db: mongoose.mongo.Db,
		filters: SearchFilters,
		skip: number,
		limit: number,
	): Promise<{ photos: any[]; total: number }> {
		const match: any = { isPublished: true };

		if (filters.albumId) {
			try {
				match.albumId = new Types.ObjectId(filters.albumId);
			} catch {
				// invalid id, skip filter
			}
		}

		if (filters.tags && filters.tags.length > 0) {
			const tagIds = filters.tags
				.map((id) => {
					try {
						return new Types.ObjectId(id);
					} catch {
						return null;
					}
				})
				.filter(Boolean);
			if (tagIds.length > 0) match.tags = { $in: tagIds };
		}

		if (filters.people && filters.people.length > 0) {
			const peopleIds = filters.people
				.map((id) => {
					try {
						return new Types.ObjectId(id);
					} catch {
						return null;
					}
				})
				.filter(Boolean);
			if (peopleIds.length > 0) match.people = { $in: peopleIds };
		}

		if (filters.locationIds && filters.locationIds.length > 0) {
			const locationObjectIds = filters.locationIds
				.map((id) => {
					try {
						return new Types.ObjectId(id);
					} catch {
						return null;
					}
				})
				.filter(Boolean);
			if (locationObjectIds.length > 0) {
				match.location = locationObjectIds.length === 1 ? locationObjectIds[0] : { $in: locationObjectIds };
			}
		}

		if (filters.dateFrom || filters.dateTo) {
			const dateField = 'uploadedAt'; // or exif.dateTime if we add $expr
			const range: any = {};
			if (filters.dateFrom) {
				range.$gte = new Date(filters.dateFrom);
			}
			if (filters.dateTo) {
				range.$lte = new Date(filters.dateTo);
			}
			if (Object.keys(range).length > 0) match[dateField] = range;
		}

		const { SUPPORTED_LANGUAGES } = await import('../types/multi-lang');
		const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
		let textMatch: any = null;
		if (filters.q && filters.q.trim()) {
			const q = filters.q.trim();
			const titleDesc = ['title', 'description'].flatMap((f) =>
				langs.map((code) => ({ [`${f}.${code}`]: { $regex: q, $options: 'i' } })),
			);
			textMatch = {
				$or: [
					...titleDesc,
					{ filename: { $regex: q, $options: 'i' } },
					{ originalFilename: { $regex: q, $options: 'i' } },
				],
			};
		}

		const sortField = filters.sortBy === 'date' ? 'uploadedAt' : 'uploadedAt';
		const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

		const pipeline: any[] = [{ $match: match }];
		if (textMatch) pipeline.push({ $match: textMatch });

		const facetStage: any = {
			photos: [
				{ $sort: { [sortField]: sortOrder } },
				{ $skip: skip },
				{ $limit: limit },
				{
					$lookup: {
						from: 'albums',
						localField: 'albumId',
						foreignField: '_id',
						as: 'album',
						pipeline: [{ $project: { name: 1, alias: 1 } }],
					},
				},
				{
					$lookup: {
						from: 'tags',
						localField: 'tags',
						foreignField: '_id',
						as: 'tagsDocs',
					},
				},
				{
					$lookup: {
						from: 'people',
						localField: 'people',
						foreignField: '_id',
						as: 'peopleDocs',
					},
				},
				{
					$lookup: {
						from: 'locations',
						localField: 'location',
						foreignField: '_id',
						as: 'locationDoc',
					},
				},
			],
			total: [{ $count: 'count' }],
		};
		pipeline.push({ $facet: facetStage });

		const out = await db.collection('photos').aggregate(pipeline).toArray();
		const facetResult = out[0] as { photos?: any[]; total?: { count: number }[] } | undefined;
		const photos = (facetResult?.photos ?? []) as any[];
		const total = facetResult?.total?.[0]?.count ?? 0;

		// Serialize ObjectIds for JSON
		const serialized = photos.map((p) => ({
			...p,
			_id: p._id?.toString(),
			albumId: p.albumId?.toString(),
			tags: Array.isArray(p.tags) ? p.tags.map((t: any) => (t?.toString?.() ?? t)) : [],
			people: Array.isArray(p.people) ? p.people.map((p2: any) => (p2?.toString?.() ?? p2)) : [],
			location: p.location?.toString?.() ?? p.location,
			uploadedBy: p.uploadedBy?.toString?.() ?? p.uploadedBy,
		}));

		return { photos: serialized, total };
	}

	private async searchAlbums(db: mongoose.mongo.Db, q?: string, limitCount = 20): Promise<{ albums: any[]; total: number }> {
		const match: any = { isPublic: true };
		if (q && q.trim()) {
			const { SUPPORTED_LANGUAGES } = await import('../types/multi-lang');
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
			const conds = [
				...langs.map((code) => ({ [`name.${code}`]: { $regex: q.trim(), $options: 'i' } })),
				...langs.map((code) => ({ [`description.${code}`]: { $regex: q.trim(), $options: 'i' } })),
				{ alias: { $regex: q.trim(), $options: 'i' } },
			];
			match.$or = conds;
		}
		const [albums, total] = await Promise.all([
			db.collection('albums').find(match).sort({ updatedAt: -1 }).limit(limitCount).toArray(),
			db.collection('albums').countDocuments(match),
		]);
		const serialized = albums.map((a) => ({
			...a,
			_id: a._id?.toString(),
			parentAlbumId: a.parentAlbumId?.toString(),
			coverPhotoId: a.coverPhotoId?.toString(),
		}));
		return { albums: serialized, total };
	}

	private async searchPeople(db: mongoose.mongo.Db, q?: string, limitCount = 20): Promise<{ people: any[]; total: number }> {
		const match: any = {};
		if (q && q.trim()) {
			const { SUPPORTED_LANGUAGES } = await import('../types/multi-lang');
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
			const fields = ['firstName', 'lastName', 'fullName', 'nickname'];
			const conds = fields.flatMap((f) => langs.map((code) => ({ [`${f}.${code}`]: { $regex: q.trim(), $options: 'i' } })));
			match.$or = conds;
		}
		const [people, total] = await Promise.all([
			db.collection('people').find(match).sort({ updatedAt: -1 }).limit(limitCount).toArray(),
			db.collection('people').countDocuments(match),
		]);
		const serialized = people.map((p) => ({ ...p, _id: p._id?.toString() }));
		return { people: serialized, total };
	}

	private async searchLocations(db: mongoose.mongo.Db, q?: string, limitCount = 20): Promise<{ locations: any[]; total: number }> {
		const match: any = {};
		if (q && q.trim()) {
			const { SUPPORTED_LANGUAGES } = await import('../types/multi-lang');
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
			const conds = [
				...langs.map((code) => ({ [`name.${code}`]: { $regex: q.trim(), $options: 'i' } })),
				{ address: { $regex: q.trim(), $options: 'i' } },
				{ city: { $regex: q.trim(), $options: 'i' } },
				{ country: { $regex: q.trim(), $options: 'i' } },
			];
			match.$or = conds;
		}
		const [locations, total] = await Promise.all([
			db.collection('locations').find(match).sort({ updatedAt: -1 }).limit(limitCount).toArray(),
			db.collection('locations').countDocuments(match),
		]);
		const serialized = locations.map((l) => ({ ...l, _id: l._id?.toString() }));
		return { locations: serialized, total };
	}
}
