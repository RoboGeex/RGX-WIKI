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

  const parseYouTubeTime = (value: string): number => {
    if (!value) return 0
    if (/^\d+$/.test(value)) {
      return Number.parseInt(value, 10) || 0
    }
    const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/)
    if (!match) return 0
    const hours = match[1] ? Number.parseInt(match[1], 10) : 0
    const minutes = match[2] ? Number.parseInt(match[2], 10) : 0
    const seconds = match[3] ? Number.parseInt(match[3], 10) : 0
    return hours * 3600 + minutes * 60 + seconds
  }

  const toYoutubeEmbed = (url: string): string => {
    try {
      const u = new URL(url)
      let videoId = ''
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1)
      } else if (u.hostname.includes('youtube.com')) {
        if (u.pathname.startsWith('/embed/')) {
          const segments = u.pathname.split('/')
          videoId = segments[segments.length - 1] || ''
        } else {
          videoId = u.searchParams.get('v') || ''
        }
      }
      if (!videoId) return ''
      const params = new URLSearchParams()
      const startParam = u.searchParams.get('start') || u.searchParams.get('t')
      if (startParam) {
        const startSeconds = parseYouTubeTime(startParam)
        if (startSeconds > 0) {
          params.set('start', startSeconds.toString())
        }
      }
      const paramString = params.toString()
      return `https://www.youtube.com/embed/${videoId}${paramString ? `?${paramString}` : ''}`
    } catch {
      return ''
    }
  }

  const renderBlock = (block: any, index: number) => {
    if (!block || !block.type) return null

    if (block.type === 'paragraph') {
      const html = locale === 'ar' ? block.html_ar : block.html_en
      const text = locale === 'ar' ? (block.ar || '') : (block.en || '')
      if (html) {
        return (
          <p
            key={index}
            className="text-base leading-7 text-gray-700"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      }
      if (!text) return null
      return (
        <p key={index} className="text-base leading-7 text-gray-700">
          {text}
        </p>
      )
    }

    if (block.type === 'list') {
      const items = locale === 'ar' ? block.items_ar : block.items_en
      if (!Array.isArray(items) || items.length === 0) return null
      const ListWrapper = (block.ordered ? 'ol' : 'ul') as 'ol' | 'ul'
      const listClass = block.ordered ? 'list-decimal' : 'list-disc'
      const paddingClass = locale === 'ar' ? 'pr-6' : 'pl-6'
      const itemSpacingClass = locale === 'ar' ? 'mr-2' : 'ml-2'
      return (
        <ListWrapper
          key={index}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          className={`text-base leading-7 text-gray-700 ${listClass} ${paddingClass} space-y-2`}
        >
          {items.map((item: string, itemIndex: number) => (
            <li
              key={itemIndex}
              className={itemSpacingClass}
              dangerouslySetInnerHTML={{ __html: item }}
            />
          ))}
        </ListWrapper>
      )
    }

    if (block.type === 'heading') {
      const textValue = (locale === 'ar' ? (block.ar || '') : (block.en || '')) || ''
      if (!textValue) return null

      const base = slugify(textValue)
      const count = headingCounts.get(base) ?? 0
      headingCounts.set(base, count + 1)
      const id = count === 0 ? base : `${base}-${count}`
      const originalLevel = block.level
      const level = block.level && block.level >= 2 && block.level <= 6 ? block.level : 2
      const tagLevel = Math.min(level + 1, 4)
      const Tag = (`h${tagLevel}` as keyof JSX.IntrinsicElements)
      const sizeClass = tagLevel === 3 ? 'text-2xl' : tagLevel === 4 ? 'text-xl' : 'text-3xl'
      const paddingClass = level >= 4 ? 'pl-6' : level === 3 ? 'pl-3' : ''
      const isTitleHeading = originalLevel === 1 && !skippedTitleHeading && textValue.trim() === lessonDisplayTitle.trim()

      if (isTitleHeading) {
        skippedTitleHeading = true
        return null
      } else {
        tocEntries.push({ id, text: textValue, level })
      }

      return (
        <Tag
          key={index}
          id={id}
          data-toc={true}
          data-level={level}
          data-toc-text={textValue}
          className={`${sizeClass} font-semibold text-gray-900 mt-8 mb-4 ${paddingClass}`}
        >
          {textValue}
        </Tag>
      )
    }

    if (block.type === 'table') {
      const html = locale === 'ar' ? (block.html_ar || block.html_en || '') : (block.html_en || block.html_ar || '')
      if (!html) return null
      return (
        <div key={index} className="overflow-x-auto">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
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

    if (block.type === 'youtube' && block.url) {
      const embedUrl = toYoutubeEmbed(block.url)
      if (!embedUrl) return null
      const title =
        locale === 'ar'
          ? block.title_ar || block.title_en || 'YouTube video'
          : block.title_en || block.title_ar || 'YouTube video'
      return (
        <div key={index} className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-black">
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )
    }

    if (block.type === 'video' && block.url) {
      const caption =
        locale === 'ar'
          ? block.caption_ar || block.title_ar || ''
          : block.caption_en || block.title_en || ''
      return (
        <figure key={index} className="space-y-3">
          <video
            controls
            className="w-full rounded-xl border border-gray-200 bg-black"
            src={block.url}
            poster={block.poster || undefined}
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

            <article className="tiptap prose prose-lg max-w-none space-y-6">
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
