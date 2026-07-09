"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Plus } from 'lucide-react'
import CreateWikiModal from '@/components/create-wiki-modal'

export type SidebarWiki = { slug: string; displayName: string }

type Props = {
  wikis: SidebarWiki[]
  isSuperadmin: boolean
}

// Left panel of the editor wikis screen: every wiki the developer can manage,
// with the open one highlighted. Rendered from the /editor (wikis) layout —
// alongside the top bar — so both persist across wiki switches; the active
// slug comes from the URL, not props. (The /editor/<segment> match also
// catches reserved segments like /editor/lesson, but those never equal a
// wiki slug in the list.)
export default function WikiSidebar({ wikis, isSuperadmin }: Props) {
  const [createOpen, setCreateOpen] = useState(false)
  const pathname = usePathname()
  const rawSlug = pathname?.match(/^\/editor\/([^/?]+)/)?.[1]
  const activeSlug = rawSlug ? decodeURIComponent(rawSlug) : undefined

  return (
    <>
      <aside className="hidden lg:flex w-72 shrink-0 flex-col sticky top-[72px] h-[calc(100vh-72px)] bg-white border-r border-gray-200">
        <div className="px-5 pt-6 pb-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Wikis</h1>
          <p className="mt-1 text-xs text-gray-500">Pick a wiki to manage its lessons.</p>
        </div>

        <nav className="stagger-children flex-1 overflow-y-auto no-scrollbar smooth-panel-scroll p-3 space-y-1">
          {wikis.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-500">
              No wikis available. If you just logged in, refresh this page.
            </p>
          )}
          {wikis.map((wiki) => {
            const isActive = wiki.slug === activeSlug
            return (
              <Link
                key={wiki.slug}
                href={`/editor/${wiki.slug}`}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 hover:ps-4 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-gray-700 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <BookOpen size={16} className={isActive ? 'text-primary' : 'text-gray-400'} />
                <span className="truncate">{wiki.displayName}</span>
              </Link>
            )
          })}
        </nav>

        {isSuperadmin && (
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => setCreateOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <Plus size={16} />
              New wiki
            </button>
          </div>
        )}
      </aside>

      {isSuperadmin && (
        <CreateWikiModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={async () => {
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
