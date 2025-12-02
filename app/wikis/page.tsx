import Link from 'next/link'
import { getWikis } from '@/lib/data'

const gradient = 'bg-[radial-gradient(circle_at_top,_#f05d4e_0%,_#ff9a8f_40%,_#1f1f1f_100%)]'

export default function WikisLandingPage() {
  const wikis = getWikis()

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white relative overflow-hidden">
      <div className={`absolute inset-0 opacity-60 blur-3xl ${gradient}`} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1f1f1f]/60 via-transparent to-[#0c0c0c]" />
      <div className="relative mx-auto max-w-6xl px-6 py-16 space-y-16">
        <header className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 px-5 py-2 backdrop-blur">
              <img src="/images/robogeex-logo.png" alt="RoboGeex Academy" className="h-8 w-auto" />
              <span className="text-sm uppercase tracking-[0.4em] text-white/70">RoboGeex</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            Discover every <span className="text-[#f05d4e]">Learning Wiki</span>
          </h1>
          <p className="text-lg text-white/70 max-w-3xl mx-auto">
            Choose a kit to explore lessons, activities, and teacher resources. Ziggy & Clicky have dedicated domains; everything else lives here on the hub.
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
              <span className="text-white/70">Primary</span> <span className="font-semibold text-white">#f05d4e</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
              <span className="text-white/70">Secondary</span> <span className="font-semibold text-white">#1f1f1f</span>
            </div>
          </div>
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
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl transition hover:border-[#f05d4e]/50 hover:bg-white/15"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition" />
                <div className="relative space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#f05d4e]/20 text-[#f05d4e] flex items-center justify-center text-lg font-semibold">
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
