"use client"

import { useState } from 'react'
import { X, Upload, Image as ImageIcon } from 'lucide-react'

interface CreateWikiModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; grade: string; picture: File | null }) => void
}

export default function CreateWikiModal({ isOpen, onClose, onSubmit }: CreateWikiModalProps) {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [picture, setPicture] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !grade.trim()) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
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

      const result = await response.json()
      console.log('Wiki created successfully:', result)
      
      // Call the parent onSubmit callback
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
    setGrade('')
    setPicture(null)
    setPreview(null)
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
