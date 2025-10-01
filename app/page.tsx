import { redirect } from 'next/navigation'
import { getWikis } from '@/lib/data'

export default function RootPage() {
  // Get the first available wiki
  // In production, this would be determined by the student's purchase/subscription or subdomain
  const wikis = getWikis()
  const firstWiki = wikis[0]
  
  if (firstWiki) {
    redirect(`/en/${firstWiki.slug}`)
  } else {
    // Fallback if no wikis are available
    redirect('/en/student-kit')
  }
}