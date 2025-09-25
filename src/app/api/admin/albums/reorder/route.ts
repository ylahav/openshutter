import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/access-control-server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user?.role !== 'admin' && user?.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    const { db } = await connectToDatabase()
    const body = await request.json()
    const updates = (body?.updates || []) as Array<{ id: string; parentAlbumId: string | null; order: number }>
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 })
    }

    const bulk = db.collection('albums').initializeUnorderedBulkOp()
    for (const u of updates) {
      const filter = { _id: new ObjectId(u.id) }
      const $set: any = { order: u.order }
      if (u.parentAlbumId === null) {
        $set.parentAlbumId = null
      }
      bulk.find(filter).updateOne({ $set })
    }
    await bulk.execute()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reorder albums:', error)
    return NextResponse.json({ success: false, error: 'Failed to reorder albums' }, { status: 500 })
  }
}
