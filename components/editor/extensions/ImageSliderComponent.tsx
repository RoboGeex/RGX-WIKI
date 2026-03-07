import { NodeViewWrapper } from '@tiptap/react'
import React, { useState, useEffect, useRef, memo } from 'react'
import { ChevronLeft, ChevronRight, Trash2, LayoutGrid, Check, GripVertical, Plus, Loader2, RefreshCw } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { ImageSlideData } from './ImageSlider'
import { RichCaptionInput } from './RichCaptionInput'

// Sortable Image Item Component
const SortableImageItem = memo(function SortableImageItem(props: { id: string; item: ImageSlideData; index: number; onRemove: () => void; onReplace: (newUrl: string) => void; onCaptionChange: (newCaption: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const [isReplacing, setIsReplacing] = useState(false)
  const [localCaption, setLocalCaption] = useState(props.item.caption || '')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setLocalCaption(props.item.caption || '')
  }, [props.item.caption])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    if (localCaption !== props.item.caption) {
      props.onCaptionChange(localCaption)
    }
  }

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsReplacing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const urlParams = new URLSearchParams(window.location.search)
      const wikiSlug = urlParams.get('wiki')
      if (wikiSlug) formData.append('wikiSlug', wikiSlug)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      props.onReplace(data.url)
    } catch {
      alert('Failed to replace image')
    } finally {
      setIsReplacing(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={setNodeRef}
        style={style}
        className={`relative aspect-square rounded-xl overflow-hidden border-2 border-transparent shadow-sm bg-slate-100 group transition-all duration-200`}
      >
        <img src={props.item.url} alt={`Slide ${props.index + 1}`} className="w-full h-full object-cover" />

        {/* Drag Handle Overlay */}
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors cursor-grab active:cursor-grabbing flex items-center justify-center"
        >
          <div className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 rounded-full shadow-sm text-slate-700 transition-opacity">
            <GripVertical size={20} />
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            props.onRemove()
          }}
          className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all shadow-sm z-10"
          title="Remove image"
          type="button"
        >
          <Trash2 size={14} />
        </button>

        {/* Replace Button */}
        <label
          className={`absolute bottom-2 right-2 p-1.5 bg-blue-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-500 transition-all shadow-sm z-10 cursor-pointer ${isReplacing ? 'pointer-events-none opacity-70' : ''}`}
          title="Replace image"
        >
          {isReplacing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          <input type="file" accept="image/*" className="hidden" onChange={handleReplace} disabled={isReplacing} />
        </label>

        {/* Index Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-md pointer-events-none">
          {props.index + 1}
        </div>
      </div>

      {/* Individual Caption Input */}
      <div className="w-full relative z-10">
        <RichCaptionInput
          initialContent={localCaption}
          onChange={(html) => {
            setLocalCaption(html)
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = setTimeout(() => {
              props.onCaptionChange(html)
            }, 1000)
          }}
          onBlur={handleBlur}
          placeholder="Add caption..."
          className="max-w-none text-xs"
        />
      </div>
    </div>
  )
})

