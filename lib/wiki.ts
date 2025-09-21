import { headers } from 'next/headers'
import type { Wiki, Kit } from '@/lib/data'
import { getKit, getWiki, getWikiByDomain } from '@/lib/data'

const DEFAULT_WIKI_SLUG = 'student-kit'

export function resolveWikiFromHost(host?: string | null): Wiki | undefined {
  return getWikiByDomain(host) || getWiki(DEFAULT_WIKI_SLUG)
}

export function requireWikiFromRequest(): Wiki {
  const host = headers().get('host')
  const wiki = resolveWikiFromHost(host)
  if (!wiki) {
    throw new Error('No wiki configured for host: ' + (host ?? 'unknown host'))
  }
  return wiki
}

export function getKitForWiki(kitSlug: string, wiki: Wiki): Kit | undefined {
  return getKit(kitSlug, wiki.slug)
}

