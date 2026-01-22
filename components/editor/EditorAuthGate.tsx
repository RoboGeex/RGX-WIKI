"use client"

import { useEffect, useState } from "react"
import DeveloperLogin from "./DeveloperLogin"
import { getDeveloperId, rememberDeveloperId } from "./dev-identity"

export default function EditorAuthGate({ children }: { children: React.ReactNode }) {
  const [devId, setDevId] = useState<string | undefined>(undefined)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    setDevId(getDeveloperId())
  }, [])

  useEffect(() => {
    if (devId) {
      rememberDeveloperId(devId)
    }
  }, [devId])

  if (!hydrated) {
    return null
  }

  if (!devId) {
    return <DeveloperLogin onSignedIn={setDevId} />
  }

  return <>{children}</>
}
