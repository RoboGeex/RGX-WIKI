export const HUB_DOMAIN = (process.env.NEXT_PUBLIC_HUB_DOMAIN || 'wikis.robogeex.com').toLowerCase()

export function normalizeHost(host?: string | null) {
  if (!host) return ''
  const normalized = host.trim().toLowerCase()
  if (!normalized) return ''

  // Handle bracketed IPv6 host headers such as [::1]:3000.
  if (normalized.startsWith('[')) {
    const closingBracketIndex = normalized.indexOf(']')
    if (closingBracketIndex > 1) {
      return normalized.slice(1, closingBracketIndex)
    }
  }

  const firstColonIndex = normalized.indexOf(':')
  if (firstColonIndex === -1) return normalized

  const lastColonIndex = normalized.lastIndexOf(':')
  if (firstColonIndex !== lastColonIndex) {
    // Likely a plain IPv6 literal without a port.
    return normalized
  }

  return normalized.slice(0, firstColonIndex)
}

export function isLocalHost(host?: string | null) {
  const normalized = normalizeHost(host)
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
}

export function isCloudRunHost(host?: string | null) {
  const normalized = normalizeHost(host)
  return normalized.endsWith('.run.app') || normalized.endsWith('.a.run.app')
}

export function isVercelHost(host?: string | null) {
  const normalized = normalizeHost(host)
  return normalized.endsWith('.vercel.app')
}

export function isHubHost(host?: string | null) {
  const normalized = normalizeHost(host)
  return normalized === HUB_DOMAIN || isLocalHost(normalized) || isCloudRunHost(normalized) || isVercelHost(normalized)
}
