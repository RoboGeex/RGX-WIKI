import EditorAuthGate from '@/components/editor/EditorAuthGate'

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <EditorAuthGate>{children}</EditorAuthGate>
}
