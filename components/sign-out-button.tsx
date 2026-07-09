"use client"

import { useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Loader2, LogOut, X } from 'lucide-react'

type Props = {
  className?: string
  iconSize?: number
  children?: ReactNode
}

export default function SignOutButton({ className = '', iconSize = 18, children = 'Sign out' }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function signOut() {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <LogOut size={iconSize} />
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/45 px-4 backdrop-blur-sm" onClick={() => !loading && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FDECE9] text-[#E23B2E]">
                <AlertTriangle size={24} />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-xl p-2 text-[#94A3B8] transition hover:bg-[#F1F3F7] hover:text-[#0F172A] disabled:opacity-60"
                aria-label="Cancel sign out"
              >
                <X size={18} />
              </button>
            </div>
            <h2 className="text-xl font-extrabold text-[#0F172A]">Sign out?</h2>
            <p className="mt-2 text-base leading-7 text-[#64748B]">
              You will need to sign in again to access your dashboard.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-xl border border-[#E2E6EC] bg-white px-4 py-2 text-base font-bold text-[#334155] transition hover:bg-[#FAFBFC] disabled:opacity-60"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={signOut}
                disabled={loading}
                className="inline-flex min-w-[104px] items-center justify-center rounded-xl bg-[#1A1110] px-4 py-2 text-base font-extrabold text-white transition hover:bg-[#30201E] disabled:opacity-60"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
