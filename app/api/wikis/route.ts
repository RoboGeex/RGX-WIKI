import { NextResponse } from 'next/server'
import { getWikis } from '@/lib/data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(getWikis())
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load wikis' }, { status: 500 })
  }
}

