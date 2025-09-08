import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await connectToDatabase()
    const _id = new ObjectId(id)
    const group = await db.collection('groups').findOne({ _id })
    if (!group) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: group })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load group' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name } = body || {}
    if (!name) return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    const { db } = await connectToDatabase()
    const _id = new ObjectId(id)
    const result = await db.collection('groups').findOneAndUpdate(
      { _id },
      { $set: { name, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result || !result.value) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: result.value })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update group' }, { status: 500 })
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
    const result = await db.collection('groups').deleteOne({ _id })
    if (result.deletedCount === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete group' }, { status: 500 })
  }
}
