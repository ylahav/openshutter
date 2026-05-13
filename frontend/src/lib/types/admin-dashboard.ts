export type AdminDashboardAlert = { id: string; fixPath: string };

export type AdminDashboardRecentAlbum = {
	_id: string;
	alias: string;
	name: unknown;
	photoCount: number;
	level: number;
	isPublished: boolean;
	coverImageUrl: string | null;
};

export type AdminDashboardSummary = {
	stats: {
		totalPhotos: number;
		totalAlbums: number;
		publishedAlbums: number;
		publicAlbums: number;
		featuredAlbums: number;
		tagsApplied: number;
	};
	alerts: AdminDashboardAlert[];
	recentAlbums: AdminDashboardRecentAlbum[];
	storage: {
		usedBytes: number;
		quotaBytes: number | null;
	};
};
