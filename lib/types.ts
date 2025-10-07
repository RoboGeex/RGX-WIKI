export interface Wiki {
  slug: string;
  displayName: string;
  domains?: string[];
  defaultLocale?: string;
  defaultLessonSlug?: string;
  resourcesUrl?: string;
  accessCode?: string;
  isLocked?: boolean;
}

export interface Kit {
  slug: string;
  wikiSlug: string;
  title_en: string;
  title_ar: string;
  heroImage: string;
  overview_en: string;
  overview_ar: string;
}

export interface Material {
  qty: number;
  name_en: string;
  name_ar: string;
  sku?: string;
}

export interface Module {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  summary_en?: string;
  summary_ar?: string;
}

export type LessonBodyItemVariant = 'info' | 'tip' | 'warning';

export interface LessonBodyItem {
  type: 'paragraph' | 'heading' | 'step' | 'callout' | 'codeTabs' | 'image' | 'list' | 'youtube' | 'video' | 'table' | 'imageSlider';
  en?: string;
  ar?: string;
  html_en?: string;
  html_ar?: string;
  title_en?: string;
  title_ar?: string;
  caption_en?: string;
  caption_ar?: string;
  variant?: LessonBodyItemVariant;
  image?: string;
  images?: string[];
  arduino?: string;
  makecodeUrl?: string;
  level?: number;
  ordered?: boolean;
  items_en?: string[];
  items_ar?: string[];
  url?: string;
  poster?: string;
  width?: number;
  height?: number;
  json_en?: any;
  json_ar?: any;
}

export interface Lesson {
  id: string;
  order: number;
  slug: string;
  title_en: string;
  title_ar: string;
  duration_min: number;
  difficulty: string;
  prerequisites_en: string[];
  prerequisites_ar: string[];
  materials: Material[];
  body: LessonBodyItem[];
  wikiSlug?: string;
  isGettingStarted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
