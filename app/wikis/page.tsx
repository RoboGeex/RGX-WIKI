import Link from 'next/link'
import { getWikis } from '@/lib/data'

const gradient = 'bg-[radial-gradient(circle_at_top,_#f05d4e_0%,_#3b0500_45%,_#060505_100%)]'

export default function WikisLandingPage() {
  const wikis = getWikis()

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      <div className={`absolute inset-0 opacity-80 blur-[160px] ${gradient} animate-[pulse_9s_ease-in-out_infinite]`} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#090909]/80 to-black" />
      <div className="relative mx-auto max-w-6xl px-6 py-16 space-y-16">
        <header className="space-y-6 text-center">
          <div className="relative flex justify-center">
            <div className="absolute w-60 h-60 bg-[#f05d4e]/30 blur-3xl rounded-full -translate-y-6 animate-[spin_25s_linear_infinite]" />
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-[#f05d4e]/30 to-transparent blur-2xl rounded-[36px] animate-[pulse_8s_ease-in-out_infinite]" />
            <div className="relative rounded-[36px] border border-white/10 bg-black/40 px-10 py-8 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.6)]">
              <img
                src="/images/robogeex-logo.png"
                alt="RoboGeex Academy Logo"
                className="mx-auto h-24 md:h-28 drop-shadow-[0_20px_60px_rgba(240,93,78,0.45)]"
              />
              <p className="mt-4 text-sm uppercase tracking-[0.4em] text-white/60 opacity-80 animate-[pulse_6s_ease-in-out_infinite]">
                Innovation In Your Hand
              </p>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            Discover every <span className="text-[#f05d4e]">Learning Wiki</span>
          </h1>
          <p className="text-lg text-white/70 max-w-3xl mx-auto">
            Choose a kit to explore lessons, activities, and teacher resources across the RoboGeex universe.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wikis.map((wiki) => {
            const displayName = wiki.displayName || wiki.slug
            const primaryDomain = (wiki.domains || []).find((domain) => domain && domain.trim())
            const hasDedicatedDomain = Boolean(primaryDomain && primaryDomain.trim().length)
            const normalizedDomain = primaryDomain?.replace(/https?:\/\//i, '').replace(/\/$/, '')
            const locale = wiki.defaultLocale || 'en'
            const defaultLessonSlug = wiki.defaultLessonSlug || 'getting-started'
            const href = hasDedicatedDomain
              ? `https://${normalizedDomain}`
              : `/${wiki.slug}/${locale}/${defaultLessonSlug}`

            return (
              <Link
                key={wiki.slug}
                href={href}
                className="group relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 px-6 py-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition duration-300 hover:border-[#f05d4e]/60 hover:bg-[#f05d4e]/10 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition" />
                <div className="relative space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#f05d4e]/20 text-[#f05d4e] flex items-center justify-center text-lg font-semibold animate-[pulse_6s_ease-in-out_infinite]">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/60">Wiki</p>
                    <h2 className="text-2xl font-bold text-white">{displayName}</h2>
                    <p className="text-sm text-white/70">
                      {'grade' in wiki && typeof (wiki as any).grade === 'string'
                        ? (wiki as any).grade
                        : 'All grades'}
                    </p>
                  </div>
                  <div className="pt-4 text-sm text-white/80 flex items-center justify-between">
                    <span className="font-mono text-xs tracking-wider text-white/60">
                      {hasDedicatedDomain ? normalizedDomain : `${wiki.slug}.hub`}
                    </span>
                    <span className="text-[#f05d4e] font-semibold group-hover:translate-x-1 transition">Visit →</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
