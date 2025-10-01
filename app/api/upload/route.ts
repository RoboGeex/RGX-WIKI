import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Generate filename
    const bytes = await file.arrayBuffer()
    const buf = Buffer.from(bytes)
    const safeName = (file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_')
    const ts = Date.now()
    const outDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(outDir, { recursive: true })
    const outPath = path.join(outDir, `${ts}-${safeName}`)

    const storeInDb = process.env.STORE_MEDIA_IN_DB === 'true'
    let publicUrl = ''

    if (storeInDb) {
      // Optional: store binary in DB via Prisma if desired
      try {
        const { prisma } = await import('@/lib/prisma')
        const saved = await prisma.asset.create({
          data: {
            filename: `${ts}-${safeName}`,
            mimeType: file.type || 'application/octet-stream',
            size: buf.length,
            data: buf,
          },
        })
        publicUrl = `/api/upload/${saved.id}`
      } catch (e) {
        return NextResponse.json({ error: 'DB storage not configured' }, { status: 500 })
      }
    } else {
      await fs.writeFile(outPath, buf)
      publicUrl = `/uploads/${path.basename(outPath)}`
    }

    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}

