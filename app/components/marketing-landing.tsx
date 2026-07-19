import Link from 'next/link'
import { Cairo, Lexend, Manrope } from 'next/font/google'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Cpu,
  GraduationCap,
  KeyRound,
  Languages,
  MonitorSmartphone,
  TrendingUp,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getKits, getLessons, getWikis } from '@/lib/data'
import { getWikisFromDb } from '@/lib/server-data'
import type { Locale } from '@/lib/i18n'

const displayFont = Lexend({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-land-display',
})

const bodyFont = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-land-body',
})

const arabicFont = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-land-cairo',
})

const INK = '#1A1110'
const CORAL_GRADIENT = 'linear-gradient(135deg, #F0523F, #E23B2E)'

const COVER_TONES = [
  ['#F0523F', '#E23B2E'],
  ['#E23B2E', '#B72A1E'],
  ['#F06A5D', '#D33A2B'],
]

const copy = {
  en: {
    navWikis: 'Wikis',
    navHow: 'How it works',
    navSchools: 'For schools',
    login: 'Log in',
    signup: 'Create account',
    dashboard: 'My dashboard',
    langSwitch: 'عربي',
    langHref: '/?lang=ar',
    badge: 'RoboGeex Academy — Learning Hub',
    heroTitleA: 'Learn robotics,',
    heroTitleB: 'one lesson at a time.',
    heroSub:
      'Interactive lesson wikis for RoboGeex kits — real code, real hardware, in English and Arabic. Built for classrooms, made for curious minds.',
    ctaExplore: 'Explore the wikis',
    statWikis: 'Learning wikis',
    statLessons: 'Step-by-step lessons',
    statLangsValue: '2',
    statLangs: 'Languages, full RTL',
    featuredTitle: 'Pick your track',
    featuredSub: 'Every kit has its own wiki — modules, builds and code, in order.',
    viewAll: 'View all wikis',
    openWiki: 'Open wiki',
    howTitle: 'How it works',
    steps: [
      {
        title: 'Get your access',
        body: 'Join with a class code or get enrolled by your teacher — you land straight in your kit’s wikis.',
      },
      {
        title: 'Follow the lessons',
        body: 'Step-by-step builds with photos, plus Arduino C++ and micro:bit MakeCode side by side.',
      },
      {
        title: 'Track your progress',
        body: 'Finished lessons are checked off automatically, and teachers see the whole class at a glance.',
      },
    ],
    featuresTitle: 'Made for real classrooms',
    features: [
      {
        title: 'English & Arabic',
        body: 'Every lesson ships in both languages with full right-to-left support.',
      },
      {
        title: 'Real code, real hardware',
        body: 'Arduino C++ and MakeCode blocks, ready to copy and run on the actual kit.',
      },
      {
        title: 'Teacher-ready',
        body: 'Dashboards, enrollment and per-student progress for every class.',
      },
      {
        title: 'Works everywhere',
        body: 'Phone, tablet or laptop — responsive, fast and distraction-free.',
      },
    ],
    schoolsTitle: 'Bring RoboGeex to your school',
    schoolsSub:
      'Teachers get dashboards, enrollment and progress tracking. Students get a wiki that speaks their language.',
    schoolsCta: 'Create an account',
    schoolsCta2: 'Explore the wikis',
    footerNote: '© 2026 RoboGeex. All rights reserved.',
  },
  ar: {
    navWikis: 'الموسوعات',
    navHow: 'كيف تعمل',
    navSchools: 'للمدارس',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    dashboard: 'لوحتي',
    langSwitch: 'English',
    langHref: '/?lang=en',
    badge: 'أكاديمية روبوجيكس — منصة التعلم',
    heroTitleA: 'تعلّم الروبوتات،',
    heroTitleB: 'درساً بعد درس.',
    heroSub:
      'موسوعات دروس تفاعلية لحقائب روبوجيكس — برمجة حقيقية وعتاد حقيقي، بالعربية والإنجليزية. صُمّمت للفصول الدراسية، وللعقول الفضولية.',
    ctaExplore: 'استكشف الموسوعات',
    statWikis: 'موسوعة تعليمية',
    statLessons: 'درس خطوة بخطوة',
    statLangsValue: '٢',
    statLangs: 'لغتان بدعم كامل',
    featuredTitle: 'اختر مسارك',
    featuredSub: 'لكل حقيبة موسوعتها الخاصة — وحدات ومشاريع وبرمجة، بالترتيب.',
    viewAll: 'عرض كل الموسوعات',
    openWiki: 'افتح الموسوعة',
    howTitle: 'كيف تعمل المنصة',
    steps: [
      {
        title: 'احصل على وصولك',
        body: 'انضم برمز الصف أو يسجّلك معلمك — وتدخل مباشرة إلى موسوعات حقيبتك.',
      },
      {
        title: 'اتبع الدروس',
        body: 'مشاريع خطوة بخطوة مع الصور، وأكواد Arduino C++‎ وMakeCode جنباً إلى جنب.',
      },
      {
        title: 'تابع تقدمك',
        body: 'تُعلَّم الدروس المكتملة تلقائياً، ويرى المعلم تقدم الصف كاملاً بنظرة واحدة.',
      },
    ],
    featuresTitle: 'صُمّمت للفصول الدراسية',
    features: [
      {
        title: 'بالعربية والإنجليزية',
        body: 'كل درس متوفر باللغتين مع دعم كامل للكتابة من اليمين إلى اليسار.',
      },
      {
        title: 'برمجة حقيقية، عتاد حقيقي',
        body: 'أكواد Arduino C++‎ وMakeCode جاهزة للنسخ والتشغيل على الحقيبة الفعلية.',
      },
      {
        title: 'جاهزة للمعلمين',
        body: 'لوحات تحكم وتسجيل طلاب ومتابعة تقدم لكل صف وكل طالب.',
      },
      {
        title: 'تعمل في كل مكان',
        body: 'هاتف أو جهاز لوحي أو حاسوب — تصميم متجاوب وسريع وبلا تشتيت.',
      },
    ],
    schoolsTitle: 'أحضر روبوجيكس إلى مدرستك',
    schoolsSub:
      'المعلمون يحصلون على لوحات التحكم والتسجيل ومتابعة التقدم، والطلاب على موسوعة تتحدث لغتهم.',
    schoolsCta: 'إنشاء حساب',
    schoolsCta2: 'استكشف الموسوعات',
    footerNote: '© 2026 روبوجيكس. جميع الحقوق محفوظة.',
  },
} as const

