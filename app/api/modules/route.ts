import { NextResponse } from 'next/server'
import { getModules } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const wikiSlug = searchParams.get('wiki') || 'student-kit'
  try {
    const modules = getModules(wikiSlug)
    return NextResponse.json(modules)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load modules' }, { status: 500 })
  }
}

