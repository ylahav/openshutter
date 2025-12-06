import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import { buildAlbumAccessQuery } from '$lib/access-control-server';
import { PersonModel } from '$lib/models/Person';
import { TagModel } from '$lib/models/Tag';
import { LocationModel } from '$lib/models/Location';
import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const { db } = await connectToDatabase();
		await connectMongoose();

		const searchParams = url.searchParams;

		// Get search parameters
		const query = searchParams.get('q') || '';
		const type = searchParams.get('type') || 'all'; // 'photos', 'albums', 'people', 'locations', 'all'
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '20');
		const sortBy = searchParams.get('sortBy') || 'relevance';
		const sortOrder = searchParams.get('sortOrder') || 'desc';

		// Filter parameters
		const tagIds =
			searchParams
				.get('tags')
				?.split(',')
				.filter(Boolean)
				.map((id) => new ObjectId(id)) || [];
		const albumId = searchParams.get('albumId');
		const peopleIds =
			searchParams
				.get('people')
				?.split(',')
				.filter(Boolean)
				.map((id) => new ObjectId(id)) || [];
		const locationIds =
			searchParams
				.get('locationIds')
				?.split(',')
				.filter(Boolean)
				.map((id) => new ObjectId(id)) || [];
		const locationId = searchParams.get('locationId'); // Keep for backward compatibility
		const dateFrom = searchParams.get('dateFrom');
		const dateTo = searchParams.get('dateTo');
		const storageProvider = searchParams.get('storageProvider');
		const isPublicParam = searchParams.get('isPublic');
		const isPublic = isPublicParam === '' || isPublicParam === null ? null : isPublicParam;
		const mine = searchParams.get('mine') === 'true';

		// Get current user from locals (set by authentication middleware)
		const user = locals.user
			? {
					id: locals.user._id || locals.user.id,
					email: locals.user.email,
					name: locals.user.name,
					role: locals.user.role || 'guest'
				}
			: null;

		const results: any = {
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
			hasMore: false
		};

		// Search photos
		if (type === 'photos' || type === 'all') {
			let photoQuery: any = { isPublished: true };

			// If there's a search query, find matching people, tags, and locations first
			const matchingPersonIds: ObjectId[] = [];
			const matchingTagIds: ObjectId[] = [];
			const matchingLocationIds: ObjectId[] = [];

			if (query && query.trim()) {
				// Search for matching people
				const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
				const personFields = ['firstName', 'lastName', 'fullName', 'nickname'];
				const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const personConds = personFields.flatMap((f) =>
					langs.map((code) => ({
						[`${f}.${code}`]: { $regex: escapedQuery, $options: 'i' }
					}))
				);
				const personStringConds = personFields.map((f) => ({
					[f]: { $regex: escapedQuery, $options: 'i' }
				}));
				const fullNameCombinedConds = [
					...langs.map((code) => ({ [`fullName.${code}`]: { $regex: escapedQuery, $options: 'i' } })),
					{ fullName: { $regex: escapedQuery, $options: 'i' } }
				];
				const queryWords = query.trim().split(/\s+/).filter((w) => w.length > 0);
				const fullNameWordConds = queryWords.flatMap((word) => {
					const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					return [
						...langs.map((code) => ({ [`fullName.${code}`]: { $regex: escapedWord, $options: 'i' } })),
						{ fullName: { $regex: escapedWord, $options: 'i' } }
					];
				});
				const partialMatchConds = personFields.flatMap((f) => [
					...langs.map((code) => ({
						[`${f}.${code}`]: { $regex: `^${escapedQuery}`, $options: 'i' }
					})),
					{
						[f]: { $regex: `^${escapedQuery}`, $options: 'i' }
					}
				]);

				const allPersonConds = [
					...personConds,
					...personStringConds,
					...fullNameCombinedConds,
					...fullNameWordConds,
					...partialMatchConds
				];

				const matchingPeople = await PersonModel.find({
					$or: allPersonConds
				})
					.select('_id firstName lastName fullName')
					.lean();

				matchingPersonIds.push(...matchingPeople.map((p: any) => new ObjectId(String(p._id))));

				// Search for matching tags
				const tagConds = langs.map((code) => ({ [`name.${code}`]: { $regex: query, $options: 'i' } }));
				const matchingTags = await TagModel.find({
					$or: [...tagConds, { name: { $regex: query, $options: 'i' } }]
				})
					.select('_id')
					.lean();
				matchingTagIds.push(...matchingTags.map((t: any) => new ObjectId(String(t._id))));

				// Search for matching locations
				const locationNameConds = langs.map((code) => ({
					[`name.${code}`]: { $regex: query, $options: 'i' }
				}));
				const matchingLocations = await LocationModel.find({
					$or: [
						...locationNameConds,
						{ name: { $regex: query, $options: 'i' } },
						{ address: { $regex: query, $options: 'i' } },
						{ city: { $regex: query, $options: 'i' } },
						{ country: { $regex: query, $options: 'i' } }
					]
				})
					.select('_id')
					.lean();
				matchingLocationIds.push(...matchingLocations.map((l: any) => new ObjectId(String(l._id))));

				// Build photo query
				const photoOrConditions: any[] = [];

				if (matchingPersonIds.length > 0) {
					const personIdStrings = matchingPersonIds.map((id) => String(id));
					photoOrConditions.push({ people: { $in: matchingPersonIds } });
					photoOrConditions.push({ people: { $in: personIdStrings } });
					matchingPersonIds.forEach((personId) => {
						photoOrConditions.push({ people: personId });
						photoOrConditions.push({ people: String(personId) });
					});
				}
				if (matchingTagIds.length > 0) {
					const tagIdStrings = matchingTagIds.map((id) => String(id));
					photoOrConditions.push({ tags: { $in: matchingTagIds } });
					photoOrConditions.push({ tags: { $in: tagIdStrings } });
				}
				if (matchingLocationIds.length > 0) {
					const locationIdStrings = matchingLocationIds.map((id) => String(id));
					photoOrConditions.push({ location: { $in: matchingLocationIds } });
					photoOrConditions.push({ location: { $in: locationIdStrings } });
					matchingLocationIds.forEach((id) => {
						photoOrConditions.push({ location: id });
						photoOrConditions.push({ location: String(id) });
					});
				}

				// Also search in photo's own text fields
				const photoTextConds = langs
					.map((code) => [
						{ [`title.${code}`]: { $regex: query, $options: 'i' } },
						{ [`description.${code}`]: { $regex: query, $options: 'i' } }
					])
					.flat();
				photoTextConds.push(
					{ title: { $regex: query, $options: 'i' } },
					{ description: { $regex: query, $options: 'i' } },
					{ filename: { $regex: query, $options: 'i' } },
					{ originalFilename: { $regex: query, $options: 'i' } }
				);
				photoOrConditions.push(...photoTextConds);

				if (photoOrConditions.length > 0) {
					photoQuery = {
						$and: [{ isPublished: true }, { $or: photoOrConditions }]
					};
				}
			}

			// Apply additional filters
			const additionalFilters: any[] = [];

			if (tagIds.length > 0) {
				additionalFilters.push({ tags: { $in: tagIds } });
			}

			if (albumId) {
				const getAllChildAlbumIds = async (parentId: string | ObjectId): Promise<ObjectId[]> => {
					const parentObjectId = typeof parentId === 'string' ? new ObjectId(parentId) : parentId;
					const childAlbums = await db
						.collection('albums')
						.find({
							$or: [{ parentAlbumId: parentObjectId }, { parentAlbumId: parentId.toString() }]
						})
						.project({ _id: 1 })
						.toArray();

					let allIds: ObjectId[] = [parentObjectId];
					for (const child of childAlbums) {
						const childIds = await getAllChildAlbumIds(child._id);
						allIds = allIds.concat(childIds);
					}
					return allIds;
				};

				const allAlbumIds = await getAllChildAlbumIds(albumId);
				const albumIdStrings = allAlbumIds.map((id) => String(id));

				additionalFilters.push({
					$or: [{ albumId: { $in: allAlbumIds } }, { albumId: { $in: albumIdStrings } }]
				});
			}

			if (peopleIds.length > 0) {
				const peopleIdStrings = peopleIds.map((id) => String(id));
				const allPeopleIds = [...peopleIds, ...peopleIdStrings];
				additionalFilters.push({
					people: { $in: allPeopleIds }
				});
			}

			const finalLocationIds =
				locationIds.length > 0 ? locationIds : locationId ? [new ObjectId(locationId)] : [];
			if (finalLocationIds.length > 0) {
				const locationIdStrings = finalLocationIds.map((id) => String(id));
				additionalFilters.push({
					$or: [{ location: { $in: finalLocationIds } }, { location: { $in: locationIdStrings } }]
				});
			}

			if (dateFrom || dateTo) {
				const dateFilter: any = {};
				if (dateFrom) {
					const [year, month, day] = dateFrom.split('-').map(Number);
					const fromDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
					dateFilter.$gte = fromDate;
				}
				if (dateTo) {
					const [year, month, day] = dateTo.split('-').map(Number);
					const toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
					dateFilter.$lte = toDate;
				}

				additionalFilters.push({
					$or: [
						{ 'exif.dateTime': dateFilter },
						{ 'exif.dateTimeOriginal': dateFilter },
						{ uploadedAt: dateFilter }
					]
				});
			}

			if (storageProvider) {
				additionalFilters.push({ 'storage.provider': storageProvider });
			}

			if (isPublic !== null) {
				if (photoQuery.$and) {
					photoQuery.$and = photoQuery.$and.filter((cond: any) => !cond.isPublished);
					additionalFilters.push({ isPublished: isPublic === 'true' });
				} else {
					photoQuery.isPublished = isPublic === 'true';
				}
			}

			if (mine && user) {
				additionalFilters.push({ uploadedBy: { $in: [new ObjectId(user.id), user.id] } });
			}

			// Add additional filters to query
			if (additionalFilters.length > 0) {
				if (photoQuery.$and) {
					photoQuery.$and.push(...additionalFilters);
				} else {
					const hasComplexFilters = additionalFilters.some((f: any) => f.$or || f.$and);
					if (Object.keys(photoQuery).length > 1 || hasComplexFilters) {
						const baseQuery = { ...photoQuery };
						photoQuery = {
							$and: [baseQuery, ...additionalFilters]
						};
					} else {
						Object.assign(photoQuery, ...additionalFilters);
					}
				}
			}

			// Get photos with pagination
			const photos = await db
				.collection('photos')
				.find(photoQuery)
				.sort({
					[sortBy === 'date'
						? 'uploadedAt'
						: sortBy === 'filename'
							? 'filename'
							: 'uploadedAt']: sortOrder === 'asc' ? 1 : -1
				})
				.skip((page - 1) * limit)
				.limit(limit)
				.toArray();

			const totalPhotos = await db.collection('photos').countDocuments(photoQuery);

			// Transform photos to ensure thumbnail URLs are properly constructed
			const transformedPhotos = photos.map((photo: any) => {
				if (photo.storage) {
					if (
						photo.storage.thumbnailPath &&
						!photo.storage.thumbnailPath.startsWith('/api/storage/serve/') &&
						!photo.storage.thumbnailPath.startsWith('http')
					) {
						const provider = photo.storage.provider || 'local';
						photo.storage.thumbnailPath = `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.thumbnailPath)}`;
					}
					if (
						photo.storage.url &&
						!photo.storage.url.startsWith('/api/storage/serve/') &&
						!photo.storage.url.startsWith('http')
					) {
						const provider = photo.storage.provider || 'local';
						photo.storage.url = `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.url)}`;
					}
				}
				return photo;
			});

			results.photos = transformedPhotos;
			results.totalPhotos = totalPhotos;
		}

		// Search albums
		if (type === 'albums' || type === 'all') {
			let albumQuery: any = {};

			if (query && query.trim()) {
				const matchingTagIds: ObjectId[] = [];
				const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
				const tagConds = langs.map((code) => ({
					[`name.${code}`]: { $regex: query, $options: 'i' }
				}));
				const matchingTags = await TagModel.find({
					$or: [...tagConds, { name: { $regex: query, $options: 'i' } }]
				})
					.select('_id')
					.lean();
				matchingTagIds.push(...matchingTags.map((t: any) => new ObjectId(String(t._id))));

				const albumOrConditions: any[] = [];

				if (matchingTagIds.length > 0) {
					albumOrConditions.push({ tags: { $in: matchingTagIds } });
				}

				const albumTextConds = [
					{ name: { $regex: query, $options: 'i' } },
					{ description: { $regex: query, $options: 'i' } },
					{ alias: { $regex: query, $options: 'i' } }
				];
				albumOrConditions.push(...albumTextConds);

				if (albumOrConditions.length > 0) {
					albumQuery.$or = albumOrConditions;
				}
			}

			// Apply filters
			if (tagIds.length > 0) {
				if (albumQuery.tags) {
					albumQuery.tags = {
						$in: [...tagIds, ...(Array.isArray(albumQuery.tags.$in) ? albumQuery.tags.$in : [])]
					};
				} else {
					albumQuery.tags = { $in: tagIds };
				}
			}

			if (storageProvider) {
				albumQuery.storageProvider = storageProvider;
			}

			if (isPublic !== null) {
				albumQuery.isPublic = isPublic === 'true';
			}

			if (mine && user) {
				try {
					const userObjectId = new ObjectId(user.id);
					if (albumQuery.$or) {
						albumQuery.$and = [
							{ $or: albumQuery.$or },
							{ $or: [{ createdBy: user.id }, { createdBy: userObjectId }] }
						];
						delete albumQuery.$or;
					} else {
						albumQuery.$or = [{ createdBy: user.id }, { createdBy: userObjectId }];
					}
				} catch {
					if (albumQuery.$or) {
						albumQuery.$and = [{ $or: albumQuery.$or }, { createdBy: user.id }];
						delete albumQuery.$or;
					} else {
						albumQuery.createdBy = user.id;
					}
				}
			}

			// Apply access control for non-admin users
			if (user?.role !== 'admin') {
				const accessQuery = await buildAlbumAccessQuery(user);
				if (albumQuery.$and) {
					albumQuery.$and.push(accessQuery);
				} else {
					albumQuery = { $and: [albumQuery, accessQuery] };
				}
			}

			// Get albums with pagination
			const albums = await db
				.collection('albums')
				.find(albumQuery)
				.sort({
					[sortBy === 'date' ? 'createdAt' : 'name']: sortOrder === 'asc' ? 1 : -1
				})
				.skip((page - 1) * limit)
				.limit(limit)
				.toArray();

			const totalAlbums = await db.collection('albums').countDocuments(albumQuery);

			results.albums = albums;
			results.totalAlbums = totalAlbums;
		}

		// Search people
		if (type === 'people' || type === 'all') {
			let peopleQuery: any = {};

			if (query) {
				const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
				const fields = ['firstName', 'lastName', 'fullName', 'nickname'];
				const multilingualConds = fields.flatMap((f) =>
					langs.map((code) => ({ [`${f}.${code}`]: { $regex: query, $options: 'i' } }))
				);
				const stringConds = fields.map((f) => ({ [f]: { $regex: query, $options: 'i' } }));
				const descConds = langs.map((code) => ({
					[`description.${code}`]: { $regex: query, $options: 'i' }
				}));
				const descString = { description: { $regex: query, $options: 'i' } };
				peopleQuery.$or = [...multilingualConds, ...stringConds, ...descConds, descString];
			}

			// Get people with pagination
			const people = await PersonModel.find(peopleQuery)
				.sort({
					[sortBy === 'date' ? 'createdAt' : 'fullName']: sortOrder === 'asc' ? 1 : -1
				})
				.skip((page - 1) * limit)
				.limit(limit)
				.lean();

			// Convert to consistent format
			const convertedPeople = people.map((person: any) => {
				const firstName =
					typeof person.firstName === 'string' ? { en: person.firstName, he: '' } : person.firstName;

				const lastName =
					typeof person.lastName === 'string'
						? { en: person.lastName, he: '' }
						: person.lastName || person.familyName || { en: '', he: '' };

				const langCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
				const fullName = langCodes.reduce((acc: any, code: string) => {
					const fn = typeof firstName === 'object' ? firstName[code] || '' : '';
					const ln = typeof lastName === 'object' ? lastName[code] || '' : '';
					const combined = `${(fn || '').trim()} ${(ln || '').trim()}`.trim();
					if (combined) acc[code] = combined;
					return acc;
				}, {});

				return {
					...person,
					firstName,
					lastName,
					fullName,
					nickname:
						typeof person.nickname === 'string'
							? { en: person.nickname, he: '' }
							: person.nickname || {},
					description:
						typeof person.description === 'string'
							? { en: person.description, he: '' }
							: person.description || {}
				};
			});

			const totalPeople = await PersonModel.countDocuments(peopleQuery);

			results.people = convertedPeople;
			results.totalPeople = totalPeople;
		}

		// Search locations
		if (type === 'locations' || type === 'all') {
			let locationQuery: any = {};

			if (query) {
				const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
				const nameDesc = ['name', 'description'];
				const textConds = nameDesc.flatMap((f) =>
					langs.map((code) => ({ [`${f}.${code}`]: { $regex: query, $options: 'i' } }))
				);
				locationQuery.$or = [
					...textConds,
					{ address: { $regex: query, $options: 'i' } },
					{ city: { $regex: query, $options: 'i' } },
					{ state: { $regex: query, $options: 'i' } },
					{ country: { $regex: query, $options: 'i' } }
				];
			}

			// Get locations with pagination
			const locations = await LocationModel.find(locationQuery)
				.sort({
					[sortBy === 'date' ? 'createdAt' : 'name']: sortOrder === 'asc' ? 1 : -1
				})
				.skip((page - 1) * limit)
				.limit(limit)
				.lean();

			const totalLocations = await LocationModel.countDocuments(locationQuery);

			results.locations = locations;
			results.totalLocations = totalLocations;
		}

		// Check if there are more results
		const totalResults = results.totalPhotos + results.totalAlbums + results.totalPeople + results.totalLocations;
		results.hasMore = totalResults > page * limit;

		return json({
			success: true,
			data: results
		});
	} catch (error) {
		console.error('Search API error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Search failed: ${errorMessage}` }, { status: 500 });
	}
};

