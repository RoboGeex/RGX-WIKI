import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { findDeveloperById } from '@/lib/developers'
import { canManageWiki } from '@/lib/assignments'
import { getVerifiedDeveloperId } from '@/lib/dev-session'
import WikiAccessGate from '@/components/editor/WikiAccessGate'

const PropertiesForm = dynamic(() => import('@/components/editor/PropertiesForm'), { ssr: false })

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: { wiki?: string; kit?: string }
}) {
  const wikiSlug = (searchParams.wiki || searchParams.kit || '').trim()

  if (wikiSlug) {
    const devId = getVerifiedDeveloperId()
    if (devId) {
      const developer = await findDeveloperById(devId)
      if (developer && !canManageWiki(developer, wikiSlug)) {
        redirect('/editor')
      }
    }
  }

  return (
    <>
      {wikiSlug && <WikiAccessGate />}
      <PropertiesForm />
    </>
  )
}