/**
 * Segment-based Bilingual Content Management Types
 * 
 * Each lesson is broken into segments that track versioning
 * between English and Arabic content for translation sync.
 */

export interface ListItem {
  text: string;
  indent: number; // 0 = top level, 1 = first nested level, 2 = second nested level, etc.
}

export interface Segment {
  id: string;
  type: 'paragraph' | 'heading' | 'step' | 'callout' | 'image' | 'list' | 'youtube' | 'video' | 'table' | 'horizontalRule' | 'imageSlider' | 'code';
  
  // Content
  english: string;
  arabic: string;

  // Language for code blocks
  language?: string;
  
  // List items (for list type) - supports nested lists with structured items
  items_en?: ListItem[];
  items_ar?: ListItem[];
  
  // Version tracking
  englishVersion: number;
  arabicVersion: number; // Tracks which English version was last translated from
  
  // Change detection
  needsUpdate: boolean;
  originalEnglish: string; // Stores the English text that was last translated
  
  // Metadata
  refTitle?: string; // Purely for internal organization/referencing
  level?: number; // For headings
  variant?: 'info' | 'tip' | 'warning'; // For callouts
  ordered?: boolean; // For lists
  image?: string; // For images (English)
  image_ar?: string; // For images (Arabic - optional override)
  images?: string[]; // For image slider
  url?: string; // For youtube/video
  layoutMode?: string; // For aspect ratio rendering
  start?: number; // Starting index for ordered lists
  
  // HTML versions for rich text
  html_en?: string;
  html_ar?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastTranslatedAt?: string;
}

export interface SegmentedLesson {
  id: string;
  slug: string;
  wikiSlug: string;
  title_en: string;
  title_ar: string;
  segments: Segment[];
  
  // Metadata
  order: number;
  coverImage?: string;
  duration_min: number;
  difficulty: string;
  ownerId?: string;
  lastModifiedBy?: string;
  status?: string;
  publishedAt?: string;
  
