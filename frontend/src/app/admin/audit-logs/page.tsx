'use client'

import { useEffect, useState } from 'react'

interface Log {
  _id: string
  timestamp: string
  action: string
  userId?: string
  userRole?: string
  ip?: string
  userAgent?: string
  resourceType: string
  resourceId?: string
  resourceAlias?: string
  details?: any
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/audit-logs?limit=100')
        const json = await res.json()
        if (json.success) setLogs(json.data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Audit Logs</h1>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">Resource</th>
                <th className="p-2 text-left">IP</th>
                <th className="p-2 text-left">UA</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="p-2">{l.action}</td>
                  <td className="p-2">{l.userId || 'anon'} ({l.userRole || '-'})</td>
                  <td className="p-2">{l.resourceType}:{l.resourceAlias || l.resourceId}</td>
                  <td className="p-2">{l.ip || '-'}</td>
                  <td className="p-2 max-w-[320px] truncate" title={l.userAgent}>{l.userAgent || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


