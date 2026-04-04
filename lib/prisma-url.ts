function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return undefined
}

export function isPrismaProxyUrl(url: string | undefined): boolean {
  return !!url && url.trim().toLowerCase().startsWith('prisma://')
}

export function resolvePrismaDirectUrl(...candidates: Array<string | undefined>): string | undefined {
  const preferredDirect = firstNonEmpty(...candidates)
  if (preferredDirect && !isPrismaProxyUrl(preferredDirect)) {
    return preferredDirect
  }
  return undefined
}
