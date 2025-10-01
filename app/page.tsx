import { redirect } from 'next/navigation'
import { getKits } from '@/lib/data'
import Link from 'next/link'

export default function RootPage() {
  // For production deployment, always redirect to student-kit as the default
  // This ensures users always land on a working page
  redirect('/en/student-kit')
  
  // Alternative approach: Show available kits (commented out)
  /*
  const kits = getKits()
  
  return (
    <div className="min-h-screen bg-[#eef2f1] flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Welcome to RGX Wiki</h1>
        <p className="text-lg text-gray-600 mb-8">Choose a learning kit to get started:</p>
        <div className="grid gap-4 md:grid-cols-2">
          {kits.map(kit => (
            <Link 
              key={kit.slug}
              href={`/en/${kit.slug}`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{kit.title_en}</h2>
              <p className="text-gray-600">{kit.overview_en}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
  */
}