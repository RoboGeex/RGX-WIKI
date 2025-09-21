import { useState } from 'react'
import RichTextEditor from '@/components/rich-text-editor'

export default function EditorTestPage() {
  const [content, setContent] = useState(`
    <p><strong>Welcome to the Rich Text Editor!</strong></p>
    <p>Select some text and click on a color button above to change its color.</p>
    <p>You can also use <em>bold</em>, <u>underline</u>, and <em><u>both</u></em> formatting.</p>
    <blockquote>
      <p>This is a blockquote that can also have <span style="color: #DC2626">colored text</span>!</p>
    </blockquote>
  `)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Rich Text Editor Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the color functionality by selecting text and clicking on color buttons.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Editor
            </h2>
            <RichTextEditor
              content={content}
              onChange={setContent}
            />
          </div>

          {/* Preview */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Live Preview
            </h2>
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-6 min-h-[400px]">
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How to Test Color Functionality:
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
            <li>Select some text in the editor</li>
            <li>Click on any color button in the toolbar</li>
            <li>The selected text should change color immediately</li>
            <li>Check the live preview to see the colored text</li>
          </ol>
        </div>
      </div>
    </div>
  )
}