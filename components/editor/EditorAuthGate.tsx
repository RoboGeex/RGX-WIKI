"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getDeveloperId, rememberDeveloperId } from "./dev-identity"

export default function EditorAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [devId, setDevId] = useState<string | undefined>(undefined)

  useEffect(() => {
    const id = getDeveloperId()
    setDevId(id)
    if (id) rememberDeveloperId(id)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !devId) {
      router.replace("/login?redirect=/editor")
    }
  }, [mounted, devId, router])

  if (!mounted || !devId) return null

  return <>{children}</>
}
