import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { getActorIdFromRequest } from '@/lib/api-auth'
import { findDeveloperById } from '@/lib/developers'
import { canManageWiki, canEditLesson } from '@/lib/assignments'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const actorId = getActorIdFromRequest(req)
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { wikiSlug, lessonId, forceTakeover } = body

    if (!wikiSlug || !lessonId) {
      return NextResponse.json({ error: 'Missing wikiSlug or lessonId' }, { status: 400 })
    }

    const developer = await findDeveloperById(actorId)
    
    const prisma = getPrisma(wikiSlug)

    // Find the lesson first
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { activeEditorId: true, lockedUntil: true, version: true, ownerId: true }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    if (!canEditLesson(developer, wikiSlug, lesson.ownerId)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit (or lock) this lesson' }, { status: 403 })
    }

    const now = new Date()
    const lockDuration = 2 * 60 * 1000 // 2 minutes

    // Determine if we can acquire or renew the lock
    const isLockedBySomeoneElse = 
      lesson.activeEditorId && 
      lesson.activeEditorId !== actorId && 
      lesson.lockedUntil && 
      lesson.lockedUntil > now

    if (isLockedBySomeoneElse && !forceTakeover) {
      const editorIdParsed = lesson.activeEditorId ? parseInt(lesson.activeEditorId) : NaN
      const defaultPrisma = getPrisma()
      const editor = !isNaN(editorIdParsed) ? await defaultPrisma.developer.findUnique({
        where: { id: editorIdParsed }
      }) : null
      
      return NextResponse.json({
        locked: true,
        lockedBy: editor?.name || editor?.email || 'Another developer',
        lockedUntil: lesson.lockedUntil,
        version: lesson.version
      })
    }

    // Acquire or renew lock
    const newLockTime = new Date(now.getTime() + lockDuration)
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        activeEditorId: actorId,
        lockedUntil: newLockTime
      }
    })

    return NextResponse.json({
      locked: false,
      success: true,
      lockedUntil: newLockTime,
      version: lesson.version
    })

  } catch (error: any) {
    console.error('Lock error:', error)
    return NextResponse.json({ error: error.message || 'Failed to acquire lock' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const actorId = getActorIdFromRequest(req)
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const wikiSlug = searchParams.get('wiki')
    const lessonId = searchParams.get('id')

    if (!wikiSlug || !lessonId) {
      return NextResponse.json({ error: 'Missing wikiSlug or id' }, { status: 400 })
    }

    const prisma = getPrisma(wikiSlug)

    const developer = await findDeveloperById(actorId)

    if (!canManageWiki(developer, wikiSlug)) {
      return NextResponse.json({ error: 'Access denied: You are not assigned to this wiki' }, { status: 403 })
    }

    // Only release the lock if the current user owns it
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { activeEditorId: true }
    })

    if (lesson?.activeEditorId === actorId) {
      await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          activeEditorId: null,
          lockedUntil: null
        }
      })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Release lock error:', error)
    return NextResponse.json({ error: error.message || 'Failed to release lock' }, { status: 500 })
  }
}
