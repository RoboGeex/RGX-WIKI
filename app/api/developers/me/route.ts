import { NextResponse } from 'next/server'
import { findDeveloperById } from '@/lib/developers'
import { resolveDeveloperId } from '@/lib/dev-session'

function getActorIdFromRequest(req: Request): string | undefined {
  return resolveDeveloperId(req)
}

export async function GET(request: Request) {
  try {
    const actorId = getActorIdFromRequest(request)
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const developer = await findDeveloperById(actorId)
    if (!developer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      ok: true,
      developer: {
        id: developer.id,
        email: developer.email,
        name: developer.name,
        role: developer.role,
        wikiSlugs: developer.wikiSlugs || [],
        lessonIds: developer.lessonIds || [],
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load developer' },
      { status: 500 },
    )
  }
}
