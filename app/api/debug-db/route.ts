import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Flush the globalThis Prisma client cache so stale clients are dropped
const g = globalThis as any
if (g.prismaClients) {
  for (const client of Object.values(g.prismaClients) as PrismaClient[]) {
    try { client.$disconnect() } catch {}
  }
  g.prismaClients = {}
  console.log('[debug-db] Flushed Prisma client cache')
}

export async function GET() {
  // Test every DATABASE_URL_* variable that is set
  const results: Record<string, any> = {}

  const envKeys = Object.keys(process.env).filter(
    (k) => k === 'DATABASE_URL' || k.startsWith('DATABASE_URL_'),
  )

  for (const key of envKeys) {
    const url = process.env[key]!
    const redacted = url.replace(/:([^:@]+)@/, ':****@')
    try {
      const prisma = new PrismaClient({ datasources: { db: { url } } })
      await prisma.$queryRaw`SELECT 1`
      await prisma.$disconnect()
      results[key] = { ok: true, url: redacted }
    } catch (e: any) {
      results[key] = { ok: false, url: redacted, error: e.message }
    }
  }

  return NextResponse.json(results)
}
