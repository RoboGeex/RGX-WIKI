import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Palette, Bold, Italic, Underline } from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
}

const colorPalette = [
  '#000000', '#374151', '#DC2626', '#EA580C', '#D97706',
  '#65A30D', '#059669', '#0891B2', '#2563EB', '#7C3AED',
  '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'
]

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
  })

  if (!editor) {
    return <div className="flex items-center justify-center p-8">Loading editor...</div>
  }

  const applyColor = (color: string) => {
    editor.chain().focus().setColor(color).run()
  }

  const toggleBold = () => {
    editor.chain().focus().toggleBold().run()
  }

  const toggleItalic = () => {
    editor.chain().focus().toggleItalic().run()
  }

  const toggleUnderline = () => {
    editor.chain().focus().toggleUnderline().run()
  }

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        {/* Formatting buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleBold}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('bold') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : ''
            }`}
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={toggleItalic}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('italic') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : ''
            }`}
            title="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={toggleUnderline}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('underline') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : ''
            }`}
            title="Underline"
          >
            <Underline size={16} />
          </button>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-2 ml-4">
          <Palette size={16} className="text-gray-500" />
          <div className="flex gap-1">
            {colorPalette.map((color) => (
              <button
                key={color}
                onClick={() => applyColor(color)}
                className="w-6 h-6 rounded border-2 border-white shadow-sm hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={`Apply ${color}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  )
}