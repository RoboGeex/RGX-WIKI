export const HUB_DOMAIN = (process.env.NEXT_PUBLIC_HUB_DOMAIN || 'wiki.robogeex.com').toLowerCase()

export function normalizeHost(host?: string | null) {
  if (!host) return ''
  return host.split(':')[0].toLowerCase()
}
