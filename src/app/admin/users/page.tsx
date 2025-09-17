'use client'

import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import { useI18n } from '@/hooks/useI18n'
import { useEffect, useState } from 'react'
import { MultiLangUtils, MultiLangText } from '@/types/multi-lang'
import MultiLangInput from '@/components/MultiLangInput'
import { useLanguage } from '@/contexts/LanguageContext'

interface UserItem {
  _id: string
  name: MultiLangText | string
  username: string
  role: 'admin' | 'owner' | 'guest'
  groupAliases?: string[]
  blocked?: boolean
  allowedStorageProviders?: string[]
}

interface StorageOption {
  id: string
  name: string
  type: string
  isEnabled: boolean
}

export default function AdminUsersPage() {
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<(UserItem & { password?: string }) | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [storageOptions, setStorageOptions] = useState<StorageOption[]>([])
  const [loadingStorageOptions, setLoadingStorageOptions] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/users')
        const data = await res.json()
        if (data.success) setUsers(data.data)
        else setError(data.error || 'Failed to load users')
      } catch (e) {
        setError('Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Load storage options when editing a user
  useEffect(() => {
    const loadStorageOptions = async () => {
      if (!editing) return
      
      try {
        setLoadingStorageOptions(true)
        const response = await fetch('/api/admin/storage-options')
        const data = await response.json()
        
        if (data.success) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Storage options loaded:', data.data)
          }
          setStorageOptions(data.data)
        } else {
          console.error('Failed to load storage options:', data.error)
        }
      } catch (error) {
        console.error('Error loading storage options:', error)
      } finally {
        setLoadingStorageOptions(false)
      }
    }

    loadStorageOptions()
  }, [editing])

  // create handled in modal

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('admin.users')}</h1>
              <p className="text-gray-600 mt-2">{t('admin.manageUsersRolesGroups')}</p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin" className="btn-secondary">{t('admin.backToAdmin')}</Link>
            </div>
          </div>

          {/* Top actions */}
          <div className="flex justify-end mb-6">
            <button className="btn-primary" onClick={() => setEditing({ _id: '', username: '', role: 'owner', name: { [currentLanguage]: '' }, blocked: false })}>{t('admin.newUser')}</button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-center text-gray-600">{t('admin.loading')}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin.noUsersYet')}</h3>
              <p className="text-gray-600 mb-4">{t('admin.createUsersAssignGroups')}</p>
              <button className="btn-primary">{t('createYourFirstUser')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((u) => (
                <div key={u._id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {typeof u.name === 'string' ? u.name : MultiLangUtils.getTextValue(u.name, currentLanguage)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {u.username} • {u.role}
                        {u.blocked && <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">{t('blocked')}</span>}
                      </p>
                    </div>
                    <button className="btn-secondary" onClick={() => setEditing(u)}>{t('edit')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edit/Create Modal */}
          {editing && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{editing._id ? t('editUser') : t('createUser')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t('admin.emailUsername')}</label>
                    <input
                      className={`input ${editing._id ? 'bg-gray-100' : ''}`}
                      type="email"
                      value={editing.username}
                      onChange={e => !editing._id && setEditing(prev => prev ? { ...prev, username: e.target.value } : prev)}
                      disabled={!!editing._id}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t('admin.nameLabel')}</label>
                    <MultiLangInput
                      value={(typeof editing.name === 'string' ? { [currentLanguage]: editing.name } : (editing.name as MultiLangText)) || {}}
                      onChange={(value) => setEditing(prev => prev ? { ...prev, name: value as MultiLangText } : prev)}
                      placeholder={t('admin.enterUserName')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t('admin.role')}</label>
                    <select className="input" value={editing.role} onChange={e => setEditing(prev => prev ? { ...prev, role: e.target.value as any } : prev)}>
                      <option value="owner">{t('admin.owner')}</option>
                      <option value="admin">{t('admin.admin')}</option>
                      <option value="guest">{t('admin.guest')}</option>
                    </select>
                  </div>
                  {(editing.role === 'owner' || editing.role === 'admin') && (
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Storage Permissions</label>
                      {loadingStorageOptions ? (
                        <div className="text-sm text-gray-500">Loading storage options...</div>
                      ) : (
                        <div className="space-y-2">
                          {storageOptions.map((option) => (
                            <label key={option.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={(editing.allowedStorageProviders || []).includes(option.id)}
                                onChange={(e) => {
                                  const current = editing.allowedStorageProviders || []
                                  const updated = e.target.checked
                                    ? [...current, option.id]
                                    : current.filter(id => id !== option.id)
                                  setEditing(prev => prev ? { ...prev, allowedStorageProviders: updated } : prev)
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">{option.name}</span>
                            </label>
                          ))}
                          <p className="text-xs text-gray-500">
                            {editing.role === 'admin' ? 'Admins can use all storage providers by default' : 'Select which storage providers this owner can use'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">{t('admin.passwordLeaveBlank')}</label>
                    <input className="input" type="password" value={editing.password || ''} onChange={e => setEditing(prev => prev ? { ...prev, password: e.target.value } : prev)} />
                  </div>
                  {editing._id && (
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editing.blocked || false}
                          onChange={e => setEditing(prev => prev ? { ...prev, blocked: e.target.checked } : prev)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">{t('admin.blockThisUser')}</span>
                      </label>
                    </div>
                  )}
                </div>
                {error && <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}
                <div className="flex justify-end gap-2 mt-4">
                  <button className="btn-secondary" onClick={() => setEditing(null)}>{t('admin.cancel')}</button>
                  <button
                    className="btn-primary"
                    disabled={savingEdit}
                    onClick={async () => {
                      setSavingEdit(true)
                      setError(null)
                      try {
                        if (editing._id) {
                          const payload: any = { name: editing.name, role: editing.role }
                          if (editing.password) payload.password = editing.password
                          if (typeof editing.blocked === 'boolean') payload.blocked = editing.blocked
                          if (editing.allowedStorageProviders) payload.allowedStorageProviders = editing.allowedStorageProviders
                          const res = await fetch(`/api/admin/users/${editing._id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                          })
                          const data = await res.json()
                          if (!data.success) setError(data.error || t('failedToUpdateUser'))
                          else {
                            setUsers(prev => prev.map(u => u._id === editing._id ? data.data : u))
                            setEditing(null)
                          }
                        } else {
                          // create
                          const res = await fetch('/api/admin/users', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({
                            username: editing.username,
                            password: editing.password,
                            name: editing.name,
                            role: editing.role,
                            groupAliases: [],
                            blocked: false,
                            allowedStorageProviders: editing.allowedStorageProviders || ['local'],
                          }),
                          })
                          const data = await res.json()
                          if (!data.success) setError(data.error || t('failedToCreateUser'))
                          else {
                            setUsers(prev => [data.data, ...prev])
                            setEditing(null)
                          }
                        }
                      } catch {
                        setError(t('requestFailed'))
                      } finally {
                        setSavingEdit(false)
                      }
                    }}
                  >
                    {savingEdit ? t('saving') : (editing._id ? t('admin.saveChanges') : t('admin.createUser'))}
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
