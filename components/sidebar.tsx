"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { buildLessonHref, stripLegacyDraftSuffix, DEFAULT_LESSON_SLUG, RESOURCES_LESSON_SLUG } from "@/lib/wikiPaths";
import type { Module } from "@/lib/types";

interface Props {
  locale: Locale;
  kitSlug: string;
  isOpen: boolean;
  onClose: () => void;
  modules?: Module[];
  lessons?: any[];
  className?: string;
  onLessonClick?: (lesson: any) => void;
  activeSlug?: string;
  hideLessons?: boolean;
  tocMaxLevel?: number;
  refreshTocTrigger?: number;
  isHubDomain?: boolean;
}

interface TocItem {
  id: string; 
  text: string;
  level: number;
}

export default function Sidebar({
  locale,
  kitSlug,
  isOpen,
  onClose,
  modules: propModules,
  lessons,
  className,
  onLessonClick,
  activeSlug,
  hideLessons,
  tocMaxLevel = 1,
  refreshTocTrigger,
  isHubDomain = false,
}: Props) {
  const pathname = usePathname();
  const safeLocale: Locale =
    locale && (locale === "en" || locale === "ar") ? locale : "en";
  const isArabic = safeLocale === "ar";
  const [modules, setModules] = useState<Module[]>([]);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeHeading, setActiveHeading] = useState<string>("");

  useEffect(() => {
    if (propModules) {
      setModules(propModules);
    } else if (lessons) {
      const simpleModule: Module = {
        id: "lessons",
        order: 1,
        title_en: t("lessons", "en"),
        title_ar: t("lessons", "ar"),
        summary_en: t("allLessons", "en"),
        summary_ar: t("allLessons", "ar"),
      };
      setModules([simpleModule]);
    }
  }, [propModules, lessons]);

  // Track the scroll handler to remove it later
  const scrollHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const updateToc = () => {
      // 1. Target the active editor container
      const containerSelector = `[data-editor-lang="${locale}"]`;
      let container = document.querySelector(containerSelector);
      
      // Build query for headings
      const hLevels = [];
      for (let i = 1; i <= (tocMaxLevel || 1); i++) {
        hLevels.push(`.ProseMirror h${i}`);
      }
      const query = hLevels.join(", ");

      const headingElements = container 
        ? Array.from(container.querySelectorAll(query))
        : Array.from(document.querySelectorAll(query));
      
      // Filter visible ones
      const visibleNodes = headingElements.filter((node) => {
        const el = node as HTMLElement;
        return el.offsetParent !== null || el.getBoundingClientRect().height > 0;
      }) as HTMLElement[];

      // Map to TOC items & ensure stable IDs
      const mapped: TocItem[] = visibleNodes.map((node, idx) => {
        const tagName = node.tagName.toLowerCase();
        const level = Number(tagName.replace("h", "")) || 1;
        
        const stableId = `toc-h${level}-${idx}`;
        if (node.id !== stableId) {
          node.id = stableId;
        }

        return {
          id: stableId,
          text: node.getAttribute("data-toc-text") || node.innerText || "Untitled Section",
          level: level,
        };
      });

      setToc(mapped);

      // Setup Scroll Highlighting
      if (mapped.length > 0) {
        const handleScroll = () => {
          const threshold = 160; 
          let currentId = "";

          for (const item of mapped) {
            const el = document.getElementById(item.id);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= threshold) {
                currentId = item.id;
              } else {
                break;
              }
            }
          }

          if (!currentId && mapped.length > 0) {
            currentId = mapped[0].id;
          }

          if (currentId) setActiveHeading(currentId);
        };

        // Clean up previous listener
        if (scrollHandlerRef.current) {
          window.removeEventListener("scroll", scrollHandlerRef.current);
        }

        scrollHandlerRef.current = handleScroll;
        window.addEventListener("scroll", handleScroll);
        handleScroll();
      }
    };

    const timer = setTimeout(updateToc, 50);
    return () => {
      clearTimeout(timer);
      if (scrollHandlerRef.current) {
        window.removeEventListener("scroll", scrollHandlerRef.current);
      }
    };
  }, [pathname, refreshTocTrigger, tocMaxLevel, locale]);

  const handleScrollTo = (index: number) => {
    const containerSelector = `[data-editor-lang="${locale}"]`;
    const container = document.querySelector(containerSelector);
    
    const hLevels = [];
    for (let i = 1; i <= (tocMaxLevel || 1); i++) {
      hLevels.push(`.ProseMirror h${i}`);
    }
    const query = hLevels.join(", ");
    
    let elements = container 
      ? Array.from(container.querySelectorAll(query))
      : Array.from(document.querySelectorAll(query));

    const visibleElements = elements.filter((node) => {
      const el = node as HTMLElement;
      return el.offsetParent !== null || el.getBoundingClientRect().height > 0;
    }) as HTMLElement[];

    const el = visibleElements[index];

    if (el) {
      const headerOffset = 140;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      
      if (el.id) setActiveHeading(el.id);
    }
    
    if (isOpen) onClose();
  };


  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 bg-black/40 z-40 lg:hidden" />
      )}
      <aside
        className={`fixed lg:static top-20 left-0 w-72 lg:w-64 h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar smooth-panel-scroll bg-white border border-gray-200 rounded-xl shadow-sm z-50 transform transition-transform lg:sticky lg:top-28 lg:h-auto lg:self-start ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${className || ""}`}
      >
        <div className="lg:hidden flex justify-end p-4">
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {!hideLessons && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                {t("lessons", safeLocale)}
              </div>
              <div className="space-y-1">
                {(() => {
                  let displayIdx = 0;
                  return lessons?.map((lesson) => {
                    const root = stripLegacyDraftSuffix(lesson.slug || '');
                    const isSpecial = root === DEFAULT_LESSON_SLUG || root === RESOURCES_LESSON_SLUG;
                    if (!isSpecial) displayIdx++;
                    
                    const isActive = activeSlug ? activeSlug === lesson.slug : pathname?.endsWith(`/${lesson.slug}`);
                    return (
                      <a
                        key={lesson.slug}
                        href={onLessonClick ? "#" : buildLessonHref({ locale: safeLocale, kitSlug, lessonSlug: lesson.slug, isHubDomain })}
                        onClick={(e) => {
                          if (onLessonClick) {
                            e.preventDefault();
                            onLessonClick(lesson);
                          }
                        }}
                        className={`block rounded-md px-3 py-2 text-sm transition ${
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-gray-700 hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        <div className="font-medium">
                          {!isSpecial && <span className="mr-1">{displayIdx}.</span>}
                          {locale === "ar" ? lesson.title_ar : lesson.title_en}
                        </div>
                        <div className="text-[11px] text-gray-500">{lesson.duration_min}m</div>
                      </a>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              {t("onThisPage", safeLocale)}
            </div>
            <nav className={`space-y-1 ${isArabic ? "text-right" : "text-left"}`} dir={isArabic ? "rtl" : "ltr"}>
              {toc.length === 0 && (
                <div className="text-xs text-gray-400">{t("noHeadingsYet", safeLocale)}</div>
              )}
              {toc.map((item, idx) => (
                <button
                  key={`toc-${item.id}-${idx}`}
                  onClick={() => handleScrollTo(idx)}
                  className={`block w-full rounded-md px-3 py-2 text-sm transition ${
                    isArabic
                      ? (item.level >= 4 ? "text-right pr-6 text-xs" : item.level === 3 ? "text-right pr-4" : "text-right")
                      : (item.level >= 4 ? "text-left pl-6 text-xs" : item.level === 3 ? "text-left pl-4" : "text-left")
                  } ${activeHeading === item.id ? "bg-primary/10 text-primary font-medium" : "text-gray-700 hover:bg-primary/10 hover:text-primary"}`}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}
