"use client"

import { useEffect, useState } from "react"
import DeveloperLogin from "./DeveloperLogin"
import { getDeveloperId, rememberDeveloperId } from "./dev-identity"

export default function EditorAuthGate({ children }: { children: React.ReactNode }) {
  const [devId, setDevId] = useState<string | undefined>(() => getDeveloperId())

  useEffect(() => {
    if (devId) {
      rememberDeveloperId(devId)
    }
  }, [devId])

  if (!devId) {
    return <DeveloperLogin onSignedIn={setDevId} />
  }

  return <>{children}</>
}
