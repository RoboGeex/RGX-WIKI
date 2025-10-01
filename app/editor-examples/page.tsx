import Link from 'next/link'

export default function EditorExamplesPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">Editor URL Examples</h1>
        <p className="text-sm text-gray-600">
          Examples of how to open the editor directly with URL parameters, bypassing the properties page.
        </p>
      </header>

      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Examples</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Create new lesson with wiki only:</h3>
              <Link 
                href="/editor?wiki=student-kit" 
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                /editor?wiki=student-kit
              </Link>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Create lesson with wiki and title:</h3>
              <Link 
                href="/editor?wiki=student-kit&title=My New Lesson" 
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                /editor?wiki=student-kit&title=My New Lesson
              </Link>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Create lesson with all parameters:</h3>
              <Link 
                href="/editor/lesson?wiki=student-kit&slug=my-lesson&id=my-lesson&title=My New Lesson" 
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                /editor?wiki=student-kit&slug=my-lesson&id=my-lesson&title=My New Lesson
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Parameters</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">wiki</code>
              <div>
                <p className="text-sm text-gray-700">Wiki slug (e.g., "student-kit", "osama-kanan")</p>
                <p className="text-xs text-gray-500">Required to specify which wiki the lesson belongs to</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">kit</code>
              <div>
                <p className="text-sm text-gray-700">Kit slug (alternative to wiki parameter)</p>
                <p className="text-xs text-gray-500">Can be used instead of wiki parameter</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">slug</code>
              <div>
                <p className="text-sm text-gray-700">Lesson slug (URL-friendly identifier)</p>
                <p className="text-xs text-gray-500">Will be auto-generated from title if not provided</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">id</code>
              <div>
                <p className="text-sm text-gray-700">Lesson ID (unique identifier)</p>
                <p className="text-xs text-gray-500">Will be auto-generated from slug if not provided</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">title</code>
              <div>
                <p className="text-sm text-gray-700">Lesson title (English)</p>
                <p className="text-xs text-gray-500">Will be used as the initial heading in the editor</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">How It Works</h2>
          <div className="space-y-3 text-sm text-blue-800">
            <p>• The editor now checks for URL parameters first before redirecting to properties</p>
            <p>• If URL parameters are found, they create lesson metadata automatically</p>
            <p>• The metadata is stored in sessionStorage for persistence</p>
            <p>• You can still use the properties page for more detailed configuration</p>
            <p>• This allows for direct links to the editor with pre-configured lesson data</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Integration Examples</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p><strong>From Dashboard:</strong> Add "Edit" buttons that link directly to the editor</p>
            <p><strong>From External Links:</strong> Share direct editor links with pre-filled content</p>
            <p><strong>From API:</strong> Generate editor URLs programmatically with lesson data</p>
            <p><strong>From Templates:</strong> Create lesson templates with pre-configured metadata</p>
          </div>
        </div>
      </div>
    </div>
  )
}
