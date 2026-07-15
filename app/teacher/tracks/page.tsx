import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Home, Layout, Route } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import TrackManager from '@/components/track-manager'
import SignOutButton from '@/components/sign-out-button'

export const dynamic = 'force-dynamic'

export default async function TeacherTracksPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/teacher/tracks')
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/')

  const teacher = await prisma.user.findUnique({ where: { id: user.id }, select: { assignedWikiSlugs: true } })
  const assignedSlugs = Array.isArray(teacher?.assignedWikiSlugs) ? teacher.assignedWikiSlugs as string[] : []
  const wikis = assignedSlugs.length ? await prisma.wiki.findMany({
    where: { slug: { in: assignedSlugs }, isPublished: true },
    orderBy: { displayName: 'asc' },
    select: { slug: true, displayName: true },
  }) : []
  const initials = (user.name?.trim() || user.email).split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <header className="fixed inset-x-0 top-0 z-40 flex h-[68px] items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link href="/home"><Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={150} height={44} priority className="h-11 w-auto" /></Link>
        <div className="ml-auto flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] text-sm font-bold text-white">
          {user.avatarUrl ? <Image src={user.avatarUrl} alt={user.name || user.email} width={36} height={36} className="h-full w-full object-cover" /> : initials}
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-white/10 bg-[#1A1110] px-4 py-5 text-white lg:flex">
        <Link href="/home" className="flex h-14 items-center px-2"><Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={176} height={50} priority className="h-12 w-auto" /></Link>
        <p className="mt-6 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Workspace</p>
        <nav className="mt-2 space-y-1">
          <Link href="/home" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold text-white/60 transition hover:bg-white/[0.07] hover:text-white"><Home size={18} /> Home</Link>
          <Link href="/teacher" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold text-white/60 transition hover:bg-white/[0.07] hover:text-white"><Layout size={18} /> My classes</Link>
          <Link href="/teacher/tracks" className="flex items-center gap-3 rounded-xl bg-[#F0523F] px-3.5 py-3 text-[15px] font-semibold text-white shadow-[0_12px_28px_-16px_rgba(240,82,63,.9)]"><Route size={18} /> Tracks</Link>
        </nav>
        <p className="mt-7 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Assigned classes</p>
        <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {wikis.length === 0 ? <p className="px-3 py-3 text-sm leading-5 text-white/40">No classes assigned yet.</p> : wikis.map((wiki) => (
            <Link key={wiki.slug} href={`/${wiki.slug}`} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white/50 transition hover:bg-white/[0.06] hover:text-white"><span className="h-2 w-2 shrink-0 rounded-full bg-white/20" /><span className="truncate">{wiki.displayName}</span></Link>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
          <div className="flex items-center gap-3 p-1.5"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] text-sm font-bold text-white">{user.avatarUrl ? <Image src={user.avatarUrl} alt={user.name || user.email} width={36} height={36} className="h-full w-full object-cover" /> : initials}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user.name || user.email}</p><p className="truncate text-xs text-white/40">{user.email}</p></div></div>
          <SignOutButton iconSize={16} className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/50 transition hover:bg-white/[0.06] hover:text-white">Sign out</SignOutButton>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-2xl border border-black/10 bg-[#1A1110]/95 p-1.5 shadow-2xl backdrop-blur lg:hidden">
        <Link href="/home" className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold text-white/55"><Home size={17} />Home</Link>
        <Link href="/teacher" className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold text-white/55"><Layout size={17} />Classes</Link>
        <Link href="/teacher/tracks" className="flex flex-col items-center gap-1 rounded-xl bg-[#F0523F] py-2 text-[10px] font-bold text-white"><Route size={17} />Tracks</Link>
        <SignOutButton iconSize={17} className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold text-white/55">Sign out</SignOutButton>
      </nav>

      <main className="w-full px-4 pb-28 pt-[92px] sm:px-6 lg:ml-[272px] lg:w-[calc(100%-272px)] lg:px-10 lg:pb-16 lg:pt-10"><div className="mx-auto max-w-[1180px]"><TrackManager audience={user.role === 'admin' ? 'admin' : 'teacher'} /></div></main>
    </div>
  )
}
