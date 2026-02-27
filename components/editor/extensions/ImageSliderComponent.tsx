import { NodeViewWrapper } from '@tiptap/react'
import React, { useState, useEffect, memo } from 'react'
import { ChevronLeft, ChevronRight, Trash2, LayoutGrid, Check, GripVertical, Plus, Loader2 } from 'lucide-react'
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

// Sortable Image Item Component
const SortableImageItem = memo(function SortableImageItem(props: { id: string; item: ImageSlideData; index: number; onRemove: () => void; onCaptionChange: (newCaption: string) => void }) {
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
    opacity: isDragging ? 0.3 : 1, // Reduced opacity for original item while dragging
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

        {/* Index Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-xs font-medium rounded-md pointer-events-none">
          {props.index + 1}
        </div>
      </div>

      {/* Individual Caption Input */}
      <input
        type="text"
        className="w-full text-xs text-gray-600 bg-transparent border border-transparent hover:border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded px-2 py-1 outline-none transition-colors placeholder:text-gray-400"
        placeholder="Add caption..."
        value={props.item.caption || ''}
        onChange={(e) => props.onCaptionChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
          e.stopPropagation()
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />
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
        <div className="inline-flex w-full max-w-[720px]">
          <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white flex items-center justify-center" style={{ height: '462px' }}>
            {/* Current Image */}
            <img
              src={images[currentIndex]?.url}
              alt={images[currentIndex]?.caption || `Slide ${currentIndex + 1}`}
              className="block h-full w-full object-contain pointer-events-none"
            />

            {/* Display active caption overlay if present */}
            {images[currentIndex]?.caption && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[80%] px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg text-white text-sm text-center">
                {images[currentIndex].caption}
              </div>
            )}

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-10"
                  type="button"
                  title="Previous"
                >
                  <ChevronLeft size={20} className="text-slate-700" />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-10"
                  type="button"
                  title="Next"
                >
                  <ChevronRight size={20} className="text-slate-700" />
                </button>

                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 p-1 rounded-full bg-black/10 backdrop-blur-[2px]">
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

                {/* Counter */}
                <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs text-white font-medium">
                  {currentIndex + 1} / {images.length}
                </div>
              </>
            )}

            {/* Editor Controls */}
            {props.editor?.isEditable && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsReordering(true); }}
                  className="px-2.5 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white hover:bg-black/70 transition-colors flex items-center gap-1.5 text-sm font-medium mr-2"
                  title="Reorder images in grid"
                  type="button"
                >
                  <LayoutGrid size={16} />
                  Reorder
                </button>


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
        </div>
      )}

      {/* Removed Global Caption Input */}
    </NodeViewWrapper>
  )
}

