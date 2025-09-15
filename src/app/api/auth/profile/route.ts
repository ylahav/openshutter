import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { hashPassword, verifyPassword } from '@/lib/security/password'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne(
      { _id: new ObjectId((session.user as any)._id) },
      { projection: { password: 0 } } // Exclude password from response
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Map username to email since that's how it's stored in the database
    const userWithEmail = {
      ...user,
      email: user.username // username field contains the email
    }


    return NextResponse.json({ user: userWithEmail })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, bio, profileImage, currentPassword, newPassword } = await request.json()
    const userId = (session.user as any)._id

    const { db } = await connectToDatabase()
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to change password' }, { status: 400 })
      }

      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password)
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {
      name: name || user.name,
      username: email || user.username, // Update username field with email value
      bio: bio !== undefined ? bio : user.bio,
      profileImage: profileImage !== undefined ? profileImage : user.profileImage,
      updatedAt: new Date()
    }

    // Hash new password if provided
    if (newPassword) {
      updateData.password = await hashPassword(newPassword)
    }

    // Update user
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch updated user (excluding password)
    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    )

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found after update' }, { status: 404 })
    }

    // Map username to email for consistency
    const userWithEmail = {
      ...updatedUser,
      email: updatedUser.username
    }

    return NextResponse.json({ 
      user: userWithEmail,
      message: 'Profile updated successfully' 
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
