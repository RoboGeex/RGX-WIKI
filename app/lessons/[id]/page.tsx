"use client";


import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import KitHeader from '@/components/kit-header';
import { getListMarker } from '@/lib/segment-types';

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


    // Render lesson.body as HTML and add IDs to headings
    const renderBody = () => {
        if (!lesson?.body) return null;
        return lesson.body.map((item: any, idx: number) => {
            if (item.type === 'heading' && item.en) {
                const Tag = `h${item.level || 2}` as keyof JSX.IntrinsicElements;
                const id = (item.en as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + idx;
                return <Tag key={id} id={id} className={
                  item.level === 1 ? 'text-2xl font-bold mt-8 mb-4' :
                  item.level === 2 ? 'text-xl font-semibold mt-6 mb-3' :
                  'text-lg font-medium mt-4 mb-2'
                }>{item.html_en ? <span dangerouslySetInnerHTML={{ __html: item.html_en }} /> : item.en}</Tag>;
            }
            if (item.type === 'paragraph' && (item.html_en || item.en)) {
                return <div key={idx} className="mb-4" dangerouslySetInnerHTML={{ __html: item.html_en || item.en }} />;
            }
            if (item.type === 'table') {
                const html = item.html_en || ''
                return (
                    <div key={idx} className="overflow-x-auto">
                        <div className="tiptap" dangerouslySetInnerHTML={{ __html: html }} />
                    </div>
                );
            }
            if (item.type === 'imageSlider') {
                const images = Array.isArray(item.images) ? item.images : []
                if (!images.length) return null
                return (
                    <div key={idx} className="tiptap-image-slider overflow-x-auto">
                        <div className="tiptap-image-slider-track">
                            {images.map((src: string, slideIdx: number) => (
                                <div key={slideIdx} className="tiptap-image-slide">
                                    <img src={src} alt={`Slide ${slideIdx + 1}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
            if (item.type === 'list') {
                const items = item.items_en || (item.en ? [item.en] : []);
                if (!Array.isArray(items) || items.length === 0) return null;
                
                return (
                    <div key={idx} className="pl-2 mb-4 space-y-2 text-gray-700">
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
                                    <div 
                                        className="flex-1"
                                        dangerouslySetInnerHTML={{ __html: text }} 
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
                const alignClass =
                    align === 'left' ? 'items-start' :
                    align === 'right' ? 'items-end' :
                    'items-center';

                return (
                    <figure key={idx} className={`my-10 flex flex-col ${alignClass} w-full`}>
                        <div style={{ width, maxWidth: '100%' }}>
                            <div className="relative w-full aspect-[1920/720] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm flex items-center justify-center">
                                <img
                                    src={item.image}
                                    alt={caption}
                                    className="h-full w-full object-contain"
                                    loading="lazy"
                                />
                            </div>
                            {caption ? (
                                <figcaption className="mt-3 text-xs text-gray-500 text-center">{caption}</figcaption>
                            ) : null}
                        </div>
                    </figure>
                );
            }
            // Add more block types as needed
            return null;
        });
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
                    <div ref={contentRef} className="tiptap prose mt-6 max-w-none">
                        {renderBody()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonPage;
