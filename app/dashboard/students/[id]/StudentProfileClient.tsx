"use client"

import type { FormEvent, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, Clock, RotateCcw, Route, Save, ShieldOff, Trash2, UserRound } from 'lucide-react'
import PrettySelect from '@/components/ui/PrettySelect'
import { formatUtcDate } from '@/lib/format-date'

type StudentHistory = {
  id: string
  wikiSlug: string
  wikiName: string
  status: string
  joinedAt: string
  removedAt: string | null
  linkActive: boolean
  linkDisabledAt: string | null
  teacher: { id: string; name: string | null; email: string }
  completed: number
  inProgress: number
  total: number
  lastActivity: string | null
}

export type StudentProfileData = {
  student: { id: string; email: string; name: string | null; avatarUrl: string | null; createdAt: string; updatedAt: string; disabledAt: string | null }
  history: StudentHistory[]
  tracks: { id: string; name: string; description: string | null; assignedAt: string; wikis: { slug: string; displayName: string }[]; completed: number; inProgress: number; total: number }[]
  overallProgress: { completed: number; total: number; wikiCount: number }
  wikiOptions: { slug: string; displayName: string }[]
}

type ConfirmState = {
  title: string
  body: string
  confirmLabel: string
  tone: 'danger' | 'warning'
  onConfirm: () => Promise<void>
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  const parts = source.split(/\s+/)
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : source.slice(0, 2).toUpperCase()
}

function pct(completed: number, total: number) {
  return total ? Math.round((completed / total) * 100) : 0
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">{label}</p>
      <div className="mt-1.5 text-base font-bold text-[#0F172A]">{value}</div>
    </div>
  )
}

