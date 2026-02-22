export function getActorIdFromRequest(req: Request): string | undefined {
  const headers = (req as any)?.headers as Headers | undefined
  if (!headers) return undefined
  const raw =
    headers.get('x-user-id') ||
    headers.get('x-actor-id') ||
    headers.get('x-developer-id') ||
    headers.get('x-dev-id')
  return raw ? raw.trim() || undefined : undefined
}
