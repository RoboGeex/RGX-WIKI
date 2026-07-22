import CatalogPage from '@/components/catalog/CatalogPage'

export const dynamic = 'force-dynamic'

// The catalog also renders at the hub root (app/page.tsx); both share
// components/catalog/CatalogPage so they can never drift apart.
export default async function WikisPage({
  searchParams,
}: {
  searchParams?: { q?: string; lang?: string }
}) {
  return (
    <CatalogPage
      locale={searchParams?.lang === 'ar' ? 'ar' : 'en'}
      initialQuery={(searchParams?.q || '').trim()}
      basePath="/wikis"
    />
  )
}
