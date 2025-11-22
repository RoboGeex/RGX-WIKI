
import { PrismaClient } from '@prisma/client'

// This is the standard, recommended way to instantiate Prisma Client in Next.js.
// It prevents creating too many connections during development hot-reloading.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
