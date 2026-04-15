"use client"

import Link from 'next/link'

type Props = {
  href: string
  displayName: string
  description: string
  gradeLabel: string
  initials: string
}

export default function WikiCard({ href, displayName, description, gradeLabel, initials }: Props) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-gray-100 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:border-[#f05d4e]/30 hover:-translate-y-1"
    >
      <div className="space-y-5">
        {/* Top row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-[#ffefed] text-[#f05d4e] flex items-center justify-center text-lg font-bold">
            {initials}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-gray-500">
              WIKI
            </span>
            <span className="rounded-full bg-[#f2fbf4] px-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#2cb65d]">
              {gradeLabel}
            </span>
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-2.5">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{displayName}</h2>
          <p className="text-[13px] sm:text-sm text-gray-500 leading-relaxed max-w-sm line-clamp-3">{description}</p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="pt-8 mt-auto">
        <span className="text-[#f05d4e] font-semibold text-sm group-hover:translate-x-1.5 transition-transform inline-block">Visit →</span>
      </div>
    </Link>
  )
}

