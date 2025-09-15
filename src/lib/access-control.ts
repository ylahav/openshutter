export interface UserSession {
  id: string
  email: string
  name: string
  role: 'admin' | 'owner' | 'guest'
}

export interface AlbumAccessInfo {
  isPublic: boolean
  allowedGroups?: string[]
  allowedUsers?: string[]
  createdBy?: string
}

/**
 * Check if user can create albums
 * @param user - User session information
 * @returns boolean indicating if user can create albums
 */
export function canCreateAlbums(user: UserSession | null): boolean {
  return user?.role === 'admin' || user?.role === 'owner'
}

/**
 * Check if user can edit album
 * @param album - Album information
 * @param user - User session information
 * @returns boolean indicating if user can edit album
 */
export function canEditAlbum(album: any, user: UserSession | null): boolean {
  if (!user) return false
  
  // Admins can edit everything
  if (user.role === 'admin') return true
  
  // Owners can edit their own albums
  if (user.role === 'owner' && album.createdBy === user.id) return true
  
  return false
}

/**
 * Check if user can delete album
 * @param album - Album information
 * @param user - User session information
 * @returns boolean indicating if user can delete album
 */
export function canDeleteAlbum(album: any, user: UserSession | null): boolean {
  if (!user) return false
  
  // Admins can delete everything
  if (user.role === 'admin') return true
  
  // Owners can delete their own albums
  if (user.role === 'owner' && album.createdBy === user.id) return true
  
  return false
}
