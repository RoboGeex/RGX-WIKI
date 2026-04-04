import { PrismaClient } from '@prisma/client'
import { isPrismaProxyUrl, resolvePrismaDirectUrl } from '@/lib/prisma-url'

type ClientCache = {
  [datasourceUrl: string]: PrismaClient
}

const globalForPrisma = globalThis as unknown as {
  prismaClients?: ClientCache
}

function getUrlForWiki(wikiSlug?: string): string | undefined {
  if (!wikiSlug) {
    const direct = resolvePrismaDirectUrl(
      process.env.DATABASE_URL_DEFAULT_DIRECT,
      process.env.DIRECT_URL,
      process.env.DATABASE_URL_DEFAULT,
      process.env.DATABASE_URL,
    )
    if (direct) return direct

    const fallback = process.env.DATABASE_URL_DEFAULT || process.env.DATABASE_URL
    if (isPrismaProxyUrl(fallback)) {
      throw new Error(
        'Default database is configured with a prisma:// URL. Set DATABASE_URL_DEFAULT_DIRECT or DIRECT_URL to a direct mysql:// connection.',
      )
    }
    return fallback
  }

  const upper = wikiSlug.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  const envKey = `DATABASE_URL_${upper}`
  const directEnvKey = `${envKey}_DIRECT`
  const specific = resolvePrismaDirectUrl(
    process.env[directEnvKey],
    process.env[envKey],
    process.env.DATABASE_URL_DEFAULT_DIRECT,
    process.env.DIRECT_URL,
    process.env.DATABASE_URL_DEFAULT,
    process.env.DATABASE_URL,
  )
  if (specific) return specific

  const configured =
    process.env[envKey] ||
    process.env.DATABASE_URL_DEFAULT ||
    process.env.DATABASE_URL
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
    throw new Error('No database URL configured for this wiki')
  }

  if (!globalForPrisma.prismaClients) {
    globalForPrisma.prismaClients = {}
  }

  if (!globalForPrisma.prismaClients[url]) {
    globalForPrisma.prismaClients[url] = new PrismaClient({
      datasources: { db: { url } },
    })
  }

  return globalForPrisma.prismaClients[url]
}
