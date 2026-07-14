import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { findDeveloperById } from '@/lib/developers'
import { canManageWiki } from '@/lib/assignments'
import { getVerifiedDeveloperId } from '@/lib/dev-session'
import WikiAccessGate from '@/components/editor/WikiAccessGate'

const WikiEditor = dynamic(() => import('@/components/editor/Editor'), { ssr: false })

export default async function EditorLessonPage({
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
      {/* Syncs the HTTP-only cookie for old sessions so the access check
          above fires on the next server render (via router.refresh). */}
      {wikiSlug && <WikiAccessGate />}
      <div className="min-h-screen bg-[#eef2f1]">
        <WikiEditor />
      </div>
    </>
  )
}
