import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ContactMessage } from '@/lib/models/ContactMessage'
import { siteConfigService } from '@/services/site-config'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const ipHits = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const rec = ipHits.get(ip)
  if (!rec || now > rec.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (rec.count >= RATE_LIMIT_MAX) return false
  rec.count += 1
  return true
}

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    if (!rateLimit(ip)) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const { name, email, subject, request, website } = body as Record<string, string>

    // Honeypot (bots often fill hidden fields)
    if (website && website.trim().length > 0) {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    if (!name || !name.trim() || !email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Name and email are required' }, { status: 400 })
    }

    // Simple email pattern check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 400 })
    }

    // Persist to DB
    await connectToDatabase()
    await ContactMessage.create({ name: name.trim(), email: email.trim(), subject: subject || '', request: request || '', ip })

    // Optional email notification
    const config = await siteConfigService.getConfig()
    const notify = config?.contact?.notifications?.emailEnabled && config?.contact?.notifications?.to
    if (notify) {
      // Placeholder: add integration with your mailer here
      if (process.env.NODE_ENV === 'development') {
        console.log('Contact notification would be sent to', config.contact?.notifications?.to)
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
