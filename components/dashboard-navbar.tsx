"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Globe, Menu, Eye, Edit3, Layout, HelpCircle, LogOut } from 'lucide-react'
import { Locale, t } from '@/lib/i18n'
import { setStoredLocale } from '@/lib/unlock'
// Note: We can't import server-side functions in client components

interface Props {
  locale: Locale
  wikiSlug?: string
  kitSlug?: string
}

export default function DashboardNavbar({ locale, wikiSlug, kitSlug }: Props) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Helper function to find the first kit for a wiki
  const getFirstKitForWiki = (wikiSlug: string): string | null => {
    // For client components, we'll use a simple mapping approach
    // This should be replaced with a proper API call in the future
    const wikiToKitMap: Record<string, string> = {
      'student-kit': 'student-kit',
      'osama-kanan': 'osama-kanan',
      'بيسيب': 'biseb',
      'ios': 'ios',
      'osama-kanan-1': 'osama-kanan-1',
      'بيسيبig': 'bisebig',
      'new-wiki': 'new-wiki',
      'cadsoijasdoii': 'cadsoijasdoii',
      'abbb': 'abbb',
      'point': 'point',
      'osama-fd': 'osama-fd',
      'zzzzz': 'zzzzz'
    }
    
    return wikiToKitMap[wikiSlug] || wikiSlug
  }

  const changeLocale = () => {
    const next = locale === 'en' ? 'ar' : 'en'
    setStoredLocale(next)
    // Reload to apply locale change
    window.location.reload()
  }

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  // Extract wiki context from URL
  const getCurrentWikiContext = () => {
    // Check if we're in a wiki-specific route
    const wikiMatch = pathname.match(/\/dashboard\/([^\/]+)/) || pathname.match(/\/editor\/dashboard\/([^\/]+)/)
    if (wikiMatch) {
      return wikiMatch[1]
    }
    
    // Check URL search params for wiki context
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('wiki')
    }
    
    return wikiSlug || 'student-kit' // fallback
  }

  const currentWikiSlug = getCurrentWikiContext()

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Layout,
      description: 'Overview & Management'
    },
    {
      href: '/editor',
      label: 'Editor',
      icon: Edit3,
      description: 'Create & Edit Content'
    }
  ]

  // Generate view URL based on current wiki context
  const getViewWikiHref = () => {
    let targetKitSlug = ''
    
    // If we have a specific kit context, use it
    if (kitSlug) {
      targetKitSlug = kitSlug
    } else if (currentWikiSlug) {
      // If we're in a wiki context, find the correct kit for that wiki
      const kitSlugForWiki = getFirstKitForWiki(currentWikiSlug)
      if (kitSlugForWiki) {
        targetKitSlug = kitSlugForWiki
      }
    } else {
      // Default fallback
      targetKitSlug = 'student-kit'
    }
    
    // For client components, we'll generate the subdomain URL directly
    // This assumes the wiki slug matches the subdomain pattern
    if (currentWikiSlug && currentWikiSlug !== 'student-kit') {
      const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
      const port = typeof window !== 'undefined' ? window.location.port : '3000'
      const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : ''
      return `${protocol}//${currentWikiSlug}.localhost${portSuffix}/${locale}/${targetKitSlug}`
    }
    
    // Fallback to relative URL
    return `/${locale}/${targetKitSlug}`
  }

  const viewWikiHref = getViewWikiHref()
  
  // Get the kit name for display
  const getKitNameForDisplay = () => {
    if (kitSlug) return kitSlug
    if (currentWikiSlug) {
      const kitSlugForWiki = getFirstKitForWiki(currentWikiSlug)
      return kitSlugForWiki || currentWikiSlug
    }
    return 'student-kit'
  }
  
  const displayKitName = getKitNameForDisplay()

  return (
    <nav className="bg-[#1e1e1e] w-full border-b border-transparent fixed top-0 left-0 right-0 z-40 backdrop-blur">
      {/* Logo - Absolute Left */}
      <Link href="/dashboard" className="absolute left-0 top-0 h-16 flex items-center gap-2 pl-4 z-50">
        <Image 
          src="/images/robogeex-logo.png" 
          alt="RoboGeex Academy" 
          width={184} 
          height={64} 
          priority 
          className="h-12 w-auto"
        />
        <span className="sr-only">RoboGeex Academy Dashboard</span>
      </Link>

      <div className="relative max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 rounded-md hover:bg-white/10 text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <Menu size={18} />
        </button>

        {/* Spacer for logo */}
        <div className="w-48"></div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Desktop Navigation - Right */}
          <div className="hidden lg:flex items-center gap-3">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'text-primary bg-primary/10 border border-primary/20'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  title={item.description}
                >
                  <Icon size={14} />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
          {/* View Wiki Button */}
          <Link
            href={viewWikiHref}
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title={`View ${displayKitName} Wiki`}
          >
            <Eye size={14} />
            <span className="text-xs">View</span>
          </Link>

          {/* Help Button */}
          <button
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Help & Support"
          >
            <HelpCircle size={14} />
          </button>

          {/* Language Toggle */}
          <button
            onClick={changeLocale}
            className="px-2.5 py-1.5 rounded-md border border-white/30 text-white text-xs flex items-center gap-1.5 transition hover:bg-white/10"
            title="Change Language"
          >
            <Globe size={12} />
            <span>{locale.toUpperCase()}</span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="User Menu"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#1e1e1e] border-t border-white/10">
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'text-primary bg-primary/10 border border-primary/20'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={18} />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-white/60">{item.description}</div>
                  </div>
                </Link>
              )
            })}
            
            <div className="border-t border-white/10 pt-2 mt-4">
              <Link
                href={viewWikiHref}
                target="_blank"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Eye size={18} />
                <div>
                  <div className="font-medium">View {displayKitName} Wiki</div>
                  <div className="text-xs text-white/60">Preview live site</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
