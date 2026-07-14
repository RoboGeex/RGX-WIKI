import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

// ─────────────────────────────────────────────────────────────────────────────
// Developer session identity.
//
// Historically the `rgx_dev_id` cookie (and the `x-developer-id` header mirrored
// from localStorage) held the developer's RAW numeric id. That is trivially
// forgeable: anyone can send `Cookie: rgx_dev_id=1` and be treated as developer
// #1. This module replaces that with a signed token so the id can no longer be
// spoofed, while keeping the cookie name/attributes identical so nothing else
// about the flow changes.
//
// Token format:  <base64url(devId)>.<expiryMs>.<HMAC-SHA256 base64url>
// The HMAC is keyed by DEV_SESSION_SECRET (recommended) and falls back to the
// developers/default database URL — a stable, secret value that is always
// present in production, so no new env var is strictly required to deploy.
// ─────────────────────────────────────────────────────────────────────────────

export const DEV_COOKIE = 'rgx_dev_id'
const DEFAULT_DAYS = 30

function isLocalNoDbMode(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.USE_DB !== 'true'
}

function secret(): string | null {
  return (
    process.env.DEV_SESSION_SECRET ||
    process.env.DATABASE_URL_DEVELOPERS ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_DEFAULT ||
    process.env.DATABASE_URL_HUB ||
    null
  )
}

function b64(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function unb64(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

/**
 * Produce the value to store in the `rgx_dev_id` cookie for a developer id.
 * When no secret is configured (local no-DB dev only) the raw id is returned so
 * local development keeps working without any setup.
 */
export function signDeveloperSession(devId: string, days = DEFAULT_DAYS): string {
  const id = (devId || '').trim()
  const key = secret()
  if (!key) return id // local/dev with no secret — unsigned, accepted only locally
  const exp = Date.now() + days * 24 * 60 * 60 * 1000
  const payload = `${b64(id)}.${exp}`
  const sig = createHmac('sha256', key).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/**
 * Verify a cookie value and return the developer id it authenticates, or null.
 * In production a valid HMAC signature and unexpired token are required; a raw
 * (legacy, unsigned) value is rejected. In local no-DB mode a raw value is
 * accepted for convenience.
 */
export function verifyDeveloperSession(token?: string | null): string | null {
  if (!token) return null
  const key = secret()

  if (!key) {
    // No secret configured — only trust a raw value locally, never in prod.
    return isLocalNoDbMode() ? token.trim() || null : null
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    // Not a signed token (e.g. a legacy raw id). Reject in production; allow
    // locally so a dev environment isn't locked out mid-transition.
    return isLocalNoDbMode() ? token.trim() || null : null
  }

  const [b64id, expStr, sig] = parts
  const payload = `${b64id}.${expStr}`
  const expected = createHmac('sha256', key).update(payload).digest('base64url')

  const provided = Buffer.from(sig)
  const good = Buffer.from(expected)
  if (provided.length !== good.length || !timingSafeEqual(provided, good)) return null

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return null

  try {
    const id = unb64(b64id).trim()
    return id || null
  } catch {
    return null
  }
}

/**
 * The developer id authenticated by the signed `rgx_dev_id` cookie on the
 * current request, or null. Safe to call in any server (route handler / server
 * component) context.
 */
export function getVerifiedDeveloperId(): string | null {
  try {
    return verifyDeveloperSession(cookies().get(DEV_COOKIE)?.value)
  } catch {
    return null
  }
}

/**
 * Resolve the acting developer id for an API request. Authorization trusts ONLY
 * the signed cookie. As a local-development convenience (no DB, non-production)
 * the old `x-developer-id` header / NEXT_PUBLIC_DEVELOPER_ID are still honored.
 */
export function resolveDeveloperId(req?: Request): string | undefined {
  const verified = getVerifiedDeveloperId()
  if (verified) return verified

  if (isLocalNoDbMode()) {
    const headers = (req as any)?.headers as Headers | undefined
    const raw =
      headers?.get('x-user-id') ||
      headers?.get('x-actor-id') ||
      headers?.get('x-developer-id') ||
      headers?.get('x-dev-id') ||
      undefined
    if (raw && raw.trim()) return raw.trim()
    const envId = process.env.NEXT_PUBLIC_DEVELOPER_ID?.trim()
    if (envId) return envId
  }

  return undefined
}
