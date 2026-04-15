import { notFound } from 'next/navigation'
import {
  getKit,
  getLesson,
  getNextLesson, getPrevLesson,
} from '@/lib/data'
import type { Locale } from '@/lib/i18n'
import Callout from '@/components/callout'
import CodeTabs from '@/components/code-tabs'
import CodeBlock from '@/components/code-block'
import PrevNextNav from '@/components/prev-next-nav'
import { LessonImageSlider } from '@/components/lesson/ImageSlider'
import Step from '@/components/step'
import LessonToc from '@/components/lesson-toc'
import { getListMarker } from '@/lib/segment-types'
import { ZoomableImage } from '@/components/zoomable-image'

export const dynamic = 'force-dynamic'

export default async function LessonPage(
  {
    params,
    searchParams,
  }: {
    params: { locale: Locale; kit: string; lesson: string }
    searchParams?: { preview?: string }
  }
) {
  const { locale, kit, lesson: lessonSlug } = params
  const preview = searchParams?.preview === '1' || searchParams?.preview === 'true'

  const kitData = getKit(kit)
  if (!kitData) {
    notFound()
  }

  const lesson = await getLesson(kit, lessonSlug, { includeDrafts: preview })

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
          <div
            key={index}
            className="text-gray-700"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      }
      if (!text) return null
      return (
        <p key={index} className="text-gray-700">
          {text}
        </p>
      )
    }

    if (block.type === 'list') {
      const items = locale === 'ar' ? block.items_ar : block.items_en
      if (!Array.isArray(items) || items.length === 0) return null

      const paddingClass = locale === 'ar' ? 'pr-6' : 'pl-6'

      return (
        <div
          key={index}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          className={`text-xl leading-7 text-gray-700 ${paddingClass} space-y-1 my-3`}
        >
          {items.map((item: any, itemIndex: number) => {
            const text = typeof item === 'object' ? item.text : item
            const indent = typeof item === 'object' ? (item.indent || 0) : 0
            const marker = getListMarker(items, itemIndex, !!block.ordered)

            return (
              <div
                key={itemIndex}
                className="flex items-baseline gap-1.5"
                style={{
                  [locale === 'ar' ? 'paddingRight' : 'paddingLeft']: `${indent * 2}rem`
                }}
              >
                <span className={`shrink-0 leading-7 ${block.ordered ? 'min-w-[1.2rem]' : 'w-4 text-center'} text-gray-700`}>
                  {marker}
                </span>
                <div
                  className="flex-1 [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: text }}
                />
              </div>
            )
          })}
        </div>
      )
    }

    if (block.type === 'heading') {
      const textValue = (locale === 'ar' ? (block.ar || '') : (block.en || '')) || ''
      const htmlValue = locale === 'ar' ? block.html_ar : block.html_en
      if (!textValue && !htmlValue) return null

      const anchorText = textValue || (typeof htmlValue === 'string' ? htmlValue.replace(/<[^>]+>/g, '') : '')
      const base = slugify(anchorText || 'heading')
      const count = headingCounts.get(base) ?? 0
      headingCounts.set(base, count + 1)
      const id = count === 0 ? base : `${base}-${count}`
      const originalLevel = block.level
      const level = block.level && block.level >= 1 && block.level <= 6 ? block.level : 2
      const Tag = (`h${level}` as keyof JSX.IntrinsicElements)
      const sizeClass =
        level === 1 ? 'text-5xl' :
          level === 2 ? 'text-4xl' :
            level === 3 ? 'text-2xl' :
              level === 4 ? 'text-xl' :
                'text-lg'
      const paddingClass = level >= 4 ? 'pl-6' : level === 3 ? 'pl-3' : ''
      const normalizedHeading = textValue.trim()
      const normalizedTitle = lessonDisplayTitle.trim()
      if (level === 1 && normalizedHeading && normalizedHeading === normalizedTitle) {
        // Skip duplicating the lesson title in the body; it's already shown in the header card
        return null
      }
      tocEntries.push({ id, text: anchorText || textValue, level })

      return (
        <Tag
          key={index}
          id={id}
          data-toc={true}
          data-level={level}
          data-toc-text={anchorText}
          className={`${sizeClass} font-semibold text-gray-900 mt-8 mb-4`}
        >
          {htmlValue ? (
            <span dangerouslySetInnerHTML={{ __html: htmlValue }} />
          ) : (
            textValue
          )}
        </Tag>
      )
    }

    if (block.type === 'table') {
      const html = locale === 'ar' ? (block.html_ar || block.html_en || '') : (block.html_en || block.html_ar || '')
      if (!html) return null
      return (
        <div key={index} className="overflow-x-auto my-6">
          <article
            className="tiptap max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )
    }

    if (block.type === 'imageSlider') {
      const images = Array.isArray(block.images) ? block.images.filter(Boolean) : []
      if (!images.length) return null
      const caption = locale === 'ar' ? (block.caption_ar || block.title_ar || '') : (block.caption_en || block.title_en || '')
      const nodeAttrs =
        (locale === 'ar' ? block?.json_ar?.attrs : block?.json_en?.attrs) ||
        block?.json_en?.attrs ||
        block?.json_ar?.attrs ||
        {}
      const layoutMode = block.layoutMode || nodeAttrs.layoutMode || 'fit'
      return (
        <figure key={index} className="mt-2 mb-8 flex flex-col items-center w-full">
          <LessonImageSlider images={images} layoutMode={layoutMode} />
          {caption ? (
            <figcaption
              className="mt-1 pb-2 text-[11px] text-gray-500 text-center leading-tight [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: caption }}
            />
          ) : null}
        </figure>
      )
    }

    if (block.type === 'horizontalRule') {
      return <hr key={index} className="border-t border-gray-200 my-8" />
    }

    if (block.type === 'image') {
      const caption = locale === 'ar' ? (block.caption_ar || block.title_ar || '') : (block.caption_en || block.title_en || '')
      const nodeAttrs =
        (locale === 'ar' ? block?.json_ar?.attrs : block?.json_en?.attrs) ||
        block?.json_en?.attrs ||
        block?.json_ar?.attrs ||
        {}
      // Use Arabic image if available in Arabic locale, otherwise use English image.
      const imageUrl = locale === 'ar'
        ? (block.image_ar || block.image || nodeAttrs.src)
        : (block.image || block.image_ar || nodeAttrs.src)
      const width = block.width || nodeAttrs.width || '100%'
      const align = block.align || block.textAlign || nodeAttrs.textAlign || nodeAttrs.align || 'center'
      const layoutMode = block.layoutMode || nodeAttrs.layoutMode || 'fit'
      if (!imageUrl) return null

      const alignClass =
        align === 'left' ? 'items-start' :
          align === 'right' ? 'items-end' :
            'items-center'

      return (
        <figure
          key={index}
          className={`mt-2 mb-8 flex flex-col ${alignClass} w-full`}
        >
          <div style={{ width, maxWidth: '100%' }}>
            <div className={`relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-md ${
              (layoutMode === '1:1' || layoutMode === '3:4' || layoutMode === '2:3' || layoutMode === '16:9') 
                ? `flex items-center justify-center ${
                    layoutMode === '1:1' ? 'aspect-square' :
                    layoutMode === '3:4' ? 'aspect-[3/4]' :
                    layoutMode === '2:3' ? 'aspect-[2/3]' :
                    'aspect-video'
                  }`
                : ''
            }`}>
              <ZoomableImage>
                <img
                  src={imageUrl}
                  alt={caption || ''}
                  className={`block w-full !m-0 !p-0 ${
                    (layoutMode === '1:1' || layoutMode === '3:4' || layoutMode === '2:3' || layoutMode === '16:9') ? 'object-cover h-full' : 'h-auto object-cover'
                  }`}
                  loading="lazy"
                />
              </ZoomableImage>
            </div>
            {caption ? (
              <figcaption
                className="mt-1 pb-2 text-[11px] text-gray-500 text-center leading-tight [&_p]:m-0"
                dangerouslySetInnerHTML={{ __html: caption }}
              />
            ) : null}
          </div>
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
      const width = block.width || '100%'
      const align = block.align || 'center'
      const alignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'
      const layoutMode = block.layoutMode || 'aspect-video'

      return (
        <figure key={index} className={`mt-2 mb-8 flex flex-col ${alignClass} w-full`}>
          <div style={{ width, maxWidth: '100%' }}>
            <div className={`relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm ${
              layoutMode === '1:1' ? 'aspect-square' :
              layoutMode === '3:4' ? 'aspect-[3/4]' :
              layoutMode === '2:3' ? 'aspect-[2/3]' :
              layoutMode === '16:9' ? 'aspect-video' :
              'aspect-video'
            }`}>
              <iframe
                src={embedUrl}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full block object-cover"
              />
            </div>
          </div>
        </figure>
      )
    }

    if (block.type === 'video') {
      const caption =
        locale === 'ar'
          ? block.caption_ar || block.title_ar || ''
          : block.caption_en || block.title_en || ''
      const nodeAttrs =
        (locale === 'ar' ? block?.json_ar?.attrs : block?.json_en?.attrs) ||
        block?.json_en?.attrs ||
        block?.json_ar?.attrs ||
        {}
      const videoUrl = block.url || nodeAttrs.src
      if (!videoUrl) return null
      const isVimeo = typeof videoUrl === 'string' && videoUrl.includes('vimeo.com')
      const isYoutube = typeof videoUrl === 'string' && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))
      const provider = block.provider || (isVimeo ? 'vimeo' : isYoutube ? 'youtube' : null)

      const getEmbedUrl = (url: string) => {
        if (!url) return ''
        if (url.includes('vimeo.com') && !url.includes('player.vimeo.com')) {
          const match = url.match(/vimeo\.com\/(?:video\/)*([0-9]+)/)
          return match ? `https://player.vimeo.com/video/${match[1]}` : url
        }
        if ((url.includes('youtube.com') || url.includes('youtu.be')) && !url.includes('youtube.com/embed')) {
          const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/)
          return match ? `https://www.youtube.com/embed/${match[1]}` : url
        }
        return url
      }

      const width = block.width || nodeAttrs.width || '100%'
      const align = block.align || block.textAlign || nodeAttrs.textAlign || nodeAttrs.align || 'center'
      const alignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'
      const layoutMode = block.layoutMode || nodeAttrs.layoutMode || 'aspect-video'

      return (
        <figure key={index} className={`mt-2 mb-8 flex flex-col ${alignClass} w-full`}>
          <div style={{ width, maxWidth: '100%' }}>
            {provider === 'vimeo' || provider === 'youtube' ? (
              <div className={`relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm ${
                layoutMode === '1:1' ? 'aspect-square' :
                layoutMode === '3:4' ? 'aspect-[3/4]' :
                layoutMode === '2:3' ? 'aspect-[2/3]' :
                layoutMode === '16:9' ? 'aspect-video' :
                'aspect-video'
              }`}>
                <iframe
                  src={getEmbedUrl(videoUrl)}
                  title={caption || lessonDisplayTitle || (provider === 'youtube' ? 'YouTube video' : 'Vimeo video')}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full block object-cover"
                />
              </div>
            ) : (
              <div className={`relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm flex items-center justify-center ${
                layoutMode === '1:1' ? 'aspect-square' :
                layoutMode === '3:4' ? 'aspect-[3/4]' :
                layoutMode === '2:3' ? 'aspect-[2/3]' :
                layoutMode === '16:9' ? 'aspect-video' :
                layoutMode === 'fit' ? '' :
                'aspect-video'
              }`}>
                <video
                  controls
                  className={`w-full block object-cover ${layoutMode === 'fit' ? 'h-auto' : 'h-full'}`}
                  src={block.url}
                  poster={block.poster || undefined}
                />
              </div>
            )}
            {caption ? (
              <figcaption className="mt-1 pb-2 text-[11px] text-gray-500 text-center leading-tight [&_p]:m-0" dangerouslySetInnerHTML={{ __html: caption }} />
            ) : null}
          </div>
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

    if (block.type === 'columns') {
      const count = block.count || 2
      const content = block.content || []
      return (
        <div
          key={index}
          className="columns-layout"
          style={{ '--columns-count': count.toString() } as React.CSSProperties}
        >
          {content.map((child: any, childIndex: number) => renderBlock(child, childIndex))}
        </div>
      )
    }

    if (block.type === 'column') {
      const content = block.content || []
      return (
        <div key={index} className="column-layout">
          {content.map((child: any, childIndex: number) => renderBlock(child, childIndex))}
        </div>
      )
    }

    if (block.type === 'code') {
      const code = locale === 'ar' ? (block.ar || block.en || '') : (block.en || '')
      if (!code) return null
      return <CodeBlock key={index} code={code} language={block.language} locale={locale} />
    }

    return null
  }

  const renderedBlocks = Array.isArray(lesson.body)
    ? lesson.body.map((block, index) => renderBlock(block, index)).filter(Boolean)
    : []

  const clientTocEntries = tocEntries.map((entry) => ({ ...entry }))

  const prevLesson = await getPrevLesson(kit, lesson.slug, { includeDrafts: preview })
  const nextLesson = await getNextLesson(kit, lesson.slug, { includeDrafts: preview })

  const placeholder =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="32">Lesson cover</text></svg>'
  const coverCandidates = [
    lesson.coverImage,
    kitData.heroImage,
    placeholder,
  ]
  const coverSrc = coverCandidates.find((c) => typeof c === 'string' && c.trim().length > 0)?.trim() || placeholder

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 xl:px-12 pt-4 pb-10">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:w-64 lg:flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            <LessonToc entries={clientTocEntries} lessonTitle={lessonDisplayTitle} />
          </div>
        </aside>

        <div className="flex-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-md overflow-hidden">
            <div className="w-full bg-gray-100">
              <ZoomableImage>
                <img
                  src={coverSrc}
                  alt={lesson.title_en || lesson.title_ar || 'Lesson cover'}
                  className="w-full h-[150px] md:h-[240px] object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </ZoomableImage>
            </div>
            <div className="p-5 md:p-8 xl:p-10 space-y-6">
              <header className="space-y-2 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-primary font-medium uppercase tracking-wide text-[11px]">
                    {locale === 'ar' ? 'الدرس' : 'Lesson'}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{kitData.title_en}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                  {locale === 'ar' ? (lesson.title_ar || lesson.title_en || '') : (lesson.title_en || lesson.title_ar || '')}
                </h1>
              </header>

              <article className="tiptap prose prose-xl max-w-none space-y-6">
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
    </div>
  )
}
