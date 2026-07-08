"use client"

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, CheckCircle2, Loader2, Mail, ShieldCheck, Trash2, UserRound } from 'lucide-react'

type Account = {
  source: 'user' | 'developer'
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
  canUploadAvatar: boolean
}

type Props = {
  account: Account
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  const parts = source.split(/\s+/)
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export default function AdminProfileClient({ account: initialAccount }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [account, setAccount] = useState(initialAccount)
  const [name, setName] = useState(initialAccount.name || '')
  const [email, setEmail] = useState(initialAccount.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function saveProfile() {
    setSavingProfile(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save profile.')
      setAccount(data.account)
      setName(data.account.name || '')
      setEmail(data.account.email)
      setMessage('Profile updated.')
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Could not save profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword() {
    setError(null)
    setMessage(null)
    if (!newPassword) {
      setError('Enter a new password.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not change password.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Password changed.')
    } catch (e: any) {
      setError(e?.message || 'Could not change password.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.')
      return
    }

    setAvatarBusy(true)
    setError(null)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/auth/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not upload profile image.')
      setAccount((current) => ({ ...current, avatarUrl: data.avatarUrl }))
      setMessage('Profile image updated.')
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Could not upload profile image.')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function removeAvatar() {
    if (!window.confirm('Remove your profile image?')) return
    setAvatarBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/avatar', { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Could not remove profile image.')
      setAccount((current) => ({ ...current, avatarUrl: null }))
      setMessage('Profile image removed.')
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Could not remove profile image.')
    } finally {
      setAvatarBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-[#EAECF1] bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] text-3xl font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(226,59,46,0.75)]">
            {account.avatarUrl ? (
              <img src={account.avatarUrl} alt={account.name || account.email} className="h-full w-full object-cover" />
            ) : (
              initials(account.name, account.email)
            )}
            {account.canUploadAvatar && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
                className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A1110] text-white shadow-lg transition hover:bg-[#E23B2E] disabled:opacity-60"
                aria-label="Change profile image"
              >
                {avatarBusy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelected} />

          <h1 className="mt-5 text-2xl font-extrabold text-[#0F172A]">{account.name || 'Admin user'}</h1>
          <p className="mt-1 text-base text-[#64748B]">{account.email}</p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FDECE9] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#E23B2E]">
            <ShieldCheck size={14} />
            {account.source === 'user' ? 'Admin account' : 'Developer admin'}
          </span>

          {account.canUploadAvatar ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
                className="rounded-xl bg-[#1A1110] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#30201E] disabled:opacity-60"
              >
                Upload image
              </button>
              {account.avatarUrl && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={avatarBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E6EC] px-4 py-2.5 text-sm font-bold text-[#64748B] transition hover:bg-[#FAFBFC] hover:text-[#E23B2E] disabled:opacity-60"
                >
                  <Trash2 size={15} /> Remove
                </button>
              )}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-[#E2E6EC] bg-[#FAFBFC] px-4 py-3 text-sm text-[#64748B]">
              Profile images are available for admin user accounts. This legacy developer account can still update name, email, and password.
            </p>
          )}
        </div>
      </section>

      <div className="space-y-6">
        {(message || error) && (
          <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {!error && <CheckCircle2 size={17} />}
            {error || message}
          </div>
        )}

        <section className="rounded-2xl border border-[#EAECF1] bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDECE9] text-[#E23B2E]">
              <UserRound size={19} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A]">Profile details</h2>
              <p className="text-sm text-[#64748B]">Update the identity shown around the admin panel.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-[#475569]">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-[46px] w-full rounded-xl border border-[#E2E6EC] bg-white px-4 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10"
                placeholder="Admin name"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-[#475569]">Email</span>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-[46px] w-full rounded-xl border border-[#E2E6EC] bg-white pl-10 pr-4 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10"
                  placeholder="admin@example.com"
                />
              </div>
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={saveProfile}
              disabled={savingProfile}
              className="inline-flex min-w-[132px] items-center justify-center rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] px-5 py-2.5 text-base font-bold text-white shadow-[0_8px_20px_-8px_rgba(226,59,46,0.75)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
            >
              {savingProfile ? <Loader2 size={18} className="animate-spin" /> : 'Save profile'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#EAECF1] bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDECE9] text-[#E23B2E]">
              <ShieldCheck size={19} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A]">Password</h2>
              <p className="text-sm text-[#64748B]">Use at least 8 characters. Your current password is required.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-[#475569]">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-[46px] w-full rounded-xl border border-[#E2E6EC] bg-white px-4 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-[#475569]">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-[46px] w-full rounded-xl border border-[#E2E6EC] bg-white px-4 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-[#475569]">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-[46px] w-full rounded-xl border border-[#E2E6EC] bg-white px-4 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10"
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={savePassword}
              disabled={savingPassword}
              className="inline-flex min-w-[150px] items-center justify-center rounded-xl border border-[#1A1110] bg-[#1A1110] px-5 py-2.5 text-base font-bold text-white transition hover:bg-[#30201E] disabled:opacity-60"
            >
              {savingPassword ? <Loader2 size={18} className="animate-spin" /> : 'Change password'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
