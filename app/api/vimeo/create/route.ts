import { NextResponse } from 'next/server'
import { requireAdminAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function getVimeoFolderUri(wikiSlug?: string) {
    if (!wikiSlug) return process.env.VIMEO_FOLDER_DEFAULT
    const normalized = wikiSlug.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    const envKey = `VIMEO_FOLDER_${normalized}`
    return process.env[envKey] || process.env.VIMEO_FOLDER_DEFAULT
}

export async function POST(req: Request) {
    // Restrict Vimeo video creation to authenticated editors so the account's
    // API quota can't be abused anonymously. Editor callers send the
    // `rgx_dev_id` cookie automatically (same-origin) — no UX change.
    try {
        await requireAdminAccess()
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { fileName, size, wikiSlug } = await req.json()
        const token = process.env.VIMEO_ACCESS_TOKEN

        if (!token) {
            return NextResponse.json({ error: 'Vimeo access token is not configured on server' }, { status: 500 })
        }
        if (!size || size <= 0) {
            return NextResponse.json({ error: 'Invalid file size' }, { status: 400 })
        }

        const folderUri = getVimeoFolderUri(wikiSlug)
        const createPayload: Record<string, any> = {
            upload: {
                approach: 'tus',
                size: size,
            },
            name: fileName || 'Untitled Video',
        }
        if (folderUri) {
            createPayload.folder_uri = folderUri
        }

        const createResp = await fetch('https://api.vimeo.com/me/videos', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.vimeo.*+json;version=3.4',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(createPayload),
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

        const videoUri: string | undefined = createData?.uri
        const videoId = videoUri ? videoUri.split('/').filter(Boolean).pop() : undefined
        const playbackUrl = videoId ? `https://player.vimeo.com/video/${videoId}` : createData?.link

        return NextResponse.json({
            uploadLink,
            playbackUrl,
            videoId,
            uri: videoUri
        })
    } catch (error: any) {
        console.error('Vimeo API error:', error)
        return NextResponse.json({ error: error?.message || 'Failed to create Vimeo upload' }, { status: 500 })
    }
}
