import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function lessonsFilePath(wikiSlug: string) {
  return path.join(process.cwd(), 'data', 'lessons.' + wikiSlug + '.json')
}

async function readLessonsFromFile(wikiSlug: string): Promise<any[]> {
  try {
    const filePath = lessonsFilePath(wikiSlug)
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as any[]
  } catch {
    return []
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const { searchParams } = new URL(req.url)
    const wikiSlug = searchParams.get('wiki') || searchParams.get('kit') || 'student-kit'
    
    if (process.env.USE_DB === 'true') {
      try {
        const { prisma } = await import('@/lib/prisma')
        const lesson = await prisma.lesson.findFirst({
          where: {
            AND: [
              { wikiSlug },
              {
                OR: [
                  { id },
                  { slug: id }
                ]
              }
            ]
          }
        })
        
        if (!lesson) {
          const fallbackLessons = await readLessonsFromFile(wikiSlug)
          const fallbackLesson = fallbackLessons.find(l => l.id === id || l.slug === id)
          if (fallbackLesson) {
            return NextResponse.json(fallbackLesson)
          }
          return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
        }

        return NextResponse.json(lesson)
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'DB error' }, { status: 500 })
      }
    } else {
      const lessons = await readLessonsFromFile(wikiSlug)
      const lesson = lessons.find(l => l.id === id || l.slug === id)
      
      if (!lesson) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
      }
      
      return NextResponse.json(lesson)
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load lesson' }, { status: 500 })
  }
}