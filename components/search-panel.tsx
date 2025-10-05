'use client'
import Link from 'next/link'
import type { Lesson } from '../lib/types'
import type { Locale } from '../lib/i18n'

export default function SearchPanel(
  { query, lessons, locale, onClose }: 
  {
    query: string; 
    lessons: (Lesson & { kitSlug: string })[]; 
    locale: Locale; 
    onClose: () => void; 
    kitSlug: string; 
  }
) {
  const lowerCaseQuery = query.toLowerCase();
  const filtered = lessons.filter(l => {
    // Search in both English and Arabic titles, regardless of the current locale.
    // This makes the search more robust against missing translations.
    const titleEn = l.title_en?.toLowerCase() || '';
    const titleAr = l.title_ar?.toLowerCase() || '';
    return titleEn.includes(lowerCaseQuery) || titleAr.includes(lowerCaseQuery);
  }).slice(0, 6);

  if (!query) return null;

  return (
    <div className="absolute top-full mt-2 w-full bg-white border rounded-xl shadow-lg overflow-hidden z-[70]">
      {filtered.length === 0 && (
        <div className="p-4 text-sm text-gray-500">No results</div>
      )}
      {filtered.map(l => {
        const href = `/${locale}/${l.kitSlug}/lesson/${l.slug}`;
        return (
          <Link
            key={l.id}
            href={href}
            onClick={onClose}
            className="block px-4 py-3 hover:bg-gray-100 text-sm"
          >
            <div className="font-medium">
              {/* Display the title in the current locale, falling back to English if needed */}
              {locale === 'ar' ? (l.title_ar || l.title_en) : (l.title_en || l.title_ar)}
            </div>
            <div className="text-xs text-gray-500">
              {l.duration_min}m - {l.difficulty}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
