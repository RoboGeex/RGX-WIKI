import { getWikis, getKits } from '@/lib/data'
import WikiCard from '@/components/wiki-card'
import Link from 'next/link'
import { Search, User } from 'lucide-react'

export default function WikisLandingPage() {
  const wikis = getWikis()
  const kits = getKits()

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-md z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/robogeex-logo.png" alt="RoboGeex" className="h-8 drop-shadow-sm" />
            </Link>
            <div className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-gray-500 tracking-wide">
              <Link href="#" className="hover:text-gray-900 transition-colors">Lessons</Link>
              <Link href="#" className="hover:text-gray-900 transition-colors">Activities</Link>
              <Link href="#" className="hover:text-gray-900 transition-colors">Teacher Resources</Link>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block w-48 lg:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search wiki..." 
                className="w-full bg-[#f6f6f6] border border-transparent rounded-full pl-11 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f05d4e]/20 focus:bg-white transition-all font-medium"
              />
            </div>
            <button className="flex items-center justify-center h-10 w-10 rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors shrink-0">
              <User size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-20 lg:py-28 space-y-24">
        <header className="text-center space-y-6 max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center justify-center bg-[#f05d4e] text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
            INNOVATION IN YOUR HAND
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-[56px] font-black text-[#1b1b29] tracking-tight leading-[1.1]">
            Discover every Learning Wiki
          </h1>
          <p className="text-lg sm:text-[19px] text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium">
            Choose a kit to explore lessons, activities, and teacher resources across the RoboGeex universe.
          </p>
        </header>

        <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {wikis.map((wiki) => {
            const displayName = wiki.displayName || wiki.slug
            const primaryDomain = (wiki.domains || []).find((domain) => domain && domain.trim())
            const hasDedicatedDomain = Boolean(primaryDomain && primaryDomain.trim().length)
            const normalizedDomain = primaryDomain?.replace(/https?:\/\//i, '').replace(/\/$/, '')
            const locale = wiki.defaultLocale || 'en'
            const defaultLessonSlug = wiki.defaultLessonSlug || 'getting-started'
            const href = hasDedicatedDomain
              ? `https://${normalizedDomain}`
              : `/${locale}/${wiki.slug}`

            // Use kit overview as description if available, otherwise fallback
            const kitMatch = kits.find(k => k.wikiSlug === wiki.slug)
            const description = kitMatch?.overview_en || `Learning content and immersive experiences for the ${displayName} kit environment.`

            const gradeLabel = 'grade' in wiki && typeof (wiki as any).grade === 'string'
              ? ((wiki as any).grade.toUpperCase() === 'ALL LEVELS' ? 'ALL LEVELS' : (wiki as any).grade.toUpperCase())
              : 'ALL LEVELS'

            return (
              <WikiCard
                key={wiki.slug}
                href={href}
                displayName={displayName}
                description={description}
                gradeLabel={gradeLabel}
                initials={displayName.slice(0, 2).toUpperCase()}
              />
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 mt-10">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
            <img src="/images/robogeex-logo.png" alt="RoboGeex" className="h-[22px]" />
            <span className="text-xs text-gray-400 font-medium">© 2024 RoboGeex. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 text-xs text-gray-500 font-semibold tracking-wide">
            <Link href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-gray-900 transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-gray-900 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

