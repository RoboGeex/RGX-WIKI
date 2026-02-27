'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Lesson } from '@/lib/types'
import type { Locale } from '@/lib/i18n'
import { buildLessonHref } from '@/lib/wikiPaths'

export default function SearchPanel(
  { query, locale, onClose, kitSlug, isHubDomain }: 
  {
    query: string; 
    locale: Locale; 
    onClose: () => void; 
    kitSlug: string; 
    isHubDomain?: boolean;
  }
) {
  const [results, setResults] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length > 0) {
      setLoading(true);
      fetch(`/api/search?query=${query}&kit=${kitSlug}`)
        .then(res => res.json())
        .then(data => {
          setResults(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [query, kitSlug]);

  if (!query) return null;

  return (
    <div className="absolute top-full mt-2 w-full bg-white border rounded-xl shadow-lg overflow-hidden z-[70]">
      {loading && <div className="p-4 text-sm text-gray-500">Loading...</div>}
      {!loading && results.length === 0 && (
        <div className="p-4 text-sm text-gray-500">No results</div>
      )}
      {results.map(l => {
        const href = buildLessonHref({ locale, kitSlug, lessonSlug: l.slug, isHubDomain });
        return (
          <Link
            key={l.id}
            href={href}
            onClick={onClose}
            className="block px-4 py-3 hover:bg-gray-100 text-sm transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900">
                {locale === 'ar' ? (l.title_ar || l.title_en) : (l.title_en || l.title_ar)}
              </div>
              {l.status !== 'published' && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded uppercase tracking-wider">
                  Draft
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {l.duration_min}m • {l.difficulty}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