export default function ImageSliderComponent(props: any) {
  // Normalize images on load
  const images: ImageSlideData[] = (props.node.attrs.images || []).map((img: any) => {
    if (typeof img === 'string') return { url: img, caption: '' }
    return img
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isReordering, setIsReordering] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null) // State for dragging overlay
  const [isUploading, setIsUploading] = useState(false)

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Removed global caption useEffect and handleBlur

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return

    setIsUploading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        // Try to get wikiSlug from URL if available
        const urlParams = new URLSearchParams(window.location.search)
        const wikiSlug = urlParams.get('wiki')
        if (wikiSlug) {
          formData.append('wikiSlug', wikiSlug)
        }

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || `Upload failed (${res.status})`)
        }
        const data = await res.json()
        return data.url
      })

      const results = await Promise.allSettled(uploadPromises)
      const successUrls = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map(r => r.value)

      const failCount = results.filter(r => r.status === 'rejected').length

      if (successUrls.length > 0) {
        const newItems = successUrls.map(url => ({ url, caption: '' }))
        props.updateAttributes({ images: [...images, ...newItems] })
      }

      if (failCount > 0) {
        alert(`${failCount} image(s) couldn't be uploaded. The rest were added successfully.`)
      }
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Failed to upload images')
    } finally {
      setIsUploading(false)
      // reset input
      e.target.value = ''
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event

    if (over && active.id !== over.id) {
      const activeIndex = images.findIndex((img) => img.url === active.id)
      const overIndex = images.findIndex((img) => img.url === over.id)

      if (activeIndex !== -1 && overIndex !== -1) {
        const newImages = arrayMove(images, activeIndex, overIndex)
        props.updateAttributes({ images: newImages })

        // Adjust currentIndex if necessary so the same image stays selected, 
        // or just reset to the dragged image's new position
        setCurrentIndex(overIndex)
      }
    }
  }

  if (!images.length) return <NodeViewWrapper className="image-slider-wrapper p-4 bg-slate-50 rounded border border-slate-200 text-slate-400 text-center text-sm">No images in slider</NodeViewWrapper>

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)


  const removeImage = (indexToRemove: number) => {
    const newImages = images.filter((_: any, i: number) => i !== indexToRemove)
    if (newImages.length === 0) {
      if (typeof props.deleteNode === 'function') {
        props.deleteNode()
      }
      return
    }
    props.updateAttributes({ images: newImages })
    if (currentIndex >= newImages.length) {
      setCurrentIndex(newImages.length - 1)
    } else if (currentIndex === indexToRemove) {
      // If we removed the currently viewed image, but there are images after it, the currentIndex is naturally fine
    } else if (currentIndex > indexToRemove) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const removeCurrentImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    removeImage(currentIndex)
  }

  return (
    <NodeViewWrapper className="image-slider-wrapper relative group select-none flex flex-col items-center space-y-3 my-6">
      {/* Main View Area */}
      {isReordering ? (
        <div className="w-full max-w-[720px] bg-white rounded-2xl border border-gray-200 p-4 shadow-sm min-h-[462px]">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Reorder Images</h3>
            <div className="flex items-center gap-2">
              <label className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors ${isUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'}`}>
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {isUploading ? 'Uploading...' : 'Add Image(s)'}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={isUploading}
                />
              </label>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsReordering(false); }}
                className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-lg flex items-center gap-1.5 text-sm font-medium"
                type="button"
              >
                <Check size={16} /> Done Reordering
              </button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map(img => img.url)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((item: ImageSlideData, index: number) => (
                  <SortableImageItem
                    key={item.url}
                    id={item.url}
                    item={item}
                    index={index}
                    onRemove={() => removeImage(index)}
                    onReplace={(newUrl: string) => {
                      const newImages = [...images]
                      newImages[index] = { ...newImages[index], url: newUrl }
                      props.updateAttributes({ images: newImages })
                    }}
                    onCaptionChange={(newCaption) => {
                      const newImages = [...images]
                      newImages[index] = { ...newImages[index], caption: newCaption }
                      props.updateAttributes({ images: newImages })
                    }}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-primary shadow-2xl scale-105 bg-slate-100 z-50 cursor-grabbing">
                  <img
                    src={activeId}
                    alt="Dragging Slide"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="inline-flex flex-col w-full max-w-[720px] mx-auto">
          <div
            className={`relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-white not-prose shadow-md ${
              props.node.attrs.layoutMode === '1:1' ? 'aspect-square' :
              props.node.attrs.layoutMode === '3:4' ? 'aspect-[3/4]' :
              props.node.attrs.layoutMode === '2:3' ? 'aspect-[2/3]' :
              props.node.attrs.layoutMode === '16:9' ? 'aspect-video' :
              ''
            }`}
            style={(!props.node.attrs.layoutMode || props.node.attrs.layoutMode === 'fit') ? { display: 'grid', gridTemplateAreas: '"stack"', fontSize: 0, lineHeight: 0 } : {}}
          >
            {/* All images stacked in the same grid cell — the tallest/widest one sizes the container */}
            {images.map((img: any, idx: number) => {
              const isActive = idx === currentIndex

              return (
                <div
                  key={idx}
                  style={(!props.node.attrs.layoutMode || props.node.attrs.layoutMode === 'fit') ? { gridArea: 'stack', fontSize: 0, lineHeight: 0 } : {}}
                  className={`w-full flex items-center justify-center !m-0 !p-0 ${isActive ? 'visible opacity-100 z-10' : 'invisible opacity-0 pointer-events-none z-0'} ${
                    (props.node.attrs.layoutMode === '1:1' || props.node.attrs.layoutMode === '3:4' || props.node.attrs.layoutMode === '2:3' || props.node.attrs.layoutMode === '16:9') ? 'absolute inset-0 h-full' : ''
                  }`}
                  aria-hidden={!isActive}
                >
                  <img
                    src={img.url}
                    alt={img.caption || `Slide ${idx + 1}`}
                    className={`block w-full pointer-events-none !m-0 !p-0 ${
                      (props.node.attrs.layoutMode === '1:1' || props.node.attrs.layoutMode === '3:4' || props.node.attrs.layoutMode === '2:3' || props.node.attrs.layoutMode === '16:9') ? 'h-full object-cover' : 'h-auto object-cover'
                    }`}
                    style={{ display: 'block', margin: 0, padding: 0 }}
                  />
                </div>
              )
            })}

            {/* Removed active caption overlay from here */}

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-20"
                  type="button"
                  title="Previous"
                >
                  <ChevronLeft size={20} className="text-slate-700" />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-20"
                  type="button"
                  title="Next"
                >
                  <ChevronRight size={20} className="text-slate-700" />
                </button>

                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 p-1 rounded-full bg-black/10 backdrop-blur-[2px]">
                  {images.map((_: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex(idx); }}
                      className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'}`}
                      type="button"
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

              </>
            )}

            {/* Editor Controls */}
            {props.editor?.isEditable && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsReordering(true); }}
                  className="px-2.5 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors flex items-center gap-1.5 text-sm font-medium mr-2"
                  title="Reorder images in grid"
                  type="button"
                >
                  <LayoutGrid size={16} />
                  Reorder
                </button>

                <div className="flex bg-black/50 backdrop-blur-sm rounded-lg p-0.5 ml-2 border border-white/10">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.updateAttributes({ layoutMode: 'fit' }); }}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${(!props.node.attrs.layoutMode || props.node.attrs.layoutMode === 'fit') ? 'bg-white text-black shadow-sm' : 'text-white hover:bg-white/20'}`}
                    type="button"
                  >
                    Fit
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.updateAttributes({ layoutMode: '1:1' }); }}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${props.node.attrs.layoutMode === '1:1' ? 'bg-white text-black shadow-sm' : 'text-white hover:bg-white/20'}`}
                    type="button"
                  >
                    1:1
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.updateAttributes({ layoutMode: '3:4' }); }}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${props.node.attrs.layoutMode === '3:4' ? 'bg-white text-black shadow-sm' : 'text-white hover:bg-white/20'}`}
                    type="button"
                  >
                    3:4
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.updateAttributes({ layoutMode: '2:3' }); }}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${props.node.attrs.layoutMode === '2:3' ? 'bg-white text-black shadow-sm' : 'text-white hover:bg-white/20'}`}
                    type="button"
                  >
                    2:3
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.updateAttributes({ layoutMode: '16:9' }); }}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${props.node.attrs.layoutMode === '16:9' ? 'bg-white text-black shadow-sm' : 'text-white hover:bg-white/20'}`}
                    type="button"
                  >
                    16:9
                  </button>
                </div>
                <button
                  onClick={removeCurrentImage}
                  className="p-1.5 bg-red-500/80 backdrop-blur-sm rounded text-white hover:bg-red-500 transition-colors ml-2"
                  title="Delete photo"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Active caption displayed as a standard figure caption below the box */}
          {images[currentIndex]?.caption && (
            <div
              className="mt-1 pb-2 w-full text-base text-gray-600 text-center [&_p]:m-0 [&_p]:!text-base [&_p]:!text-gray-600 [&_p]:!leading-tight"
              dangerouslySetInnerHTML={{ __html: images[currentIndex].caption }}
            />
          )}
        </div>
      )}

      {/* Removed Global Caption Input */}
    </NodeViewWrapper>
  )
}

