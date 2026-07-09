"use client"

import { useEffect, useState } from 'react'
import { X, Upload, Plus, Tag } from 'lucide-react'
import { applyDeveloperHeader } from '@/components/editor/dev-identity'
import PrettySelect from '@/components/ui/PrettySelect'
import { useFitScale, fitStyle } from '@/components/ui/use-fit-scale'

interface CreateWikiModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; grade: string; picture: File | null }) => void
}

type DeveloperOption = {
  id: string
  name?: string
  email: string
  role?: string
}

type CategoryOption = {
  id: number
  name: string
}

const gradeOptions = [
  { value: '', label: 'Select grade level' },
  { value: 'Elementary (K-5)', label: 'Elementary (K-5)' },
  { value: 'Middle School (6-8)', label: 'Middle School (6-8)' },
  { value: 'High School (9-12)', label: 'High School (9-12)' },
  { value: 'College', label: 'College' },
  { value: 'Adult', label: 'Adult' },
  { value: 'All Ages', label: 'All Ages' },
]

function slugifyClient(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CreateWikiModal({ isOpen, onClose, onSubmit }: CreateWikiModalProps) {
  const { ref: panelRef, scale } = useFitScale<HTMLDivElement>()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [grade, setGrade] = useState('')
  const [picture, setPicture] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [developers, setDevelopers] = useState<DeveloperOption[]>([])
  const [assignedIds, setAssignedIds] = useState<string[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSuperadmin, setIsSuperadmin] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPicture(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Fetch developers when modal opens (only visible to superadmins — API returns 403 otherwise)
  useEffect(() => {
    if (!isOpen) return
    fetch('/api/developers', { headers: applyDeveloperHeader() as HeadersInit })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: DeveloperOption[]) => setDevelopers(data))
      .catch(() => {})

    fetch('/api/categories', { headers: applyDeveloperHeader() as HeadersInit })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CategoryOption[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})

    fetch('/api/developers/me', { headers: applyDeveloperHeader() as HeadersInit })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.developer?.role === 'superadmin') setIsSuperadmin(true)
      })
      .catch(() => {})
  }, [isOpen])

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    setCreatingCategory(true)
    setCategoryError(null)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: applyDeveloperHeader({ 'Content-Type': 'application/json' }) as HeadersInit,
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to create category')
      const created: CategoryOption | undefined = data?.category
      if (created?.name) {
        setCategories((prev) =>
          prev.some((c) => c.name === created.name) ? prev : [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        )
        setSelectedTags((prev) => (prev.includes(created.name) ? prev : [...prev, created.name]))
      }
      setNewCategoryName('')
    } catch (e: any) {
      setCategoryError(e?.message || 'Failed to create category')
    } finally {
      setCreatingCategory(false)
    }
  }

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    )
  }

  const effectiveSlug = (slugTouched ? slug : slugifyClient(name)).trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !grade.trim() || !effectiveSlug) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('slug', effectiveSlug)
      formData.append('grade', grade.trim())
      formData.append('tags', JSON.stringify(selectedTags))
      if (picture) {
        formData.append('picture', picture)
      }

      const response = await fetch('/api/wikis', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create wiki')
      }

      // Assign selected team members to the new wiki
      if (assignedIds.length > 0) {
        const memberHeaders = applyDeveloperHeader({ 'Content-Type': 'application/json' })
        await fetch(`/api/wikis/${effectiveSlug}/members`, {
          method: 'PUT',
          headers: memberHeaders as HeadersInit,
          body: JSON.stringify({ assignedIds }),
        })
      }

      await onSubmit({ name: name.trim(), grade: grade.trim(), picture })
      handleClose()
    } catch (error) {
      console.error('Error creating wiki:', error)
      alert(error instanceof Error ? error.message : 'Failed to create wiki')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setSlug('')
    setSlugTouched(false)
    setGrade('')
    setPicture(null)
    setPreview(null)
    setAssignedIds([])
    setDevelopers([])
    setSelectedTags([])
    setCategories([])
    setNewCategoryName('')
    setCategoryError(null)
    setIsSuperadmin(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="animate-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={panelRef} style={fitStyle(scale)} className="animate-fade-in bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Create New Wiki</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-0">
            {/* Left column — picture upload + slug/grade/categories */}
            <div className="w-96 shrink-0 flex flex-col gap-5 px-8 py-6 border-r border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wiki Picture
                </label>
                <div className="relative w-full">
                  <input
                    id="picture"
                    type="file"
                    accept="image/*"
                    onChange={handlePictureChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <label
                    htmlFor="picture"
                    className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors overflow-hidden"
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-4 text-center">
                        <Upload size={28} className="text-gray-400" />
                        <span className="text-sm text-gray-500">Click to upload image</span>
                        <span className="text-xs text-gray-400">PNG, JPG up to 10MB</span>
                      </div>
                    )}
                  </label>
                </div>
                {picture && (
                  <button
                    type="button"
                    onClick={() => {
                      setPicture(null)
                      setPreview(null)
                    }}
                    className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={16} />
                    Remove picture
                  </button>
                )}
              </div>

              {/* Wiki Slug */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug *
                </label>
                <input
                  id="slug"
                  type="text"
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(slugifyClient(e.target.value))
                  }}
                  placeholder="arduino-basics"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors font-mono text-sm"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used in the URL: <span className="font-mono">/{effectiveSlug || 'your-slug'}/en</span>
                </p>
              </div>

              {/* Grade Level */}
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                  Grade Level *
                </label>
                <PrettySelect
                  id="grade"
                  value={grade}
                  onValueChange={setGrade}
                  options={gradeOptions}
                  placeholder="Select grade level"
                  ariaLabel="Grade level"
                  buttonClassName="min-h-[50px] border-gray-300 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Category Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Tag size={14} />
                    Categories
                  </span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Pick one or more tags to categorize this wiki.
                </p>

                {categories.length === 0 ? (
                  <p className="text-xs text-gray-400 mb-2">
                    No categories yet.
                    {isSuperadmin ? ' Create one below.' : ' Ask a superadmin to create one.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {categories.map((cat) => {
                      const active = selectedTags.includes(cat.name)
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => toggleTag(cat.name)}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                            active
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-primary/40 hover:bg-primary/5'
                          }`}
                        >
                          {cat.name}
                        </button>
                      )
                    })}
                  </div>
                )}

                {isSuperadmin && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => {
                        setNewCategoryName(e.target.value)
                        setCategoryError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleCreateCategory()
                        }
                      }}
                      placeholder="New category name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim() || creatingCategory}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                      {creatingCategory ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                )}
                {categoryError && (
                  <p className="mt-1 text-xs text-red-600">{categoryError}</p>
                )}
              </div>
            </div>

            {/* Right column — name + team */}
            <div className="flex-1 flex flex-col gap-5 px-8 py-6">
              {/* Wiki Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Wiki Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Arduino Basics, Robotics 101"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  required
                />
              </div>

              {/* Team Assignment — only shown to superadmins (API returns [] otherwise) */}
              {developers.filter((d) => d.role !== 'superadmin').length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wiki Team
                    <span className="text-xs font-normal text-gray-400 ml-2">Who can manage this wiki</span>
                  </label>
                  <div className="border border-gray-200 rounded-xl divide-y max-h-[28rem] overflow-y-auto">
                    {developers
                      .filter((d) => d.role !== 'superadmin')
                      .map((dev) => (
                        <label
                          key={dev.id}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 select-none"
                        >
                          <input
                            type="checkbox"
                            checked={assignedIds.includes(dev.id)}
                            onChange={(e) =>
                              setAssignedIds((prev) =>
                                e.target.checked
                                  ? [...prev, dev.id]
                                  : prev.filter((id) => id !== dev.id),
                              )
                            }
                            className="rounded border-gray-300"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-800 truncate">{dev.name || dev.email}</div>
                            {dev.name && (
                              <div className="text-xs text-gray-400 truncate">{dev.email}</div>
                            )}
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              dev.role === 'admin'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {dev.role || 'editor'}
                          </span>
                        </label>
                      ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Superadmins always have full access.</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2 mt-auto">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || !grade.trim() || isSubmitting}
                  className="flex-1 px-4 py-3 text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors font-medium"
                >
                  {isSubmitting ? 'Creating...' : 'Create Wiki'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
