import { NodeViewWrapper } from '@tiptap/react'
import { X } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

const normalizeTags = (value: any): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag) => tag.length > 0)
}

export default function TagBlockComponent(props: any) {
  const { node, updateAttributes, editor, deleteNode } = props
  const isEditable = !!editor?.isEditable
  const tags = useMemo(() => normalizeTags(node.attrs?.tags), [node.attrs?.tags])

  const [title, setTitle] = useState(typeof node.attrs?.title === 'string' ? node.attrs.title : '')
  const [pendingTag, setPendingTag] = useState('')

  useEffect(() => {
    setTitle(typeof node.attrs?.title === 'string' ? node.attrs.title : '')
  }, [node.attrs?.title])

  const commitTitle = () => {
    const nextTitle = (title || '').trim()
    if (nextTitle !== node.attrs?.title) {
      updateAttributes({ title: nextTitle })
    }
    if (nextTitle !== title) setTitle(nextTitle)
  }

  const addTag = () => {
    const value = pendingTag.trim()
    if (!value) return
    updateAttributes({ tags: [...tags, value.toUpperCase()] })
    setPendingTag('')
  }

  const removeTag = (index: number) => {
    updateAttributes({ tags: tags.filter((_, i) => i !== index) })
  }

  return (
    <NodeViewWrapper className="tag-block-node media-node-block my-6 rounded-xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
      <div className="flex flex-col gap-3">
        {isEditable ? (
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={commitTitle}
            placeholder="Add title"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitTitle()
              }
            }}
            className="w-full bg-transparent text-xl md:text-2xl font-semibold tracking-wide text-gray-900 uppercase outline-none"
          />
        ) : (
          <p className="m-0 text-xl md:text-2xl font-semibold tracking-wide text-gray-900 uppercase">{title}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-sm border border-[#c9d3d8] bg-[#eef3f5] px-2.5 py-1.5 text-sm md:text-base font-medium uppercase tracking-[0.02em] text-[#2f363d]"
            >
              <span>{tag}</span>
              {isEditable ? (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="rounded p-0.5 text-[#5c6670] hover:bg-white/80"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </span>
          ))}
        </div>

        {isEditable ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={pendingTag}
              placeholder="Add tag"
              onChange={(event) => setPendingTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault()
                  addTag()
                }
              }}
              className="min-w-[12rem] rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-300"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Add Tag
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof deleteNode === 'function') deleteNode()
              }}
              className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Remove Block
            </button>
          </div>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}
