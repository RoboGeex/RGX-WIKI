import { notFound } from 'next/navigation'
import {
  getKit,
  getLesson,
  getNextLesson, getPrevLesson,
} from '@/lib/data'
import type { Locale } from '@/lib/i18n'
import Breadcrumbs from '@/components/breadcrumbs'
import Callout from '@/components/callout'
import CodeTabs from '@/components/code-tabs'
import PrevNextNav from '@/components/prev-next-nav'
import Step from '@/components/step'
import LessonToc from '@/components/lesson-toc'

export const dynamic = 'force-dynamic'

export default async function LessonPage(
  { params }: { params: { locale: Locale; kit: string; lesson: string } }
) {
  const { locale, kit, lesson: lessonSlug } = params

  const kitData = getKit(kit)
  if (!kitData) {
    notFound()
  }

  const lesson = await getLesson(kit, lessonSlug)

  if (!lesson) {
    notFound()
  }

  const lessonDisplayTitle = locale === 'ar' ? (lesson.title_ar || lesson.title_en || '') : (lesson.title_en || lesson.title_ar || '')
  const headingCounts = new Map<string, number>()
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section'

  const tocEntries: { id: string; text: string; level: number }[] = []
  let stepIndex = 0
  let skippedTitleHeading = false

  const renderBlock = (block: any, index: number) => {
    if (!block || !block.type) return null
    
    if (block.type === 'paragraph') {
      return (
        <p key={index} className="text-base leading-7 text-gray-700">
          {locale === 'ar' ? (block.ar || '') : (block.en || '')}
        </p>
      )
    }

    if (block.type === 'heading') {
      const text = (locale === 'ar' ? (block.ar || '') : (block.en || '')) || ''
      if (!text) return null
      
      const base = slugify(text)
      const count = headingCounts.get(base) ?? 0
      headingCounts.set(base, count + 1)
      const id = count === 0 ? base : `${base}-${count}`
      const originalLevel = block.level
      const level = block.level && block.level >= 2 && block.level <= 6 ? block.level : 2
      const tagLevel = Math.min(level + 1, 4)
      const Tag = (`h${tagLevel}` as keyof JSX.IntrinsicElements)
      const sizeClass = tagLevel === 3 ? 'text-2xl' : 'text-xl'
      const paddingClass = level >= 4 ? 'pl-6' : level === 3 ? 'pl-3' : ''
      const isTitleHeading = originalLevel === 1 && !skippedTitleHeading && text.trim() === lessonDisplayTitle.trim()
      
      if (isTitleHeading) {
        skippedTitleHeading = true
        return null
      } else {
        tocEntries.push({ id, text, level })
      }
      
      return (
        <Tag
          key={index}
          id={id}
          data-toc={true}
          data-level={level}
          data-toc-text={text}
          className={`${sizeClass} font-semibold text-gray-900 mt-8 mb-4 ${paddingClass}`}>
          {text}
        </Tag>
      )
    }

    if (block.type === 'image' && block.image) {
      const caption = locale === 'ar' ? (block.caption_ar || block.title_ar || '') : (block.caption_en || block.title_en || '')
      return (
        <figure key={index} className="space-y-3">
          <img
            src={block.image}
            alt={caption || ''}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 object-contain"
          />
          {caption ? (
            <figcaption className="text-xs text-gray-500 text-center">{caption}</figcaption>
          ) : null}
        </figure>
      )
    }

    if (block.type === 'step') {
      stepIndex++
      return <Step key={index} step={block} stepNumber={stepIndex} locale={locale} />
    }

    if (block.type === 'callout') {
      return <Callout key={index} callout={block} locale={locale} />
    }

    if (block.type === 'codeTabs') {
      return <CodeTabs key={index} codeItem={block} locale={locale} />
    }

    return null
  }

  const renderedBlocks = Array.isArray(lesson.body)
    ? lesson.body.map((block, index) => renderBlock(block, index)).filter(Boolean)
    : []

  const clientTocEntries = tocEntries.map((entry) => ({ ...entry }))

  const prevLesson = await getPrevLesson(kit, lesson.slug)
  const nextLesson = await getNextLesson(kit, lesson.slug)

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 xl:px-12 pt-4 pb-10">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:w-64 lg:flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            <LessonToc entries={clientTocEntries} lessonTitle={lessonDisplayTitle} />
          </div>
        </aside>

        <div className="flex-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-md p-6 md:p-10 xl:p-12 space-y-10">
            <Breadcrumbs locale={locale} kit={kitData} lesson={lesson} />
            <header className="space-y-4 border-b border-gray-200 pb-6">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-primary font-medium uppercase tracking-wide text-xs">
                  {locale === 'ar' ? 'الدرس' : 'Lesson'}
                </span>
                <span>{kitData.title_en}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {locale === 'ar' ? (lesson.title_ar || lesson.title_en || '') : (lesson.title_en || lesson.title_ar || '')}
              </h1>
            </header>

            <article className="prose prose-lg max-w-none space-y-6">
              {renderedBlocks}
            </article>

            <PrevNextNav
              prevLesson={prevLesson}
              nextLesson={nextLesson}
              locale={locale}
              kitSlug={kit}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
