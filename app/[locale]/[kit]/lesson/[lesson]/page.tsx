import { notFound, redirect } from 'next/navigation'
import {
  findLessonInList,
  findPrevNextInList,
  getKit,
  getLessons,
} from '@/lib/data'
import { stripLegacyDraftSuffix, DEFAULT_LESSON_SLUG, RESOURCES_LESSON_SLUG } from '@/lib/wikiPaths'
import { getLessonBySlug, getWikisFromDb } from '@/lib/server-data'
import type { Locale } from '@/lib/i18n'
import Callout from '@/components/callout'
import CodeTabs from '@/components/code-tabs'
import CodeBlock from '@/components/code-block'
import PrevNextNav from '@/components/prev-next-nav'
import LessonProgressTracker from '@/app/components/LessonProgressTracker'
import { LessonImageSlider } from '@/components/lesson/ImageSlider'
import Step from '@/components/step'
import LessonToc from '@/components/lesson-toc'
import { getListMarker } from '@/lib/segment-types'
import { InteractiveHtml } from '@/components/lesson/InteractiveHtml'
import { LessonEmbed, LessonImage, LessonVideo } from '@/components/lesson/LessonMedia'
import { splitBodyBlocksBySection } from '@/lib/lesson-sections'
import { normalizeLessonMediaUrl } from '@/lib/media-url'

export const dynamic = 'force-dynamic'

