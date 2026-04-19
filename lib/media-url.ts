const SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+\-.]*:/

function hasScheme(value: string): boolean {
  return SCHEME_RE.test(value)
}

function toRootRelativePath(value: string): string {
  if (!value) return ''
  if (value.startsWith('/')) return value
  if (value.startsWith('./')) return `/${value.slice(2)}`
  return `/${value}`
}

export function normalizeLessonMediaUrl(rawValue: unknown, wikiSlug?: string): string {
  if (typeof rawValue !== 'string') return ''
  const value = rawValue.trim()
  if (!value) return ''
  if (value.startsWith('//')) return value
  if (value.startsWith('data:') || value.startsWith('blob:')) return value
  if (hasScheme(value)) return value

  const rootPath = toRootRelativePath(value)
  if (!wikiSlug || !rootPath.startsWith('/api/upload/')) {
    return rootPath
  }

  try {
    const temp = new URL(rootPath, 'http://local.invalid')
    if (!temp.searchParams.get('wiki')) {
      temp.searchParams.set('wiki', wikiSlug)
    }
    return `${temp.pathname}${temp.search}${temp.hash}`
  } catch {
    return rootPath
  }
}
