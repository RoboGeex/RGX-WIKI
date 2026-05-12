"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Check,
  Pencil,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { applyDeveloperHeader } from "@/components/editor/dev-identity"

// ── Types ─────────────────────────────────────────────────────────────────────

type Developer = {
  id: string
  name?: string
  email: string
  role?: string
}

type Props = {
  wikiSlug: string
  initialDisplayName: string
  initialPicture?: string
  initialScheduledDeletionAt?: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WikiSettingsPanel({
  wikiSlug,
  initialDisplayName,
  initialPicture,
  initialScheduledDeletionAt,
}: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false) // drives CSS transition
  const [devRole, setDevRole] = useState<string | null>(null)

  // Trigger enter transition one frame after mounting, exit before unmounting
  useEffect(() => {
    if (!isOpen) return
    const id = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => setIsOpen(false), 300) // match transition duration
  }

  // Rename
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [renaming, setRenaming] = useState(false)
  const [renameSuccess, setRenameSuccess] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  // Picture
  const [picture, setPicture] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [pictureSuccess, setPictureSuccess] = useState(false)
  const [pictureError, setPictureError] = useState<string | null>(null)

  // Team
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [assignedIds, setAssignedIds] = useState<string[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [savingTeam, setSavingTeam] = useState(false)
  const [teamSuccess, setTeamSuccess] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)

  // Delete
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState<string | null>(
    initialScheduledDeletionAt ?? null,
  )
  const [undoing, setUndoing] = useState(false)

  // ── Load developer role on open ────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return
    fetch("/api/developers/me", { headers: applyDeveloperHeader() as HeadersInit })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.developer) setDevRole(data.developer.role ?? null)
      })
      .catch(() => {})
  }, [isOpen])

  // ── Load team when panel opens as superadmin ───────────────────────────────

  useEffect(() => {
    if (!isOpen || devRole !== "superadmin") return
    setLoadingTeam(true)
    Promise.all([
      fetch("/api/developers", { headers: applyDeveloperHeader() as HeadersInit }).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch(`/api/wikis/${wikiSlug}/members`, {
        headers: applyDeveloperHeader() as HeadersInit,
      }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([devs, members]: [Developer[], Developer[]]) => {
        setDevelopers(devs)
        setAssignedIds(members.map((m) => m.id))
      })
      .catch(() => {})
      .finally(() => setLoadingTeam(false))
  }, [isOpen, devRole, wikiSlug])

  // ── Rename ─────────────────────────────────────────────────────────────────

  const handleRename = async () => {
    const trimmed = displayName.trim()
    if (!trimmed) return
    setRenaming(true)
    setRenameError(null)
    setRenameSuccess(false)
    try {
      const res = await fetch(`/api/wikis/${wikiSlug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(applyDeveloperHeader() as Record<string, string>),
        },
        body: JSON.stringify({ displayName: trimmed }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Failed to rename wiki")
      }
      setRenameSuccess(true)
      setTimeout(() => setRenameSuccess(false), 3000)
      router.refresh()
    } catch (e: any) {
      setRenameError(e.message)
    } finally {
      setRenaming(false)
    }
  }

  // ── Picture ────────────────────────────────────────────────────────────────

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPicture(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleUploadPicture = async () => {
    if (!picture) return
    setUploadingPicture(true)
    setPictureError(null)
    setPictureSuccess(false)
    try {
      const fd = new FormData()
      fd.append("picture", picture)
      const res = await fetch(`/api/wikis/${wikiSlug}`, {
        method: "PATCH",
        headers: applyDeveloperHeader() as HeadersInit,
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Failed to upload picture")
      }
      setPictureSuccess(true)
      setPicture(null)
      setPreview(null)
      setTimeout(() => setPictureSuccess(false), 3000)
      router.refresh()
    } catch (e: any) {
      setPictureError(e.message)
    } finally {
      setUploadingPicture(false)
    }
  }

  // ── Team ───────────────────────────────────────────────────────────────────

  const handleSaveTeam = async () => {
    setSavingTeam(true)
    setTeamError(null)
    setTeamSuccess(false)
    try {
      const res = await fetch(`/api/wikis/${wikiSlug}/members`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(applyDeveloperHeader() as Record<string, string>),
        },
        body: JSON.stringify({ assignedIds }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Failed to save team")
      }
      setTeamSuccess(true)
      setTimeout(() => setTeamSuccess(false), 3000)
    } catch (e: any) {
      setTeamError(e.message)
    } finally {
      setSavingTeam(false)
    }
  }

  // ── Delete / Undo ──────────────────────────────────────────────────────────

  const handleScheduleDelete = async () => {
    if (deleteConfirmText !== wikiSlug) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/wikis/${wikiSlug}`, {
        method: "DELETE",
        headers: applyDeveloperHeader() as HeadersInit,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Failed to schedule deletion")
      }
      const data = await res.json()
      setScheduledDeletionAt(data.scheduledDeletionAt)
      setShowDeleteDialog(false)
      handleClose()
    } catch (e: any) {
      setDeleteError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleUndoDelete = async () => {
    setUndoing(true)
    try {
      const res = await fetch(`/api/wikis/${wikiSlug}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(applyDeveloperHeader() as Record<string, string>),
        },
        body: JSON.stringify({ undo: true }),
      })
      if (!res.ok) throw new Error("Failed to undo")
      setScheduledDeletionAt(null)
      router.refresh()
    } catch {
      // silently fail — user can try again
    } finally {
      setUndoing(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const daysLeft =
    scheduledDeletionAt !== null
      ? Math.max(
          0,
          Math.ceil(
            (new Date(scheduledDeletionAt).getTime() - Date.now()) / 86_400_000,
          ),
        )
      : null

  const nonSuperadminDevs = developers.filter((d) => d.role !== "superadmin")

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Deletion banner (always visible when scheduled) ── */}
      {scheduledDeletionAt && daysLeft !== null && daysLeft > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm">
          <AlertTriangle size={15} className="shrink-0 text-red-500" />
          <span className="text-red-700">
            This wiki will be permanently deleted in{" "}
            <strong>
              {daysLeft} day{daysLeft !== 1 ? "s" : ""}
            </strong>
            .
          </span>
          <button
            onClick={handleUndoDelete}
            disabled={undoing}
            className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-semibold text-red-700 underline hover:text-red-900 disabled:opacity-60"
          >
            <RotateCcw size={12} />
            {undoing ? "Undoing…" : "Undo"}
          </button>
        </div>
      )}

      {/* ── Settings trigger button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-400 hover:bg-gray-50"
      >
        <Settings size={13} />
        Settings
      </button>

      {/* ── Right-side drawer ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop — fades in/out */}
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
            onClick={handleClose}
          />

          {/* Panel — slides in from the right */}
          <div className={`relative ml-auto flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out ${isVisible ? "translate-x-0" : "translate-x-full"}`}>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Wiki Settings</h2>
                <p className="mt-0.5 font-mono text-xs text-gray-400">{wikiSlug}</p>
              </div>
              <button
                onClick={() => handleClose()}
                className="rounded-lg p-1.5 transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">

              {/* ── Display name ── */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Pencil size={14} />
                  Display Name
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename()}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleRename}
                    disabled={renaming || !displayName.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {renaming ? (
                      <span className="text-xs">Saving…</span>
                    ) : renameSuccess ? (
                      <>
                        <Check size={14} /> Saved
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Save
                      </>
                    )}
                  </button>
                </div>
                {renameError && (
                  <p className="mt-1.5 text-xs text-red-600">{renameError}</p>
                )}
              </section>

              {/* ── Cover picture ── */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Upload size={14} />
                  Cover Picture
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      id="wiki-settings-picture"
                      type="file"
                      accept="image/*"
                      onChange={handlePictureChange}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <label
                      htmlFor="wiki-settings-picture"
                      className="flex h-36 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 transition hover:border-primary/50 hover:bg-primary/5"
                    >
                      {preview ? (
                        <img
                          src={preview}
                          alt="New cover preview"
                          className="h-full w-full object-cover"
                        />
                      ) : initialPicture ? (
                        <img
                          src={initialPicture}
                          alt="Current cover"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center px-4">
                          <Upload size={24} className="text-gray-400" />
                          <span className="text-sm text-gray-500">Click to upload image</span>
                          <span className="text-xs text-gray-400">PNG, JPG up to 10 MB</span>
                        </div>
                      )}
                    </label>
                  </div>

                  {picture && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUploadPicture}
                        disabled={uploadingPicture}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
                      >
                        {uploadingPicture ? (
                          "Uploading…"
                        ) : pictureSuccess ? (
                          <>
                            <Check size={14} /> Saved
                          </>
                        ) : (
                          "Save Picture"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setPicture(null)
                          setPreview(null)
                        }}
                        className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-gray-100"
                      >
                        <X size={14} /> Clear
                      </button>
                    </div>
                  )}
                  {pictureError && (
                    <p className="text-xs text-red-600">{pictureError}</p>
                  )}
                </div>
              </section>

              {/* ── Team (superadmin only) ── */}
              {devRole === "superadmin" && (
                <section>
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Users size={14} />
                    Wiki Team
                  </h3>
                  <p className="mb-3 text-xs text-gray-400">
                    Who can manage this wiki's lessons
                  </p>

                  {loadingTeam ? (
                    <p className="text-xs text-gray-500">Loading…</p>
                  ) : nonSuperadminDevs.length === 0 ? (
                    <p className="text-xs text-gray-400">No admins or editors found.</p>
                  ) : (
                    <>
                      <div className="max-h-52 divide-y overflow-y-auto rounded-xl border border-gray-200">
                        {nonSuperadminDevs.map((dev) => (
                          <label
                            key={dev.id}
                            className="flex cursor-pointer select-none items-center gap-3 px-4 py-2.5 hover:bg-gray-50"
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
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-gray-800">
                                {dev.name || dev.email}
                              </p>
                              {dev.name && (
                                <p className="truncate text-xs text-gray-400">{dev.email}</p>
                              )}
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                dev.role === "admin"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {dev.role || "editor"}
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Superadmins always have full access.
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={handleSaveTeam}
                          disabled={savingTeam}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
                        >
                          {savingTeam ? "Saving…" : "Save Team"}
                        </button>
                        {teamSuccess && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <Check size={13} /> Saved
                          </span>
                        )}
                        {teamError && (
                          <span className="text-xs text-red-600">{teamError}</span>
                        )}
                      </div>
                    </>
                  )}
                </section>
              )}

              {/* ── Danger zone (superadmin only) ── */}
              {devRole === "superadmin" && (
                <section className="rounded-xl border border-red-200 bg-red-50 p-5">
                  <h3 className="mb-1 text-sm font-semibold text-red-700">Danger Zone</h3>
                  <p className="mb-4 text-xs text-red-400">
                    Destructive actions. These cannot be undone after the 7-day grace period.
                  </p>
                  <button
                    onClick={() => {
                      setDeleteConfirmText("")
                      setDeleteError(null)
                      setShowDeleteDialog(true)
                    }}
                    disabled={!!scheduledDeletionAt}
                    className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    {scheduledDeletionAt ? "Deletion Scheduled" : "Delete Wiki"}
                  </button>
                  {scheduledDeletionAt && daysLeft !== null && (
                    <p className="mt-2 text-xs text-red-400">
                      Permanently deleted in {daysLeft} day{daysLeft !== 1 ? "s" : ""}. Use
                      the banner above to undo.
                    </p>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation dialog (layered above drawer) ── */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-2xl">
            {/* Icon + copy */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Delete "{initialDisplayName}"?
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  The wiki and <strong>all its lessons</strong> will be permanently deleted
                  after a <strong>7-day grace period</strong>. During this window you can
                  restore it from the banner at the top of the page.
                </p>
              </div>
            </div>

            {/* Slug confirmation input */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type the wiki slug to confirm:{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">
                  {wikiSlug}
                </code>
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={wikiSlug}
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>

            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleDelete}
                disabled={deleteConfirmText !== wikiSlug || deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Scheduling…" : "Schedule Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
