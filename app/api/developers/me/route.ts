import { NextResponse } from 'next/server'
import { findDeveloperById } from '@/lib/developers'

function getActorIdFromRequest(req: Request): string | undefined {
  const headers = (req as any)?.headers as Headers | undefined
  if (!headers) return undefined
  const raw =
    headers.get('x-user-id') ||
    headers.get('x-actor-id') ||
    headers.get('x-developer-id') ||
    headers.get('x-dev-id')
  return raw ? raw.trim() || undefined : undefined
}

export async function GET(request: Request) {
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
}
