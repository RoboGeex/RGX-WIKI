import dynamic from 'next/dynamic'

const WikiEditor = dynamic(() => import('@/components/editor/Editor'), { ssr: false })

export default function EditorPage() {
  return <WikiEditor />
}