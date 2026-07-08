import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'
import { getDevelopersPrisma } from '@/lib/prisma-developers'
import { getPrisma } from '@/lib/prisma-multi'
import { writeAssetToGcs } from '@/lib/gcs-assets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 5 * 1024 * 1024

async function developerAvatarColumnExists(devDb: ReturnType<typeof getDevelopersPrisma>) {
  try {
    await devDb.$queryRawUnsafe('SELECT `avatarUrl` FROM `Developer` LIMIT 1')
    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminAccess()
    let developerId: number | null = null
    if (auth.source === 'developer') {
      developerId = Number(auth.dev.id)
      if (!Number.isFinite(developerId)) {
        return NextResponse.json({ error: 'Local developer profiles cannot save profile images.' }, { status: 400 })
      }
      const devDb = getDevelopersPrisma()
      if (!(await developerAvatarColumnExists(devDb))) {
        return NextResponse.json({ error: 'Profile image storage is not ready yet. Apply the latest database migration first.' }, { status: 409 })
      }
    }

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file selected.' }, { status: 400 })
    if (!file.type?.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length === 0) return NextResponse.json({ error: 'Image is empty.' }, { status: 400 })
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5 MB.' }, { status: 400 })
    }

    const safeName = (file.name || 'admin-avatar').replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${Date.now()}-${safeName}`
    const mimeType = file.type || 'image/png'
    const assetDb = getPrisma(undefined)
    const asset = await assetDb.asset.create({
      data: { wikiSlug: null, filename, mimeType, size: buffer.length },
    })

    try {
      await writeAssetToGcs({ wikiSlug: null, assetId: asset.id, filename, mimeType, buffer })
    } catch (gcsError) {
      await assetDb.asset.delete({ where: { id: asset.id } }).catch(() => {})
      throw gcsError
    }

    const avatarUrl = `/api/upload/${asset.id}`

    if (auth.source === 'user') {
      await prisma.user.update({ where: { id: auth.user.id }, data: { avatarUrl } })
    } else {
      const devDb = getDevelopersPrisma()
      await (devDb.developer as any).update({ where: { id: developerId! }, data: { avatarUrl } })
    }

    return NextResponse.json({ ok: true, avatarUrl })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Upload failed.' }, { status })
  }
}

export async function DELETE() {
  try {
    const auth = await requireAdminAccess()
    if (auth.source === 'user') {
      await prisma.user.update({ where: { id: auth.user.id }, data: { avatarUrl: null } })
    } else {
      const numericId = Number(auth.dev.id)
      if (!Number.isFinite(numericId)) {
        return NextResponse.json({ error: 'Local developer profiles cannot save profile images.' }, { status: 400 })
      }
      const devDb = getDevelopersPrisma()
      if (!(await developerAvatarColumnExists(devDb))) {
        return NextResponse.json({ error: 'Profile image storage is not ready yet. Apply the latest database migration first.' }, { status: 409 })
      }
      await (devDb.developer as any).update({ where: { id: numericId }, data: { avatarUrl: null } })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Could not remove profile image.' }, { status })
  }
}
