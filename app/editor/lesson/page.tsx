import dynamic from 'next/dynamic'
import AdminNavbar from '@/components/admin-navbar'
import EditorAuthGate from '@/components/editor/EditorAuthGate'

const WikiEditor = dynamic(() => import('@/components/editor/Editor'), { ssr: false })

export default function EditorLessonPage() {
  return (
    <EditorAuthGate>
      <div className="min-h-screen bg-[#eef2f1]">
        <WikiEditor />
      </div>
    </EditorAuthGate>
  )
}
