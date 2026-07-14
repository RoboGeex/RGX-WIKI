// Gate for internal diagnostic endpoints (/api/debug-*, /api/db-test).
// These routes expose environment/database internals and must never be
// reachable anonymously. They are NOT used by the application itself, so
// gating them behind a shared secret does not change app behaviour — it only
// blocks unauthenticated probing.
//
// Provide the secret via `DEBUG_SECRET` (falls back to the existing
// `MIGRATE_ASSETS_SECRET`) and pass it as the `x-debug-secret` header or a
// `?secret=` query param. Fails closed: if no secret is configured, access is
// denied.
export function isDebugAuthorized(req: Request): boolean {
  const secret = process.env.DEBUG_SECRET || process.env.MIGRATE_ASSETS_SECRET
  if (!secret) return false

  let provided: string | null = req.headers.get('x-debug-secret')
  if (!provided) {
    try {
      provided = new URL(req.url).searchParams.get('secret')
    } catch {
      provided = null
    }
  }
  return provided === secret
}
