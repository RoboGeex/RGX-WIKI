import { PrismaClient } from '@prisma/client'

type ClientCache = {
  [datasourceUrl: string]: PrismaClient
}

const globalForPrisma = globalThis as unknown as {
  prismaClients?: ClientCache
}

function getUrlForWiki(wikiSlug?: string): string | undefined {
  if (!wikiSlug) return process.env.DATABASE_URL_DEFAULT || process.env.DATABASE_URL
  const upper = wikiSlug.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  const envKey = `DATABASE_URL_${upper}`
  const specific = process.env[envKey]
  if (specific) return specific
  return process.env.DATABASE_URL_DEFAULT || process.env.DATABASE_URL
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
