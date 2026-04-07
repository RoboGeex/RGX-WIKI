import { NextResponse } from 'next/server'
import { getWikis } from '@/lib/data'
import path from 'path'
import { promises as fs } from 'fs'
import { getPrisma } from '@/lib/prisma-multi'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

type WikiRow = {
  slug: string
  displayName: string
  grade: string | null
  picture: string | null
  isPublished: number | boolean | null
  domains: unknown
  defaultLocale: string | null
  defaultLessonSlug: string | null
  resourcesUrl: string | null
  createdAt: Date | string | null
}

function parseDomains(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      // ignore parse failure and fallback below
    }
  }
  return []
}

function normalizeWikiRow(row: WikiRow) {
  return {
    slug: row.slug,
    displayName: row.displayName,
    grade: row.grade || 'All Levels',
    picture: row.picture || '',
    isPublished: row.isPublished == null ? true : Boolean(row.isPublished),
    domains: parseDomains(row.domains),
    defaultLocale: row.defaultLocale || 'en',
    defaultLessonSlug: row.defaultLessonSlug || 'getting-started',
    resourcesUrl: row.resourcesUrl || '/resources',
    createdAt: row.createdAt
      ? new Date(row.createdAt as any).toISOString()
      : new Date().toISOString(),
  }
}

async function ensureWikiTable(): Promise<void> {
  const prisma: any = getPrisma()
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Wiki (
      slug VARCHAR(191) NOT NULL,
      displayName VARCHAR(255) NOT NULL,
      grade VARCHAR(191) NULL,
      picture TEXT NULL,
      isPublished BOOLEAN NOT NULL DEFAULT TRUE,
      domains JSON NULL,
      defaultLocale VARCHAR(16) NULL,
      defaultLessonSlug VARCHAR(191) NULL,
      resourcesUrl VARCHAR(255) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (slug)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE Wiki
      ADD COLUMN IF NOT EXISTS isPublished BOOLEAN NOT NULL DEFAULT TRUE;
    `)
  } catch {
    // Column might already exist or server may not support IF NOT EXISTS.
  }
}

async function readWikisFromDb(): Promise<any[]> {
  await ensureWikiTable()
  const prisma: any = getPrisma()
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT slug, displayName, grade, picture, isPublished, domains, defaultLocale, defaultLessonSlug, resourcesUrl, createdAt
    FROM Wiki
    ORDER BY createdAt ASC
  `)) as WikiRow[]
  return rows.map(normalizeWikiRow)
}

async function saveWikiToDb(wiki: any): Promise<void> {
  await ensureWikiTable()
  const prisma: any = getPrisma()
  await prisma.$executeRaw`
    INSERT INTO Wiki (
      slug, displayName, grade, picture, isPublished, domains, defaultLocale, defaultLessonSlug, resourcesUrl, createdAt
    ) VALUES (
      ${wiki.slug},
      ${wiki.displayName},
      ${wiki.grade || null},
      ${wiki.picture || null},
      ${wiki.isPublished == null ? true : Boolean(wiki.isPublished)},
      ${JSON.stringify(wiki.domains || [])},
      ${wiki.defaultLocale || 'en'},
      ${wiki.defaultLessonSlug || 'getting-started'},
      ${wiki.resourcesUrl || '/resources'},
      ${new Date(wiki.createdAt || new Date().toISOString())}
    )
    ON DUPLICATE KEY UPDATE
      displayName = VALUES(displayName),
      grade = VALUES(grade),
      picture = VALUES(picture),
      isPublished = VALUES(isPublished),
      domains = VALUES(domains),
      defaultLocale = VALUES(defaultLocale),
      defaultLessonSlug = VALUES(defaultLessonSlug),
      resourcesUrl = VALUES(resourcesUrl)
  `
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

  if (existingKits.some(k => k.wikiSlug === wiki.slug)) {
    return
  }

  const newKit = {
    slug: wiki.slug,
    wikiSlug: wiki.slug,
    title_en: `${wiki.displayName} Learning Kit`,
    title_ar: `${wiki.displayName} Learning Kit`,
    heroImage: wiki.picture || '/images/robogeex-logo.png',
    overview_en: `${wiki.grade} level learning content for ${wiki.displayName}.`,
    overview_ar: `${wiki.grade} level learning content for ${wiki.displayName}.`
  }

  const updatedKits = [...existingKits, newKit]
  await writeKitsToFile(updatedKits)
}

