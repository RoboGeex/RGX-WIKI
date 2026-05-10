"use client"

import { useEffect, useState } from 'react'
import { X, Upload } from 'lucide-react'
import { applyDeveloperHeader } from '@/components/editor/dev-identity'

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

function slugifyClient(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CreateWikiModal({ isOpen, onClose, onSubmit }: CreateWikiModalProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [grade, setGrade] = useState('')
  const [picture, setPicture] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [developers, setDevelopers] = useState<DeveloperOption[]>([])
  const [assignedIds, setAssignedIds] = useState<string[]>([])

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
  }, [isOpen])

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
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Wiki</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <select
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                required
              >
                <option value="">Select grade level</option>
                <option value="Elementary (K-5)">Elementary (K-5)</option>
                <option value="Middle School (6-8)">Middle School (6-8)</option>
                <option value="High School (9-12)">High School (9-12)</option>
                <option value="College">College</option>
                <option value="Adult">Adult</option>
                <option value="All Ages">All Ages</option>
              </select>
            </div>

            {/* Picture Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wiki Picture
              </label>
              <div className="space-y-4">
                {/* Upload Area */}
                <div className="relative">
                  <input
                    id="picture"
                    type="file"
                    accept="image/*"
                    onChange={handlePictureChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <label
                    htmlFor="picture"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload size={24} className="text-gray-400" />
                        <span className="text-sm text-gray-500">Click to upload image</span>
                        <span className="text-xs text-gray-400">PNG, JPG up to 10MB</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Remove Picture Button */}
                {picture && (
                  <button
                    type="button"
                    onClick={() => {
                      setPicture(null)
                      setPreview(null)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={16} />
                    Remove picture
                  </button>
                )}
              </div>
            </div>

            {/* Team Assignment — only shown to superadmins (API returns [] otherwise) */}
            {developers.filter((d) => d.role !== 'superadmin').length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wiki Team
                  <span className="text-xs font-normal text-gray-400 ml-2">Who can manage this wiki</span>
                </label>
                <div className="border border-gray-200 rounded-xl divide-y max-h-44 overflow-y-auto">
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
            <div className="flex gap-3 pt-4">
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
          </form>
        </div>
      </div>
    </div>
  )
}
