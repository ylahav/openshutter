import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { connectToDatabase } from '@/lib/mongodb'
import { hashPassword } from '@/lib/security/password'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await connectToDatabase()
    const _id = new ObjectId(id)
    const user = await db.collection('users').findOne({ _id })
    if (!user) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    const { passwordHash, ...rest } = user as any
    return NextResponse.json({ success: true, data: { ...rest, _id: String(user._id) } })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load user' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, password, role, groupAliases, blocked, allowedStorageProviders } = body || {}
    const update: any = { updatedAt: new Date() }
    if (name) update.name = name
    if (role) update.role = role
    if (Array.isArray(groupAliases)) update.groupAliases = groupAliases
    if (password) update.passwordHash = await hashPassword(password)
    if (typeof blocked === 'boolean') update.blocked = blocked
    if (Array.isArray(allowedStorageProviders)) update.allowedStorageProviders = allowedStorageProviders

    const { db } = await connectToDatabase()
    const _id = new ObjectId(id)
    
    // If we're updating role or blocked status, check admin validation
    if (role || typeof blocked === 'boolean') {
      const currentUser = await db.collection('users').findOne({ _id })
      if (!currentUser) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      
      // Check if this would result in no active admins
      const newRole = role || currentUser.role
      const newBlocked = typeof blocked === 'boolean' ? blocked : currentUser.blocked
      
      if (newRole === 'admin' && !newBlocked) {
        // This user will remain an active admin, so it's safe
      } else {
        // Check if there are other active admins
        const otherActiveAdmins = await db.collection('users').countDocuments({
          _id: { $ne: _id },
          role: 'admin',
          blocked: { $ne: true }
        })
        
        if (otherActiveAdmins === 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'Cannot block or change role: At least one admin must remain active' 
          }, { status: 400 })
        }
      }
    }

    const result = await db.collection('users').findOneAndUpdate(
      { _id },
      { $set: update },
      { returnDocument: 'after' }
    )
    if (!result || !result.value) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    const { passwordHash, ...rest } = result.value as any
    return NextResponse.json({ success: true, data: { ...rest, _id: String(result.value._id) } })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await connectToDatabase()
    const _id = new ObjectId(id)
    
    // Check if this is the last active admin
    const user = await db.collection('users').findOne({ _id })
    if (!user) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    
    if (user.role === 'admin' && !user.blocked) {
      const otherActiveAdmins = await db.collection('users').countDocuments({
        _id: { $ne: _id },
        role: 'admin',
        blocked: { $ne: true }
      })
      
      if (otherActiveAdmins === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Cannot delete: At least one admin must remain active' 
        }, { status: 400 })
      }
    }
    
    const result = await db.collection('users').deleteOne({ _id })
    if (result.deletedCount === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 })
  }
}
