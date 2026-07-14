import { resolveDeveloperId } from '@/lib/dev-session'

// Authorization trusts ONLY the signed `rgx_dev_id` cookie. The old
// `x-developer-id` header is no longer accepted as proof of identity (except in
// local no-DB dev mode, handled inside resolveDeveloperId).
export function getActorIdFromRequest(req: Request): string | undefined {
  return resolveDeveloperId(req)
}
