import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, getCurrentUser } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma-multi'
import { writeAssetToGcs } from '@/lib/gcs-assets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// POST /api/auth/avatar  (multipart/form-data with `file`)
// Uploads the signed-in user's profile picture and returns its URL.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError('Not signed in', 401)

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (!file.type?.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length === 0) return NextResponse.json({ error: 'Empty file' }, { status: 400 })
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 })
    }

    const safeName = (file.name || 'avatar').replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${Date.now()}-${safeName}`
    const mimeType = file.type || 'image/png'

    // Avatars are global (not tied to a wiki); store them in the default DB/bucket.
    const assetDb = getPrisma(undefined)
    const asset = await assetDb.asset.create({
      data: { wikiSlug: null, filename, mimeType, size: buf.length },
    })
    try {
      await writeAssetToGcs({ wikiSlug: null, assetId: asset.id, filename, mimeType, buffer: buf })
    } catch (gcsError: any) {
      await assetDb.asset.delete({ where: { id: asset.id } }).catch(() => {})
      throw gcsError
    }

    const avatarUrl = `/api/upload/${asset.id}`
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } })

    return NextResponse.json({ ok: true, avatarUrl })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}

// DELETE /api/auth/avatar — remove the signed-in user's profile picture.
export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError('Not signed in', 401)
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
