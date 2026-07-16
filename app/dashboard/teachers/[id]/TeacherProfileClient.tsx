"use client"

import type { FormEvent, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, Clock, KeyRound, Link2, RotateCcw, Save, ShieldOff, Trash2, UserRound } from 'lucide-react'
import PrettySelect from '@/components/ui/PrettySelect'
import { formatUtcDate } from '@/lib/format-date'

type TeacherEnrollmentHistory = {
  id: string
  wikiSlug: string
  wikiName: string
  status: string
  joinedAt: string
  removedAt: string | null
  student: { id: string; name: string | null; email: string; avatarUrl: string | null }
  completed: number
  inProgress: number
  total: number
  lastActivity: string | null
}

type TeacherLink = {
  id: string
  wikiSlug: string
  wikiName: string
  isActive: boolean
  createdAt: string
  disabledAt: string | null
  enrollmentCount: number
}

export type TeacherProfileData = {
  teacher: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
    assignedWikiSlugs: string[]
    disabledAt: string | null
    createdAt: string
    updatedAt: string
    createdByName: string | null
    createdByEmail: string | null
  }
  allWikis: { slug: string; displayName: string }[]
  links: TeacherLink[]
  enrollmentHistory: TeacherEnrollmentHistory[]
  lastLoginAt: string | null
  canResetPassword: boolean
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

