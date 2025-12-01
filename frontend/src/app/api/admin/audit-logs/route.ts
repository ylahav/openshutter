import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/access-control-server'
import { findAuditLogs } from '@/services/audit-log'
import type { AuditAction } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const skip = parseInt(searchParams.get('skip') || '0')
    const actionParam = searchParams.get('action') || undefined
    const userId = searchParams.get('userId') || undefined
    const resourceType = (searchParams.get('resourceType') as 'album' | 'photo') || undefined
    const resourceId = searchParams.get('resourceId') || undefined
    const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined
    const until = searchParams.get('until') ? new Date(searchParams.get('until')!) : undefined

    let action: AuditAction | AuditAction[] | undefined = undefined
    if (actionParam) {
      const allowed: AuditAction[] = ['album.view.allow','album.view.deny','photo.view.allow','photo.view.deny']
      const parts = actionParam.split(',').map(s => s.trim()).filter(Boolean)
      const filtered = parts.filter((p): p is AuditAction => allowed.includes(p as AuditAction))
      if (filtered.length === 1) action = filtered[0]
      else if (filtered.length > 1) action = filtered
    }

    const logs = await findAuditLogs({ action, userId, resourceType, resourceId, since, until }, limit, skip)
    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('API: Error fetching audit logs:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}


