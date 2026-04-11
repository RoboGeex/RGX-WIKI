"use client";


import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import KitHeader from '@/components/kit-header';
import { getListMarker } from '@/lib/segment-types';
import { LessonImageSlider } from '@/components/lesson/ImageSlider'
import { InteractiveHtml } from '@/components/lesson/InteractiveHtml'
import { LessonEmbed, LessonImage, LessonVideo } from '@/components/lesson/LessonMedia'

const LessonPage = () => {
    const params = useParams();
    const id = (params?.id as string) || "";

    const [lesson, setLesson] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);
    // Extract headings from lesson.body (array of blocks)
    const headings = useMemo(() => {
        if (!lesson?.body) {
            return []
        }
        const extractedHeadings = lesson.body
            .filter((item: any) => item.type === 'heading' && item.en && ((item.level ?? 2) === 1))
            .map((item: any, idx: number) => ({
                id: (item.en as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + idx,
                text: item.en,
                level: item.level || 2,
            }))
        return extractedHeadings
    }, [lesson?.body]);

    useEffect(() => {
        if (id) {
            // Fetch lesson data based on the ID
            const fetchLesson = async () => {
                try {
                    const response = await fetch(`/api/lessons/${id}?kit=student-kit`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    setLesson(data);
                } catch (error) {
                    console.error('Error fetching lesson:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchLesson();
        }
    }, [id]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!lesson) {
        return <div>Lesson not found.</div>;
    }

    const normalizeTextAlign = (value: unknown): 'left' | 'center' | 'right' | 'justify' | undefined => {
        if (typeof value !== 'string') return undefined;
        const normalized = value.trim().toLowerCase();
        if (normalized === 'left' || normalized === 'center' || normalized === 'right' || normalized === 'justify') {
            return normalized;
        }
        return undefined;
    };

    const getBlockAlign = (item: any): 'left' | 'center' | 'right' | 'justify' | undefined => {
        return normalizeTextAlign(item?.align || item?.json_en?.attrs?.textAlign || item?.json_en?.attrs?.align);
    };


    // Render lesson.body as HTML and add IDs to headings
    const renderBody = () => {
        if (!lesson?.body) return null;
        const renderBlock = (item: any, blockIdx: number): any => {
            if (item.type === 'heading' && item.en) {
                const Tag = `h${item.level || 2}` as keyof JSX.IntrinsicElements;
                const id = (item.en as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + blockIdx;
                const textAlign = getBlockAlign(item);
                return <Tag key={id} id={id} className={
                    item.level === 1 ? 'text-2xl font-bold mt-8 mb-4' :
                        item.level === 2 ? 'text-xl font-semibold mt-6 mb-3' :
                            'text-lg font-medium mt-4 mb-2'
                } style={textAlign ? { textAlign } : undefined}>{item.html_en ? <span dangerouslySetInnerHTML={{ __html: item.html_en }} /> : item.en}</Tag>;
            }
            if (item.type === 'paragraph' && (item.html_en || item.en)) {
                const textAlign = getBlockAlign(item);
                return <InteractiveHtml key={blockIdx} className="mb-4" html={item.html_en || item.en} style={textAlign ? { textAlign } : undefined} />;
            }
            if (item.type === 'table') {
                const html = item.html_en || ''
                return (
                    <div key={blockIdx} className="overflow-x-auto">
                        <InteractiveHtml className="tiptap" html={html} />
                    </div>
                );
            }
            if (item.type === 'imageSlider') {
                const images = Array.isArray(item.images) ? item.images : []
                const caption = item.caption_en || item.caption_ar || item.title_en || item.title_ar || ''
                if (!images.length) return null
                const layoutMode = item.layoutMode || 'fit'
                
                return (
                    <figure key={blockIdx} className="media-block flex flex-col items-center w-full">
                        <LessonImageSlider images={images} layoutMode={layoutMode} />
                        {caption ? (
                            <figcaption
                                className="mt-1 w-full text-base text-gray-600 text-center [&_p]:m-0 [&_p]:!text-base [&_p]:!text-gray-600 [&_p]:!leading-tight"
                                dangerouslySetInnerHTML={{ __html: caption }}
                            />
                        ) : null}
                    </figure>
                );
            }
            if (item.type === 'list') {
                const items = item.items_en || (item.en ? [item.en] : []);
                if (!Array.isArray(items) || items.length === 0) return null;

                return (
                    <div key={blockIdx} className="pl-2 mb-4 space-y-2 text-gray-700">
                        {items.map((li: any, liIdx: number) => {
                            const text = typeof li === 'object' ? li.text : li;
                            const indent = typeof li === 'object' ? (li.indent || 0) : 0;
                            const marker = getListMarker(items, liIdx, !!item.ordered)

                            return (
                                <div
                                    key={liIdx}
                                    className="flex items-start gap-3"
                                    style={{ paddingLeft: `${indent * 2}rem` }}
                                >
                                    <span className={`shrink-0 font-medium ${item.ordered ? 'min-w-[1.5rem]' : 'w-4 text-center'} text-gray-500`}>
                                        {marker}
                                    </span>
                                    <InteractiveHtml
                                        className="lesson-list-item-content flex-1 min-w-0 [&_p]:m-0"
                                        html={text || ''}
                                    />
                                </div>
                            );
                        })}
                    </div>
                );
            }

            if (item.type === 'image' && item.image) {
                const caption = item.caption_en || item.caption_ar || item.title_en || item.title_ar || '';
                const width = item.width || '100%';
                const align = item.align || 'center';
                const layoutMode = item.layoutMode || 'fit';
                const alignClass =
                    align === 'left' ? 'items-start' :
                        align === 'right' ? 'items-end' :
                            'items-center';

                return (
                    <figure key={blockIdx} className={`media-block flex flex-col ${alignClass} w-full`}>
                        <div style={{ width, maxWidth: '100%' }}>
                            <div className={`relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${
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
                                    src={item.image}
                                    alt={caption}
                                    zoomable
                                    trimWhitespace={layoutMode === 'fit'}
                                    minHeightClassName={layoutMode === 'fit' ? 'min-h-[14rem]' : undefined}
                                    imgClassName={`w-full block !m-0 !p-0 ${
                                      (layoutMode === '1:1' || layoutMode === '3:4' || layoutMode === '2:3' || layoutMode === '16:9') ? 'object-cover h-full' : 'h-auto object-cover'
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
                );
            }

            if (item.type === 'youtube' && item.url) {
                const embedUrl = item.url.includes('youtube.com') || item.url.includes('youtu.be')
                    ? item.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
                    : item.url
                const title = item.title_en || item.title_ar || 'YouTube video'
                const width = item.width || '100%'
                const align = item.align || 'center'
                const alignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'
                const layoutMode = item.layoutMode || 'aspect-video'

                return (
                    <figure key={blockIdx} className={`mt-2 mb-8 flex flex-col ${alignClass} w-full`}>
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
                );
            }

            if (item.type === 'video' && item.url) {
                const caption = item.caption_en || item.caption_ar || item.title_en || item.title_ar || ''
                const width = item.width || '100%'
                const align = item.align || 'center'
                const alignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'
                const layoutMode = item.layoutMode || 'aspect-video'

                const isVimeo = typeof item.url === 'string' && item.url.includes('vimeo.com')
                const isYoutube = typeof item.url === 'string' && (item.url.includes('youtube.com') || item.url.includes('youtu.be'))
                const provider = item.provider || (isVimeo ? 'vimeo' : isYoutube ? 'youtube' : null)

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

                return (
                    <figure key={blockIdx} className={`media-block flex flex-col ${alignClass} w-full`}>
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
                                        src={getEmbedUrl(item.url)}
                                        title={caption || 'Video'}
                                        iframeClassName="h-full w-full block object-cover"
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
                                        src={item.url}
                                        poster={item.poster || undefined}
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
                );
            }

            if (item.type === 'columns') {
                return (
                    <div
                        key={blockIdx}
                        className="columns-layout"
                        style={{ '--columns-count': item.count || 2 } as any}
                    >
                        {(item.content || []).map((child: any, cIdx: number) => renderBlock(child, cIdx))}
                    </div>
                );
            }

            if (item.type === 'column') {
                return (
                    <div key={blockIdx} className="column-layout">
                        {(item.content || []).map((child: any, cIdx: number) => renderBlock(child, cIdx))}
                    </div>
                );
            }

            return null;
        };

        return lesson.body.map((item: any, idx: number) => renderBlock(item, idx));
    };

    // Scroll to heading
    const scrollToHeading = (id: string) => {
        const el = contentRef.current?.querySelector(`#${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-[1800px] gap-12 px-10 py-12">
            {/* TOC Sidebar */}
            <aside className="hidden w-32 shrink-0 md:flex">
                <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Lesson</h3>
                    <div className="mt-2 text-base font-semibold text-gray-900">{lesson.title_en || lesson.title || ''}</div>
                    <nav className="mt-6 space-y-2">
                        {headings.length === 0 ? (
                            <div className="text-xs text-gray-400 italic">No headings found</div>
                        ) : (
                            headings.map((h: { id: string; text: string; level: number }) => (
                                <button
                                    key={h.id}
                                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-primary/10 hover:text-primary"
                                    onClick={() => scrollToHeading(h.id)}
                                >
                                    {h.text}
                                </button>
                            ))
                        )}
                    </nav>
                </div>
            </aside>
            {/* Main Content */}
            <div className="flex-1 min-w-0">
                <div className="w-full rounded-3xl border border-gray-200 bg-white p-12 shadow-md">
                    <KitHeader lang="en" kitSlug="student-kit" lessonSlug={id} />
                    <div ref={contentRef} className="tiptap prose prose-xl mt-6 max-w-none">
                        {renderBody()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonPage;
