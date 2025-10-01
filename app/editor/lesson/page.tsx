import dynamic from 'next/dynamic'
import AdminNavbar from '@/components/admin-navbar'

const WikiEditor = dynamic(() => import('@/components/editor/Editor'), { ssr: false })

export default function EditorLessonPage() {
  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <AdminNavbar />
      <div className="pt-16">
        <WikiEditor />
      </div>
    </div>
  )
}
