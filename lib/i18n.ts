export type Locale = 'en' | 'ar'

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
  return (translations as any)[locale][key] || translations.en[key]
}
