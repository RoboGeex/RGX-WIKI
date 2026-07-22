import Link from 'next/link'
import { getCatalogMessages, type CatalogLocale } from '@/lib/catalog-i18n'

/** Ported from robogeex_courses' Footer.tsx — socials, explore column, contact. */
const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/robogeex',
    handle: '@robogeex',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/robogeexacademy',
    handle: 'robogeexacademy',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.27-1.46 1.52-1.46H16.5V4.43A22 22 0 0 0 14.3 4.3c-2.2 0-3.7 1.35-3.7 3.82V10.5H8v3h2.6V21h2.9Z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@robogeexacademy',
    handle: '@robogeexacademy',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3-5.2 3Z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/robogeexacademy',
    handle: 'robogeexacademy',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5ZM3 9.5h4V21H3V9.5ZM9 9.5h3.84v1.57h.05a4.2 4.2 0 0 1 3.79-2.08c4.05 0 4.8 2.67 4.8 6.14V21h-4v-5.34c0-1.27-.02-2.91-1.77-2.91-1.77 0-2.04 1.38-2.04 2.82V21H9V9.5Z" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp Channel',
    href: 'https://whatsapp.com/channel/0029Vb86VbKGehEJ0GvbwB1n',
    handle: 'RoboGeex',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.5 3.5A11.3 11.3 0 0 0 12 0h-.07A11.5 11.5 0 0 0 .5 11.94 11.5 11.5 0 0 0 2 17.7L.5 24l6.45-1.69a11.45 11.45 0 0 0 5.05 1.2h.01a11.5 11.5 0 0 0 11.49-11.5 11.43 11.43 0 0 0-3-7.51Zm-8.5 17.6h-.01a9.55 9.55 0 0 1-4.86-1.33l-.35-.21-3.83 1 1.02-3.73-.23-.38A9.5 9.5 0 0 1 2.5 12 9.5 9.5 0 0 1 12 2.5a9.43 9.43 0 0 1 6.71 2.79A9.4 9.4 0 0 1 21.5 12 9.5 9.5 0 0 1 12 21.1Zm5.2-7.12c-.28-.14-1.68-.83-1.94-.92-.26-.1-.45-.14-.64.14-.18.28-.73.92-.9 1.11-.16.19-.33.21-.61.07-1.68-.84-2.78-1.5-3.89-3.4-.29-.5.29-.47.83-1.55.09-.18.05-.34-.02-.48-.07-.14-.64-1.55-.88-2.12-.23-.55-.46-.48-.64-.49l-.55-.01a1.05 1.05 0 0 0-.77.36c-.27.28-1.02 1-1.02 2.42 0 1.43 1.04 2.81 1.19 3.01.14.19 2.05 3.13 4.97 4.4 1.85.8 2.58.87 3.5.73.56-.08 1.68-.69 1.91-1.35.24-.66.24-1.23.17-1.35-.07-.13-.26-.2-.54-.34Z" />
      </svg>
    ),
  },
  {
    label: 'Telegram',
    href: 'https://t.me/robogeex',
    handle: '@robogeex',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M21.4 2.6a1.5 1.5 0 0 0-1.6-.2L2.5 9.6a1.2 1.2 0 0 0 .04 2.22l4.36 1.55 1.7 5.36a1.1 1.1 0 0 0 1.79.46l2.55-2.3 4.8 3.5a1.4 1.4 0 0 0 2.2-.83l3-15.05a1.5 1.5 0 0 0-.54-1.42ZM9.7 14.6l-.5 3.55-1.34-4.22 8.83-7.97L9.7 14.6Z" />
      </svg>
    ),
  },
]

export function CatalogFooter({ locale, basePath }: { locale: CatalogLocale; basePath: string }) {
  const t = getCatalogMessages(locale)

  const EXPLORE = [
    { label: t.nav.courses, href: basePath, internal: true },
    { label: t.nav.events, href: 'https://www.robogeex.com/events' },
    { label: t.nav.shop, href: 'https://www.robogeex.com/shop' },
    { label: t.nav.blog, href: 'https://www.robogeex.com/blog' },
    { label: t.nav.about, href: 'https://www.robogeex.com/about' },
  ]

  return (
    <footer className="mt-20 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="md:col-span-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logos/logo-horizontal-light.svg" alt="RoboGeex Academy" className="h-14 w-auto" />
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/70">{t.footer.desc}</p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${s.label}${s.handle ? ` — ${s.handle}` : ''}`}
                title={s.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/80 transition hover:bg-brand hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              >
                <span className="h-5 w-5">{s.icon}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="md:col-span-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white">{t.footer.explore}</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {EXPLORE.map((l) => (
              <li key={l.label}>
                {l.internal ? (
                  <Link href={l.href} className="transition hover:text-brand">{l.label}</Link>
                ) : (
                  <a href={l.href} target="_blank" rel="noreferrer" className="transition hover:text-brand">{l.label}</a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-white">{t.footer.getInTouch}</h4>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-3">
              <span className="shrink-0 text-white/40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
                </svg>
              </span>
              <a href="https://wa.me/96171171119" target="_blank" rel="noreferrer" dir="ltr" className="transition hover:text-brand">+961 71 171 119</a>
            </li>
            <li className="flex items-center gap-3">
              <span className="shrink-0 text-white/40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </span>
              <a href="mailto:info@robogeex.com" dir="ltr" className="transition hover:text-brand">info@robogeex.com</a>
            </li>
            <li className="flex items-center gap-3">
              <span className="shrink-0 text-white/40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
                </svg>
              </span>
              <a href="https://robogeex.com" target="_blank" rel="noreferrer" dir="ltr" className="transition hover:text-brand">robogeex.com</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} RoboGeex Academy. {t.footer.rights}</span>
          <a href="https://social.robogeex.com" target="_blank" rel="noreferrer" className="transition hover:text-brand">{t.footer.allLinks}</a>
        </div>
      </div>
    </footer>
  )
}
