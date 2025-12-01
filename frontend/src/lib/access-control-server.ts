import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { UserSession, AlbumAccessInfo } from './access-control'

/**
 * Get current user session with proper typing (server-side only)
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return null
  }

  return {
    id: (session.user as any).id,
    email: session.user.email!,
    name: session.user.name!,
    role: (session.user as any).role || 'guest'
  }
}

/**
 * Build MongoDB query for albums accessible by user (server-side only)
 * @param user - User session information
 * @returns MongoDB query object
 */
export async function buildAlbumAccessQuery(user: UserSession | null): Promise<any> {
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
 * @param albums - Array of albums to filter
 * @param user - User session information
 * @returns Array of albums the user can access
 */
export async function filterAlbumsByAccess(albums: any[], user: UserSession | null): Promise<any[]> {
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
 * @param album - Album access information
 * @param user - User session information
 * @returns boolean indicating if user has access
 */
export async function checkAlbumAccess(album: AlbumAccessInfo, user: UserSession | null): Promise<boolean> {
  // Admins can access everything
  if (user?.role === 'admin') {
    return true
  }

  // If album is public, everyone can access it
  if (album.isPublic) {
    return true
  }

  // For private albums, user must be logged in
  if (!user) {
    return false
  }

  // Owners can access their own albums
  if (user.role === 'owner' && album.createdBy && album.createdBy === user.id) {
    return true
  }

  // For private albums, check if there are specific access restrictions
  const hasAllowedUsers = album.allowedUsers && album.allowedUsers.length > 0
  const hasAllowedGroups = album.allowedGroups && album.allowedGroups.length > 0

  // If no specific restrictions, any logged-in user can access
  if (!hasAllowedUsers && !hasAllowedGroups) {
    return true
  }

  // Check if user is in allowed users list
  if (hasAllowedUsers && album.allowedUsers) {
    const userObjectId = new ObjectId(user.id)
    const hasUserAccess = album.allowedUsers.some(userId => {
      try {
        return new ObjectId(userId).equals(userObjectId)
      } catch {
        return false
      }
    })
    if (hasUserAccess) {
      return true
    }
  }

  // Check if user belongs to any allowed groups
  if (hasAllowedGroups && album.allowedGroups) {
    const { db } = await connectToDatabase()
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(user.id) })
    
    if (userDoc?.groupAliases) {
      const hasGroupAccess = album.allowedGroups.some(groupAlias => 
        userDoc.groupAliases.includes(groupAlias)
      )
      if (hasGroupAccess) {
        return true
      }
    }
  }

  return false
}
