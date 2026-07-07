import { redirect } from 'next/navigation'
import { Lexend } from 'next/font/google'
import { requireAdminAccess } from '@/lib/admin-auth'
import AdminNavbar from '../../../components/admin-navbar'
import { prisma } from '@/lib/prisma'
import TeachersPageClient from './TeachersPageClient'

const display = Lexend({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-lexend' })

function getInitials(name: string | null | undefined, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default async function TeachersPage() {
  let userInitials = 'AD'
  let isAdmin = false
  try {
    const auth = await requireAdminAccess()
    isAdmin = true
    if (auth.source === 'user') userInitials = getInitials(auth.user.name, auth.user.email)
    else if (auth.source === 'developer') userInitials = getInitials(auth.dev.name ?? null, auth.dev.email ?? '')
  } catch { /* */ }
  if (!isAdmin) redirect('/login?redirect=/dashboard/teachers')

  const wikis = await prisma.wiki.findMany({
    where: { isPublished: true },
    orderBy: { displayName: 'asc' },
    select: { slug: true, displayName: true },
  }).catch(() => [])

  return (
    <div
      className={`${display.variable} rgx-dash min-h-screen`}
      style={{
        background:
          'radial-gradient(circle at 10% 0%, rgba(240,82,63,0.08), transparent 38%), radial-gradient(circle at 92% 4%, rgba(240,82,63,0.06), transparent 36%), linear-gradient(180deg, #FDF6F4 0%, #FBF7F5 100%)',
      }}
    >
      <AdminNavbar userInitials={userInitials} />
      <div className="dashboard-text-scale mx-auto max-w-[1400px] px-6 pt-[96px] pb-14">
        <TeachersPageClient wikis={wikis} />
      </div>
    </div>
  )
}
