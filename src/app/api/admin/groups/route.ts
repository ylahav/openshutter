import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const groups = await db
      .collection('groups')
      .find({})
      .sort({ alias: 1 })
      .toArray()
    // Normalize _id to string for the client
    const data = groups.map((g: any) => ({ ...g, _id: String(g._id) }))
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load groups' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alias, name } = body || {}
    if (!alias || !name) {
      return NextResponse.json({ success: false, error: 'alias and name are required' }, { status: 400 })
    }
    const normalizedAlias = String(alias).trim().toLowerCase()

    const { db } = await connectToDatabase()
    const groups = db.collection('groups')

    const existing = await groups.findOne({ alias: normalizedAlias })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Alias already exists' }, { status: 409 })
    }

    const now = new Date()
    const doc = {
      alias: normalizedAlias,
      name,
      createdAt: now,
      updatedAt: now,
    }
    const result = await groups.insertOne(doc as any)
    return NextResponse.json(
      { success: true, data: { ...doc, _id: String(result.insertedId) } },
      { status: 201 }
    )
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to create group' }, { status: 500 })
  }
}
