"use client"

import Link from 'next/link'
import { useState } from 'react'

type Props = {
  href: string
  displayName: string
  gradeLabel: string
  domainLabel: string
  initials: string
}

export default function WikiCard({ href, displayName, gradeLabel, domainLabel, initials }: Props) {
  const [blob, setBlob] = useState({ x: 50, y: 50, active: false })

  const handlePointerMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setBlob({ x, y, active: true })
  }

  const handlePointerLeave = () => {
    setBlob((curr) => ({ ...curr, active: false }))
  }

  return (
    <Link
      href={href}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      className="group relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 px-6 py-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition duration-300 hover:border-[#f05d4e]/50 hover:bg-white/10 hover:-translate-y-1"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(200px circle at ${blob.x}% ${blob.y}%, rgba(240,93,78,0.35), transparent 70%)`,
          opacity: blob.active ? 1 : 0,
        }}
      />
      <div className="relative space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-[#f05d4e]/20 text-[#f05d4e] flex items-center justify-center text-lg font-semibold animate-[pulse_6s_ease-in-out_infinite]">
          {initials}
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Wiki</p>
          <h2 className="text-2xl font-bold text-white">{displayName}</h2>
          <p className="text-sm text-white/70">{gradeLabel}</p>
        </div>
        <div className="pt-4 text-sm text-white/80 flex items-center justify-between">
          {domainLabel && (
            <span className="font-mono text-xs tracking-wider text-white/60">{domainLabel}</span>
          )}
          <span className="text-[#f05d4e] font-semibold group-hover:translate-x-1 transition">Visit →</span>
        </div>
      </div>
    </Link>
  )
}
