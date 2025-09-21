// Safe Prisma client loader for server-only usage
// Avoids importing @prisma/client at build time when not installed

let prisma: any = undefined

if (typeof window === 'undefined') {
  try {
    const mod = (eval('require'))('@prisma/client') as any
    const PrismaClient = mod?.PrismaClient
    if (PrismaClient) {
      // Reuse in dev to avoid creating many connections
      const g: any = globalThis as any
      prisma = g.__prisma || new PrismaClient()
      if (process.env.NODE_ENV !== 'production') g.__prisma = prisma
    }
  } catch (e) {
    // @prisma/client not installed — leave prisma as undefined
    prisma = undefined
  }
}

export { prisma }
export default prisma as any
