'use client'

import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import { useI18n } from '@/hooks/useI18n'
import { useEffect, useState } from 'react'
import { MultiLangUtils, MultiLangText } from '@/types/multi-lang'
import MultiLangInput from '@/components/MultiLangInput'
import { useLanguage } from '@/contexts/LanguageContext'

interface GroupItem {
  _id: string
  alias: string
  name: MultiLangText | string
  createdAt?: string
}

export default function AdminGroupsPage() {
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<{ _id: string; alias: string; name: MultiLangText } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/groups')
        const data = await res.json()
        if (data.success) setGroups(data.data)
        else setError(data.error || 'Failed to load groups')
      } catch (e) {
        setError('Failed to load groups')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCreate = async () => {
    setError(null)
    if (!newAlias.trim() || !newName.trim()) {
      setError('Alias and name are required')
      return
    }
    try {
      setCreating(true)
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: newAlias.trim(), name: { [currentLanguage]: newName.trim() } }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to create group')
        return
      }
      setGroups(prev => [data.data, ...prev])
      setNewAlias('')
      setNewName('')
    } catch (e) {
      setError('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('groups')}</h1>
              <p className="text-gray-600 mt-2">{t('defineManageGroups')}</p>
            </div>
            <div className="flex gap-3 items-center">
              <Link href="/admin" className="btn-secondary">{t('backToAdmin')}</Link>
            </div>
          </div>

          {/* Create Group Form */}
          <div className="bg-white border rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('createGroup')}</h2>
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
              <div className="flex-1 max-w-xs">
                <label className="block text-sm text-gray-700 mb-1">{t('alias')}</label>
                <input
                  type="text"
                  placeholder={t('aliasUnique')}
                  value={newAlias}
                  onChange={e => setNewAlias(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex-1 min-w-[260px]">
                <label className="block text-sm text-gray-700 mb-1">{t('nameWithLang').replace('{lang}', currentLanguage.toUpperCase())}</label>
                <input
                  type="text"
                  placeholder={t('namePlaceholder').replace('{lang}', currentLanguage)}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <button className="btn-primary" onClick={handleCreate} disabled={creating}>
                  {creating ? t('creating') : t('createGroup')}
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-center text-gray-600">{t('loading')}</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noGroupsYet')}</h3>
              <p className="text-gray-600 mb-4">{t('groupsHelp')}</p>
              <button className="btn-primary" onClick={() => { /* focus create form */ }}>
                {t('createFirstGroup')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map((g, idx) => (
                <div key={g._id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {typeof g.name === 'string' ? g.name : MultiLangUtils.getTextValue(g.name, currentLanguage)}
                      </h3>
                      <p className="text-sm text-gray-500">Alias: {g.alias}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary" onClick={() => setEditing({ _id: g._id, alias: g.alias, name: (typeof g.name === 'string' ? { [currentLanguage]: g.name } : (g.name as MultiLangText)) })}>{t('edit')}</button>
                      <button
                        className="btn-danger"
                        onClick={async () => {
                          setError(null)
                          try {
                            const res = await fetch(`/api/admin/groups/${g._id}`, { method: 'DELETE' })
                            const data = await res.json()
                            if (!data.success) setError(data.error || t('failedToDelete'))
                            else setGroups(prev => prev.filter((x) => x._id !== g._id))
                          } catch {
                            setError(t('failedToDelete'))
                          }
                        }}
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edit Modal */}
          {editing && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('editGroup')}</h3>
                <div className="mb-3">
                  <label className="block text-sm text-gray-700 mb-1">{t('alias')}</label>
                  <input type="text" value={editing.alias} className="input bg-gray-100" disabled />
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-700 mb-1">{t('name')}</label>
                  <MultiLangInput
                    value={editing.name}
                    onChange={(value) => setEditing(prev => prev ? { ...prev, name: value as MultiLangText } : prev)}
                  />
                </div>
                {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}
                <div className="flex justify-end gap-2">
                  <button className="btn-secondary" onClick={() => setEditing(null)}>{t('cancel')}</button>
                  <button
                    className="btn-primary"
                    disabled={savingEdit}
                    onClick={async () => {
                      setSavingEdit(true)
                      setError(null)
                      try {
                        const res = await fetch(`/api/admin/groups/${editing._id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: editing.name }),
                        })
                        const data = await res.json()
                        if (!data.success) {
                          setError(data.error || t('failedToUpdate'))
                        } else {
                          setGroups(prev => prev.map(g => g._id === editing._id ? data.data : g))
                          setEditing(null)
                        }
                      } catch {
                        setError(t('failedToUpdate'))
                      } finally {
                        setSavingEdit(false)
                      }
                    }}
                  >
                    {savingEdit ? t('saving') : t('saveChanges')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
