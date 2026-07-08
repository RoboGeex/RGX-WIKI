// Instant skeleton for the lessons area while a wiki's data loads —
// the sidebar (in the layout above) stays mounted and interactive.
export default function LoadingWikiLessons() {
  return (
    <div className="animate-fade-in mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="space-y-3">
        <div className="h-8 w-64 rounded-lg bg-gray-200/80 animate-pulse" />
        <div className="h-4 w-80 rounded bg-gray-200/60 animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-white/70 border border-gray-200/60 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
