import { PrismaClient } from '@prisma/client'
import { isPrismaProxyUrl, resolvePrismaDirectUrl } from '@/lib/prisma-url'

type ClientCache = {
  [datasourceUrl: string]: PrismaClient
}

const globalForPrisma = globalThis as unknown as {
  prismaClients?: ClientCache
  prismaMissingWikiUrlWarnings?: Set<string>
  prismaMissingDefaultUrlWarnings?: Set<string>
}

function isTruthyEnv(value?: string): boolean {
  const normalized = (value || '').trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function shouldUseSharedDatabaseOnly(): boolean {
  return (
    isTruthyEnv(process.env.USE_SHARED_DB) ||
    isTruthyEnv(process.env.SHARED_DATABASE_MODE) ||
    isTruthyEnv(process.env.DISABLE_WIKI_DB_ROUTING)
  )
}

function getFirstConfiguredWikiDatabaseUrl(): { url?: string; source?: string } {
  const suffixes = new Set<string>()
  Object.keys(process.env).forEach((key) => {
    const match = key.match(/^DATABASE_URL_([A-Z0-9_]+?)(?:_DIRECT)?$/)
    if (!match) return
    const suffix = match[1]
    if (suffix === 'DEFAULT' || suffix === 'HUB') return
    suffixes.add(suffix)
  })

  for (const suffix of Array.from(suffixes).sort()) {
    const envKey = `DATABASE_URL_${suffix}`
    const directEnvKey = `${envKey}_DIRECT`
    const resolved = resolvePrismaDirectUrl(
      process.env[directEnvKey],
      process.env[envKey],
    )
    if (!resolved || isPrismaProxyUrl(resolved)) continue
    return {
      url: resolved,
      source: process.env[directEnvKey] ? directEnvKey : envKey,
    }
  }

  return {}
}

function getDefaultUrl(): string | undefined {
  const direct = resolvePrismaDirectUrl(
    process.env.DATABASE_URL_HUB_DIRECT,
    process.env.DATABASE_URL_DEFAULT_DIRECT,
    process.env.DIRECT_URL,
    process.env.DATABASE_URL_HUB,
    process.env.DATABASE_URL_DEFAULT,
    process.env.DATABASE_URL,
  )
  if (direct) return direct

  const fallback =
    process.env.DATABASE_URL_HUB ||
    process.env.DATABASE_URL_DEFAULT ||
    process.env.DATABASE_URL
  if (isPrismaProxyUrl(fallback)) {
    throw new Error(
      'Default/hub database is configured with a prisma:// URL. Set DATABASE_URL_HUB_DIRECT, DATABASE_URL_DEFAULT_DIRECT, or DIRECT_URL to a direct mysql:// connection.',
    )
  }
  if (fallback) return fallback

  const discovered = getFirstConfiguredWikiDatabaseUrl()
  if (discovered.url) {
    if (!globalForPrisma.prismaMissingDefaultUrlWarnings) {
      globalForPrisma.prismaMissingDefaultUrlWarnings = new Set<string>()
    }
    const warnKey = discovered.source || 'unknown'
    if (!globalForPrisma.prismaMissingDefaultUrlWarnings.has(warnKey)) {
      globalForPrisma.prismaMissingDefaultUrlWarnings.add(warnKey)
      console.warn(
        `[prisma-multi] Missing DATABASE_URL_HUB/DATABASE_URL_DEFAULT; using ${warnKey} for shared DB operations.`,
      )
    }
    return discovered.url
  }

  return undefined
}

function getUrlForWiki(wikiSlug?: string): string | undefined {
  if (!wikiSlug) {
    return getDefaultUrl()
  }

  const upper = wikiSlug.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  const envKey = `DATABASE_URL_${upper}`
  const directEnvKey = `${envKey}_DIRECT`
  const hasWikiSpecificUrl = Boolean(process.env[directEnvKey] || process.env[envKey])
  const specific = resolvePrismaDirectUrl(
    process.env[directEnvKey],
    process.env[envKey],
    process.env.DATABASE_URL_DEFAULT_DIRECT,
    process.env.DIRECT_URL,
    process.env.DATABASE_URL_DEFAULT,
    process.env.DATABASE_URL,
  )
  if (specific) return specific

  if (shouldUseSharedDatabaseOnly()) {
    return getDefaultUrl()
  }

  if (!hasWikiSpecificUrl) {
    const strictWikiUrl = process.env.STRICT_WIKI_DB_URL === 'true'
    if (strictWikiUrl) {
      throw new Error(
        `No ${directEnvKey} or ${envKey} configured for wiki "${wikiSlug}". Set one of them or disable STRICT_WIKI_DB_URL.`,
      )
    }

    if (!globalForPrisma.prismaMissingWikiUrlWarnings) {
      globalForPrisma.prismaMissingWikiUrlWarnings = new Set<string>()
    }
    const warnKey = `${wikiSlug}:${envKey}`
    if (!globalForPrisma.prismaMissingWikiUrlWarnings.has(warnKey)) {
      globalForPrisma.prismaMissingWikiUrlWarnings.add(warnKey)
      console.warn(
        `[prisma-multi] Missing ${envKey}/${directEnvKey}; falling back to default DB for wiki "${wikiSlug}".`,
      )
    }
  }

  const configured =
    process.env[envKey] ||
    process.env.DATABASE_URL_DEFAULT ||
    process.env.DATABASE_URL
  
  if (!configured) {
    console.warn(`[prisma-multi] No database URL found for wiki "${wikiSlug}" (checked ${envKey}, DATABASE_URL_DEFAULT, DATABASE_URL)`)
  }

  if (isPrismaProxyUrl(configured)) {
    throw new Error(
      `Database for wiki "${wikiSlug}" is configured with a prisma:// URL. Set ${directEnvKey}, DATABASE_URL_DEFAULT_DIRECT, or DIRECT_URL to a direct mysql:// connection.`,
    )
  }
  return configured
}

export function getPrisma(wikiSlug?: string): PrismaClient {
  const url = getUrlForWiki(wikiSlug)
  if (!url) {
    if (wikiSlug) {
      throw new Error(`No database URL configured for wiki "${wikiSlug}"`)
    }
    throw new Error(
      'No database URL configured for shared operations. Set DATABASE_URL_HUB or DATABASE_URL_DEFAULT.',
    )
  }

  if (!globalForPrisma.prismaClients) {
    globalForPrisma.prismaClients = {}
  }

  if (!globalForPrisma.prismaClients[url]) {
    const redactedUrl = url.replace(/:([^:@]+)@/, ':****@')
    console.log(`[prisma-multi] Creating new client for ${redactedUrl.split('@')[1]} (wiki: ${wikiSlug || 'default'})`)
    globalForPrisma.prismaClients[url] = new PrismaClient({
      datasources: { db: { url } },
    })
  }

  return globalForPrisma.prismaClients[url]
}
