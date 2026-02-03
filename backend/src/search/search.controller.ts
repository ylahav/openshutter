import { Controller, Get, Post, Query, Body, Req, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { SearchService, SearchFilters } from './search.service';
import { SearchBodyDto } from './dto/search-body.dto';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';
import type { AlbumAccessContext } from '../albums/albums.service';

@Controller('search')
@UseGuards(OptionalAdminGuard)
export class SearchController {
	constructor(
		private readonly searchService: SearchService,
		@InjectModel('User') private userModel: Model<any>,
	) {}

	private async getAccessContext(req: Request): Promise<AlbumAccessContext | null> {
		const user = (req as any).user;
		if (!user?.id) return null;
		const doc = await this.userModel.findById(user.id).select('groupAliases').lean().exec();
		if (!doc) return null;
		return {
			userId: user.id,
			groupAliases: Array.isArray(doc.groupAliases) ? doc.groupAliases : [],
		};
	}

	/**
	 * POST /api/search – preferred: search criteria in request body.
	 */
	@Post()
	async searchPost(@Req() req: Request, @Body() body: SearchBodyDto): Promise<ReturnType<SearchService['search']>> {
		const accessContext = await this.getAccessContext(req);
		const filters: SearchFilters = {
			q: body.q?.trim() || undefined,
			type: body.type || 'photos',
			page: body.page ?? 1,
			limit: body.limit ?? 20,
			albumId: body.albumId?.trim() || undefined,
			tags: body.tags?.length ? body.tags.map((s) => s.trim()).filter(Boolean) : undefined,
			people: body.people?.length ? body.people.map((s) => s.trim()).filter(Boolean) : undefined,
			locationIds: body.locationIds?.length ? body.locationIds.map((s) => s.trim()).filter(Boolean) : undefined,
			dateFrom: body.dateFrom?.trim() || undefined,
			dateTo: body.dateTo?.trim() || undefined,
			sortBy: body.sortBy || 'date',
			sortOrder: body.sortOrder || 'desc',
		};
		return this.searchService.search(filters, accessContext);
	}

	/**
	 * GET /api/search – kept for backward compatibility (e.g. shareable links).
	 */
	@Get()
	async search(
		@Req() req: Request,
		@Query('q') q?: string,
		@Query('type') type?: 'photos' | 'albums' | 'people' | 'locations' | 'all',
		@Query('page') page?: string,
		@Query('limit') limit?: string,
		@Query('albumId') albumId?: string,
		@Query('tags') tags?: string,
		@Query('people') people?: string,
		@Query('locationIds') locationIds?: string,
		@Query('dateFrom') dateFrom?: string,
		@Query('dateTo') dateTo?: string,
		@Query('sortBy') sortBy?: string,
		@Query('sortOrder') sortOrder?: 'asc' | 'desc',
	) {
		const accessContext = await this.getAccessContext(req);
		const filters: SearchFilters = {
			q: q?.trim() || undefined,
			type: type || 'photos',
			page: page ? parseInt(page, 10) || 1 : 1,
			limit: limit ? parseInt(limit, 10) || 20 : 20,
			albumId: albumId?.trim() || undefined,
			tags: tags ? tags.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
			people: people ? people.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
			locationIds: locationIds ? locationIds.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
			dateFrom: dateFrom?.trim() || undefined,
			dateTo: dateTo?.trim() || undefined,
			sortBy: sortBy || 'date',
			sortOrder: sortOrder || 'desc',
		};

		return this.searchService.search(filters, accessContext);
	}
}
