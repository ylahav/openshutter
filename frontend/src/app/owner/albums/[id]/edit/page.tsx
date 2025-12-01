'use client'

import { use } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import OwnerGuard from '@/components/OwnerGuard'
import { useLanguage } from '@/contexts/LanguageContext'
import MultiLangInput from '@/components/MultiLangInput'
import MultiLangHTMLEditor from '@/components/MultiLangHTMLEditor'
import { MultiLangHTML, MultiLangText, MultiLangUtils } from '@/types/multi-lang'
import { TemplateAlbum } from '@/types'
import { useSession } from 'next-auth/react'
import { canEditAlbum } from '@/lib/access-control'

export default function OwnerEditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const { currentLanguage } = useLanguage()
  const [album, setAlbum] = useState<TemplateAlbum | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: {} as MultiLangText,
    description: {} as MultiLangHTML,
    isPublic: false,
    isFeatured: false,
    showExifData: true,
    order: 0,
  })

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/albums/${resolvedParams.id}`)
        if (!res.ok) throw new Error('Failed to fetch album')
        const result = await res.json()
        if (!result.success) throw new Error(result.error || 'Failed to fetch album')
        const a = result.data as TemplateAlbum
        if (!canEditAlbum(a as any, session?.user as any)) {
          setError('Forbidden')
          return
        }
        setAlbum(a)
        setFormData({
          name: (typeof a.name === 'string' ? { en: a.name } : (a.name || {})) as MultiLangText,
          description: (typeof a.description === 'string' ? { en: a.description } : (a.description || {})) as MultiLangHTML,
          isPublic: a.isPublic || false,
          isFeatured: a.isFeatured || false,
          showExifData: (a as any).showExifData !== undefined ? (a as any).showExifData : true,
          order: a.order || 0,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch album')
      } finally {
        setLoading(false)
      }
    }
    fetchAlbum()
  }, [resolvedParams.id, session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      const res = await fetch(`/api/albums/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          name: MultiLangUtils.clean(formData.name),
          description: MultiLangUtils.clean(formData.description),
        }),
      })
      if (!res.ok) throw new Error('Failed to update album')
      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Failed to update album')
      router.push('/owner/albums')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update album')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? (parseInt(value) || 0) : value)
    }))
  }

  return (
    <OwnerGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          {loading ? (
            <div>Loading…</div>
          ) : error || !album ? (
            <div className="space-y-4">
              <div className="text-red-600">{error || 'Album not found'}</div>
              <Link href="/owner/albums" className="underline">Back</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 bg-white border rounded p-4">
              <div>
                <label className="block text-sm mb-2">Album Name</label>
                <MultiLangInput
                  value={formData.name}
                  onChange={(value) => setFormData(prev => ({ ...prev, name: value as MultiLangText }))}
                  placeholder="Enter album name..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Description</label>
                <MultiLangHTMLEditor
                  value={formData.description}
                  onChange={(value) => setFormData(prev => ({ ...prev, description: value as MultiLangHTML }))}
                  placeholder="Enter album description..."
                  height={200}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" checked={formData.isPublic} onChange={handleInputChange} /> Public</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleInputChange} /> Featured</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showExifData" checked={formData.showExifData} onChange={handleInputChange} /> Show EXIF</label>
              </div>
              <div>
                <label className="block text-sm mb-2">Display Order</label>
                <input type="number" name="order" value={formData.order} onChange={handleInputChange} className="w-full border rounded px-2 py-1" />
              </div>
              <div className="flex justify-between gap-2">
                <Link href={`/photos/upload?albumId=${resolvedParams.id}&returnTo=/owner/albums`} className="px-3 py-2 border rounded">Add Photos</Link>
                <Link href="/owner/albums" className="px-3 py-2 border rounded">Cancel</Link>
                <button type="submit" disabled={saving} className="px-3 py-2 bg-primary text-white rounded">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </OwnerGuard>
  )
}
