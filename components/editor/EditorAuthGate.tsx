"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getDeveloperId, rememberDeveloperId, clearDeveloperId } from "./dev-identity"

export default function EditorAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [devId, setDevId] = useState<string | undefined>(undefined)
  const [hasAdminSession, setHasAdminSession] = useState(false)

  useEffect(() => {
    let cancelled = false

    const id = getDeveloperId()
    setDevId(id)
    if (id) rememberDeveloperId(id)

    if (id) {
      // Confirm the signed `rgx_dev_id` cookie is present and valid. A legacy
      // session (unsigned cookie) still has the localStorage id but no valid
      // cookie, so its API calls would fail — send it to a fresh login instead
      // of rendering an editor that can't save.
      fetch("/api/developers/me", { cache: "no-store" })
        .then((res) => {
          if (cancelled) return
          if (res.ok) {
            setMounted(true)
            return
          }
          if (res.status === 401 || res.status === 403) {
            clearDeveloperId()
            setDevId(undefined)
            setMounted(true) // triggers the redirect-to-login effect below
            return
          }
          // Transient (5xx) error — don't lock the editor out.
          setMounted(true)
        })
        .catch(() => {
          if (!cancelled) setMounted(true)
        })
      return
    }

    fetch("/api/auth/profile", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setHasAdminSession(data?.user?.role === "admin")
      })
      .catch(() => {
        if (!cancelled) setHasAdminSession(false)
      })
      .finally(() => {
        if (!cancelled) setMounted(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (mounted && !devId && !hasAdminSession) {
      const redirect = pathname && pathname.startsWith("/editor") ? pathname : "/editor"
      router.replace(`/login?redirect=${encodeURIComponent(redirect)}`)
    }
  }, [mounted, devId, hasAdminSession, pathname, router])

  if (!mounted || (!devId && !hasAdminSession)) return null

  return <>{children}</>
}
