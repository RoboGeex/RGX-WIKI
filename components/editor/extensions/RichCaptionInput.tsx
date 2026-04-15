import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { Link2, Unlock, X } from 'lucide-react'
import './SafeBubbleMenu'

// Basic text colors matching the main editor
const textColors = ['#000000', '#475569', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']
const highlightColors = ['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecdd3']

interface Props {
    initialContent: string
    onChange: (html: string) => void
    onCommit?: (html: string) => void
    onFocusChange?: (focused: boolean) => void
    placeholder?: string
    className?: string
}

export function RichCaptionInput({ initialContent, onChange, onCommit, onFocusChange, placeholder = 'Add a caption...', className = '' }: Props) {
    const [isFocused, setIsFocused] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                bulletList: false,
                orderedList: false,
                blockquote: false,
                codeBlock: false,
                horizontalRule: false,
                link: false,
                underline: false,
            }),
            Underline,
            Link.configure({ openOnClick: false }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-gray-400 before:pointer-events-none before:italic',
            }),
        ],
        content: initialContent || '',
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            // Clean empty wrapper tags if they exist
            const html = editor.getHTML()
            if (html === '<p></p>') {
                onChange('')
            } else {
                onChange(html)
            }
        },
        onFocus: () => {
            setIsFocused(true)
            onFocusChange?.(true)
        },
        onBlur: ({ editor }) => {
            setIsFocused(false)
            onFocusChange?.(false)
            const html = editor.getHTML()
            onCommit?.(html === '<p></p>' ? '' : html)
        },
    })

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Explicitly destroy the Tiptap editor when this React component unmounts.
    // Without this, when ProseMirror tears down the containing node view,
    // the still-running editor tries to access DOM nodes React is also cleaning up,
    // causing "Cannot read properties of undefined (reading 'destroy')" crashes.
    useEffect(() => {
        return () => {
            if (editor && !editor.isDestroyed) {
                editor.destroy()
            }
        }
    }, [editor])


    useEffect(() => {
        if (!editor || editor.isFocused) return

        // Normalize both values to treat empty states ( "" and "<p></p>" ) as identical
        const currentHtml = editor.getHTML()
        const normalizedInitial = (initialContent === '<p></p>' || !initialContent) ? '' : initialContent
        const normalizedCurrent = currentHtml === '<p></p>' ? '' : currentHtml

        if (normalizedInitial !== normalizedCurrent) {
            editor.commands.setContent(initialContent || '')
        }
    }, [initialContent, editor])

    if (!editor) return null

    const promptForLink = () => {
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL:', previousUrl)
        if (url === null) return
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    return (
        <div className={`relative w-full group ${className}`} onMouseDown={(e) => e.stopPropagation()}>
            {editor && isMounted && (
                <BubbleMenu
                    editor={editor}
                    className="flex items-center gap-0.5 p-1 rounded-xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl"
                >
                    <button type="button" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700 font-bold text-sm min-w-[28px]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); editor.chain().focus().toggleBold().run() }}>B</button>
                    <button type="button" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700 italic text-sm min-w-[28px]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); editor.chain().focus().toggleItalic().run() }}>I</button>
                    <button type="button" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700 underline text-sm min-w-[28px]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); editor.chain().focus().toggleUnderline().run() }}>U</button>
                    <div className="w-[1px] h-4 bg-gray-300 mx-1" />
                    <button type="button" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); promptForLink() }} title="Add link"><Link2 size={14} /></button>
                    <button type="button" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); editor.chain().focus().unsetLink().run() }} title="Remove link"><Unlock size={14} /></button>
                </BubbleMenu>
            )}

            <div
                className={`w-full text-center text-xs text-gray-500 bg-transparent border rounded px-2 py-0.5 outline-none transition-colors border-transparent hover:border-gray-200 ${isFocused ? 'border-primary ring-1 ring-primary' : ''} overflow-hidden leading-tight`}
                onKeyDown={(e) => {
                    // Stop tiptap parent editor from catching keystrokes
                    e.stopPropagation()
                    if (e.key === 'Enter') {
                        e.preventDefault()
                        const html = editor.getHTML()
                        onCommit?.(html === '<p></p>' ? '' : html)
                        editor.commands.blur()
                    }
                }}
            >
                <EditorContent
                    editor={editor}
                    className="tiptap-caption-editor w-full text-center [&_.tiptap]:w-full [&_.tiptap]:text-center [&_.tiptap]:!min-h-0 [&_.tiptap]:!p-0 [&_.tiptap]:outline-none [&_p]:text-center [&_p]:w-full [&_p]:m-0"
                />
            </div>
        </div>
    )
}
