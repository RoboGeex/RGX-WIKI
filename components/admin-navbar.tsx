import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Layout, Edit3, Eye } from 'lucide-react'
// Note: We can't import server-side functions in client components

interface AdminNavbarProps {
  currentWikiSlug?: string
  currentKitSlug?: string
}

export default function AdminNavbar({ currentWikiSlug, currentKitSlug }: AdminNavbarProps) {
  const pathname = usePathname()
  
  const isDashboard = pathname === '/dashboard'
  const isEditor = pathname.startsWith('/editor')
  
  // Generate view URL based on current wiki context
  const getViewWikiHref = () => {
    let targetKitSlug = ''
    
    if (currentWikiSlug && currentKitSlug) {
      targetKitSlug = currentKitSlug
    } else if (currentWikiSlug) {
      // For client components, we'll use a simple mapping approach
      const wikiToKitMap: Record<string, string> = {
        'ziggy': 'ziggy',
        'clicky': 'clicky',
      }
      targetKitSlug = wikiToKitMap[currentWikiSlug] || currentWikiSlug
    } else {
      targetKitSlug = 'ziggy' // fallback
    }
    
    // For client components, we'll generate the subdomain URL directly
    // This assumes the wiki slug matches the subdomain pattern
    if (currentWikiSlug && currentWikiSlug !== 'student-kit') {
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
      const port = typeof window !== 'undefined' ? window.location.port : '3000'
      const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : ''
      return `${protocol}//${currentWikiSlug}.localhost${portSuffix}/en/${targetKitSlug}`
    }
    
    // Fallback to relative URL
    return `/en/${targetKitSlug}`
  }

  const viewWikiHref = getViewWikiHref()

  return (
    <nav className="bg-[#1e1e1e] w-full border-b border-transparent fixed top-0 left-0 right-0 z-40 backdrop-blur">
      <div className="relative max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo - Left */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image 
            src="/images/robogeex-logo.png" 
            alt="RoboGeex Academy" 
            width={184} 
            height={64} 
            priority 
            className="h-12 w-auto"
          />
          <span className="sr-only">RoboGeex Academy</span>
        </Link>

        {/* Navigation Buttons - Right */}
        <div className="flex items-center gap-2">
          {/* Dashboard Button */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${
              isDashboard
                ? 'text-primary bg-primary/10 border border-primary/20'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layout size={16} />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>

          {/* Editor Button */}
          <Link
            href="/editor"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${
              isEditor
                ? 'text-primary bg-primary/10 border border-primary/20'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Edit3 size={16} />
            <span className="text-sm font-medium">Editor</span>
          </Link>

          {/* View Button */}
          <Link
            href={viewWikiHref}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="View Wiki"
          >
            <Eye size={16} />
            <span className="text-sm font-medium">View</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