async function createLessonFilesForWiki(wiki: any): Promise<void> {
  const lessonsPath = path.join(process.cwd(), 'data', `lessons.${wiki.slug}.json`)

  try {
    await fs.access(lessonsPath)
    return
  } catch {
    // create file below
  }

  const gettingStartedLesson = {
    id: 'getting-started',
    wikiSlug: wiki.slug,
    order: 0,
    slug: 'getting-started',
    title_en: 'Getting Started',
    title_ar: 'Getting Started',
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
        ar: 'Getting Started'
      },
      {
        type: 'heading',
        en: `Welcome to ${wiki.displayName} Learning`,
        level: 2,
        ar: `Welcome to ${wiki.displayName} Learning`
      },
      {
        type: 'paragraph',
        en: `Welcome to the ${wiki.displayName} learning kit! This is your starting point for learning about ${wiki.displayName} concepts.`,
        ar: `Welcome to the ${wiki.displayName} learning kit! This is your starting point for learning about ${wiki.displayName} concepts.`
      },
      {
        type: 'heading',
        en: 'What You\'ll Learn',
        level: 2,
        ar: 'What You Will Learn'
      },
      {
        type: 'paragraph',
        en: `In this kit, you will learn the fundamentals of ${wiki.displayName} and how to apply them in practical projects.`,
        ar: `In this kit, you will learn the fundamentals of ${wiki.displayName} and how to apply them in practical projects.`
      }
    ]
  }

  const resourcesLesson = {
    id: 'resources',
    wikiSlug: wiki.slug,
    order: 1,
    slug: 'resources',
    title_en: 'Resources',
    title_ar: 'Resources',
    duration_min: 15,
    difficulty: 'Beginner',
    prerequisites_en: [],
    prerequisites_ar: [],
    materials: [],
    body: [
      {
        type: 'heading',
        en: 'Resources',
        level: 1,
        ar: 'Resources',
      },
      {
        type: 'paragraph',
        en: `Resources for ${wiki.displayName} will appear here.`,
        ar: `Resources for ${wiki.displayName} will appear here.`,
      },
    ],
  }

  const dir = path.dirname(lessonsPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(lessonsPath, JSON.stringify([gettingStartedLesson, resourcesLesson], null, 2), 'utf-8')
}

async function createModuleFilesForWiki(wiki: any): Promise<void> {
  const modulesPath = path.join(process.cwd(), 'data', `modules.${wiki.slug}.json`)

  try {
    await fs.access(modulesPath)
    return
  } catch {
    // create file below
  }

  const defaultModules = [
    {
      id: 'intro',
      order: 1,
      title_en: 'Introduction',
      title_ar: 'Introduction',
      summary_en: `Setup and first steps for ${wiki.displayName} learning.`,
      summary_ar: `Setup and first steps for ${wiki.displayName} learning.`
    },
    {
      id: 'basics',
      order: 2,
      title_en: `${wiki.displayName} Basics`,
      title_ar: `${wiki.displayName} Basics`,
      summary_en: `Learn the fundamental concepts of ${wiki.displayName}.`,
      summary_ar: `Learn the fundamental concepts of ${wiki.displayName}.`
    }
  ]

  const dir = path.dirname(modulesPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(modulesPath, JSON.stringify(defaultModules, null, 2), 'utf-8')
}

function mergeWikis(primary: any[], fallback: any[]): any[] {
  const bySlug = new Map<string, any>()

  fallback.forEach((wiki) => {
    const slug = typeof wiki?.slug === 'string' ? wiki.slug.trim() : ''
    if (!slug) return
    bySlug.set(slug, wiki)
  })

  primary.forEach((wiki) => {
    const slug = typeof wiki?.slug === 'string' ? wiki.slug.trim() : ''
    if (!slug) return
    bySlug.set(slug, { ...(bySlug.get(slug) || {}), ...wiki })
  })

  return Array.from(bySlug.values())
}

export async function GET() {
  try {
    const fileWikis = await readWikisFromFile()
    const fallbackWikis = fileWikis.length > 0 ? fileWikis : getWikis()
    const dbWikis = await readWikisFromDb()
    if (dbWikis.length > 0) {
      return NextResponse.json(mergeWikis(dbWikis, fallbackWikis))
    }
    return NextResponse.json(fallbackWikis)
  } catch {
    try {
      return NextResponse.json(getWikis())
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Failed to load wikis' }, { status: 500 })
    }
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

    const slug = slugify(name)

    let existingWikis = await readWikisFromFile()
    try {
      const dbWikis = await readWikisFromDb()
      if (dbWikis.length > 0) {
        existingWikis = dbWikis
      }
    } catch {
      // keep file fallback
    }

    if (existingWikis.some(w => w.slug === slug)) {
      return NextResponse.json({ error: 'A wiki with this name already exists' }, { status: 409 })
    }

    let pictureUrl = ''

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

    const newWiki = {
      slug,
      displayName: name,
      grade,
      picture: pictureUrl,
      isPublished: true,
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

    await saveWikiToDb(newWiki)

    const fileWikis = await readWikisFromFile()
    await writeWikisToFile([...fileWikis, newWiki])

    await createKitForWiki(newWiki)
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
