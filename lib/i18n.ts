export const i18n = {
  locales: ['en', 'ar'],
  defaultLocale: 'en',
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
    showCode: 'Show code',
    hideCode: 'Hide code',
    missingKitOrRedirect: 'Error: URL is missing kit or redirect parameter.',
    invalidAccessCode: 'Invalid access code.',
    unlocking: 'Unlocking...',
    accessCodePlaceholder: 'Enter your code',
    unlockWiki: 'Unlock Wiki',
    enterAccessCodeToContinue: 'Enter the access code you received to continue.',
    accessCodeHint: 'Code format: XXXX-XXXX-XXXX',
    accessCodeSuccess: 'Access granted! Redirecting...',
    dontHaveCode: "Don’t have a code?",
    contactUs: 'Contact us',

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
    search: 'ابحث عن الدروس...',
    language: 'اللغة',
    theme: 'السمة',
    light: 'فاتح',
    // Lesson meta
    difficulty: 'الصعوبة',
    duration: 'المدة',
    minutes: 'دقائق',
    prerequisites: 'المتطلبات المسبقة',
    materials: 'المواد',
    buySpares: 'اشترِ قطع غيار',
    getSupport: 'اطلب الدعم',

    // Navigation
    home: 'الرئيسية',
    kit: 'الحقيبة',
    module: 'وحدة',
    lesson: 'درس',
    lessons: 'دروس',
    modules: 'وحدات',
    previous: 'السابق',
    next: 'التالي',
    gettingStarted: 'البدء',
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
    showCode: 'إظهار الرمز',
    hideCode: 'إخفاء الرمز',
    missingKitOrRedirect: 'خطأ: عنوان URL يفتقد إلى الحقيبة أو رابط إعادة التوجيه.',
    invalidAccessCode: 'رمز الوصول غير صالح.',
    unlocking: 'جاري إلغاء القفل...',
    accessCodePlaceholder: 'أدخل الرمز هنا',
    unlockWiki: 'فتح الموسوعة',
    enterAccessCodeToContinue: 'أدخل رمز الوصول الذي وصلك للمتابعة.',
    accessCodeHint: 'صيغة الرمز: XXXX-XXXX-XXXX',
    accessCodeSuccess: 'تم التحقق من الرمز! جارٍ إعادة التوجيه...',
    dontHaveCode: 'لا تملك رمزاً؟',
    contactUs: 'تواصل معنا',

    // Code
    copy: 'نسخ',
    copied: 'تم النسخ!',
    arduino: 'Arduino (C/C++)',
    microbit: 'micro:bit (MakeCode)',

    // 404
    notFound: 'الصفحة غير موجودة',
    notFoundDescription: 'الصفحة التي تبحث عنها غير متاحة.',
    backToKit: 'العودة إلى الحقيبة',
  },
} as const

export function t(key: keyof typeof translations.en, locale: Locale): string {
  if (!locale || !translations[locale]) {
    console.warn(`Invalid locale: ${locale}, falling back to English`)
    return translations.en[key] || key
  }

  const value = (translations as Record<string, Record<string, string>>)[locale][key]
  if (value !== undefined) {
    return value
  }

  return translations.en[key] || key
}