const STEP_ICONS = [KeyRound, BookOpen, TrendingUp]
const FEATURE_ICONS = [Languages, Cpu, GraduationCap, MonitorSmartphone]

type FeaturedWiki = {
  slug: string
  displayName: string
  gradeLabel: string
  picture: string
}

async function getPublishedWikis(): Promise<{ featured: FeaturedWiki[]; total: number }> {
  const fileWikis = getWikis()
  const dbWikis = await getWikisFromDb()

  const bySlug = new Map(fileWikis.map((wiki) => [wiki.slug, wiki]))
  dbWikis.forEach((wiki) => {
    bySlug.set(wiki.slug, { ...(bySlug.get(wiki.slug) || {}), ...wiki })
  })

  const published = Array.from(bySlug.values()).filter((wiki) => wiki.isPublished !== false)

  const featured = published.slice(0, 3).map((wiki) => ({
    slug: wiki.slug,
    displayName: wiki.displayName || wiki.slug,
    gradeLabel: wiki.grade || 'All Levels',
    picture:
      wiki.picture && wiki.picture !== '/images/robogeex-logo.png' ? wiki.picture : '',
  }))

  return { featured, total: published.length }
}

async function getLessonCount(): Promise<number | null> {
  if (process.env.USE_DB === 'true') {
    try {
      const { prisma } = await import('@/lib/prisma')
      const count = await prisma.lesson.count({ where: { status: 'published' } })
      if (count > 0) return count
    } catch {
      // fall through to file data
    }
  }
  try {
    const kits = getKits()
    const perKit = await Promise.all(
      kits.map((kit) => getLessons(kit.slug, { metadataOnly: true }).catch(() => []))
    )
    return perKit.reduce((sum, lessons) => sum + lessons.length, 0)
  } catch {
    return null
  }
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default async function MarketingLanding({ lang }: { lang: Locale }) {
  const t = copy[lang]
  const isAr = lang === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const track = isAr ? '' : 'tracking-tight'
  const nf = (n: number) => n.toLocaleString(isAr ? 'ar-EG' : 'en-US')

  const [user, { featured, total: wikiCount }, lessonCount] = await Promise.all([
    getCurrentUser().catch(() => null),
    getPublishedWikis(),
    getLessonCount(),
  ])

  const dashboardHref = user?.role === 'admin' ? '/dashboard' : '/home'

  const fontVars = {
    '--land-display': isAr ? 'var(--font-land-cairo)' : 'var(--font-land-display)',
    '--land-body': isAr ? 'var(--font-land-cairo)' : 'var(--font-land-body)',
  } as CSSProperties

  return (
    <div
      dir={dir}
      lang={lang}
      className={`rgx-landing ${displayFont.variable} ${bodyFont.variable} ${arabicFont.variable} min-h-screen`}
      style={{
        ...fontVars,
        color: INK,
        background:
          'radial-gradient(circle at 82% -8%, rgba(240,82,63,0.12), transparent 46%), radial-gradient(circle at 6% 34%, rgba(240,82,63,0.06), transparent 38%), #FAF8F7',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#F2E1DD] bg-[#FAF8F7]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/images/robogeex-logo.png" alt="RoboGeex" className="h-10 w-10 rounded-xl" />
            <span className={`land-display hidden text-xl font-bold sm:inline ${track}`}>RoboGeex</span>
          </Link>

          <nav className="hidden items-center gap-8 text-base font-semibold text-[#6B4F4A] lg:flex">
            <Link href="/wikis" className="transition-colors hover:text-[#1A1110]">
              {t.navWikis}
            </Link>
            <a href="#how-it-works" className="transition-colors hover:text-[#1A1110]">
              {t.navHow}
            </a>
            <a href="#for-schools" className="transition-colors hover:text-[#1A1110]">
              {t.navSchools}
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={t.langHref}
              className="inline-flex h-11 items-center rounded-full border border-[#F2E1DD] bg-white px-4 text-sm font-bold text-[#6B4F4A] transition-colors hover:text-[#1A1110]"
            >
              {t.langSwitch}
            </Link>
            {user ? (
              <Link
                href={dashboardHref}
                className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-white sm:px-6"
                style={{ background: CORAL_GRADIENT, boxShadow: '0 14px 28px -18px rgba(226,59,46,0.7)' }}
              >
                {t.dashboard}
                <Arrow size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden h-11 items-center px-3 text-sm font-bold text-[#6B4F4A] transition-colors hover:text-[#1A1110] sm:inline-flex"
                >
                  {t.login}
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-11 items-center whitespace-nowrap rounded-full px-5 text-sm font-bold text-white sm:px-6"
                  style={{ background: CORAL_GRADIENT, boxShadow: '0 14px 28px -18px rgba(226,59,46,0.7)' }}
                >
                  {t.signup}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-24">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F2E1DD] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#E23B2E]">
            {t.badge}
          </p>
          <h1 className={`land-display max-w-[900px] text-5xl font-extrabold leading-[1.06] sm:text-6xl lg:text-[5rem] ${track}`}>
            {t.heroTitleA}
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: CORAL_GRADIENT }}
            >
              {t.heroTitleB}
            </span>
          </h1>
          <p className="mt-7 max-w-[620px] text-lg font-medium leading-relaxed text-[#6B4F4A] sm:text-xl">
            {t.heroSub}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/wikis"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full px-9 text-base font-bold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: CORAL_GRADIENT, boxShadow: '0 18px 36px -20px rgba(226,59,46,0.75)' }}
            >
              {t.ctaExplore}
              <Arrow size={18} />
            </Link>
            {!user && (
              <Link
                href="/login"
                className="inline-flex h-14 items-center justify-center rounded-full border border-[#F2E1DD] bg-white px-9 text-base font-bold text-[#1A1110] transition-transform hover:-translate-y-0.5"
              >
                {t.login}
              </Link>
            )}
          </div>

          {/* Stats */}
          <dl className="mt-16 grid grid-cols-1 gap-y-8 border-y border-[#F2E1DD] py-8 sm:grid-cols-3 sm:gap-x-8">
            <div>
              <dd className={`land-display text-4xl font-extrabold sm:text-5xl ${track}`}>
                {nf(wikiCount)}
              </dd>
              <dt className="mt-2 text-base font-semibold text-[#8B6B65]">{t.statWikis}</dt>
            </div>
            {lessonCount !== null && lessonCount > 0 && (
              <div>
                <dd className={`land-display text-4xl font-extrabold sm:text-5xl ${track}`}>
                  {nf(lessonCount)}
                </dd>
                <dt className="mt-2 text-base font-semibold text-[#8B6B65]">{t.statLessons}</dt>
              </div>
            )}
            <div>
              <dd className={`land-display text-4xl font-extrabold sm:text-5xl ${track}`}>
                {t.statLangsValue}
              </dd>
              <dt className="mt-2 text-base font-semibold text-[#8B6B65]">{t.statLangs}</dt>
            </div>
          </dl>
        </section>

        {/* ── Featured wikis ─────────────────────────────────── */}
        {featured.length > 0 && (
          <section className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className={`land-display text-3xl font-extrabold sm:text-4xl ${track}`}>
                  {t.featuredTitle}
                </h2>
                <p className="mt-3 max-w-[520px] text-base font-medium text-[#6B4F4A] sm:text-lg">
                  {t.featuredSub}
                </p>
              </div>
              <Link
                href="/wikis"
                className="inline-flex items-center gap-2 text-base font-bold text-[#E23B2E] transition-colors hover:text-[#B72A1E]"
              >
                {t.viewAll}
                <Arrow size={17} />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((wiki, index) => {
                const [from, to] = COVER_TONES[index % COVER_TONES.length]
                return (
                  <Link
                    key={wiki.slug}
                    href={`/${wiki.slug}`}
                    className="group rounded-[1.75rem] border border-[#F2E1DD] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-32px_rgba(26,17,16,0.35)]"
                  >
                    <div
                      className="relative flex h-40 items-center justify-center overflow-hidden rounded-[1.25rem]"
                      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                    >
                      {wiki.picture ? (
                        <img
                          src={wiki.picture}
                          alt={wiki.displayName}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="land-display text-6xl font-extrabold text-white/85">
                          {initialsOf(wiki.displayName)}
                        </span>
                      )}
                    </div>
                    <span className="mt-5 inline-flex rounded-full bg-[#FAF3F1] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[#8B6B65]">
                      {wiki.gradeLabel}
                    </span>
                    <h3 className={`land-display mt-3 text-2xl font-bold leading-snug ${track}`}>
                      {wiki.displayName}
                    </h3>
                    <span className="mt-4 inline-flex items-center gap-2 text-base font-bold text-[#E23B2E]">
                      {t.openWiki}
                      <Arrow
                        size={16}
                        className={`transition-transform duration-300 ${isAr ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}
                      />
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── How it works ───────────────────────────────────── */}
        <section id="how-it-works" className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className={`land-display text-3xl font-extrabold sm:text-4xl ${track}`}>{t.howTitle}</h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {t.steps.map((step, index) => {
              const Icon = STEP_ICONS[index]
              return (
                <div
                  key={step.title}
                  className="rounded-[1.75rem] border border-[#F2E1DD] bg-white p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDEEEB] text-[#E23B2E]">
                      <Icon size={22} />
                    </span>
                    <span className={`land-display text-4xl font-extrabold text-[#F3D8D3] ${track}`}>
                      {nf(index + 1).padStart(isAr ? 1 : 2, '0')}
                    </span>
                  </div>
                  <h3 className={`land-display mt-5 text-xl font-bold sm:text-2xl ${track}`}>
                    {step.title}
                  </h3>
                  <p className="mt-3 text-base font-medium leading-relaxed text-[#6B4F4A]">
                    {step.body}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6 lg:px-8">
          <h2 className={`land-display text-3xl font-extrabold sm:text-4xl ${track}`}>
            {t.featuresTitle}
          </h2>
          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {t.features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index]
              return (
                <div
                  key={feature.title}
                  className="flex items-start gap-5 rounded-[1.75rem] border border-[#F2E1DD] bg-white p-7"
                >
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FDEEEB] text-[#E23B2E]">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3 className={`land-display text-xl font-bold sm:text-2xl ${track}`}>
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-base font-medium leading-relaxed text-[#6B4F4A]">
                      {feature.body}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── For schools ────────────────────────────────────── */}
        <section id="for-schools" className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-4 pb-20 sm:px-6 lg:px-8">
          <div
            className="rounded-[2rem] px-7 py-14 text-center sm:px-12 sm:py-16"
            style={{ backgroundColor: INK }}
          >
            <h2 className={`land-display text-3xl font-extrabold text-white sm:text-5xl ${track}`}>
              {t.schoolsTitle}
            </h2>
            <p className="mx-auto mt-5 max-w-[560px] text-base font-medium leading-relaxed text-[#D9C2BC] sm:text-lg">
              {t.schoolsSub}
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-13 min-h-[52px] items-center justify-center rounded-full px-8 text-base font-bold text-white"
                style={{ background: CORAL_GRADIENT, boxShadow: '0 18px 32px -20px rgba(226,59,46,0.8)' }}
              >
                {t.schoolsCta}
              </Link>
              <Link
                href="/wikis"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/25 px-8 text-base font-bold text-white transition-colors hover:bg-white/10"
              >
                {t.schoolsCta2}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-[#F2E1DD]">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/images/robogeex-logo.png" alt="RoboGeex" className="h-8 w-8 rounded-lg" />
            <p className="text-sm font-medium text-[#8B6B65]">{t.footerNote}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-[#6B4F4A]">
            <Link href="/wikis" className="transition-colors hover:text-[#1A1110]">
              {t.navWikis}
            </Link>
            <Link href="/login" className="transition-colors hover:text-[#1A1110]">
              {t.login}
            </Link>
            <Link href="/signup" className="transition-colors hover:text-[#1A1110]">
              {t.signup}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
