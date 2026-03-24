import { Injectable, Logger } from '@nestjs/common';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { AlbumsService, type AlbumAccessContext } from '../albums/albums.service';
import { SiteConfigService } from '../services/site-config';

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
	private readonly siteConfigService = SiteConfigService.getInstance();

	constructor(private readonly albumsService: AlbumsService) {}

	async search(filters: SearchFilters, accessContext?: AlbumAccessContext | null): Promise<SearchResult> {
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
			const { photos, total } = await this.searchPhotos(db, filters, skip, limit, accessContext);
			result.photos = photos;
			result.totalPhotos = total;
			result.hasMore = skip + photos.length < total;
		}

		if (type === 'all' || type === 'albums') {
			const albumsLimit = type === 'all' ? 10 : limit;
			const { albums, total } = await this.searchAlbums(db, filters.q, albumsLimit, accessContext);
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
		accessContext?: AlbumAccessContext | null,
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

		// Add relevance scoring for tag-based queries
		const hasTagFilter = filters.tags && filters.tags.length > 0;
		let tagIdsForScoring: Types.ObjectId[] = [];
		if (hasTagFilter && filters.tags) {
			tagIdsForScoring = filters.tags
				.map((id) => {
					try {
						return new Types.ObjectId(id);
					} catch {
						return null;
					}
				})
				.filter((id): id is Types.ObjectId => id !== null);
		}
		let tagFeedbackBoostByTagId = new Map<string, number>();
		if (hasTagFilter && tagIdsForScoring.length > 0) {
			tagFeedbackBoostByTagId = await this.getTagFeedbackBoostByTagId(db, tagIdsForScoring);
		}

		const pipeline: any[] = [{ $match: match }];
		if (textMatch) pipeline.push({ $match: textMatch });

		// Add relevance scoring for tag-based queries
		if (hasTagFilter && tagIdsForScoring.length > 0) {
			const feedbackBoostExpression = this.buildTagFeedbackBoostExpression(tagIdsForScoring, tagFeedbackBoostByTagId);
			pipeline.push({
				$addFields: {
					relevanceScore: {
						$add: [
							// Base score: number of matching tags
							{
								$size: {
									$setIntersection: ['$tags', tagIdsForScoring],
								},
							},
							// Bonus for album match (if filtering by album)
							...(filters.albumId
								? [
										{
											$cond: [
												{ $eq: ['$albumId', new Types.ObjectId(filters.albumId)] },
												0.2,
												0,
											],
										},
									]
								: []),
							// Bonus for location match (if filtering by location)
							...(filters.locationIds && filters.locationIds.length > 0
								? [
										{
											$cond: [
												{
													$in: [
														'$location',
														filters.locationIds
															.map((id) => {
																try {
																	return new Types.ObjectId(id);
																} catch {
																	return null;
																}
															})
															.filter(Boolean),
													],
												},
												0.2,
												0,
											],
										},
									]
								: []),
							feedbackBoostExpression,
						],
					},
				},
			});
		}

		// Restrict to photos in albums the user can access
		const visibilityCondition = this.albumsService.getVisibilityCondition(accessContext ?? null);
		pipeline.push({
			$lookup: {
				from: 'albums',
				localField: 'albumId',
				foreignField: '_id',
				as: 'album',
				pipeline: [{ $match: visibilityCondition }],
			},
		});
		pipeline.push({ $match: { 'album.0': { $exists: true } } });
		pipeline.push({ $unwind: '$album' });

		const facetStage: any = {
			photos: [
				// Sort by relevance score first (if tag filter exists), then by sortField
				...(hasTagFilter && tagIdsForScoring && tagIdsForScoring.length > 0
					? [{ $sort: { relevanceScore: -1, [sortField]: sortOrder } }]
					: [{ $sort: { [sortField]: sortOrder } }]),
				{ $skip: skip },
				{ $limit: limit },
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

	private async getTagFeedbackBoostByTagId(
		db: mongoose.mongo.Db,
		tagIds: Types.ObjectId[],
	): Promise<Map<string, number>> {
		try {
			const config = await this.siteConfigService.getConfig();
			if (!config.features?.enableTagFeedbackSearchBoost) {
				return new Map<string, number>();
			}
			const idStrings = tagIds.map((id) => id.toString());
			const rows = await db
				.collection('tag_feedback')
				.aggregate([
					{
						$match: {
							tagId: { $in: idStrings },
							action: { $in: ['applied', 'dismissed'] },
						},
					},
					{
						$group: {
							_id: { tagId: '$tagId', action: '$action' },
							count: { $sum: 1 },
						},
					},
				])
				.toArray();

			const countsByTag = new Map<string, { applied: number; dismissed: number }>();
			for (const row of rows as Array<{ _id?: { tagId?: string; action?: string }; count?: number }>) {
				const tagId = row._id?.tagId;
				if (!tagId) continue;
				const current = countsByTag.get(tagId) || { applied: 0, dismissed: 0 };
				if (row._id?.action === 'applied') current.applied += Number(row.count || 0);
				if (row._id?.action === 'dismissed') current.dismissed += Number(row.count || 0);
				countsByTag.set(tagId, current);
			}

			const boosts = new Map<string, number>();
			for (const tagId of idStrings) {
				const counts = countsByTag.get(tagId) || { applied: 0, dismissed: 0 };
				const total = counts.applied + counts.dismissed;
				if (total === 0) {
					boosts.set(tagId, 0);
					continue;
				}
				const ratio = counts.applied / total; // 0..1
				// Center at 0.5 and keep boost modest to avoid overpowering base relevance.
				const centered = (ratio - 0.5) * 0.4; // range ~[-0.2, +0.2]
				boosts.set(tagId, Number(centered.toFixed(4)));
			}
			return boosts;
		} catch (error) {
			this.logger.warn(
				`Failed to compute tag feedback boost, using base relevance only: ${error instanceof Error ? error.message : String(error)}`,
			);
			return new Map<string, number>();
		}
	}

	private buildTagFeedbackBoostExpression(
		tagIdsForScoring: Types.ObjectId[],
		boostByTagId: Map<string, number>,
	): Record<string, unknown> {
		if (!boostByTagId || boostByTagId.size === 0) return { $literal: 0 };
		const branches = tagIdsForScoring.map((tagId) => ({
			case: { $eq: ['$$matchedTag', tagId] },
			then: boostByTagId.get(tagId.toString()) || 0,
		}));
		return {
			$sum: {
				$map: {
					input: { $setIntersection: ['$tags', tagIdsForScoring] },
					as: 'matchedTag',
					in: {
						$switch: {
							branches,
							default: 0,
						},
					},
				},
			},
		};
	}

	private async searchAlbums(
		db: mongoose.mongo.Db,
		q?: string,
		limitCount = 20,
		accessContext?: AlbumAccessContext | null,
	): Promise<{ albums: any[]; total: number }> {
		const visibilityCondition = this.albumsService.getVisibilityCondition(accessContext ?? null);
		const match: any = { $and: [visibilityCondition] };
		if (q && q.trim()) {
			const { SUPPORTED_LANGUAGES } = await import('../types/multi-lang');
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
			const conds = [
				...langs.map((code) => ({ [`name.${code}`]: { $regex: q.trim(), $options: 'i' } })),
				...langs.map((code) => ({ [`description.${code}`]: { $regex: q.trim(), $options: 'i' } })),
				{ alias: { $regex: q.trim(), $options: 'i' } },
			];
			match.$and.push({ $or: conds });
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
