import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prismaDevelopers?: PrismaClient
}

function getDeveloperDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL_DEVELOPERS ||
    process.env.DEVELOPERS_DATABASE_URL ||
    process.env.DATABASE_URL_DEFAULT ||
    process.env.DATABASE_URL
  )
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
