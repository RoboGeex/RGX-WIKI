"use client"

import { useState } from "react"
import { rememberDeveloperId } from "./dev-identity"

type Props = {
  onSignedIn: (developerId: string) => void
}

export default function DeveloperLogin({ onSignedIn }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setError(null)
    try {
      const res = await fetch("/api/developers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok || !data?.developer?.id) {
        throw new Error(data?.error || "Invalid credentials")
      }
      rememberDeveloperId(data.developer.id)
      onSignedIn(data.developer.id)
    } catch (err: any) {
      setError(err?.message || "Login failed")
      setStatus("error")
    } finally {
      setStatus("idle")
    }
  }

  return (
    <div className="min-h-screen bg-[#eef2f1] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
        <div className="space-y-2 text-center">
          <img src="/images/robogeex-logo.png" alt="RoboGeex" className="mx-auto h-10 w-auto" />
          <h1 className="text-xl font-semibold text-gray-900">Developer Sign In</h1>
          <p className="text-sm text-gray-600">Use your assigned email and password to continue.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/60"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/60"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
          >
            {status === "loading" ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}
