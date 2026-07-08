import { redirect } from 'next/navigation'
import { Cairo } from 'next/font/google'
import AdminNavbar from '@/components/admin-navbar'
import { requireAdminAccess } from '@/lib/admin-auth'
import AdminProfileClient from './AdminProfileClient'

export const dynamic = 'force-dynamic'

const display = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-cairo' })

function getInitials(name: string | null | undefined, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default async function AdminProfilePage() {
  let auth: Awaited<ReturnType<typeof requireAdminAccess>>
  try {
    auth = await requireAdminAccess()
  } catch {
    redirect('/login?redirect=/dashboard/profile')
  }

  const account =
    auth.source === 'user'
      ? {
          source: 'user' as const,
          id: auth.user.id,
          name: auth.user.name,
          email: auth.user.email,
          avatarUrl: auth.user.avatarUrl,
          canUploadAvatar: true,
        }
      : {
          source: 'developer' as const,
          id: String(auth.dev.id),
          name: auth.dev.name ?? null,
          email: auth.dev.email ?? '',
          avatarUrl: auth.dev.avatarUrl ?? null,
          canUploadAvatar: Number.isFinite(Number(auth.dev.id)),
        }

  return (
    <div
      className={`${display.variable} rgx-dash min-h-screen text-[#0F172A]`}
      style={{
        background:
          'radial-gradient(circle at 10% 0%, rgba(240,82,63,0.08), transparent 38%), radial-gradient(circle at 92% 4%, rgba(240,82,63,0.06), transparent 36%), linear-gradient(180deg, #FDF6F4 0%, #FBF7F5 100%)',
      }}
    >
      <AdminNavbar
        userInitials={getInitials(account.name, account.email)}
        userAvatarUrl={account.avatarUrl}
        userName={account.name}
        userEmail={account.email}
      />

      <main className="mx-auto max-w-6xl px-6 pb-6 pt-[88px]">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E23B2E]">Admin profile</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0F172A]">Account settings</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#64748B]">
            Manage the admin identity used for dashboard access, profile display, and sign-in.
          </p>
        </div>
        <AdminProfileClient account={account} />
      </main>
    </div>
  )
}
