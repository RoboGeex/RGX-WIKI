import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import Client from 'ssh2-sftp-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function uploadVideoToVimeo(buffer: Buffer, opts: { fileName: string; mimeType: string }) {
  const token = process.env.VIMEO_ACCESS_TOKEN
  if (!token) {
    throw new Error('Vimeo access token is not configured')
  }

  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.vimeo.*+json;version=3.4',
  }

  const createResp = await fetch('https://api.vimeo.com/me/videos', {
    method: 'POST',
    headers: {
      ...baseHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      upload: {
        approach: 'streaming',
        size: buffer.length,
      },
      name: opts.fileName,
    }),
  })

  if (!createResp.ok) {
    const details = await createResp.text()
    throw new Error(`Vimeo create video failed (${createResp.status}): ${details || createResp.statusText}`)
  }

  const createData = await createResp.json()
  const uploadLink = createData?.upload?.upload_link_secure || createData?.upload?.upload_link
  if (!uploadLink) {
    throw new Error('Vimeo response missing upload link')
  }

  const uploadResp = await fetch(uploadLink, {
    method: 'PUT',
    headers: {
      'Content-Type': opts.mimeType || 'video/mp4',
      'Content-Length': String(buffer.length),
    },
    body: buffer as any,
  })

  if (!uploadResp.ok) {
    const details = await uploadResp.text()
    throw new Error(`Vimeo upload failed (${uploadResp.status}): ${details || uploadResp.statusText}`)
  }

  const videoUri: string | undefined = createData?.uri
  const videoId = videoUri ? videoUri.split('/').filter(Boolean).pop() : undefined
  const playbackUrl = videoId ? `https://player.vimeo.com/video/${videoId}` : createData?.link

  return {
    playbackUrl,
    videoId,
    link: createData?.link as string | undefined,
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    const wikiSlugRaw = ((form.get('wikiSlug') as string | null) || undefined)?.trim()
    const normalizedWikiSlug = wikiSlugRaw?.toLowerCase()
    const mediaTypeRaw = (form.get('mediaType') as string | null) || undefined

    // Generate filename
    const bytes = await file.arrayBuffer()
    const buf = Buffer.from(bytes)
    const safeName = (file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_')
    const ts = Date.now()
    const filename = `${ts}-${safeName}`
    const sanitizedWikiSegment = normalizedWikiSlug
      ? normalizedWikiSlug.replace(/[^a-z0-9_-]/g, '')
      : 'global'
    const inferredType = file.type?.startsWith('video/')
      ? 'video'
      : file.type?.startsWith('image/')
        ? 'image'
        : undefined
    const mediaSegment =
      (mediaTypeRaw || inferredType) === 'video'
        ? 'videos'
        : (mediaTypeRaw || inferredType) === 'image'
          ? 'images'
          : 'files'

    const uploadStrategyRaw = (process.env.UPLOAD_STRATEGY || '').toLowerCase()
    const storeInDbEnv = process.env.STORE_MEDIA_IN_DB === 'true'
    const uploadStrategy = uploadStrategyRaw === 'sftp' ? 'sftp' : 'local'
    const storeInDb = uploadStrategy !== 'sftp' && storeInDbEnv
    let publicUrl = ''
    const isVideoUpload = (mediaTypeRaw || inferredType) === 'video'

    if (isVideoUpload && process.env.VIMEO_ACCESS_TOKEN) {
      try {
        const uploaded = await uploadVideoToVimeo(buf, {
          fileName: safeName,
          mimeType: file.type || 'video/mp4',
        })
        if (!uploaded.playbackUrl) {
          throw new Error('Vimeo did not return a playback URL')
        }
        return NextResponse.json({
          url: uploaded.playbackUrl,
          provider: 'vimeo',
          videoId: uploaded.videoId,
          processing: true,
        })
      } catch (error: any) {
        return NextResponse.json(
          { error: error?.message || 'Vimeo upload failed' },
          { status: 500 }
        )
      }
    }

    if (storeInDb) {
      try {
        const { getPrisma } = await import('@/lib/prisma-multi')
        const prisma = getPrisma(normalizedWikiSlug || undefined)
        const saved = await prisma.asset.create({
          data: {
            filename,
            mimeType: file.type || 'application/octet-stream',
            size: buf.length,
            data: buf,
          },
        })
        const slugForUrl = sanitizedWikiSegment && sanitizedWikiSegment !== 'global' ? sanitizedWikiSegment : undefined
        publicUrl = slugForUrl ? `/api/upload/${saved.id}?wiki=${encodeURIComponent(slugForUrl)}` : `/api/upload/${saved.id}`
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'DB storage not configured' }, { status: 500 })
      }
    } else if (uploadStrategy === 'sftp') {
      const host = process.env.SFTP_HOST
      const username = process.env.SFTP_USERNAME
      const baseUrl = process.env.SFTP_BASE_URL
      if (!host || !username || !baseUrl) {
        return NextResponse.json(
          { error: 'Missing SFTP configuration (SFTP_HOST, SFTP_USERNAME, SFTP_BASE_URL)' },
          { status: 500 }
        )
      }

      const client = new Client()
      const port = Number(process.env.SFTP_PORT || '22')
      const remoteRoot = (process.env.SFTP_REMOTE_DIR || '/uploads').replace(/\/+$/, '')
      const remoteDir = `${remoteRoot}/${sanitizedWikiSegment}/${mediaSegment}`

      const connectionConfig: any = {
        host,
        port,
        username,
      }

      if (process.env.SFTP_PASSWORD) {
        connectionConfig.password = process.env.SFTP_PASSWORD
      }
      if (process.env.SFTP_PRIVATE_KEY) {
        const normalizedKey = process.env.SFTP_PRIVATE_KEY.replace(/\\n/g, '\n')
        connectionConfig.privateKey = Buffer.from(normalizedKey, 'utf-8')
      }
      if (process.env.SFTP_PASSPHRASE) {
        connectionConfig.passphrase = process.env.SFTP_PASSPHRASE
      }

      try {
        await client.connect(connectionConfig)
        if (remoteDir) {
          await client.mkdir(remoteDir, true)
        }
        const remotePath = `${remoteDir}/${filename}`
        await client.put(buf, remotePath)
      } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'SFTP upload failed' }, { status: 500 })
      } finally {
        try {
          await client.end()
        } catch {
          // ignore cleanup errors
        }
      }

      publicUrl = `${baseUrl.replace(/\/$/, '')}/${sanitizedWikiSegment}/${mediaSegment}/${filename}`
    } else {
      const outDir = path.join(process.cwd(), 'public', 'uploads', sanitizedWikiSegment, mediaSegment)
      await fs.mkdir(outDir, { recursive: true })
      const outPath = path.join(outDir, filename)
      await fs.writeFile(outPath, buf)
      const relativePath = path.join('/uploads', sanitizedWikiSegment, mediaSegment, filename).replace(/\\+/g, '/')
      publicUrl = relativePath
    }

    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}

