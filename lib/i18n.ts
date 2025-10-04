
export const i18n = {
  locales: ['en', 'ar'],
  defaultLocale: 'en'
} as const

export type Locale = (typeof i18n.locales)[number]

export function isRTL(locale: Locale): boolean {
  return locale === 'ar'
}

export const translations = {
  en: {
    // Navigation
    search: 'Search lessons...',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',    
    // Lesson meta
    difficulty: 'Difficulty',
    duration: 'Duration',
    minutes: 'minutes',
    prerequisites: 'Prerequisites',
    materials: 'Materials',
    buySpares: 'Buy spare parts',
    getSupport: 'Get support',
    
    // Navigation
    home: 'Home',
    kit: 'Kit',
    module: 'Module',
    lesson: 'Lesson',
    lessons: 'Lessons',
    modules: 'Modules',
    previous: 'Previous',
    next: 'Next',
    gettingStarted: 'Getting Started',
    resources: 'Resources',
    noLessonsYet: 'No lessons yet.',
    onThisPage: 'On this page',
    noHeadingsYet: 'No headings yet.',
    allLessons: 'All lessons',
    
    // Unlock
    unlock: 'Unlock',
    unlockTitle: 'Enter Access Code',
    unlockDescription: 'Please enter your access code to continue',
    accessCode: 'Access code',
    continue: 'Continue',
    
    // Code
    copy: 'Copy',
    copied: 'Copied!',
    arduino: 'Arduino (C/C++)',
    microbit: 'micro:bit (MakeCode)',
    
    // 404
    notFound: 'Page not found',
    notFoundDescription: 'The page you are looking for does not exist.',
    backToKit: 'Back to kit',
  },
  ar: {
    // Navigation
    search: 'البحث في الدروس...',
    language: 'اللغة',
    theme: 'المظهر',
    light: 'فاتح',    
    // Lesson meta
    difficulty: 'الصعوبة',
    duration: 'المدة',
    minutes: 'دقيقة',
    prerequisites: 'المتطلبات المسبقة',
    materials: 'المواد',
    buySpares: 'شراء قطع غيار',
    getSupport: 'الحصول على الدعم',
    
    // Navigation
    home: 'الرئيسية',
    kit: 'المجموعة',
    module: 'الوحدة',
    lesson: 'الدرس',
    lessons: 'الدروس',
    modules: 'الوحدات',
    previous: 'السابق',
    next: 'التالي',
    gettingStarted: 'البداية',
    resources: 'الموارد',
    noLessonsYet: 'لا توجد دروس بعد.',
    onThisPage: 'في هذه الصفحة',
    noHeadingsYet: 'لا توجد عناوين بعد.',
    allLessons: 'جميع الدروس',
    
    // Unlock
    unlock: 'إلغاء القفل',
    unlockTitle: 'أدخل رمز الوصول',
    unlockDescription: 'يرجى إدخال رمز الوصول للمتابعة',
    accessCode: 'رمز الوصول',
    continue: 'متابعة',
    
    // Code
    copy: 'نسخ',
    copied: 'تم النسخ!',
    arduino: 'Arduino (C/C++)',
    microbit: 'micro:bit (MakeCode)',
    
    // 404
    notFound: 'الصفحة غير موجودة',
    notFoundDescription: 'الصفحة التي تبحث عنها غير موجودة.',
    backToKit: 'العودة إلى المجموعة',
  }
} as const

export function t(key: keyof typeof translations.en, locale: Locale): string {
  // Handle undefined or invalid locale
  if (!locale || !translations[locale]) {
    console.warn(`Invalid locale: ${locale}, falling back to English`)
    return translations.en[key] || key
  }
  
  return (translations as any)[locale][key] || translations.en[key] || key
}
