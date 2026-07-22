/**
 * Catalog copy, ported verbatim from the robogeex_courses app so the hub root
 * reads exactly like courses.robogeex.com. Wording that referred to "courses"
 * is kept — these ARE the courses; each one opens its wiki.
 */
export type CatalogLocale = 'en' | 'ar'

export const CATALOG_MESSAGES = {
  en: {
    nav: {
      home: 'Home',
      events: 'Events',
      courses: 'Courses',
      shop: 'Shop',
      blog: 'Blog',
      about: 'About Us',
      contact: 'Contact Us',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      openSearch: 'Open search',
      closeSearch: 'Close search',
      searchPlaceholder: 'Search courses by title or description…',
      cancel: 'Cancel',
      home_aria: 'RoboGeex Academy — home',
      language: 'Language',
    },
    hero: {
      eyebrow: 'RoboGeex Courses',
      title: 'Explore RoboGeex Courses',
      subtitle:
        'Hands-on learning paths in robotics, coding, AI, digital fabrication, graphics, and assistive technology.',
      sub2: 'Find the right course for every learner, educator, and innovator.',
      cta: 'Get Started',
      partnership: 'In partnership with',
    },
    filters: {
      category: 'Category',
      level: 'Level',
      clearOne: 'Clear 1 filter',
      clearMany: (n: number) => `Clear ${n} filters`,
      noOptions: 'No options available with the current filters.',
    },
    card: { goto: 'Go to Course' },
    list: {
      showingOf: (a: number, b: number) => `Showing ${a} of ${b} courses`,
      emptyTitle: 'No courses found.',
      emptySubtitle: 'Try changing your filters.',
      clear: 'Clear filters',
      showMore: 'Show more',
    },
    footer: {
      desc: 'RoboGeex empowers the next generation of innovators through hands-on learning in robotics, coding, AI, and digital fabrication — for students, educators, and schools.',
      explore: 'Explore',
      getInTouch: 'Get in touch',
      rights: 'All rights reserved.',
      allLinks: 'All RoboGeex links →',
    },
  },
  ar: {
    nav: {
      home: 'الرئيسية',
      events: 'الفعاليات',
      courses: 'الدورات',
      shop: 'المتجر',
      blog: 'المدونة',
      about: 'من نحن',
      contact: 'تواصل معنا',
      openMenu: 'فتح القائمة',
      closeMenu: 'إغلاق القائمة',
      openSearch: 'فتح البحث',
      closeSearch: 'إغلاق البحث',
      searchPlaceholder: 'ابحث عن دورة بالعنوان أو الوصف…',
      cancel: 'إلغاء',
      home_aria: 'أكاديمية روبوغيكس — الرئيسية',
      language: 'اللغة',
    },
    hero: {
      eyebrow: 'دورات روبوغيكس',
      title: 'اكتشف دورات روبوغيكس',
      subtitle:
        'مسارات تعليمية عملية في الروبوتات والبرمجة والذكاء الاصطناعي والتصنيع الرقمي والتصميم والتكنولوجيا المساعدة.',
      sub2: 'ابحث عن الدورة المناسبة لكل متعلّم ومعلّم ومبتكر.',
      cta: 'ابدأ الآن',
      partnership: 'بالشراكة مع',
    },
    filters: {
      category: 'التصنيف',
      level: 'المستوى',
      clearOne: 'مسح فلتر واحد',
      clearMany: (n: number) => `مسح ${n} فلاتر`,
      noOptions: 'لا توجد خيارات متاحة مع الفلاتر الحالية.',
    },
    card: { goto: 'افتح الدورة' },
    list: {
      showingOf: (a: number, b: number) => `عرض ${a} من ${b} دورة`,
      emptyTitle: 'لا توجد دورات مطابقة.',
      emptySubtitle: 'جرّب تغيير الفلاتر.',
      clear: 'مسح الفلاتر',
      showMore: 'عرض المزيد',
    },
    footer: {
      desc: 'تُمكِّن روبوغيكس الجيل القادم من المبتكرين من خلال التعلّم العملي في الروبوتات والبرمجة والذكاء الاصطناعي والتصنيع الرقمي — للطلاب والمعلّمين والمدارس.',
      explore: 'استكشف',
      getInTouch: 'تواصل معنا',
      rights: 'جميع الحقوق محفوظة.',
      allLinks: 'كل روابط روبوغيكس ←',
    },
  },
} as const

export function getCatalogMessages(locale: CatalogLocale) {
  return CATALOG_MESSAGES[locale] ?? CATALOG_MESSAGES.en
}
