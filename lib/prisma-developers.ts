import { PrismaClient } from '@prisma/client'
import { isPrismaProxyUrl, resolvePrismaDirectUrl } from '@/lib/prisma-url'

const globalForPrisma = globalThis as unknown as {
  prismaDevelopers?: PrismaClient
}

function getDeveloperDatabaseUrl(): string | undefined {
  const preferred = resolvePrismaDirectUrl(
    process.env.DATABASE_URL_DEVELOPERS_DIRECT,
    process.env.DEVELOPERS_DATABASE_URL_DIRECT,
    process.env.DIRECT_URL_DEVELOPERS,
    process.env.DIRECT_URL,
    process.env.DATABASE_URL_DEFAULT_DIRECT,
    process.env.DATABASE_URL_DEVELOPERS,
    process.env.DEVELOPERS_DATABASE_URL,
    process.env.DATABASE_URL_DEFAULT,
    process.env.DATABASE_URL,
  )

  if (preferred) return preferred

  const configured =
    process.env.DATABASE_URL_DEVELOPERS ||
    process.env.DEVELOPERS_DATABASE_URL ||
    process.env.DATABASE_URL_DEFAULT ||
    process.env.DATABASE_URL

  if (isPrismaProxyUrl(configured)) {
    throw new Error(
      'Developer database is configured with a prisma:// URL. Set a direct mysql:// connection in DATABASE_URL_DEVELOPERS_DIRECT, DEVELOPERS_DATABASE_URL_DIRECT, DIRECT_URL_DEVELOPERS, or DIRECT_URL.',
    )
  }

  return configured
}

export function getDevelopersPrisma(): PrismaClient {
  if (!globalForPrisma.prismaDevelopers) {
    const url = getDeveloperDatabaseUrl()
    if (!url) {
      throw new Error('No developer database URL configured (set DATABASE_URL_DEVELOPERS or DEVELOPERS_DATABASE_URL)')
    }
    globalForPrisma.prismaDevelopers = new PrismaClient({
      datasources: { db: { url } },
    })
  }
  return globalForPrisma.prismaDevelopers
}
