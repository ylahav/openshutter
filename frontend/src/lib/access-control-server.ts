import type { UserSession, AlbumAccessInfo } from './access-control'
import { logger } from './utils/logger'

/**
 * Get current user session with proper typing (server-side only)
 * 
 * NOTE: This function is for Next.js API routes compatibility.
 * In SvelteKit, use `locals.user` directly in your route handlers.
 * 
 * @deprecated Use `locals.user` in SvelteKit routes instead
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  // This function is kept for backward compatibility with any remaining Next.js routes
  // In SvelteKit, use locals.user directly
  // For Next.js routes, this would need to be called from a context that has access to the request
  // Since we're migrating away from Next.js, this is mainly a placeholder
  logger.warn('getCurrentUser() is deprecated. Use locals.user in SvelteKit routes instead.')
  return null
}

/**
 * Build MongoDB query for albums accessible by user (server-side only)
 * 
 * @deprecated This function uses direct MongoDB connections which are no longer supported.
 * Use the backend API endpoints instead. Access control is now handled by the backend.
 * 
 * @param user - User session information
 * @returns MongoDB query object
 */
export async function buildAlbumAccessQuery(user: UserSession | null): Promise<any> {
  throw new Error(
    'buildAlbumAccessQuery() is deprecated. Direct MongoDB connections are no longer supported. ' +
    'Use the backend API endpoints instead. Access control is handled by the backend.'
  );
  
  // Legacy code below (never reached)
  // Admins can see everything
  if (user?.role === 'admin') {
    return {}
  }

  // If no user, only public albums
  if (!user) {
    return { isPublic: true }
  }

  // Get user's groups
  const { db } = await connectToDatabase()
  const userDoc = await db.collection('users').findOne({ _id: new ObjectId(user.id) })
  const userGroups = userDoc?.groupAliases || []

  // For owners, include their own albums
  if (user.role === 'owner') {
    return {
      $or: [
        { isPublic: true },
        { createdBy: user.id },
        {
          isPublic: false,
          $and: [
            { $or: [{ allowedUsers: { $exists: false } }, { allowedUsers: { $size: 0 } }] },
            { $or: [{ allowedGroups: { $exists: false } }, { allowedGroups: { $size: 0 } }] }
          ]
        },
        {
          isPublic: false,
          allowedUsers: new ObjectId(user.id)
        },
        ...(userGroups.length > 0 ? [{
          isPublic: false,
          allowedGroups: { $in: userGroups }
        }] : [])
      ]
    }
  }

  // Build query: public albums OR (private albums with no restrictions) OR (private albums where user is allowed)
  return {
    $or: [
      { isPublic: true },
      {
        isPublic: false,
        $and: [
          { $or: [{ allowedUsers: { $exists: false } }, { allowedUsers: { $size: 0 } }] },
          { $or: [{ allowedGroups: { $exists: false } }, { allowedGroups: { $size: 0 } }] }
        ]
      },
      {
        isPublic: false,
        allowedUsers: new ObjectId(user.id)
      },
      ...(userGroups.length > 0 ? [{
        isPublic: false,
        allowedGroups: { $in: userGroups }
      }] : [])
    ]
  }
}

/**
 * Filter albums based on user access (server-side only)
 * 
 * @deprecated This function uses direct MongoDB connections which are no longer supported.
 * Use the backend API endpoints instead. Access control is now handled by the backend.
 * 
 * @param albums - Array of albums to filter
 * @param user - User session information
 * @returns Array of albums the user can access
 */
export async function filterAlbumsByAccess(albums: any[], user: UserSession | null): Promise<any[]> {
  throw new Error(
    'filterAlbumsByAccess() is deprecated. Direct MongoDB connections are no longer supported. ' +
    'Use the backend API endpoints instead. Access control is handled by the backend.'
  );
  const accessibleAlbums = []
  
  for (const album of albums) {
    const hasAccess = await checkAlbumAccess({
      isPublic: album.isPublic,
      allowedGroups: album.allowedGroups,
      allowedUsers: album.allowedUsers,
      createdBy: album.createdBy
    }, user)
    
    if (hasAccess) {
      accessibleAlbums.push(album)
    }
  }
  
  return accessibleAlbums
}

/**
 * Check if a user has access to an album (server-side only)
 * 
 * @deprecated This function uses direct MongoDB connections which are no longer supported.
 * Use the backend API endpoints instead. Access control is now handled by the backend.
 * 
 * @param album - Album access information
 * @param user - User session information
 * @returns boolean indicating if user has access
 */
export async function checkAlbumAccess(album: AlbumAccessInfo, user: UserSession | null): Promise<boolean> {
  throw new Error(
    'checkAlbumAccess() is deprecated. Direct MongoDB connections are no longer supported. ' +
    'Use the backend API endpoints instead. Access control is handled by the backend.'
  );
}
