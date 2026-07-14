import { getWikis } from '@/lib/data'
import { getWikisFromDb } from '@/lib/server-data'
import { findDeveloperById } from '@/lib/developers'
import { canManageWiki } from '@/lib/assignments'
import { getVerifiedDeveloperId } from '@/lib/dev-session'

export type SidebarWiki = { slug: string; displayName: string }

/**
 * Server-side data for the editor wiki sidebar: the merged file+DB wiki list
 * filtered down to what the logged-in developer can manage (superadmins see
 * everything). When the rgx_dev_id cookie is absent (legacy session that
 * pre-dates it), `developer` is null and `wikis` is empty — callers should
 * fall back to the client-side access flow; WikiAccessGate stamps the cookie
 * on first render so a refresh recovers.
 */
export async function getEditorSidebarData(): Promise<{
  wikis: SidebarWiki[]
  isSuperadmin: boolean
  hasIdentity: boolean
}> {
  const fileWikis = getWikis()
  const dbWikis = await getWikisFromDb()
  const bySlug = new Map<string, any>(fileWikis.map((wiki) => [wiki.slug, wiki]))
  dbWikis.forEach((wiki) => {
    bySlug.set(wiki.slug, { ...(bySlug.get(wiki.slug) || {}), ...wiki })
  })
  const allWikis = Array.from(bySlug.values())

  const devId = getVerifiedDeveloperId()
  const developer = devId ? await findDeveloperById(devId) : null

  const accessible = developer
    ? allWikis.filter((wiki) => canManageWiki(developer as any, wiki.slug))
    : []

  return {
    wikis: accessible.map((wiki) => ({
      slug: wiki.slug,
      displayName: wiki.displayName || wiki.slug,
    })),
    isSuperadmin: developer?.role === 'superadmin',
    hasIdentity: Boolean(developer),
  }
}
