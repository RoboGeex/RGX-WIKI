import Link from 'next/link'

type Props = {
  params: { locale: string }
  searchParams?: { kit?: string; reason?: string }
}

const REASON_LABELS: Record<string, string> = {
  'access-check-failed': 'Access-code validation could not reach the database.',
  'db-bypass-active': 'Database circuit breaker is active after recent DB failures.',
  'lessons-load-failed': 'Lessons could not be loaded from the database.',
  'first-lesson-load-failed': 'The first lesson could not be retrieved from the database.',
  'lesson-load-failed': 'The requested lesson could not be loaded from the database.',
  'neighbors-load-failed': 'Adjacent lesson navigation could not be loaded from the database.',
}

export default function DbUnavailablePage({ params, searchParams }: Props) {
  const locale = (params?.locale || 'en').trim() || 'en'
  const kit = (searchParams?.kit || 'student-kit').trim() || 'student-kit'
  const reasonKey = (searchParams?.reason || '').trim()
  const reason =
    REASON_LABELS[reasonKey] ||
    'The app is running in strict DB mode and cannot continue until database connectivity is restored.'

  const homeHref = `/${locale}/${kit}`
  const dbTestHref = `/api/db-test?wiki=${encodeURIComponent(kit)}`

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#eef2f1] px-4">
      <section className="w-full max-w-2xl rounded-2xl border border-[#d2d9dd] bg-white p-7 shadow-sm">
        <h1 className="text-3xl font-extrabold text-[#10213b]">Database temporarily unavailable</h1>
        <p className="mt-3 text-[17px] leading-7 text-[#2b3e59]">
          {reason}
        </p>
        <p className="mt-2 text-sm text-[#5a6f89]">
          Once DB connectivity is fixed, refresh this page and the lessons should load normally.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={homeHref}
            className="inline-flex items-center rounded-lg bg-[#112447] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c1b34]"
          >
            Retry kit
          </Link>
          <a
            href={dbTestHref}
            className="inline-flex items-center rounded-lg border border-[#ced6de] bg-white px-4 py-2 text-sm font-semibold text-[#1e3558] hover:bg-[#f4f7fa]"
          >
            Run DB test
          </a>
        </div>
      </section>
    </main>
  )
}
