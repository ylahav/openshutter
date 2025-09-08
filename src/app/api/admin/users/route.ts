import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { hashPassword } from '@/lib/security/password'

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const users = await db.collection('users').find({}).sort({ username: 1 }).toArray()
    const data = users.map((u: any) => {
      const { passwordHash, ...rest } = u
      return { ...rest, _id: String(u._id) }
    })
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to load users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, username, password, role, groupAliases, blocked } = body || {}
    if (!name || !username || !password || !role) {
      return NextResponse.json({ success: false, error: 'name, username, password, role are required' }, { status: 400 })
    }
    const { db } = await connectToDatabase()
    const users = db.collection('users')
    const exists = await users.findOne({ username: String(username).toLowerCase() })
    if (exists) return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 409 })

    const passwordHash = await hashPassword(password)
    const now = new Date()
    const doc = {
      name,
      username: String(username).toLowerCase(),
      passwordHash,
      role,
      groupAliases: Array.isArray(groupAliases) ? groupAliases : [],
      blocked: Boolean(blocked),
      createdAt: now,
      updatedAt: now,
    }
    const result = await users.insertOne(doc as any)
    const { passwordHash: _omit, ...rest } = doc as any
    return NextResponse.json({ success: true, data: { ...rest, _id: String(result.insertedId) } }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 })
  }
}