export default async function LessonPage(
  {
    params,
    searchParams,
  }: {
    params: { locale: Locale; kit: string; lesson: string }
    searchParams?: { preview?: string; previewId?: string }
  }
) {
  const { locale, kit, lesson: lessonSlug } = params
  const preview = searchParams?.preview === '1' || searchParams?.preview === 'true' || Boolean(searchParams?.previewId)
  const previewId = (searchParams?.previewId || '').trim()

  let kitData = getKit(kit)
  if (!kitData) {
    const dbWiki = (await getWikisFromDb()).find((w) => w.slug === kit)
    if (!dbWiki) {
      notFound()
    }
    kitData = {
      slug: dbWiki.slug,
      wikiSlug: dbWiki.slug,
      title_en: dbWiki.displayName || dbWiki.slug,
      title_ar: dbWiki.displayName || dbWiki.slug,
      heroImage: dbWiki.picture || '/images/robogeex-logo.png',
      overview_en: '',
      overview_ar: '',
    } as any
  }
  if (!kitData) notFound()

  const wantsFullBody = preview || Boolean(previewId)
  const allLessons = await getLessons(kit, {
    includeDrafts: wantsFullBody,
    // Preview must render draft content, which requires the lesson body —
    // metadataOnly strips it out, so only use it outside of preview mode.
    metadataOnly: !wantsFullBody,
  })

  const lessonMeta = preview && previewId
    ? allLessons.find((item) => item.id === previewId) || findLessonInList(allLessons, lessonSlug)
    : findLessonInList(allLessons, lessonSlug)

  if (!lessonMeta) {
    const sorted = allLessons.slice().sort((a, b) => (a.order || 0) - (b.order || 0))
    const firstLesson = sorted[0]
    if (firstLesson?.slug) {
      redirect(`/${locale}/${kit}/lesson/${firstLesson.slug}`)
    }
    notFound()
  }

  const fullLesson = preview && previewId
    ? undefined
    : await getLessonBySlug(lessonMeta.slug || lessonSlug, kitData.wikiSlug)
  const lesson = fullLesson || lessonMeta
  const currentSlug = stripLegacyDraftSuffix(lesson.slug || '')
  const currentKey = stripLegacyDraftSuffix(lesson.lessonKey || '')
  
  const isSpecial = currentSlug === DEFAULT_LESSON_SLUG || 
                    currentSlug === RESOURCES_LESSON_SLUG ||
                    currentKey === DEFAULT_LESSON_SLUG || 
                    currentKey === RESOURCES_LESSON_SLUG

  const normalLessons = allLessons.filter(l => {
    const root = stripLegacyDraftSuffix(l.slug || '')
    const key = stripLegacyDraftSuffix(l.lessonKey || '')
    return root !== DEFAULT_LESSON_SLUG && root !== RESOURCES_LESSON_SLUG &&
           key !== DEFAULT_LESSON_SLUG && key !== RESOURCES_LESSON_SLUG
  })
  
  const lessonIndex = isSpecial ? -1 : normalLessons.findIndex(l => {
    const root = stripLegacyDraftSuffix(l.slug || '')
    const key = stripLegacyDraftSuffix(l.lessonKey || '')
    const currentRootSlug = currentKey || currentSlug
    return stripLegacyDraftSuffix(l.lessonKey || l.slug || '') === currentRootSlug
  })
  
  const lessonOrder = lessonIndex !== -1 ? lessonIndex + 1 : null

  const rawTitle = locale === 'ar' ? (lesson.title_ar || lesson.title_en || '') : (lesson.title_en || lesson.title_ar || '')
  const lessonDisplayTitle = isSpecial ? rawTitle : (lessonOrder ? `${lessonOrder}. ${rawTitle}` : rawTitle)
  const headingCounts = new Map<string, number>()
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section'

  const tocEntriesBySection: Record<'summary' | 'lesson', { id: string; text: string; level: number }[]> = {
    summary: [],
    lesson: [],
  }
  let tocTargetSection: 'summary' | 'lesson' = 'lesson'
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

  const normalizeTextAlign = (value: unknown): 'left' | 'center' | 'right' | 'justify' | undefined => {
    if (typeof value !== 'string') return undefined
    const normalized = value.trim().toLowerCase()
    if (normalized === 'left' || normalized === 'center' || normalized === 'right' || normalized === 'justify') {
      return normalized
    }
    return undefined
  }
  const normalizeMediaUrl = (value: unknown) => normalizeLessonMediaUrl(value, kit)
  const normalizeSliderImages = (value: unknown): any[] => {
    if (!Array.isArray(value)) return []
    return value
      .map((item: any) => {
        if (typeof item === 'string') {
          return normalizeMediaUrl(item)
        }
        if (!item || typeof item !== 'object') return ''
        const normalizedUrl = normalizeMediaUrl(item.url)
        if (!normalizedUrl) return ''
        return { ...item, url: normalizedUrl }
      })
      .filter((item: any) => (typeof item === 'string' ? Boolean(item) : Boolean(item?.url)))
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

  // ─── Locale-safe block normalization ───────────────────────────────
  // The body[] array stores blocks merged by index from EN + AR editors.
  // When EN and AR have different structure (different block count/types),
  // the shared `type` field and media attributes may be WRONG for one locale.
  //
  // Each block carries json_en / json_ar — the original TipTap JSON node
  // from each editor. These are the source of truth for each locale.
  //
  // normalizeBlockForLocale reconstructs a block using the current locale's
  // json node, making EN and AR completely independent in the wiki.
  // Old lessons without json nodes pass through unchanged (backward compat).

  const localeJsonKey = locale === 'ar' ? 'json_ar' : 'json_en'
  const localeTextKey = locale === 'ar' ? 'ar' : 'en'
  const localeHtmlKey = locale === 'ar' ? 'html_ar' : 'html_en'
  const localeTitleKey = locale === 'ar' ? 'title_ar' : 'title_en'
  const localeCaptionKey = locale === 'ar' ? 'caption_ar' : 'caption_en'
  const localeItemsKey = locale === 'ar' ? 'items_ar' : 'items_en'

  /**
   * Reconstruct a body block from the current locale's json node.
   * Returns null if this block has no content for the current locale
   * (meaning it only exists in the other language).
   * Returns the original block unchanged if there are no json nodes (old format).
   */
  function normalizeBlockForLocale(block: any): any | null {
    if (!block || typeof block !== 'object') return null

    const jsonNode = block[localeJsonKey]

    // Old-format block (no json nodes at all) → pass through unchanged
    if (!jsonNode && !block.json_en && !block.json_ar) {
      return block
    }

    // Block has json nodes but NOT for this locale → skip it
    if (!jsonNode) return null

    // Map TipTap JSON node type → body block type
    const jType = jsonNode.type
    switch (jType) {
      case 'paragraph':
        {
          const align = normalizeTextAlign(jsonNode.attrs?.textAlign || jsonNode.attrs?.align || block.align)
          return {
            type: 'paragraph',
            align,
            [localeTextKey]: block[localeTextKey] || '',
            [localeHtmlKey]: block[localeHtmlKey] || '',
          }
        }
      case 'heading':
        {
          const align = normalizeTextAlign(jsonNode.attrs?.textAlign || jsonNode.attrs?.align || block.align)
          return {
            type: 'heading',
            level: jsonNode.attrs?.level || block.level || 2,
            align,
            [localeTextKey]: block[localeTextKey] || '',
            [localeHtmlKey]: block[localeHtmlKey] || '',
          }
        }
      case 'blockquote':
        return {
          type: 'callout',
          variant: block.variant || 'info',
          [localeTextKey]: block[localeTextKey] || '',
          [localeHtmlKey]: block[localeHtmlKey] || '',
        }
      case 'bulletList':
      case 'orderedList':
        return {
          type: 'list',
          ordered: jType === 'orderedList',
          start: jsonNode.attrs?.start || block.start || 1,
          [localeItemsKey]: block[localeItemsKey] || [],
          [localeTextKey]: block[localeTextKey] || '',
        }
      case 'table':
        return {
          type: 'table',
          [localeHtmlKey]: block[localeHtmlKey] || '',
        }
      case 'image':
        return {
          type: 'image',
          image: jsonNode.attrs?.src || block.image,
          width: jsonNode.attrs?.width || block.width,
          align: jsonNode.attrs?.textAlign || jsonNode.attrs?.align || block.align || 'center',
          layoutMode: jsonNode.attrs?.layoutMode || block.layoutMode || 'fit',
          [localeTitleKey]: block[localeTitleKey] || jsonNode.attrs?.alt || jsonNode.attrs?.title || '',
          [localeCaptionKey]: block[localeCaptionKey] || jsonNode.attrs?.alt || jsonNode.attrs?.title || '',
        }
      case 'video':
        return {
          type: 'video',
          url: jsonNode.attrs?.src || block.url,
          poster: jsonNode.attrs?.poster || block.poster,
          provider: jsonNode.attrs?.provider || block.provider,
          width: jsonNode.attrs?.width || block.width,
          align: jsonNode.attrs?.textAlign || jsonNode.attrs?.align || block.align || 'center',
          layoutMode: jsonNode.attrs?.layoutMode || block.layoutMode || 'aspect-video',
          [localeTitleKey]: block[localeTitleKey] || jsonNode.attrs?.title || '',
          [localeCaptionKey]: block[localeCaptionKey] || jsonNode.attrs?.title || '',
        }
      case 'youtube':
        return {
          type: 'youtube',
          url: jsonNode.attrs?.src || block.url,
          width: jsonNode.attrs?.width || block.width,
          align: jsonNode.attrs?.textAlign || jsonNode.attrs?.align || block.align || 'center',
          layoutMode: jsonNode.attrs?.layoutMode || block.layoutMode || 'aspect-video',
          [localeTitleKey]: block[localeTitleKey] || '',
        }
      case 'imageSlider':
        return {
          type: 'imageSlider',
          images: jsonNode.attrs?.images || block.images || [],
          layoutMode: jsonNode.attrs?.layoutMode || block.layoutMode || 'fit',
          align: jsonNode.attrs?.textAlign || jsonNode.attrs?.align || block.align || 'center',
          [localeTitleKey]: block[localeTitleKey] || '',
          [localeCaptionKey]: block[localeCaptionKey] || '',
          [localeHtmlKey]: block[localeHtmlKey] || '',
        }
      case 'tagBlock':
        return {
          type: 'tagBlock',
          [localeTitleKey]: block[localeTitleKey] || jsonNode.attrs?.title || '',
          [localeItemsKey]: Array.isArray(block[localeItemsKey]) ? block[localeItemsKey] : (jsonNode.attrs?.tags || []),
          [localeTextKey]: block[localeTextKey] || '',
        }
      case 'codeBlock':
        return {
          type: 'code',
          language: jsonNode.attrs?.language || block.language || 'typescript',
          [localeTextKey]: block[localeTextKey] || '',
          [localeHtmlKey]: block[localeHtmlKey] || '',
        }
      case 'horizontalRule':
        return { type: 'horizontalRule' }
      case 'columns':
        return {
          type: 'columns',
          count: jsonNode.attrs?.count || block.count || 2,
          content: Array.isArray(block.content)
            ? block.content.map((child: any) => normalizeBlockForLocale(child)).filter(Boolean)
            : [],
        }
      case 'column':
        return {
          type: 'column',
          content: Array.isArray(block.content)
            ? block.content.map((child: any) => normalizeBlockForLocale(child)).filter(Boolean)
            : [],
        }
      default:
        // Unknown json type — pass through unchanged for backward compat
        return block
    }
  }

  /**
   * Build a locale-specific block list from the body array.
   * - Blocks with json nodes for this locale → normalized (independent per locale)
   * - Blocks with json nodes only for the OTHER locale → skipped
   * - Blocks without any json nodes (old format) → passed through unchanged
   */
  const localeBody: any[] = Array.isArray(lesson.body)
    ? lesson.body.map((block: any) => normalizeBlockForLocale(block)).filter(Boolean)
    : []

  // ─── End locale-safe normalization ─────────────────────────────────

  const renderBlock = (block: any, index: number) => {
    if (!block || !block.type) return null

    if (block.type === 'paragraph') {
      const html = locale === 'ar' ? block.html_ar : block.html_en
      const text = locale === 'ar' ? (block.ar || '') : (block.en || '')
      const align = normalizeTextAlign(block.align)
      const alignStyle = align ? { textAlign: align } : undefined
      if (html) {
        return (
          <InteractiveHtml
            key={index}
            className="text-gray-700"
            html={html}
            style={alignStyle}
          />
        )
      }
      if (!text) return null
      return (
        <p key={index} className="text-gray-700" style={alignStyle}>
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
            const marker = getListMarker(items, itemIndex, !!block.ordered, block.start)

            return (
              <div
                key={itemIndex}
                className="flex items-start gap-2"
                style={{
                  [locale === 'ar' ? 'paddingRight' : 'paddingLeft']: `${indent * 2}rem`
                }}
              >
                <span className={`shrink-0 pt-0.5 leading-7 ${block.ordered ? 'min-w-[1.2rem]' : 'w-4 text-center'} text-gray-700`}>
                  {marker}
                </span>
                <InteractiveHtml
                  className="lesson-list-item-content flex-1 min-w-0 [&_p]:m-0"
                  html={text || ''}
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
      tocEntriesBySection[tocTargetSection].push({ id, text: anchorText || textValue, level })

      return (
        <Tag
          key={index}
          id={id}
          data-toc={true}
          data-level={level}
          data-toc-text={anchorText}
          className={`${sizeClass} font-semibold text-gray-900 mt-8 mb-4`}
          style={normalizeTextAlign(block.align) ? { textAlign: normalizeTextAlign(block.align) } : undefined}
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
          <InteractiveHtml className="tiptap max-w-none" html={html} />
        </div>
      )
    }

    if (block.type === 'imageSlider') {
      const images = normalizeSliderImages(block.images)
      if (!images.length) return null
      const caption = locale === 'ar' ? (block.caption_ar || block.title_ar || '') : (block.caption_en || block.title_en || '')
      return (
        <figure key={index} className="media-block flex flex-col items-center w-full">
          <LessonImageSlider images={images} layoutMode={block.layoutMode} />
          {caption ? (
            <figcaption
              className="mt-1 w-full text-base text-gray-600 text-center [&_p]:m-0 [&_p]:!text-base [&_p]:!text-gray-600 [&_p]:!leading-tight"
              dangerouslySetInnerHTML={{ __html: caption }}
            />
          ) : null}
        </figure>
      )
    }

    if (block.type === 'tagBlock') {
      const title =
        locale === 'ar'
          ? (block.title_ar || block.title_en || '')
          : (block.title_en || block.title_ar || '')
      const tagsRaw = locale === 'ar' ? block.items_ar : block.items_en
      const tags = Array.isArray(tagsRaw)
        ? tagsRaw.map((item: any) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
        : []
      if (!title && tags.length === 0) return null
      return (
        <div key={index} className="lesson-tag-card my-6 rounded-xl border border-[#cfd6da] bg-white p-4 md:p-5">
          <p className="m-0 mb-3 text-xl md:text-2xl font-semibold uppercase tracking-wide text-gray-900">{title}</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: string, tagIndex: number) => (
              <span
                key={`${tag}-${tagIndex}`}
                className="inline-flex rounded-sm border border-[#c9d3d8] bg-[#eef3f5] px-2.5 py-1.5 text-sm md:text-base font-medium uppercase tracking-[0.02em] text-[#2f363d]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )
    }

    if (block.type === 'horizontalRule') {
      return <hr key={index} className="border-t border-gray-200 my-8" />
    }

    if (block.type === 'image' && block.image) {
      const caption = locale === 'ar' ? (block.caption_ar || block.title_ar || '') : (block.caption_en || block.title_en || '')
      const imageUrl = normalizeMediaUrl(block.image)
      if (!imageUrl) return null
      const width = block.width || '100%'
      const align = block.align || 'center'
      const layoutMode = block.layoutMode || 'fit'

      const alignClass =
        align === 'left' ? 'items-start' :
          align === 'right' ? 'items-end' :
            'items-center'

      return (
        <figure
          key={index}
          className={`media-block flex flex-col ${alignClass} w-full`}
        >
          <div style={{ width, maxWidth: '100%' }}>
            <div className={`relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-md ${
              (layoutMode === '1:1' || layoutMode === '3:4' || layoutMode === '2:3' || layoutMode === '16:9')
                ? `${
                    layoutMode === '1:1' ? 'aspect-square' :
                    layoutMode === '3:4' ? 'aspect-[3/4]' :
                    layoutMode === '2:3' ? 'aspect-[2/3]' :
                    'aspect-video'
                  }`
                : ''
            }`}>
              <LessonImage
                src={imageUrl}
                alt={caption || ''}
                zoomable
                trimWhitespace={false}
                minHeightClassName={layoutMode === 'fit' ? 'min-h-[14rem]' : undefined}
                imgClassName={`block w-full !m-0 !p-0 ${
                  (layoutMode === '1:1' || layoutMode === '3:4' || layoutMode === '2:3' || layoutMode === '16:9') ? 'object-cover h-full absolute inset-0' : 'h-auto object-cover'
                }`}
              />
            </div>
            {caption ? (
              <figcaption
                className="mt-1 w-full text-base text-gray-600 text-center [&_p]:m-0 [&_p]:!text-base [&_p]:!text-gray-600 [&_p]:!leading-tight"
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
              <LessonEmbed
                src={embedUrl}
                title={title}
                iframeClassName="h-full w-full block"
              />
            </div>
          </div>
        </figure>
      )
    }

    if (block.type === 'video' && block.url) {
      const caption =
        locale === 'ar'
          ? block.caption_ar || block.title_ar || ''
          : block.caption_en || block.title_en || ''
      const isVimeo = typeof block.url === 'string' && block.url.includes('vimeo.com')
      const isYoutube = typeof block.url === 'string' && (block.url.includes('youtube.com') || block.url.includes('youtu.be'))
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

      const width = block.width || '100%'
      const align = block.align || 'center'
      const alignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'
      const layoutMode = block.layoutMode || 'aspect-video'

      const normalizedVideoUrl = normalizeMediaUrl(block.url)
      const normalizedPoster = normalizeMediaUrl(block.poster)

      return (
        <figure key={index} className={`media-block flex flex-col ${alignClass} w-full`}>
          <div style={{ width, maxWidth: '100%' }}>
            {provider === 'vimeo' || provider === 'youtube' ? (
              <div className={`relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm ${
                layoutMode === '1:1' ? 'aspect-square' :
                layoutMode === '3:4' ? 'aspect-[3/4]' :
                layoutMode === '2:3' ? 'aspect-[2/3]' :
                layoutMode === '16:9' ? 'aspect-video' :
                'aspect-video'
              }`}>
                <LessonEmbed
                  src={getEmbedUrl(block.url)}
                  title={caption || lessonDisplayTitle || (provider === 'youtube' ? 'YouTube video' : 'Vimeo video')}
                  iframeClassName="h-full w-full block"
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
                <LessonVideo
                  src={normalizedVideoUrl || block.url}
                  poster={normalizedPoster || undefined}
                  minHeightClassName={layoutMode === 'fit' ? 'min-h-[14rem]' : undefined}
                  videoClassName={`w-full block object-cover ${layoutMode === 'fit' ? 'h-auto' : 'h-full'}`}
                />
              </div>
            )}
            {caption ? (
              <figcaption className="mt-1 w-full text-base text-gray-600 text-center [&_p]:m-0 [&_p]:!text-base [&_p]:!text-gray-600 [&_p]:!leading-tight" dangerouslySetInnerHTML={{ __html: caption }} />
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

  const { summaryBlocks, lessonBlocks, hasMarkers } = splitBodyBlocksBySection(localeBody, locale)

  let renderCounter = 0
  const renderBlocks = (blocks: any[], section: 'summary' | 'lesson') => {
    tocTargetSection = section
    return blocks
      .map((block) => {
        const rendered = renderBlock(block, renderCounter)
        renderCounter += 1
        return rendered
      })
      .filter(Boolean)
  }

  const renderedSummaryBlocks = renderBlocks(summaryBlocks, 'summary')
  const renderedLessonBlocks = renderBlocks(lessonBlocks, 'lesson')
  const defaultSection: 'summary' | 'lesson' = hasMarkers ? 'summary' : 'lesson'
  const showSectionTabs = hasMarkers
  const tabBase = `${lesson.id || lesson.slug || 'lesson'}-${locale}`.replace(/[^a-zA-Z0-9_-]/g, '')
  const summaryTabId = `${tabBase}-summary`
  const lessonTabId = `${tabBase}-lesson`
  const summaryPlaceholder = 'Write the lesson summary here.'
  const lessonPlaceholder = 'Write the lesson content here.'

  const summaryTocEntries = tocEntriesBySection.summary.map((entry) => ({ ...entry }))
  const lessonTocEntries = tocEntriesBySection.lesson.map((entry) => ({ ...entry }))

  const { prev: prevLesson, next: nextLesson } = findPrevNextInList(allLessons, lesson.slug)

  const placeholder =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="32">Lesson cover</text></svg>'
  const coverCandidates = [
    normalizeMediaUrl(lesson.coverImage),
    kitData.heroImage,
    placeholder,
  ]
  const coverSrc = coverCandidates.find((c) => typeof c === 'string' && c.trim().length > 0)?.trim() || placeholder

  return (
    <div className="mx-auto w-full max-w-[1600px] px-0 sm:px-6 lg:px-10 xl:px-12 pt-0 sm:pt-4 pb-10">
      <div className={showSectionTabs ? 'lesson-section-tabs' : ''}>
        {showSectionTabs ? (
          <>
            <input
              id={summaryTabId}
              type="radio"
              name={`${tabBase}-sections`}
              className="lesson-section-tab-input lesson-section-tab-input-summary"
              defaultChecked={defaultSection === 'summary'}
            />
            <input
              id={lessonTabId}
              type="radio"
              name={`${tabBase}-sections`}
              className="lesson-section-tab-input lesson-section-tab-input-lesson"
              defaultChecked={defaultSection === 'lesson'}
            />
          </>
        ) : null}
        <div className="lesson-section-layout flex flex-col gap-0 sm:gap-8 lg:grid lg:grid-cols-[260px_793px] lg:justify-center lg:gap-10">
          <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0">
            <div className="sticky top-20 space-y-4">
              {showSectionTabs ? (
                <>
                  <div className="lesson-toc-panel lesson-toc-panel-summary">
                    <LessonToc entries={summaryTocEntries} lessonTitle={lessonDisplayTitle} locale={locale} />
                  </div>
                  <div className="lesson-toc-panel lesson-toc-panel-lesson">
                    <LessonToc entries={lessonTocEntries} lessonTitle={lessonDisplayTitle} locale={locale} />
                  </div>
                </>
              ) : (
                <LessonToc entries={lessonTocEntries} lessonTitle={lessonDisplayTitle} locale={locale} />
              )}
            </div>
          </aside>

          <div className="w-full space-y-6 lg:justify-self-start">
            <div className="bg-white sm:border border-gray-200 sm:rounded-3xl sm:shadow-md sm:overflow-hidden">
            <div className="w-full bg-gray-100">
              <LessonImage
                src={coverSrc}
                alt={lesson.title_en || lesson.title_ar || 'Lesson cover'}
                zoomable
                loading="eager"
                minHeightClassName="min-h-[14rem]"
                imgClassName="w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[3/1] object-cover sm:rounded-none rounded-2xl"
              />
            </div>
              <div className="px-4 py-6 sm:p-5 md:p-8 xl:p-10 space-y-6">
                <header className="space-y-2 border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-primary font-medium uppercase tracking-wide text-[11px]">
                      {locale === 'ar' 
                        ? (isSpecial ? '\u0627\u0644\u062F\u0631\u0633' : `\u0627\u0644\u062F\u0631\u0633 ${lessonOrder}`) 
                        : (isSpecial ? 'Lesson' : `Lesson ${lessonOrder}`)}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{kitData.title_en}</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                    {lessonDisplayTitle}
                  </h1>
                  {(lesson.duration_min || lesson.difficulty) && (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      {typeof lesson.duration_min === 'number' && lesson.duration_min > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-semibold tracking-wide text-xs uppercase text-gray-700">
                          {lesson.duration_min} min
                        </span>
                      )}
                      {lesson.difficulty && lesson.difficulty.trim() && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-semibold tracking-wide text-xs uppercase text-gray-700">
                          {lesson.difficulty}
                        </span>
                      )}
                    </div>
                  )}
                </header>

                {showSectionTabs ? (
                  <>
                    <div className="lesson-section-tab-list" role="tablist" aria-label="Lesson sections">
                      <label htmlFor={summaryTabId} className="lesson-section-tab lesson-section-tab-summary" role="tab" aria-controls={`${summaryTabId}-panel`}>
                        {locale === 'ar' ? '\u0627\u0644\u0645\u0644\u062E\u0635' : 'Summary'}
                      </label>
                      <label htmlFor={lessonTabId} className="lesson-section-tab lesson-section-tab-lesson" role="tab" aria-controls={`${lessonTabId}-panel`}>
                        {locale === 'ar' ? '\u0627\u0644\u062F\u0631\u0633' : 'Lesson'}
                      </label>
                    </div>

                    <article
                      id={`${summaryTabId}-panel`}
                      className="lesson-section-panel lesson-section-panel-summary tiptap prose prose-xl max-w-none space-y-6"
                    >
                      {renderedSummaryBlocks.length > 0 ? renderedSummaryBlocks : (
                        <p className="text-gray-400 italic">{summaryPlaceholder}</p>
                      )}
                    </article>

                    <article
                      id={`${lessonTabId}-panel`}
                      className="lesson-section-panel lesson-section-panel-lesson tiptap prose prose-xl max-w-none space-y-6"
                    >
                      {renderedLessonBlocks.length > 0 ? renderedLessonBlocks : (
                        <p className="text-gray-400 italic">{lessonPlaceholder}</p>
                      )}
                    </article>
                  </>
                ) : (
                  <article className="tiptap prose prose-xl max-w-none space-y-6">
                    {renderedLessonBlocks.length > 0 ? renderedLessonBlocks : (
                      <p className="text-gray-400 italic">{lessonPlaceholder}</p>
                    )}
                  </article>
                )}

                <LessonProgressTracker lessonId={lesson.id} wikiSlug={kit} />

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
    </div>
  )
}

