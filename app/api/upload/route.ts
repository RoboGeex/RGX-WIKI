import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import Client from 'ssh2-sftp-client'

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
    const filename = `${ts}-${safeName}`

    const storeInDb = process.env.STORE_MEDIA_IN_DB === 'true'
    const uploadStrategy = (process.env.UPLOAD_STRATEGY || '').toLowerCase()
    let publicUrl = ''

    if (storeInDb) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const saved = await prisma.asset.create({
          data: {
            filename,
            mimeType: file.type || 'application/octet-stream',
            size: buf.length,
            data: buf,
          },
        })
        publicUrl = `/api/upload/${saved.id}`
      } catch (e) {
        return NextResponse.json({ error: 'DB storage not configured' }, { status: 500 })
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
      const remoteDir = (process.env.SFTP_REMOTE_DIR || '/uploads').replace(/\/+$/, '')

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

      publicUrl = `${baseUrl.replace(/\/$/, '')}/${filename}`
    } else {
      const outDir = path.join(process.cwd(), 'public', 'uploads')
      await fs.mkdir(outDir, { recursive: true })
      const outPath = path.join(outDir, filename)
      await fs.writeFile(outPath, buf)
      publicUrl = `/uploads/${path.basename(outPath)}`
    }

    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}

