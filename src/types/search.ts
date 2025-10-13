/**
 * Shared search types for OpenShutter
 */

export interface MobileSearchFilters {
  type: 'all' | 'photos' | 'albums' | 'people' | 'locations'
  tags: string[]
  dateRange: { from: string; to: string }
  location: string
}

export interface DesktopSearchFilters {
  tags: string[]
  albumId: string | null
  dateFrom: string
  dateTo: string
  storageProvider: string
  isPublic: string
  mine: boolean
}

export interface SearchResult {
  _id: string
  type: 'photo' | 'album' | 'person' | 'location'
  title: string
  description?: string
  thumbnail?: string
  albumId?: string
  albumName?: string
  createdAt: string
  updatedAt: string
  isPublished?: boolean
  tags?: string[]
  people?: string[]
  location?: {
    name: string
    coordinates?: [number, number]
  }
}

export interface SearchResults {
  photos: SearchResult[]
  albums: SearchResult[]
  people: SearchResult[]
  locations: SearchResult[]
  totalPhotos: number
  totalAlbums: number
  totalPeople: number
  totalLocations: number
  page: number
  limit: number
  hasMore: boolean
}
