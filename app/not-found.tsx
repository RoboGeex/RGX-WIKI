import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center space-y-6">
        <div>
          <div className="text-6xl font-extrabold text-primary">
            404
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            The page you are looking for does not exist or was moved.
          </p>
        </div>
        <Link
          href="/en/student-kit"
          className="inline-flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground font-medium py-2.5 px-5 rounded-xl transition-colors"
        >
          <Home size={16} />
          <span>Back to kit</span>
        </Link>
      </div>
    </div>
  )
}
