"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[#eef2f1] flex items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Application error</h1>
            <p className="mt-3 text-sm text-slate-600">
              {error?.message || "An unexpected error occurred."}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
