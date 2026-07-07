// Deterministic date formatting for values that are rendered on the server and
// then hydrated on the client. Locale/timezone-based formatters like
// toLocaleDateString() produce different output on the Node server vs the
// browser, which breaks React hydration. These helpers use UTC and a fixed
// format so both environments always agree.

// Fixed M/D/YYYY, e.g. "7/7/2026".
export function formatUtcDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}/${dt.getUTCFullYear()}`
}
