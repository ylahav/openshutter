import { Controller, Get, InternalServerErrorException, Logger, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard';
import { connectDB } from '../config/db';
import mongoose from 'mongoose';

function resolveStorageQuotaBytes(config: ConfigService): number | null {
	const rawBytes = config.get<string>('STORAGE_QUOTA_BYTES')?.trim();
	if (rawBytes) {
		const n = Number(rawBytes);
		if (Number.isFinite(n) && n > 0) return n;
	}
	const rawGb = config.get<string>('STORAGE_QUOTA_GB')?.trim();
	if (rawGb) {
		const g = Number(rawGb);
		if (Number.isFinite(g) && g > 0) return Math.round(g * 1024 * 1024 * 1024);
	}
	return null;
}

function pickCoverImageUrl(photo: any): string | null {
	if (!photo?.storage) return null;
	const thumbs = photo.storage.thumbnails;
	if (thumbs && typeof thumbs === 'object') {
		for (const k of ['medium', 'small', 'large']) {
			const u = thumbs[k];
			if (typeof u === 'string' && u) return u;
		}
		const first = Object.values(thumbs).find((v) => typeof v === 'string') as string | undefined;
		if (first) return first;
	}
	const tp = photo.storage.thumbnailPath;
	if (typeof tp === 'string' && tp.startsWith('/')) return tp;
	const url = photo.storage.url;
	if (typeof url === 'string' && url) return url;
	return null;
}

@Controller('admin/dashboard')
@UseGuards(AdminOrOwnerGuard)
export class AdminDashboardController {
	private readonly logger = new Logger(AdminDashboardController.name);

	constructor(private readonly configService: ConfigService) {}

	@Get()
	async getDashboardSummary(@Req() req: Request) {
		try {
			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new InternalServerErrorException('Database connection not established');

			const albums = db.collection('albums');
			const photos = db.collection('photos');

			const publishedFilter = { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] };

			// Owners see stats scoped to content they created; admins see the whole site.
			// Photos have no direct owner field — derive via albumId ∈ { albums.createdBy = ownerId }.
			const user = (req as any).user as { id?: string; role?: string } | undefined;
			const isOwnerScoped = user?.role === 'owner' && !!user.id && mongoose.Types.ObjectId.isValid(user.id);
			const ownerAlbumFilter: Record<string, unknown> = isOwnerScoped
				? { createdBy: new mongoose.Types.ObjectId(user!.id!) }
				: {};
			const ownerAlbumIds: mongoose.Types.ObjectId[] = isOwnerScoped
				? ((await albums
						.find(ownerAlbumFilter, { projection: { _id: 1 } })
						.toArray()) as { _id: mongoose.Types.ObjectId }[]).map((a) => a._id)
				: [];
			const ownerPhotoFilter: Record<string, unknown> = isOwnerScoped
				? { albumId: { $in: ownerAlbumIds } }
				: {};
			const withOwner = (filter: Record<string, unknown>) =>
				isOwnerScoped ? { $and: [ownerAlbumFilter, filter] } : filter;

			const [
				totalPhotos,
				totalAlbums,
				publishedAlbums,
				publicAlbums,
				featuredAlbums,
				tagAgg,
				storageAgg,
			] = await Promise.all([
				isOwnerScoped && ownerAlbumIds.length === 0
					? Promise.resolve(0)
					: photos.countDocuments(ownerPhotoFilter),
				albums.countDocuments(ownerAlbumFilter),
				albums.countDocuments(withOwner(publishedFilter as Record<string, unknown>)),
				albums.countDocuments(withOwner({ isPublic: true })),
				albums.countDocuments(withOwner({ isFeatured: true })),
				(isOwnerScoped && ownerAlbumIds.length === 0
					? Promise.resolve([] as { total: number }[])
					: photos
							.aggregate<{ total: number }>([
								...(isOwnerScoped ? [{ $match: ownerPhotoFilter }] : []),
								{ $project: { n: { $size: { $ifNull: ['$tags', []] } } } },
								{ $group: { _id: null, total: { $sum: '$n' } } },
							])
							.toArray()),
				(isOwnerScoped && ownerAlbumIds.length === 0
					? Promise.resolve([] as { bytes: number }[])
					: photos
							.aggregate<{ bytes: number }>([
								...(isOwnerScoped ? [{ $match: ownerPhotoFilter }] : []),
								{ $group: { _id: null, bytes: { $sum: { $ifNull: ['$size', 0] } } } },
							])
							.toArray()),
			]);

			const tagsApplied = tagAgg[0]?.total ?? 0;
			const usedBytes = storageAgg[0]?.bytes ?? 0;

			const rawRecent = await albums
				.find(
					ownerAlbumFilter,
					{
						sort: { updatedAt: -1 },
						limit: 5,
						projection: {
							_id: 1,
							name: 1,
							alias: 1,
							photoCount: 1,
							level: 1,
							isPublished: 1,
							coverPhotoId: 1,
						},
					},
				)
				.toArray();

			const coverIds = rawRecent.map((a) => a.coverPhotoId).filter(Boolean) as mongoose.Types.ObjectId[];
			let coverPhotos: any[] = [];
			if (coverIds.length > 0) {
				coverPhotos = await photos
					.find({ _id: { $in: coverIds } }, { projection: { storage: 1 } })
					.toArray();
			}
			const coverById = new Map(coverPhotos.map((p) => [p._id.toString(), p]));

			const recentAlbums = rawRecent.map((a) => {
				const cid = a.coverPhotoId?.toString?.() ?? null;
				const p = cid ? coverById.get(cid) : null;
				return {
					_id: a._id.toString(),
					alias: typeof a.alias === 'string' ? a.alias : '',
					name: a.name,
					photoCount: typeof a.photoCount === 'number' ? a.photoCount : 0,
					level: typeof a.level === 'number' ? a.level : 0,
					isPublished: a.isPublished !== false,
					coverImageUrl: p ? pickCoverImageUrl(p) : null,
				};
			});

			const alerts: { id: string; fixPath: string }[] = [];
			if (featuredAlbums === 0 && publishedAlbums > 0) {
				alerts.push({ id: 'no_featured', fixPath: '/admin/albums' });
			}

			const quotaBytes = isOwnerScoped ? null : resolveStorageQuotaBytes(this.configService);

			return {
				stats: {
					totalPhotos,
					totalAlbums,
					publishedAlbums,
					publicAlbums,
					featuredAlbums,
					tagsApplied,
				},
				alerts,
				recentAlbums,
				storage: {
					usedBytes,
					quotaBytes,
				},
			};
		} catch (e) {
			this.logger.error('Dashboard summary failed', e);
			if (e instanceof InternalServerErrorException) throw e;
			throw new InternalServerErrorException('Failed to load dashboard summary');
		}
	}
}
