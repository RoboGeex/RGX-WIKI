import Link from 'next/link'
import { getWikis } from '@/lib/data'

const gradient = 'bg-[radial-gradient(circle_at_top,_#fde68a_0%,_#fb7185_35%,_#312e81_100%)]'

export default function WikisLandingPage() {
  const wikis = getWikis()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className={`absolute inset-0 opacity-30 ${gradient}`} />
      <div className="relative mx-auto max-w-6xl px-6 py-16 space-y-16">
        <header className="space-y-6 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-white/70">RoboGeex</p>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            Discover every <span className="text-amber-200">Learning Wiki</span>
          </h1>
          <p className="text-lg text-white/70 max-w-3xl mx-auto">
            Choose a kit to explore lessons, activities, and teacher resources. Ziggy & Clicky have dedicated domains; everything else lives here on the hub.
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
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-6 py-8 shadow-2xl backdrop-blur transition hover:border-white/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition" />
                <div className="relative space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-semibold">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/60">Wiki</p>
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    <p className="text-sm text-white/70">
                      {'grade' in wiki && typeof (wiki as any).grade === 'string'
                        ? (wiki as any).grade
                        : 'All grades'}
                    </p>
                  </div>
                  <div className="pt-4 text-sm text-white/80 flex items-center justify-between">
                    <span>{hasDedicatedDomain ? normalizedDomain : `${wiki.slug}.hub`}</span>
                    <span className="text-white font-semibold group-hover:translate-x-1 transition">Visit →</span>
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