  // Aggregate stats
  totalSegments: number;
  segmentsNeedingUpdate: number;
  
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to create a new segment
export function createSegment(type: Segment['type'], english: string = '', arabic: string = ''): Segment {
  const base: Segment = {
    id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    english,
    arabic,
    englishVersion: 1,
    arabicVersion: arabic ? 1 : 0, // If Arabic exists, it's synced with version 1
    needsUpdate: false,
    originalEnglish: english,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    refTitle: '',
    language: type === 'code' ? 'typescript' : undefined,
  };
  
  // Initialize list items for list type
  if (type === 'list') {
    base.items_en = english ? [{ text: english, indent: 0 }] : [{ text: '', indent: 0 }];
    base.items_ar = arabic ? [{ text: arabic, indent: 0 }] : [];
    base.items_en = english ? [{ text: english, indent: 0 }] : [{ text: '', indent: 0 }];
    base.items_ar = arabic ? [{ text: arabic, indent: 0 }] : [];
    base.ordered = false;
  }
  
  // Initialize table content
  if (type === 'table') {
    // Default 3x3 table
    const defaultTable = `<table><tbody>
      <tr><td><p></p></td><td><p></p></td><td><p></p></td></tr>
      <tr><td><p></p></td><td><p></p></td><td><p></p></td></tr>
      <tr><td><p></p></td><td><p></p></td><td><p></p></td></tr>
    </tbody></table>`
    base.english = english || defaultTable
    base.arabic = arabic || defaultTable
    base.html_en = base.english
    base.html_ar = base.arabic
  }
  
  return base;
}

// Helper to strip HTML tags to get plain text
function stripHtml(html: string): string {
  if (typeof document === 'undefined') {
    // Basic fallback for server-side if needed
    return html.replace(/<[^>]*>/g, '').trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

// Helper function to update a segment's English content
export function updateEnglishContent(segment: Segment, newEnglishHtml: string): Segment {
  const plainText = stripHtml(newEnglishHtml);
  const oldPlainText = stripHtml(segment.english);
  
  const hasChanged = plainText.trim() !== oldPlainText.trim();
  const arabicExists = segment.arabic.trim().length > 0;
  
  return {
    ...segment,
    english: newEnglishHtml, // We store the HTML in the main english field for legacy compatibility but also set html_en
    html_en: newEnglishHtml,
    englishVersion: segment.englishVersion + 1,
    needsUpdate: hasChanged && arabicExists,
    updatedAt: new Date().toISOString(),
  };
}

// Helper function to update a segment's Arabic content (marks as synced)
export function updateArabicContent(segment: Segment, newArabicHtml: string): Segment {
  return {
    ...segment,
    arabic: newArabicHtml,
    html_ar: newArabicHtml,
    arabicVersion: segment.englishVersion, // Sync with current English version
    needsUpdate: false,
    originalEnglish: segment.english, // Store current English as the translated version
    updatedAt: new Date().toISOString(),
    lastTranslatedAt: new Date().toISOString(),
  };
}

// Word-level diff helper
export function getWordDiff(original: string, updated: string): { unchanged: string[]; added: string[]; removed: string[] } {
  const originalWords = original.trim().split(/\s+/).filter(Boolean);
  const updatedWords = updated.trim().split(/\s+/).filter(Boolean);
  
  const originalSet = new Set(originalWords);
  const updatedSet = new Set(updatedWords);
  
  const unchanged = updatedWords.filter(word => originalSet.has(word));
  const added = updatedWords.filter(word => !originalSet.has(word));
  const removed = originalWords.filter(word => !updatedSet.has(word));
  
  return { unchanged, added, removed };
}

// Render text with highlighted changes
export function highlightChanges(original: string, updated: string): { text: string; isChanged: boolean }[] {
  const originalWords = original.trim().split(/\s+/).filter(Boolean);
  const updatedWords = updated.trim().split(/\s+/).filter(Boolean);
  const originalSet = new Set(originalWords);
  
  return updatedWords.map(word => ({
    text: word,
    isChanged: !originalSet.has(word),
  }));
}

// Convert legacy LessonBodyItem[] to Segment[]
export function convertBodyToSegments(body: any[]): Segment[] {
  if (!Array.isArray(body)) return [];
  
  return body.map((item, index) => {
    const segment = createSegment(item.type || 'paragraph', item.en || item.html_en || '', item.ar || item.html_ar || '');
    
    const meta = item._segment || {};
    
    const result: Segment = {
      ...segment,
      id: meta.id || `seg_${index}_${Date.now()}`,
      level: item.level,
      variant: item.variant,
      ordered: item.ordered,
      image: item.image,
      image_ar: item.image_ar,
      images: item.images,
      url: item.url,
      language: item.language,
      layoutMode: item.layoutMode,
      start: item.start,
      html_en: item.html_en,
      html_ar: item.html_ar,
      // Restore versioning and sync status from metadata
      englishVersion: meta.englishVersion || 1,
      arabicVersion: meta.arabicVersion || ( (item.ar || item.html_ar || (item.items_ar && item.items_ar.length)) ? 1 : 0 ),
      needsUpdate: meta.needsUpdate ?? false,
      originalEnglish: meta.originalEnglish || item.en || item.html_en || '',
      refTitle: meta.refTitle || item.refTitle || '',
    };
    
    // Handle list items - convert from flat string array or ListItem array
    if (item.type === 'list') {
      const rawItemsEn = Array.isArray(item.items_en) ? item.items_en : (item.en ? [item.en] : ['']);
      const rawItemsAr = Array.isArray(item.items_ar) ? item.items_ar : (item.ar ? [item.ar] : []);
      
      // Convert to ListItem format if needed
      const itemsEn: ListItem[] = rawItemsEn.map((i: any) => 
        typeof i === 'string' ? { text: i, indent: 0 } : { text: i.text || '', indent: i.indent || 0 }
      );
      const itemsAr: ListItem[] = rawItemsAr.map((i: any) => 
        typeof i === 'string' ? { text: i, indent: 0 } : { text: i.text || '', indent: i.indent || 0 }
      );
      
      result.items_en = itemsEn;
      result.items_ar = itemsAr;
      result.english = itemsEn.map((i: ListItem) => i.text).join('\n');
      result.arabic = itemsAr.map((i: ListItem) => i.text).join('\n');
    }
    
    return result;
  });
}

// Helper to convert ListItem[] to string[] for API
function listItemsToStrings(items: ListItem[]): string[] {
  return items.map(item => item.text);
}

// Convert Segment[] back to LessonBodyItem[] for saving
export function convertSegmentsToBody(segments: Segment[]): any[] {
  return segments.map(seg => {
    const base: any = {
      type: seg.type,
      en: stripHtml(seg.english),
      ar: stripHtml(seg.arabic),
      html_en: seg.html_en || seg.english,
      html_ar: seg.html_ar || seg.arabic,
      level: seg.level,
      variant: seg.variant,
      ordered: seg.ordered,
      image: seg.image,
      image_ar: seg.image_ar,
      images: seg.images,
      url: seg.url,
      language: seg.language,
      layoutMode: seg.layoutMode,
      start: seg.start,
      // Store segment metadata for sync tracking
      _segment: {
        id: seg.id,
        englishVersion: seg.englishVersion,
        arabicVersion: seg.arabicVersion,
        needsUpdate: seg.needsUpdate,
        originalEnglish: seg.originalEnglish,
        refTitle: seg.refTitle,
      }
    };
    
    // Handle list items - save as ListItem[] to preserve indentation
    if (seg.type === 'list' && seg.items_en) {
      base.items_en = seg.items_en;
      base.items_ar = seg.items_ar || [];
      base.en = seg.items_en.map(i => i.text).join('\n');
      base.ar = (seg.items_ar || []).map(i => i.text).join('\n');
    }

    // Handle image captions and Arabic image
    if (seg.type === 'image') {
      base.caption_en = seg.english;
      base.caption_ar = seg.arabic;
      base.title_en = seg.english;
      base.title_ar = seg.arabic;
      // If Arabic image exists
      if (seg.image_ar) {
        base.image_ar = seg.image_ar;
      }
    }
    
    // For headings, unwrap the outer <p> tag from Tiptap if present
    if (seg.type === 'heading') {
      const unwrap = (html: string) => {
        if (!html) return ''
        // If it starts with <p> and ends with </p>, remove them
        if (html.startsWith('<p>') && html.endsWith('</p>')) {
          return html.slice(3, -4)
        }
        // Also handle attributes in p tag if any (simple check)
        if (html.startsWith('<p ') && html.endsWith('</p>')) {
           const endTagIndex = html.indexOf('>')
           if (endTagIndex !== -1) {
             return html.slice(endTagIndex + 1, -4)
           }
        }
        return html
      }
      
      base.html_en = unwrap(base.html_en)
      base.html_ar = unwrap(base.html_ar)
    }

    return base;
  });
}
// Helper to get list marker based on indent level
export function getListMarker(items: ListItem[], currentIdx: number, isOrdered: boolean, start: number = 1): string {
  const currentItem = items[currentIdx];
  const currentIndent = typeof currentItem === 'object' ? currentItem.indent : 0;
  
  // Alternate type based on indent level: 0=parent, 1=alternate, 2=same as parent, etc.
  const effectiveOrdered = currentIndent % 2 === 0 ? isOrdered : !isOrdered;
  
  if (!effectiveOrdered) {
    // Different bullet styles for different levels
    const bullets = ['•', '◦', '▪', '▫'];
    return bullets[currentIndent % bullets.length];
  } else {
    // Calculate position within this indent level (reset numbering)
    let count = (currentIndent === 0) ? start : 1;
    for (let i = 0; i < currentIdx; i++) {
      const prevItem = items[i];
      const prevIndent = typeof prevItem === 'object' ? prevItem.indent : 0;
      if (prevIndent === currentIndent) {
        count++;
      } else if (prevIndent < currentIndent) {
        // Reset count when we enter a new group
        count = (currentIndent === 0) ? start : 1;
      }
    }
    return `${count}.`;
  }
}
