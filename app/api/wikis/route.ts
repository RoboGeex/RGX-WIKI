import { NextResponse } from 'next/server'
import { getWikis } from '@/lib/data'
import path from 'path'
import { promises as fs } from 'fs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

async function readWikisFromFile(): Promise<any[]> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'wikis.json')
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeWikisToFile(wikis: any[]): Promise<void> {
  const filePath = path.join(process.cwd(), 'data', 'wikis.json')
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(wikis, null, 2), 'utf-8')
}

async function readKitsFromFile(): Promise<any[]> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'kits.json')
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeKitsToFile(kits: any[]): Promise<void> {
  const filePath = path.join(process.cwd(), 'data', 'kits.json')
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(kits, null, 2), 'utf-8')
}

async function createKitForWiki(wiki: any): Promise<void> {
  const existingKits = await readKitsFromFile()
  
  // Check if kit already exists
  if (existingKits.some(k => k.wikiSlug === wiki.slug)) {
    return // Kit already exists
  }

  const newKit = {
    slug: wiki.slug,
    wikiSlug: wiki.slug,
    title_en: `${wiki.displayName} Learning Kit`,
    title_ar: `${wiki.displayName} Learning Kit`,
    heroImage: wiki.picture || '/images/robogeex-logo.png',
    overview_en: `${wiki.grade} level learning content for ${wiki.displayName}.`,
    overview_ar: `محتوى تعليمي لـ ${wiki.grade} لـ ${wiki.displayName}.`
  }

  const updatedKits = [...existingKits, newKit]
  await writeKitsToFile(updatedKits)
}

async function createLessonFilesForWiki(wiki: any): Promise<void> {
  const lessonsPath = path.join(process.cwd(), 'data', `lessons.${wiki.slug}.json`)
  
  // Check if file already exists
  try {
    await fs.access(lessonsPath)
    return // File already exists
  } catch {
    // File doesn't exist, create it
  }

  const gettingStartedLesson = {
    id: 'getting-started',
    wikiSlug: wiki.slug,
    order: 0,
    slug: 'getting-started',
    title_en: 'Getting Started',
    title_ar: 'البداية',
    duration_min: 30,
    difficulty: 'Beginner',
    prerequisites_en: [],
    prerequisites_ar: [],
    materials: [],
    body: [
      {
        type: 'heading',
        en: 'Getting Started',
        level: 1,
        ar: 'البداية'
      },
      {
        type: 'heading',
        en: `Welcome to ${wiki.displayName} Learning`,
        level: 2,
        ar: `مرحباً بك في تعلم ${wiki.displayName}`
      },
      {
        type: 'paragraph',
        en: `Welcome to the ${wiki.displayName} learning kit! This is your starting point for learning about ${wiki.displayName} concepts.`,
        ar: `مرحباً بك في مجموعة تعلم ${wiki.displayName}! هذه نقطة البداية لتعلم مفاهيم ${wiki.displayName}.`
      },
      {
        type: 'heading',
        en: 'What You\'ll Learn',
        level: 2,
        ar: 'ما سوف تتعلمه'
      },
      {
        type: 'paragraph',
        en: `In this kit, you will learn the fundamentals of ${wiki.displayName} and how to apply them in practical projects.`,
        ar: `في هذه المجموعة، سوف تتعلم أساسيات ${wiki.displayName} وكيفية تطبيقها في المشاريع العملية.`
      }
    ]
  }

  const dir = path.dirname(lessonsPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(lessonsPath, JSON.stringify([gettingStartedLesson], null, 2), 'utf-8')
}

async function createModuleFilesForWiki(wiki: any): Promise<void> {
  const modulesPath = path.join(process.cwd(), 'data', `modules.${wiki.slug}.json`)
  
  // Check if file already exists
  try {
    await fs.access(modulesPath)
    return // File already exists
  } catch {
    // File doesn't exist, create it
  }

  const defaultModules = [
    {
      id: 'intro',
      order: 1,
      title_en: 'Introduction',
      title_ar: 'مقدمة',
      summary_en: `Setup and first steps for ${wiki.displayName} learning.`,
      summary_ar: `الإعداد والخطوات الأولى لتعلم ${wiki.displayName}.`
    },
    {
      id: 'basics',
      order: 2,
      title_en: `${wiki.displayName} Basics`,
      title_ar: `أساسيات ${wiki.displayName}`,
      summary_en: `Learn the fundamental concepts of ${wiki.displayName}.`,
      summary_ar: `تعلم المفاهيم الأساسية لـ ${wiki.displayName}.`
    }
  ]

  const dir = path.dirname(modulesPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(modulesPath, JSON.stringify(defaultModules, null, 2), 'utf-8')
}

export async function GET() {
  try {
    return NextResponse.json(getWikis())
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load wikis' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const name = form.get('name') as string
    const grade = form.get('grade') as string
    const picture = form.get('picture') as File | null

    if (!name || !grade) {
      return NextResponse.json({ error: 'Name and grade are required' }, { status: 400 })
    }

    // Generate slug from name
    const slug = slugify(name)
    
    // Check if slug already exists
    const existingWikis = await readWikisFromFile()
    if (existingWikis.some(w => w.slug === slug)) {
      return NextResponse.json({ error: 'A wiki with this name already exists' }, { status: 409 })
    }

    let pictureUrl = ''
    
    // Handle picture upload if provided
    if (picture) {
      const bytes = await picture.arrayBuffer()
      const buf = Buffer.from(bytes)
      const safeName = (picture.name || 'wiki-picture').replace(/[^a-zA-Z0-9._-]/g, '_')
      const ts = Date.now()
      const outDir = path.join(process.cwd(), 'public', 'uploads', 'wikis')
      await fs.mkdir(outDir, { recursive: true })
      const outPath = path.join(outDir, `${ts}-${safeName}`)
      await fs.writeFile(outPath, buf)
      pictureUrl = `/uploads/wikis/${path.basename(outPath)}`
    }

    // Create new wiki object
    const newWiki = {
      slug,
      displayName: name,
      grade,
      picture: pictureUrl,
      domains: [
        `${slug}.localhost`,
        'localhost',
        '127.0.0.1'
      ],
      defaultLocale: 'en',
      defaultLessonSlug: 'getting-started',
      resourcesUrl: '/resources',
      createdAt: new Date().toISOString()
    }

    // Add to existing wikis
    const updatedWikis = [...existingWikis, newWiki]
    await writeWikisToFile(updatedWikis)

    // Create corresponding kit entry
    await createKitForWiki(newWiki)

    // Create lesson and module files
    await createLessonFilesForWiki(newWiki)
    await createModuleFilesForWiki(newWiki)

    return NextResponse.json({ 
      ok: true, 
      wiki: newWiki,
      message: 'Wiki created successfully'
    })

  } catch (e: any) {
    console.error('Error creating wiki:', e)
    return NextResponse.json({ error: e?.message || 'Failed to create wiki' }, { status: 500 })
  }
}

