import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { prisma } = await import('@/lib/prisma')
    const asset = await prisma.asset.findUnique({ where: { id: Number(params.id) } })
    if (!asset || !asset.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return new NextResponse(asset.data as any, {
      headers: {
        'Content-Type': asset.mimeType || 'application/octet-stream',
        'Content-Length': String(asset.size || (asset.data as Buffer).length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}