export default function TeacherProfileClient({ profile }: { profile: TeacherProfileData }) {
  const router = useRouter()
  const [name, setName] = useState(profile.teacher.name ?? '')
  const [email, setEmail] = useState(profile.teacher.email)
  const [assigned, setAssigned] = useState<string[]>(profile.teacher.assignedWikiSlugs)
  const [selectedWiki, setSelectedWiki] = useState(profile.teacher.assignedWikiSlugs[0] ?? profile.allWikis[0]?.slug ?? '')
  const [resetWiki, setResetWiki] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const totals = useMemo(() => {
    const students = new Set(profile.enrollmentHistory.map(h => h.student.id)).size
    const completed = profile.enrollmentHistory.reduce((sum, h) => sum + h.completed, 0)
    const total = profile.enrollmentHistory.reduce((sum, h) => sum + h.total, 0)
    const activeEnrollments = profile.enrollmentHistory.filter(h => h.status === 'active').length
    return { students, completed, total, activeEnrollments }
  }, [profile.enrollmentHistory])

  function toggleWiki(slug: string) {
    setAssigned(current => current.includes(slug) ? current.filter(item => item !== slug) : [...current, slug])
  }

  async function patch(body: Record<string, unknown>, success: string, onSuccess?: () => void) {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/teachers/${profile.teacher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Action failed')
      setStatus(success)
      onSuccess?.()
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
    await patch({ action: 'updateTeacher', name, email, assignedWikiSlugs: assigned }, 'Teacher profile updated.')
  }

  async function resetTeacherPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('The password confirmation does not match.'); return }
    await patch(
      { action: 'resetPassword', newPassword },
      'Teacher password reset. Existing sessions were signed out.',
      () => { setNewPassword(''); setConfirmPassword('') },
    )
  }

  async function deleteAccount() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/teachers/${profile.teacher.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Delete failed')
      router.push('/dashboard/teachers')
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
      setBusy(false)
    }
  }

  const selectedWikiName = profile.allWikis.find(w => w.slug === selectedWiki)?.displayName ?? selectedWiki
  const resetWikiName = resetWiki ? profile.allWikis.find(w => w.slug === resetWiki)?.displayName ?? resetWiki : 'all assigned wikis'

  return (
    <div className="space-y-5">
      <Link href="/dashboard/teachers" className="inline-flex items-center gap-2 text-sm font-bold text-[#64748B] transition hover:text-[#E23B2E]">
        <ArrowLeft size={16} /> Back to teachers
      </Link>

      <section className="rounded-3xl border border-[#EAECF1] bg-white p-5 shadow-[0_16px_50px_-34px_rgba(15,23,42,0.35)]">
        <div className="grid gap-5 lg:grid-cols-[1fr_430px]">
          <div className="flex min-w-0 items-center gap-5">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] text-3xl font-extrabold text-white ring-1 ring-black/5">
              {profile.teacher.avatarUrl ? <Image src={profile.teacher.avatarUrl} alt={profile.teacher.name || profile.teacher.email} fill sizes="96px" className="object-cover" /> : initials(profile.teacher.name, profile.teacher.email)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E23B2E]">Teacher profile</p>
              <h1 className="mt-1 truncate text-3xl font-extrabold tracking-tight text-[#0F172A]">{profile.teacher.name || 'Unnamed teacher'}</h1>
              <p className="mt-1 truncate text-base font-semibold text-[#64748B]">{profile.teacher.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${profile.teacher.disabledAt ? 'bg-[#F1F3F7] text-[#64748B]' : 'bg-emerald-50 text-emerald-700'}`}>{profile.teacher.disabledAt ? 'Disabled' : 'Active'}</span>
                <span className="rounded-full bg-[#FDF3F1] px-3 py-1 text-sm font-bold text-[#E23B2E]">{assigned.length} assigned wikis</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#FAFBFC] p-4">
            <Field label="Created" value={formatUtcDate(profile.teacher.createdAt)} />
            <Field label="Last login" value={profile.lastLoginAt ? formatUtcDate(profile.lastLoginAt) : 'Never'} />
            <Field label="Students" value={`${totals.students} total`} />
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
              <h2 className="text-xl font-extrabold">Profile and wikis</h2>
            </div>
            <label className="block text-sm font-bold text-[#64748B]">
              Name
              <input value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#E2E6EC] px-3 py-2.5 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10" />
            </label>
            <label className="mt-4 block text-sm font-bold text-[#64748B]">
              Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#E2E6EC] px-3 py-2.5 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10" />
            </label>
            <div className="mt-4">
              <p className="text-sm font-bold text-[#64748B]">Assigned wikis</p>
              <div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-2xl border border-[#E2E6EC] p-2">
                {profile.allWikis.map(wiki => (
                  <label key={wiki.slug} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-[#334155] transition hover:bg-[#FAFBFC]">
                    <input type="checkbox" checked={assigned.includes(wiki.slug)} onChange={() => toggleWiki(wiki.slug)} className="h-4 w-4 accent-[#E23B2E]" />
                    {wiki.displayName}
                  </label>
                ))}
              </div>
            </div>
            <button disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#E23B2E] px-4 py-2.5 text-base font-extrabold text-white shadow-[0_8px_20px_-10px_rgba(226,59,46,0.7)] disabled:opacity-60">
              <Save size={17} /> Save changes
            </button>
          </form>

          <section className="rounded-3xl border border-[#EAECF1] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound size={19} className="text-[#E23B2E]" />
              <h2 className="text-xl font-extrabold">Admin actions</h2>
            </div>
            <button
              disabled={busy}
              onClick={() => setConfirm({
                title: profile.teacher.disabledAt ? 'Enable teacher account?' : 'Disable teacher account?',
                body: profile.teacher.disabledAt ? `${profile.teacher.email} will be able to sign in again.` : `${profile.teacher.email} will be signed out and blocked from signing in.`,
                confirmLabel: profile.teacher.disabledAt ? 'Enable account' : 'Disable account',
                tone: 'warning',
                onConfirm: () => patch({ disabled: !profile.teacher.disabledAt }, profile.teacher.disabledAt ? 'Teacher enabled.' : 'Teacher disabled.'),
              })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E2E6EC] bg-white px-4 py-2.5 text-base font-extrabold text-[#334155] disabled:opacity-60"
            >
              <KeyRound size={17} /> {profile.teacher.disabledAt ? 'Enable account' : 'Disable account'}
            </button>
            {profile.canResetPassword && (
              <form onSubmit={resetTeacherPassword} className="mt-5 border-t border-[#EAECF1] pt-5">
                <h3 className="text-base font-extrabold text-[#0F172A]">Reset teacher password</h3>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">Superadmin only. The teacher will be signed out everywhere.</p>
                <label className="mt-4 block text-sm font-bold text-[#64748B]">New password<input type="password" minLength={8} required autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#E2E6EC] px-3 py-2.5 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10" /></label>
                <label className="mt-3 block text-sm font-bold text-[#64748B]">Confirm new password<input type="password" minLength={8} required autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#E2E6EC] px-3 py-2.5 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10" /></label>
                <button disabled={busy || !newPassword || !confirmPassword} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-base font-extrabold text-white disabled:opacity-50"><KeyRound size={17} /> Reset password</button>
              </form>
            )}
            <div className="mt-5 space-y-3 border-t border-[#EAECF1] pt-5">
              <PrettySelect
                value={selectedWiki}
                onValueChange={setSelectedWiki}
                ariaLabel="Revoke wiki"
                options={profile.allWikis.map(w => ({ value: w.slug, label: w.displayName }))}
              />
              <button
                disabled={!selectedWiki || busy}
                onClick={() => setConfirm({
                  title: 'Revoke teacher wiki access?',
                  body: `This removes ${profile.teacher.email} from ${selectedWikiName}, disables active invite links for that wiki, and revokes active student enrollments under this teacher.`,
                  confirmLabel: 'Revoke access',
                  tone: 'warning',
                  onConfirm: () => patch({ action: 'revokeWiki', wikiSlug: selectedWiki }, 'Teacher wiki access revoked.'),
                })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-base font-extrabold text-amber-700 disabled:opacity-60"
              >
                <ShieldOff size={17} /> Revoke selected wiki
              </button>
              <button
                disabled={busy}
                onClick={() => setConfirm({
                  title: 'Revoke all teacher access?',
                  body: `This removes every assigned wiki from ${profile.teacher.email}, disables active invite links, and revokes active student enrollments under this teacher.`,
                  confirmLabel: 'Revoke all access',
                  tone: 'warning',
                  onConfirm: () => patch({ action: 'revokeAllWikis' }, 'All teacher wiki access revoked.'),
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
                ariaLabel="Reset student progress"
                options={[{ value: '', label: 'All assigned wikis' }, ...profile.allWikis.map(w => ({ value: w.slug, label: w.displayName }))]}
              />
              <button
                disabled={busy}
                onClick={() => setConfirm({
                  title: 'Reset student progress?',
                  body: `This clears lesson progress for students connected to ${profile.teacher.email} on ${resetWikiName}. Teacher, student, and enrollment history stays visible.`,
                  confirmLabel: 'Reset progress',
                  tone: 'warning',
                  onConfirm: () => patch({ action: 'resetProgress', wikiSlug: resetWiki }, 'Student progress reset.'),
                })}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E2E6EC] bg-white px-4 py-2.5 text-base font-extrabold text-[#334155] disabled:opacity-60"
              >
                <RotateCcw size={17} /> Reset progress
              </button>
            </div>
            <button
              disabled={busy}
              onClick={() => setConfirm({
                title: 'Delete teacher account?',
                body: `This permanently deletes ${profile.teacher.email}, their sessions, invite links, and teacher enrollment records. This cannot be undone.`,
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

        <div className="space-y-5">
          <section className="rounded-3xl border border-[#EAECF1] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#EAECF1] p-5">
              <div className="flex items-center gap-2">
                <Link2 size={19} className="text-[#E23B2E]" />
                <h2 className="text-xl font-extrabold">Invite link history</h2>
              </div>
            </div>
            <div className="divide-y divide-[#EAECF1]">
              {profile.links.length === 0 ? (
                <p className="p-8 text-center text-base font-semibold text-[#64748B]">No invite links created yet.</p>
              ) : profile.links.map(link => (
                <article key={link.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_220px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold">{link.wikiName}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase ${link.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F1F3F7] text-[#64748B]'}`}>{link.isActive ? 'active' : 'disabled'}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#64748B]">Created {formatUtcDate(link.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#FAFBFC] p-4">
                    <Field label="Enrollments" value={link.enrollmentCount} />
                    <Field label="Disabled" value={link.disabledAt ? formatUtcDate(link.disabledAt) : 'No'} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#EAECF1] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#EAECF1] p-5">
              <div className="flex items-center gap-2">
                <BookOpen size={19} className="text-[#E23B2E]" />
                <h2 className="text-xl font-extrabold">Student history</h2>
              </div>
              <p className="mt-1 text-sm font-semibold text-[#64748B]">Every student enrollment and progress record connected to this teacher.</p>
            </div>
            <div className="divide-y divide-[#EAECF1]">
              {profile.enrollmentHistory.length === 0 ? (
                <p className="p-8 text-center text-base font-semibold text-[#64748B]">No student history yet.</p>
              ) : profile.enrollmentHistory.map(item => (
                <article key={item.id} className="p-5">
                  <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold text-[#0F172A]">{item.student.name || item.student.email}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F1F3F7] text-[#64748B]'}`}>{item.status}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#64748B]">{item.student.email} on {item.wikiName}</p>
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
      </div>

      {confirm && <ConfirmDialog confirm={confirm} busy={busy} onClose={() => !busy && setConfirm(null)} />}
    </div>
  )
}
