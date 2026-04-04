"use client"

import { useState } from "react"

type Props = {
  wikiSlug: string
  initialIsPublished: boolean
}

export default function WikiPublishToggle({ wikiSlug, initialIsPublished }: Props) {
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onToggle = async () => {
    const next = !isPublished
    setError(null)
    setIsPublished(next)
    setSaving(true)
    try {
      const res = await fetch(`/api/wikis/${encodeURIComponent(wikiSlug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: next }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || "Failed to update publish status")
      }
    } catch (e: any) {
      setIsPublished(!next)
      setError(e?.message || "Failed to update publish status")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onToggle}
        disabled={saving}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          isPublished
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-gray-300 bg-gray-100 text-gray-600"
        } ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isPublished ? "bg-emerald-500" : "bg-gray-400"
          }`}
        />
        {isPublished ? "Published" : "Unpublished"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  )
}
