"use client"

import { useEffect, useState } from "react"
import DeveloperLogin from "./DeveloperLogin"
import { getDeveloperId, rememberDeveloperId } from "./dev-identity"

export default function EditorAuthGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [devId, setDevId] = useState<string | undefined>(undefined)

  useEffect(() => {
    setMounted(true)
    setDevId(getDeveloperId())
  }, [])

  useEffect(() => {
    if (devId) {
      rememberDeveloperId(devId)
    }
  }, [devId])

  // Prevent hydration mismatch by not rendering anything until mounted on client
  if (!mounted) {
    return null
  }

  if (!devId) {
    return <DeveloperLogin onSignedIn={setDevId} />
  }

  return <>{children}</>
}
