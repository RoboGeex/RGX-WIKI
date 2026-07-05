"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getDeveloperId, rememberDeveloperId } from "./dev-identity"

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
      setMounted(true)
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
