"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Edit3, Loader2, Plus, Route, Trash2, Users, X } from 'lucide-react'

type Wiki = { slug: string; displayName: string; picture: string | null }
type Student = { id: string; name: string | null; email: string; avatarUrl: string | null }
type Track = {
  id: string
  name: string
  description: string | null
  createdByName: string | null
  createdByEmail: string | null
  createdByType: string
  canEditStructure: boolean
  canAssign: boolean
  wikis: { id: string; wikiSlug: string; position: number; wiki: Wiki }[]
  assignments: { id: string; studentId: string; student: Student; progress: { completed: number; total: number; percent: number } }[]
}

type FormState = { name: string; description: string; wikiSlugs: string[]; studentIds: string[] }
const EMPTY_FORM: FormState = { name: '', description: '', wikiSlugs: [], studentIds: [] }

function initials(student: Student) {
  const source = student.name?.trim() || student.email
  const words = source.split(/\s+/)
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : source.slice(0, 2)).toUpperCase()
}

export default function TrackManager({ audience }: { audience: 'teacher' | 'admin' }) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [wikis, setWikis] = useState<Wiki[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [studentQuery, setStudentQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/tracks', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load tracks')
      setTracks(data.tracks || [])
      setWikis(data.wikis || [])
      setStudents(data.students || [])
    } catch (err: any) {
      setError(err.message || 'Could not load tracks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase()
    return query ? students.filter((student) => `${student.name || ''} ${student.email}`.toLowerCase().includes(query)) : students
  }, [studentQuery, students])
  const editingTrack = editingId ? tracks.find((track) => track.id === editingId) ?? null : null
  const structureEditable = !editingTrack || editingTrack.canEditStructure

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setStudentQuery('')
    setError(null)
    setEditorOpen(true)
  }

  function openEdit(track: Track) {
    if (!track.canEditStructure && !track.canAssign) return
    setEditingId(track.id)
    setForm({ name: track.name, description: track.description || '', wikiSlugs: track.wikis.map((wiki) => wiki.wikiSlug), studentIds: track.assignments.map((assignment) => assignment.studentId) })
    setStudentQuery('')
    setError(null)
    setEditorOpen(true)
  }

  function toggle(key: 'wikiSlugs' | 'studentIds', id: string) {
    setForm((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] }))
  }

  function moveWiki(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= form.wikiSlugs.length) return
    setForm((current) => {
      const wikiSlugs = [...current.wikiSlugs]
      ;[wikiSlugs[index], wikiSlugs[target]] = [wikiSlugs[target], wikiSlugs[index]]
      return { ...current, wikiSlugs }
    })
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(editingId ? `/api/tracks/${editingId}` : '/api/tracks', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save track')
      setEditorOpen(false)
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not save track')
    } finally {
      setSaving(false)
    }
  }

  async function remove(track: Track) {
    if (!window.confirm(`Delete “${track.name}”? Student lesson progress will be kept.`)) return
    const response = await fetch(`/api/tracks/${track.id}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok) { setError(data.error || 'Could not delete track'); return }
    await load()
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E94335]">Learning paths</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">Tracks</h1><p className="mt-2 text-sm font-medium text-slate-500">Group wikis into a guided path and assign students. Progress is calculated from completed lessons.</p></div>
        <button onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E94335] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#d83b2e]"><Plus size={17} /> New track</button>
      </header>

      {error && !editorOpen && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? <div className="flex min-h-56 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin" size={20} /> Loading tracks…</div> : tracks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Route className="mx-auto text-slate-300" size={42} /><h2 className="mt-4 text-lg font-bold text-slate-900">No tracks yet</h2><p className="mt-1 text-sm text-slate-500">Create the first guided set of wikis for your students.</p></div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {tracks.map((track) => (
            <article key={track.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Route size={18} className="text-[#E94335]" /><h2 className="truncate text-xl font-extrabold text-slate-950">{track.name}</h2></div>{track.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{track.description}</p>}</div><div className="flex shrink-0 gap-1">{(track.canEditStructure || track.canAssign) && <button onClick={() => openEdit(track)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800" aria-label={`${track.canEditStructure ? 'Edit' : 'Assign students to'} ${track.name}`}>{track.canEditStructure ? <Edit3 size={16} /> : <Users size={16} />}</button>}{track.canEditStructure && <button onClick={() => remove(track)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${track.name}`}><Trash2 size={16} /></button>}</div></div>
                <p className="mt-3 text-xs font-semibold text-slate-400">Created by {track.createdByName || track.createdByEmail || track.createdByType}{!track.canAssign && audience === 'teacher' ? ' · Your account does not include every wiki in this track' : ''}</p>
              </div>
              <div className="p-5"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{track.wikis.length} wikis in order</p><div className="flex flex-wrap gap-2">{track.wikis.map((item, index) => <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 py-1.5 pl-2 pr-3 text-xs font-bold text-slate-700"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-[#E94335]">{index + 1}</span>{item.wiki.displayName}</span>)}</div></div>
              <button onClick={() => setExpanded(expanded === track.id ? null : track.id)} className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50"><span className="inline-flex items-center gap-2"><Users size={16} /> {track.assignments.length} assigned students</span>{expanded === track.id ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>
              {expanded === track.id && <div className="divide-y divide-slate-100 border-t border-slate-100">{track.assignments.length === 0 ? <p className="px-5 py-5 text-sm text-slate-500">No students assigned yet.</p> : track.assignments.map((assignment) => <div key={assignment.id} className="flex items-center gap-3 px-5 py-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">{initials(assignment.student)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{assignment.student.name || assignment.student.email}</p><p className="truncate text-xs text-slate-400">{assignment.student.email}</p></div><div className="w-28"><div className="flex justify-between text-[11px] font-bold text-slate-500"><span>{assignment.progress.completed}/{assignment.progress.total}</span><span>{assignment.progress.percent}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${assignment.progress.percent}%` }} /></div></div></div>)}</div>}
            </article>
          ))}
        </div>
      )}

      {editorOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><form onSubmit={save} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4"><div><h2 className="text-xl font-extrabold text-slate-950">{editingId ? (structureEditable ? 'Edit track' : 'Assign students') : 'Create a track'}</h2><p className="text-sm text-slate-500">{structureEditable ? 'Choose wikis, set their order, and assign students.' : 'This shared track is read-only; you can manage your own students.'}</p></div><button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div><div className="space-y-7 p-6">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-1"><span className="mb-1.5 block text-sm font-bold text-slate-700">Track name</span><input required disabled={!structureEditable} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E94335] disabled:bg-slate-100 disabled:text-slate-500" placeholder="Robotics foundations" /></label><label className="sm:col-span-1"><span className="mb-1.5 block text-sm font-bold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></span><input disabled={!structureEditable} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#E94335] disabled:bg-slate-100 disabled:text-slate-500" placeholder="A guided learning path" /></label></div>
        <section><div className="mb-3 flex items-center justify-between"><div><h3 className="font-extrabold text-slate-900">Wikis</h3><p className="text-xs text-slate-500">{structureEditable ? 'Select at least one. Use arrows to set the track order.' : 'The track creator controls its wikis and order.'}</p></div><span className="text-xs font-bold text-[#E94335]">{form.wikiSlugs.length} selected</span></div><div className="grid gap-2 sm:grid-cols-2">{wikis.map((wiki) => { const selected = form.wikiSlugs.includes(wiki.slug); const index = form.wikiSlugs.indexOf(wiki.slug); return <div key={wiki.slug} className={`flex items-center gap-2 rounded-lg border p-2.5 ${selected ? 'border-[#E94335] bg-red-50/50' : 'border-slate-200'}`}><button type="button" disabled={!structureEditable} onClick={() => toggle('wikiSlugs', wiki.slug)} className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-[#E94335] bg-[#E94335] text-white' : 'border-slate-300'}`}>{selected && <Check size={13} />}</span><span className="truncate text-sm font-bold text-slate-700">{wiki.displayName}</span></button>{selected && <><span className="text-xs font-extrabold text-slate-400">#{index + 1}</span><button type="button" onClick={() => moveWiki(index, -1)} disabled={!structureEditable || index === 0} className="p-1 text-slate-500 disabled:opacity-20"><ChevronUp size={15} /></button><button type="button" onClick={() => moveWiki(index, 1)} disabled={!structureEditable || index === form.wikiSlugs.length - 1} className="p-1 text-slate-500 disabled:opacity-20"><ChevronDown size={15} /></button></>}</div> })}</div></section>
        <section><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-extrabold text-slate-900">Students</h3><p className="text-xs text-slate-500">{audience === 'teacher' ? 'Only your active students are available.' : 'All active student accounts are available.'}</p></div><input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#E94335]" placeholder="Search students" /></div><div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">{filteredStudents.length === 0 ? <p className="p-5 text-center text-sm text-slate-500">No eligible students found.</p> : filteredStudents.map((student) => { const selected = form.studentIds.includes(student.id); return <button key={student.id} type="button" onClick={() => toggle('studentIds', student.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-[#E94335] bg-[#E94335] text-white' : 'border-slate-300'}`}>{selected && <Check size={13} />}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{student.name || student.email}</p><p className="truncate text-xs text-slate-400">{student.email}</p></div></button> })}</div></section>
      </div><div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4"><button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#E94335] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving && <Loader2 size={15} className="animate-spin" />}{editingId ? (structureEditable ? 'Save changes' : 'Update assignments') : 'Create track'}</button></div></form></div>}
    </div>
  )
}
