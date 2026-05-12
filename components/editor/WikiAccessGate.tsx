'use client'

/**
 * WikiAccessGate
 *
 * Bridges the gap between the client-side localStorage dev session and the
 * server-side HTTP-only cookie (`rgx_dev_id`) that the wiki dashboard page
 * uses to enforce wiki-level access.
 *
 * On mount it POSTs to /api/developers/sync-cookie with the localStorage devId.
 * If the cookie was not yet stamped (old session that pre-dates cookie issuance),
 * the endpoint writes it and returns { stamped: true }, and we call router.refresh()
 * so the server component re-runs — this time with the cookie present — and can
 * perform the access check and redirect if the user is not authorised.
 *
 * For sessions where the cookie already exists (stamped: false) the refresh is
 * skipped; the server check already ran during SSR and either passed or redirected.
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getDeveloperId } from '@/components/editor/dev-identity'

export default function WikiAccessGate() {
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const devId = getDeveloperId()
    if (!devId) return

    fetch('/api/developers/sync-cookie', {
      method: 'POST',
      headers: { 'x-developer-id': devId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.stamped) {
          // Cookie was newly set — re-run the server component so the access
          // check fires and redirects unauthorised users.
          router.refresh()
        }
      })
      .catch(() => {
        // Network error or endpoint unavailable — fail silently.
        // The server-side check will catch unauthorised access on any
        // subsequent navigation once the cookie is properly established.
      })
  }, [router])

  return null
}
