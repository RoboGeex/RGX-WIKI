import { headers } from 'next/headers'

export default function DebugPage() {
  const headersList = headers()
  const host = headersList.get('host')
  const userAgent = headersList.get('user-agent')
  const forwardedFor = headersList.get('x-forwarded-for')
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      <div className="space-y-2">
        <p><strong>Host:</strong> {host}</p>
        <p><strong>User Agent:</strong> {userAgent}</p>
        <p><strong>X-Forwarded-For:</strong> {forwardedFor}</p>
        <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side render'}</p>
      </div>
      <div className="mt-4">
        <a href="/en/student-kit" className="text-blue-600 underline">Go to Student Kit</a>
      </div>
    </div>
  )
}