function ConfirmDialog({ confirm, busy, onClose }: { confirm: ConfirmState; busy: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)]">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${confirm.tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-xl font-extrabold text-[#0F172A]">{confirm.title}</h2>
        <p className="mt-2 text-base leading-7 text-[#64748B]">{confirm.body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-[#E2E6EC] bg-white px-4 py-2 text-base font-bold text-[#334155] disabled:opacity-60">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm.onConfirm()}
            className={`rounded-xl px-4 py-2 text-base font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.5)] disabled:opacity-60 ${confirm.tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            {busy ? 'Working...' : confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StudentProfileClient({ profile }: { profile: StudentProfileData }) {
  const router = useRouter()
  const [name, setName] = useState(profile.student.name ?? '')
  const [email, setEmail] = useState(profile.student.email)
  const [selectedWiki, setSelectedWiki] = useState(profile.wikiOptions[0]?.slug ?? '')
  const [resetWiki, setResetWiki] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  const totals = useMemo(() => {
    const active = profile.history.filter(h => h.status === 'active').length
    return { uniqueWikis: profile.overallProgress.wikiCount, completed: profile.overallProgress.completed, total: profile.overallProgress.total, active }
  }, [profile.history, profile.overallProgress])

  async function patch(body: Record<string, unknown>, success: string) {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/students/${profile.student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Action failed')
      setStatus(success)
      setConfirm(null)
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    await patch({ action: 'updateProfile', name, email }, 'Profile updated.')
  }

  async function deleteAccount() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/students/${profile.student.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Delete failed')
      router.push('/dashboard/students')
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
      setBusy(false)
    }
  }

  const selectedWikiName = profile.wikiOptions.find(w => w.slug === selectedWiki)?.displayName ?? selectedWiki
  const resetWikiName = resetWiki ? profile.wikiOptions.find(w => w.slug === resetWiki)?.displayName ?? resetWiki : 'all wikis'

  return (
    <div className="space-y-5">
      <Link href="/dashboard/students" className="inline-flex items-center gap-2 text-sm font-bold text-[#64748B] transition hover:text-[#E23B2E]">
        <ArrowLeft size={16} /> Back to students
      </Link>

      <section className="rounded-3xl border border-[#EAECF1] bg-white p-5 shadow-[0_16px_50px_-34px_rgba(15,23,42,0.35)]">
        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="flex min-w-0 items-center gap-5">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] text-3xl font-extrabold text-white ring-1 ring-black/5">
              {profile.student.avatarUrl ? <Image src={profile.student.avatarUrl} alt={profile.student.name || profile.student.email} fill sizes="96px" className="object-cover" /> : initials(profile.student.name, profile.student.email)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E23B2E]">Student profile</p>
              <h1 className="mt-1 truncate text-3xl font-extrabold tracking-tight text-[#0F172A]">{profile.student.name || 'Unnamed student'}</h1>
              <p className="mt-1 truncate text-base font-semibold text-[#64748B]">{profile.student.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#FDF3F1] px-3 py-1 text-sm font-bold text-[#E23B2E]">{totals.active} active enrollments</span>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">{profile.tracks.length} tracks</span>
                <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-sm font-bold text-[#475569]">{pct(totals.completed, totals.total)}% complete</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#FAFBFC] p-4">
            <Field label="Joined" value={formatUtcDate(profile.student.createdAt)} />
            <Field label="Last update" value={formatUtcDate(profile.student.updatedAt)} />
            <Field label="Wikis" value={`${totals.uniqueWikis} total`} />
            <Field label="Lessons" value={`${totals.completed} / ${totals.total}`} />
          </div>
        </div>
      </section>

      {(error || status) && (
        <p className={`rounded-2xl border px-4 py-3 text-base font-bold ${error ? 'border-red-200 bg-red-50 text-red-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || status}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
        <div className="space-y-5">
          <form onSubmit={saveProfile} className="rounded-3xl border border-[#EAECF1] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <UserRound size={19} className="text-[#E23B2E]" />
              <h2 className="text-xl font-extrabold">Profile details</h2>
            </div>
            <label className="block text-sm font-bold text-[#64748B]">
              Name
              <input value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#E2E6EC] px-3 py-2.5 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10" />
            </label>
            <label className="mt-4 block text-sm font-bold text-[#64748B]">
              Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#E2E6EC] px-3 py-2.5 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10" />
            </label>
            <button disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#E23B2E] px-4 py-2.5 text-base font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(226,59,46,0.7)] disabled:opacity-60">
              <Save size={17} /> Save changes
            </button>
          </form>

          <section className="rounded-3xl border border-[#EAECF1] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <ShieldOff size={19} className="text-[#E23B2E]" />
              <h2 className="text-xl font-extrabold">Access and progress</h2>
            </div>
            <div className="space-y-3">
              <PrettySelect
                value={selectedWiki}
                onValueChange={setSelectedWiki}
                ariaLabel="Wiki access"
                options={profile.wikiOptions.map(w => ({ value: w.slug, label: w.displayName }))}
              />
              <button
                disabled={!selectedWiki || busy}
                onClick={() => setConfirm({
                  title: 'Revoke wiki access?',
                  body: `This removes ${profile.student.email} from ${selectedWikiName} and unassigns any track that grants it. Their lesson history remains visible.`,
                  confirmLabel: 'Revoke access',
                  tone: 'warning',
                  onConfirm: () => patch({ action: 'removeFromWiki', wikiSlug: selectedWiki }, 'Wiki access revoked.'),
                })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-base font-extrabold text-amber-700 disabled:opacity-60"
              >
                <ShieldOff size={17} /> Revoke selected wiki
              </button>
              <button
                disabled={busy}
                onClick={() => setConfirm({
                  title: 'Revoke all wiki access?',
                  body: `This removes ${profile.student.email} from every active wiki and track. This does not delete their account or lesson history.`,
                  confirmLabel: 'Revoke all access',
                  tone: 'warning',
                  onConfirm: () => patch({ action: 'removeFromAllWikis' }, 'All active wiki access revoked.'),
                })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-base font-extrabold text-amber-700 disabled:opacity-60"
              >
                <ShieldOff size={17} /> Revoke all wikis
              </button>
            </div>
            <div className="mt-5 border-t border-[#EAECF1] pt-5">
              <PrettySelect
                value={resetWiki}
                onValueChange={setResetWiki}
                ariaLabel="Reset progress"
                options={[{ value: '', label: 'All wikis' }, ...profile.wikiOptions.map(w => ({ value: w.slug, label: w.displayName }))]}
              />
              <button
                disabled={busy}
                onClick={() => setConfirm({
                  title: 'Reset progress?',
                  body: `This clears lesson progress for ${profile.student.email} on ${resetWikiName}. Enrollment history stays in place.`,
                  confirmLabel: 'Reset progress',
                  tone: 'warning',
                  onConfirm: () => patch({ action: 'resetProgress', wikiSlug: resetWiki }, 'Progress reset.'),
                })}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E2E6EC] bg-white px-4 py-2.5 text-base font-extrabold text-[#334155] disabled:opacity-60"
              >
                <RotateCcw size={17} /> Reset progress
              </button>
            </div>
            <button
              disabled={busy}
              onClick={() => setConfirm({
                title: 'Delete student account?',
                body: `This permanently deletes ${profile.student.email}, including sessions, enrollments, and lesson progress. This cannot be undone.`,
                confirmLabel: 'Delete account',
                tone: 'danger',
                onConfirm: deleteAccount,
              })}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-base font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.7)] disabled:opacity-60"
            >
              <Trash2 size={17} /> Delete account
            </button>
          </section>
        </div>

        <section className="rounded-3xl border border-[#EAECF1] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {profile.tracks.length > 0 && <>
            <div className="border-b border-[#EAECF1] p-5"><div className="flex items-center gap-2"><Route size={19} className="text-indigo-600" /><h2 className="text-xl font-extrabold">Assigned tracks</h2></div><p className="mt-1 text-sm font-semibold text-[#64748B]">Track progress uses the same lesson completions shown in wiki history.</p></div>
            <div className="divide-y divide-[#EAECF1] border-b border-[#EAECF1]">{profile.tracks.map(track => <article key={track.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold text-[#0F172A]">{track.name}</h3><p className="mt-1 text-sm font-semibold text-[#64748B]">{track.wikis.map(wiki => wiki.displayName).join(' → ')}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-extrabold text-indigo-700">{pct(track.completed, track.total)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E9EEF5]"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct(track.completed, track.total)}%` }} /></div><p className="mt-2 text-xs font-bold text-[#64748B]">{track.completed} of {track.total} lessons completed · {track.inProgress} in progress</p></article>)}</div>
          </>}
          <div className="border-b border-[#EAECF1] p-5">
            <div className="flex items-center gap-2">
              <BookOpen size={19} className="text-[#E23B2E]" />
              <h2 className="text-xl font-extrabold">Project history</h2>
            </div>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">Enrollment, access, teacher, and progress history across this project.</p>
          </div>
          <div className="divide-y divide-[#EAECF1]">
            {profile.history.length === 0 ? (
              <p className="p-8 text-center text-base font-semibold text-[#64748B]">No student history yet.</p>
            ) : profile.history.map(item => (
              <article key={item.id} className="p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-[#0F172A]">{item.wikiName}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F1F3F7] text-[#64748B]'}`}>{item.status}</span>
                      {!item.linkActive && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold uppercase text-amber-700">link disabled</span>}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#64748B]">Teacher: {item.teacher.name || item.teacher.email}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Field label="Joined" value={formatUtcDate(item.joinedAt)} />
                      <Field label="Removed" value={item.removedAt ? formatUtcDate(item.removedAt) : 'No'} />
                      <Field label="Last activity" value={item.lastActivity ? formatUtcDate(item.lastActivity) : 'Never'} />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#FAFBFC] p-4">
                    <div className="flex items-center justify-between text-sm font-bold text-[#64748B]">
                      <span>Progress</span>
                      <span>{pct(item.completed, item.total)}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E9EEF5]">
                      <div className="h-full rounded-full bg-[#E23B2E]" style={{ width: `${pct(item.completed, item.total)}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-bold">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={15} /> {item.completed} done</span>
                      <span className="inline-flex items-center gap-1.5 text-amber-700"><Clock size={15} /> {item.inProgress} active</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {confirm && <ConfirmDialog confirm={confirm} busy={busy} onClose={() => !busy && setConfirm(null)} />}
    </div>
  )
}
