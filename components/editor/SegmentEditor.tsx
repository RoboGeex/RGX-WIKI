'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Segment, 
  ListItem,
  createSegment, 
  updateEnglishContent, 
  updateArabicContent,
  highlightChanges,
  convertBodyToSegments,
  convertSegmentsToBody,
  getListMarker 
} from '@/lib/segment-types'
import SegmentTiptapEditor from './SegmentTiptapEditor'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Check, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  Type,
  AlignLeft,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Save,
  RefreshCw,
  Film,
  Video,
  Grid3X3,
  GripVertical,
  ArrowLeft,
  ExternalLink,
  History,
  Layout,
  Settings,
  Eye,
  Globe,
  Tag,
  Minus,
  GalleryHorizontal
} from 'lucide-react'
import { Outfit } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'] })

// dnd-kit imports
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
  defaultDropAnimationSideEffects,
  DropAnimation,
  defaultDropAnimation,
  useDndContext
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

// Helper for heading styles (matching Editor.tsx)
const getHeadingClass = (level: number) => {
  switch (level) {
    case 1: return 'text-4xl font-bold mt-4 mb-4' // Slightly reduced top margin for card context
    case 2: return 'text-3xl font-semibold mt-3 mb-3'
    case 3: return 'text-2xl font-semibold mt-2 mb-2'
    default: return 'text-xl font-medium mt-2 mb-2'
  }
}

interface SegmentEditorProps {
  lessonId: string
  wikiSlug: string
  initialBody?: any[]
  onSave?: (segments: Segment[]) => Promise<void>
  isOwner?: boolean
  isAdmin?: boolean
  onPublish?: () => Promise<void>
  lessonSlug?: string
  previewBaseUrl?: string
}

type SegmentType = Segment['type']

const SEGMENT_TYPE_OPTIONS: { value: SegmentType; label: string; icon: React.ReactNode }[] = [
  { value: 'paragraph', label: 'Paragraph', icon: <AlignLeft size={18} /> },
  { value: 'heading', label: 'Heading', icon: <Heading1 size={18} /> },
  { value: 'list', label: 'List', icon: <List size={18} /> },
  { value: 'image', label: 'Image', icon: <ImageIcon size={18} /> },
  { value: 'imageSlider', label: 'Image Slider', icon: <GalleryHorizontal size={18} /> },
  { value: 'callout', label: 'Callout', icon: <Quote size={18} /> },
  { value: 'video', label: 'Video', icon: <Film size={18} /> },
  { value: 'table', label: 'Table', icon: <Grid3X3 size={18} /> },
  { value: 'horizontalRule', label: 'Separator', icon: <Minus size={18} /> },
]

// Sortable Item Wrapper
const SortableItem = ({ 
  id, 
  children,
  isParent
}: { 
  id: string, 
  children: (props: { 
    dragHandleProps: any, 
    isDragging: boolean,
    attributes: any,
    listeners: any
  }) => React.ReactNode,
  isParent: boolean
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition, // Re-enabled for smooth sorting
    fontSize: undefined, // Prevent font scaling
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0 : 1, // Hide the original during overlay
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: listeners, isDragging, attributes, listeners })}
    </div>
  )
}

// Reusable Header Component
const SegmentTileHeader = ({ 
  segment, 
  index, 
  isParent, 
  isExpanded,
  onToggle, 
  dragHandleProps,
  statusBadge,
  actionButtons,
  titleNode,
  customClass
}: { 
  segment: Segment, 
  index: number, 
  isParent: boolean, 
  isExpanded: boolean,
  onToggle: () => void,
  dragHandleProps?: any,
  statusBadge?: React.ReactNode,
  actionButtons?: React.ReactNode,
  titleNode?: React.ReactNode,
  customClass?: string
}) => {
  return (
    <div 
      className={`flex items-center justify-between px-5 py-4 cursor-pointer group ${
        isParent 
          ? 'bg-slate-900 text-white hover:bg-slate-800' 
          : 'bg-white border-b border-slate-50 text-slate-900 hover:bg-slate-50'
      } ${customClass || ''}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div 
          {...dragHandleProps} 
          className={`cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-colors ${
            isParent 
              ? 'text-slate-500 hover:bg-white/10 hover:text-white' 
              : 'text-slate-300 hover:bg-slate-200 hover:text-slate-600'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={18} />
        </div>
        <span className={`text-[10px] font-bold w-6 tracking-wider transition-colors shrink-0 ${
          isParent 
            ? 'text-slate-400 group-hover:text-slate-300' 
            : 'text-slate-400 group-hover:text-slate-600'
        }`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        
        <div className={`p-1.5 rounded-lg transition-colors ${
          isParent ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          <SegmentTypeIcon segment={segment} isParent={isParent} />
        </div>

        <div className="flex-1 max-w-[300px] min-w-0" onClick={(e) => e.stopPropagation()}>
           {titleNode || (
             <span className={`text-sm font-bold truncate block ${isParent ? 'text-white' : 'text-slate-800'}`}>
               {segment.refTitle || (isParent ? "Untitled Section" : `${segment.type} block`)}
             </span>
           )}
        </div>
        {statusBadge}
      </div>
      
      {/* Right side actions */}
      <div className="flex items-center gap-3 shrink-0">
        {actionButtons}
        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown size={20} className={isParent ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600'} />
        </div>
      </div>
    </div>
  )
}

const SegmentOverlayContent = ({ segment, segments }: { segment: Segment, segments: Segment[] }) => {
  const { active } = useDndContext();
  const width = active?.rect.current.initial?.width;
  
  const isParent = segment.type === 'heading' && segment.level === 1;

  return (
    <div 
      className={`relative z-[100] pointer-events-none drop-shadow-2xl transition-none ${isParent ? '' : 'pl-12'}`} // pl-12 matches ml-12 if we consider padding
      style={{ width: width ? `${width}px` : '100%' }}
    >
      <div className={`bg-white border rounded-2xl overflow-hidden shadow-2xl ${
        isParent ? 'border-slate-800 ring-4 ring-slate-100' : 'border-slate-300'
      }`}>
        <SegmentTileHeader
          segment={segment}
          index={segments.findIndex(s => s.id === segment.id)}
          isParent={isParent}
          isExpanded={false}
          onToggle={() => {}}
          statusBadge={<StatusBadge segment={segment} />}
          customClass="pointer-events-none"
          actionButtons={(
            <>
              <div className={`p-2 rounded-xl border border-transparent ${isParent ? 'text-slate-500' : 'text-slate-300'}`}>
                <Type size={18} />
              </div>
              <div className={`p-2 rounded-xl border border-transparent ${isParent ? 'text-slate-500' : 'text-slate-300'}`}>
                <Trash2 size={18} />
              </div>
            </>
          )}
        />
      </div>
    </div>
  )
}

const StatusBadge = ({ segment }: { segment: Segment }) => {
  if (segment.needsUpdate) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight bg-amber-50 text-amber-600 border border-amber-200/50 uppercase shadow-sm animate-pulse">
        <AlertTriangle size={11} strokeWidth={2.5} />
        Update Required
      </span>
    )
  }
  if (segment.arabic && segment.arabicVersion >= segment.englishVersion) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight bg-emerald-50 text-emerald-600 border border-emerald-200/50 uppercase shadow-sm">
        <Check size={11} strokeWidth={2.5} />
        Live & Synced
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight bg-slate-100 text-slate-500 border border-slate-200 uppercase shadow-sm">
      Draft Version
    </span>
  )
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
  duration: 150,
  easing: 'ease-out',
};

const InsertionPoint = ({ onClick }: { onClick: () => void }) => (
  <div className="group/insert relative h-4 -my-2 z-10 flex items-center justify-center">
    <div className="absolute inset-x-0 h-px bg-slate-200 opacity-0 group-hover/insert:opacity-100 transition-opacity" />
    <button
      onClick={onClick}
      className="opacity-0 group-hover/insert:opacity-100 scale-90 group-hover/insert:scale-100 transition-all bg-white border border-slate-200 p-1.5 rounded-full shadow-lg text-slate-400 hover:text-primary hover:border-primary/30 z-20"
      title="Add segment here"
    >
      <Plus size={14} strokeWidth={3} />
    </button>
  </div>
)

const SegmentTypeIcon = ({ segment, isParent, className }: { segment: Segment, isParent: boolean, className?: string }) => {
  const size = 16;
  if (isParent) return <Heading1 size={size} className={className} />;
  
  switch (segment.type) {
    case 'paragraph': return <AlignLeft size={size} className={className} />;
    case 'heading': 
      if (segment.level === 2) return <Heading2 size={size} className={className} />;
      if (segment.level === 3) return <Heading3 size={size} className={className} />;
      return <Heading1 size={size} className={className} />;
    case 'list': return <List size={size} className={className} />;
    case 'image': return <ImageIcon size={size} className={className} />;
    case 'video': return <Film size={size} className={className} />;
    case 'table': return <Grid3X3 size={size} className={className} />;
    case 'callout': return <Quote size={size} className={className} />;
    case 'horizontalRule': return <Minus size={size} className={className} />;
    case 'imageSlider': return <GalleryHorizontal size={size} className={className} />;
    default: return <AlignLeft size={size} className={className} />;
  }
}

// Sortable Image Item
const SortableImage = ({ 
  url, 
  index, 
  onRemove 
}: { 
  url: string, 
  index: number, 
  onRemove: () => void 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: url })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="relative aspect-[4/3] group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 touch-none cursor-grab active:cursor-grabbing"
    >
      <img src={url} alt={`Slide ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
      
      {/* Order Badge */}
      <div className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 bg-black/60 text-white text-xs font-bold rounded-full shadow-sm backdrop-blur-sm z-10">
        {index + 1}
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute top-2 right-2 p-1.5 bg-red-100/90 text-red-600 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 z-10"
        title="Remove image"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// Image Slider Grid with Dnd
const ImageSliderGrid = ({ 
  images, 
  onReorder, 
  onRemove,
  children
}: { 
  images: string[], 
  onReorder: (newOrder: string[]) => void,
  onRemove: (index: number) => void,
  children?: React.ReactNode
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id) {
       const oldIndex = images.indexOf(active.id as string)
       const newIndex = images.indexOf(over?.id as string)
       onReorder(arrayMove(images, oldIndex, newIndex))
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((url, index) => (
            <SortableImage 
              key={url} 
              url={url} 
              index={index} 
              onRemove={() => onRemove(index)} 
            />
          ))}
          {children}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export default function SegmentEditor({ 
  lessonId, 
  wikiSlug, 
  initialBody, 
  onSave, 
  isOwner = false, 
  isAdmin = false, 
  onPublish,
  lessonSlug,
  previewBaseUrl
}: SegmentEditorProps) {
  const [segments, setSegments] = useState<Segment[]>([])
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set())
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [editingEnglish, setEditingEnglish] = useState<string | null>(null)
  const [editingArabic, setEditingArabic] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Initialize segments from body
  useEffect(() => {
    if (initialBody && initialBody.length > 0) {
      setSegments(convertBodyToSegments(initialBody))
    } else {
      // Start with one empty paragraph segment
      setSegments([createSegment('paragraph')])
    }
  }, [initialBody])

  const segmentsRef = useRef(segments)
  useEffect(() => {
    segmentsRef.current = segments
  }, [segments])

  // Count segments needing update
  const segmentsNeedingUpdate = segments.filter(s => s.needsUpdate).length

  // Check permissions on mount
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(true)

  useEffect(() => {
    // Determine strict authorization early
    // If not owner and not admin, you shouldn't be here
    if (!isOwner && !isAdmin) {
      setIsAuthorized(false)
      // Redirect to dashboard
      const dashboardUrl = `/editor/dashboard/${wikiSlug || 'student-kit'}`
      router.push(dashboardUrl)
    }
  }, [isOwner, isAdmin, wikiSlug, router])



  // Auto-save handler - Now stable!
  const scheduleAutoSave = useCallback(() => {
    if (!isOwner && !isAdmin) return; 

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      // Use ref to get latest segments without breaking dependency chain
      handleSave() 
    }, 2000)
  }, [isOwner, isAdmin])

  // Save handler - Now stable!
  const handleSave = useCallback(async () => {
    if (!isOwner && !isAdmin) {
      alert("You cannot save changes as you are not the owner.")
      return
    }

    setIsSaving(true)
    try {
      const currentSegments = segmentsRef.current
      if (onSave) {
        await onSave(currentSegments)
      }
      setLastSaved(new Date())
    } catch (error) {
      console.error('Save failed:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [onSave, isOwner, isAdmin])

  // Handle English text update
  const handleEnglishChange = useCallback((segmentId: string, newText: string) => {
    setSegments(prev => {
      // Check if this was a table segment that lost its table
      const currentSegment = prev.find(s => s.id === segmentId)
      if (currentSegment?.type === 'table' && !newText.includes('<table')) {
         // If table is gone, delete the segment
         return prev.filter(s => s.id !== segmentId)
      }
      
      return prev.map(seg => {
        if (seg.id === segmentId) {
          return updateEnglishContent(seg, newText)
        }
        return seg
      })
    })
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Handle Arabic text update
  const handleArabicChange = useCallback((segmentId: string, newText: string) => {
    setSegments(prev => {
      // Check if this was a table segment that lost its table
      const currentSegment = prev.find(s => s.id === segmentId)
      if (currentSegment?.type === 'table' && !newText.includes('<table')) {
         // If table is gone, delete the segment (defer to next tick or just filter out)
         // Better to just filter it out effectively "deleting" it
         return prev.filter(s => s.id !== segmentId)
      }

      return prev.map(seg => {
        if (seg.id === segmentId) {
          return updateArabicContent(seg, newText)
        }
        return seg
      })
    })
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Handle list item update (English)
  const handleListItemEnChange = useCallback((segmentId: string, index: number, value: string) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId && seg.type === 'list') {
        const items: ListItem[] = [...(seg.items_en || [])]
        items[index] = { ...items[index], text: value }
        const newEnglish = items.map(i => i.text).filter(Boolean).join('\n')
        return {
          ...seg,
          items_en: items,
          english: newEnglish,
          englishVersion: seg.englishVersion + 1,
          needsUpdate: seg.arabic.trim().length > 0,
          updatedAt: new Date().toISOString(),
        }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Handle list item update (Arabic)
  const handleListItemArChange = useCallback((segmentId: string, index: number, value: string) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId && seg.type === 'list') {
        const items: ListItem[] = [...(seg.items_ar || [])]
        items[index] = { ...items[index], text: value }
        const newArabic = items.map(i => i.text).filter(Boolean).join('\n')
        return {
          ...seg,
          items_ar: items,
          arabic: newArabic,
          arabicVersion: seg.englishVersion,
          needsUpdate: false,
          updatedAt: new Date().toISOString(),
        }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Manually confirm translation is synced
  const handleConfirmSync = useCallback((segmentId: string) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId) {
        return updateArabicContent(seg, seg.arabic)
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Handle heading level change
  const handleLevelChange = useCallback((segmentId: string, level: number) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId) {
        return { 
          ...seg, 
          level: level,
          updatedAt: new Date().toISOString() 
        }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const handleRefTitleChange = useCallback((segmentId: string, title: string) => {
    setSegments(prev => prev.map(seg => 
      seg.id === segmentId ? { ...seg, refTitle: title, updatedAt: new Date().toISOString() } : seg
    ))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Add list item
  const addListItem = useCallback((segmentId: string, lang: 'en' | 'ar') => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId && seg.type === 'list') {
        const newItem: ListItem = { text: '', indent: 0 }
        if (lang === 'en') {
          // Mirror structure to Arabic: append empty item to ar too
          return { 
            ...seg, 
            items_en: [...(seg.items_en || []), newItem],
            items_ar: [...(seg.items_ar || []), { ...newItem }] 
          }
        } else {
          return { ...seg, items_ar: [...(seg.items_ar || []), newItem] }
        }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Remove list item
  const removeListItem = useCallback((segmentId: string, lang: 'en' | 'ar', index: number) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId && seg.type === 'list') {
        if (lang === 'en') {
          const itemsEn = (seg.items_en || []).filter((_, i) => i !== index)
          const itemsAr = (seg.items_ar || []).filter((_, i) => i !== index)
          const finalItemsEn = itemsEn.length ? itemsEn : [{ text: '', indent: 0 }]
          const finalItemsAr = itemsAr.length ? itemsAr : (itemsEn.length ? [] : [{ text: '', indent: 0 }])
          
          return { 
            ...seg, 
            items_en: finalItemsEn, 
            items_ar: finalItemsAr,
            english: finalItemsEn.map(i => i.text).join('\n'),
            arabic: finalItemsAr.map(i => i.text).join('\n')
          }
        } else {
          const items = (seg.items_ar || []).filter((_, i) => i !== index)
          return { ...seg, items_ar: items, arabic: items.map(i => i.text).join('\n') }
        }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Move list item up
  const moveListItemUp = useCallback((segmentId: string, lang: 'en' | 'ar', index: number) => {
    if (index <= 0) return
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId && seg.type === 'list') {
        if (lang === 'en') {
          const itemsEn = [...(seg.items_en || [])]
          const itemsAr = [...(seg.items_ar || [])]
          
          // Swap English
          const tempEn = itemsEn[index]
          itemsEn[index] = itemsEn[index - 1]
          itemsEn[index - 1] = tempEn
          
          // Mirror Swap Arabic if exists
          if (itemsAr[index] && itemsAr[index-1]) {
            const tempAr = itemsAr[index]
            itemsAr[index] = itemsAr[index - 1]
            itemsAr[index - 1] = tempAr
          }
          
          return { 
            ...seg, 
            items_en: itemsEn, 
            items_ar: itemsAr,
            english: itemsEn.map(i => i.text).join('\n'),
            arabic: itemsAr.map(i => i.text).join('\n')
          }
        } else {
          const items = [...(seg.items_ar || [])]
          const temp = items[index]
          items[index] = items[index - 1]
          items[index - 1] = temp
          return { ...seg, items_ar: items, arabic: items.map(i => i.text).join('\n') }
        }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Move list item down
  const moveListItemDown = useCallback((segmentId: string, lang: 'en' | 'ar', index: number) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId && seg.type === 'list') {
        if (lang === 'en') {
          const itemsEn = [...(seg.items_en || [])]
          const itemsAr = [...(seg.items_ar || [])]
          if (index >= itemsEn.length - 1) return seg
          
          // Swap English
          const tempEn = itemsEn[index]
          itemsEn[index] = itemsEn[index + 1]
          itemsEn[index + 1] = tempEn
          
          // Mirror Swap Arabic
          if (itemsAr[index] && itemsAr[index + 1]) {
            const tempAr = itemsAr[index]
            itemsAr[index] = itemsAr[index + 1]
            itemsAr[index + 1] = tempAr
          }
          
          return { 
            ...seg, 
            items_en: itemsEn, 
            items_ar: itemsAr,
            english: itemsEn.map(i => i.text).join('\n'),
            arabic: itemsAr.map(i => i.text).join('\n')
          }
        } else {
          const items = [...(seg.items_ar || [])]
          if (index >= items.length - 1) return seg
          const temp = items[index]
          items[index] = items[index + 1]
          items[index + 1] = temp
          return { ...seg, items_ar: items, arabic: items.map(i => i.text).join('\n') }
        }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Indent list item (increase nesting level)
  const indentListItem = useCallback((segmentId: string, lang: 'en' | 'ar', index: number) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId && seg.type === 'list') {
        if (lang === 'en') {
          const itemsEn = [...(seg.items_en || [])]
          const itemsAr = [...(seg.items_ar || [])]
          
          if (itemsEn[index].indent < 3) {
            itemsEn[index] = { ...itemsEn[index], indent: itemsEn[index].indent + 1 }
            // Mirror indentation to Arabic
            if (itemsAr[index]) {
              itemsAr[index] = { ...itemsAr[index], indent: itemsEn[index].indent }
            }
          }
          return { ...seg, items_en: itemsEn, items_ar: itemsAr }
        } else {
          const items = [...(seg.items_ar || [])]
          if (items[index].indent < 3) {
            items[index] = { ...items[index], indent: items[index].indent + 1 }
          }
          return { ...seg, items_ar: items }
        }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Outdent list item (decrease nesting level)
  const outdentListItem = useCallback((segmentId: string, lang: 'en' | 'ar', index: number) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId && seg.type === 'list') {
        if (lang === 'en') {
          const itemsEn = [...(seg.items_en || [])]
          const itemsAr = [...(seg.items_ar || [])]
          
          if (itemsEn[index].indent > 0) {
            itemsEn[index] = { ...itemsEn[index], indent: itemsEn[index].indent - 1 }
            // Mirror indentation to Arabic
            if (itemsAr[index]) {
              itemsAr[index] = { ...itemsAr[index], indent: itemsEn[index].indent }
            }
          }
          return { ...seg, items_en: itemsEn, items_ar: itemsAr }
        } else {
          const items = [...(seg.items_ar || [])]
          if (items[index].indent > 0) {
            items[index] = { ...items[index], indent: items[index].indent - 1 }
          }
          return { ...seg, items_ar: items }
        }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Toggle list type (bulleted vs numbered)
  const toggleListType = useCallback((segmentId: string) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId && seg.type === 'list') {
        return { ...seg, ordered: !seg.ordered }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])



  // Handle image upload
  const handleImageUpload = useCallback(async (segmentId: string, file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (wikiSlug) {
        formData.append('wikiSlug', wikiSlug)
      }
      
      // Use existing upload API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const data = await response.json()
      
      setSegments(prev => prev.map(seg => {
        if (seg.id === segmentId) {
          return {
            ...seg,
            image: data.url,
            english: '', // Image blocks don't need text content usually
            originalEnglish: '',
            updatedAt: new Date().toISOString(),
          }
        }
        return seg
      }))
      scheduleAutoSave()
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image')
    }
  }, [scheduleAutoSave, wikiSlug])

  const handleImageSliderUpload = useCallback(async (segmentId: string, files: FileList) => {
    if (!lessonId || !files.length) return;
    
    // Upload all files
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('lessonId', lessonId)
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      return data.url
    })
    
    try {
      const urls = await Promise.all(uploadPromises)
      
      setSegments(prev => prev.map(seg => {
        if (seg.id === segmentId) {
          const currentImages = seg.images || []
          return {
            ...seg,
            images: [...currentImages, ...urls],
            updatedAt: new Date().toISOString()
          }
        }
        return seg
      }))
      scheduleAutoSave()
    } catch (e) {
      console.error('Failed to upload images', e)
      alert('Failed to upload some images')
    }
  }, [lessonId, scheduleAutoSave])

  const handleRemoveImageFromSlider = useCallback((segmentId: string, imageIndex: number) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === segmentId && seg.images) {
        const newImages = [...seg.images]
        newImages.splice(imageIndex, 1)
        return {
          ...seg,
          images: newImages,
          updatedAt: new Date().toISOString()
        }
      }
      return seg
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])



  // Handle video upload
  const handleVideoUpload = useCallback(async (segmentId: string, file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mediaType', 'video')
      if (wikiSlug) {
        formData.append('wikiSlug', wikiSlug)
      }
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const data = await response.json()
      
      if (data.provider === 'vimeo') {
        alert('Uploaded to Vimeo. It may take a moment before the video becomes playable.')
      }
      
      setSegments(prev => prev.map(seg => {
        if (seg.id === segmentId) {
          return {
            ...seg,
            url: data.url,
            english: '', // Video blocks usually don't need text content in the main field
            originalEnglish: '',
            updatedAt: new Date().toISOString(),
          }
        }
        return seg
      }))
      scheduleAutoSave()
    } catch (error) {
      console.error('Error uploading video:', error)
      alert('Failed to upload video')
    }
  }, [scheduleAutoSave, wikiSlug])

  // Handle Arabic image upload
  const handleArabicImageUpload = useCallback(async (segmentId: string, file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (wikiSlug) {
        formData.append('wikiSlug', wikiSlug)
      }
      
      // Use existing upload API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const data = await response.json()
      
      setSegments(prev => prev.map(seg => {
        if (seg.id === segmentId) {
          return {
            ...seg,
            image_ar: data.url,
            updatedAt: new Date().toISOString(),
          }
        }
        return seg
      }))
      scheduleAutoSave()
    } catch (error) {
      console.error('Error uploading Arabic image:', error)
      alert('Failed to upload Arabic image')
    }
  }, [scheduleAutoSave, wikiSlug])

  // Add new segment
  const addSegment = useCallback((type: SegmentType, afterId?: string) => {
    const newSegment = createSegment(type)
    console.log('Adding segment:', type, newSegment.id) // Debug log
    
    setSegments(prev => {
      if (afterId === 'top') {
        return [newSegment, ...prev]
      }
      if (afterId) {
        const index = prev.findIndex(s => s.id === afterId)
        if (index >= 0) {
          return [...prev.slice(0, index + 1), newSegment, ...prev.slice(index + 1)]
        }
      }
      return [...prev, newSegment]
    })
    
    // Expand the new segment after a short delay to ensure state is updated
    setTimeout(() => {
      setExpandedSegments(prev => {
        const next = new Set(prev)
        next.add(newSegment.id)
        return next
      })
    }, 50)
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Delete segment
  const deleteSegment = useCallback((segmentId: string) => {
    setSegments(prev => {
      if (prev.length <= 1) return prev
      return prev.filter(s => s.id !== segmentId)
    })
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Toggle segment expansion
  const toggleSegment = useCallback((segmentId: string) => {
    setExpandedSegments(prev => {
      const next = new Set(prev)
      if (next.has(segmentId)) {
        next.delete(segmentId)
      } else {
        next.add(segmentId)
      }
      return next
    })
  }, [])

  // Toggle section collapse (for H1)
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  // Handle Drag Start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // Handle Drag Over (Real-time sorting)
  const handleDragOver = useCallback((event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setSegments(prev => {
      const activeIdx = prev.findIndex(s => s.id === active.id)
      const overIdx = prev.findIndex(s => s.id === over.id)
      
      if (activeIdx === -1 || overIdx === -1) return prev

      const activeSeg = prev[activeIdx]
      const isH1 = activeSeg.type === 'heading' && activeSeg.level === 1

      if (isH1) {
        // Find active section end (all children until next H1)
        let activeEnd = activeIdx + 1
        while (activeEnd < prev.length && !(prev[activeEnd].type === 'heading' && prev[activeEnd].level === 1)) {
          activeEnd++
        }
        const activeSection = prev.slice(activeIdx, activeEnd)
        
        // Create array without the active section
        const withoutActive = [...prev.slice(0, activeIdx), ...prev.slice(activeEnd)]
        
        // Find index of the item we are hovering over in the filtered array
        let limitOverIdx = withoutActive.findIndex(s => s.id === over.id)
        if (limitOverIdx === -1) return prev // target not found?

        // Determine the "Section Block" we are hovering over.
        // We want to treat the "over" item as a proxy for its entire section.
        let targetSectionStart = limitOverIdx;
        const overSeg = withoutActive[limitOverIdx];
        
        // If hovering a child, climb up to find its parent H1
        if (!(overSeg.type === 'heading' && overSeg.level === 1)) {
             for (let i = limitOverIdx; i >= 0; i--) {
                if (withoutActive[i].type === 'heading' && withoutActive[i].level === 1) {
                    targetSectionStart = i;
                    break;
                }
             }
        }

        // Find the END of this target section
        let targetSectionEnd = targetSectionStart + 1;
        while(targetSectionEnd < withoutActive.length && !(withoutActive[targetSectionEnd].type === 'heading' && withoutActive[targetSectionEnd].level === 1)) {
            targetSectionEnd++;
        }

        const result = [...withoutActive]
        
        // Decide insertion point based on direction
        // We compare the original activeIdx with the ORIGINAL over index
        const originalOverIdx = prev.findIndex(s => s.id === over.id);
        
        if (activeIdx < originalOverIdx) {
            // Moving DOWN: Insert AFTER the target section
            // Note: targetSectionEnd is relative to 'withoutActive'
            result.splice(targetSectionEnd, 0, ...activeSection)
        } else {
            // Moving UP: Insert BEFORE the target section
            result.splice(targetSectionStart, 0, ...activeSection)
        }
        
        return result
      } else {
        // Simple move for non-H1 items (Standard dnd sorting)
        return arrayMove(prev, activeIdx, overIdx)
      }
    })
  }, [])

  // Handle Drag End
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    scheduleAutoSave()
  }, [scheduleAutoSave])



  // Render status badge (moved outside)
  
  // Fetch navigation context
  const searchParams = useSearchParams()
  const lessonTitleFromUrl = searchParams.get('title') || 'Untitled Lesson'
  const wikiNameFromUrl = searchParams.get('wiki') || 'RGX Wiki'

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
      {/* Premium Header/Navbar area */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/editor/dashboard/${wikiSlug}`}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              title="Back to wiki"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                <Globe size={10} />
                <span>{wikiNameFromUrl}</span>
                <span>/</span>
                <span>Editor</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">
                {lessonTitleFromUrl}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href={`/editor/lesson?wiki=${wikiSlug}&id=${lessonId}&title=${encodeURIComponent(lessonTitleFromUrl)}`}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors mr-2 hidden md:block"
            >
              Switch to Classic Editor →
            </Link>

            <div className="hidden md:flex flex-col items-end mr-4">
              {lastSaved ? (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Synced • {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 font-medium italic">Not saved yet</div>
              )}
              <p className="text-[10px] text-slate-300">ID: {lessonId}</p>
            </div>
            
            <Link 
              href={(process.env.NODE_ENV === 'production' && previewBaseUrl
                ? `${previewBaseUrl.replace(/\/$/, '')}/en/${lessonSlug || lessonId}`
                : `/en/${wikiSlug}/lesson/${lessonSlug || lessonId}`) + '?preview=1'
              }
              target="_blank"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <Eye size={14} />
              Preview
            </Link>
            
            {isAdmin && onPublish && (
              <button 
                onClick={onPublish}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
              >
                <Globe size={14} />
                Publish
              </button>
            )}
          </div>
        </div>
      </div>




      <div className="max-w-7xl mx-auto p-6 pt-28">
      {!isAuthorized ? null : (
        <>

      {/* Alert Banner - Standard layout code continues... */}
      {segmentsNeedingUpdate > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-amber-800">
              {segmentsNeedingUpdate} translation{segmentsNeedingUpdate === 1 ? '' : 's'} need{segmentsNeedingUpdate === 1 ? 's' : ''} updating
            </p>
            <p className="text-sm text-amber-700">
              The English content has changed since the last translation. Please review and update the Arabic content.
            </p>
          </div>
        </div>
      )}

      {/* Main Layout with Sidebar */}
      <div className="flex gap-6 items-start relative">
        {/* Left Sidebar - Sticky Tools */}
        <div className="w-64 flex-shrink-0 sticky top-24 animate-fade-in max-h-[calc(100vh-8rem)] flex flex-col">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden max-h-full">
            <div className="p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-2">Compose</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SEGMENT_TYPE_OPTIONS.map(option => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => addSegment(option.value)}
                        className="flex flex-col items-center justify-center gap-1.5 px-1 py-3 text-xs font-semibold text-slate-600 bg-white/50 border border-slate-200/50 rounded-xl hover:bg-white hover:text-primary hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all text-center group hover-scale active:scale-95"
                      >
                        <span className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-primary/5 text-slate-400 group-hover:text-primary transition-colors border border-transparent group-hover:border-primary/10">
                          {option.icon}
                        </span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 pt-0 mt-auto">
              <div className="pt-6 border-t border-slate-200/50">
                 <motion.button
                   onClick={handleSave}
                   disabled={isSaving || (!isOwner && !isAdmin)}
                   whileTap={{ scale: 0.92 }}
                   transition={{ type: "spring", stiffness: 400, damping: 17 }}
                   className={`group relative w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-bold text-sm transition-all shadow-xl overflow-hidden ${
                     isSaving 
                       ? 'bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                       : 'bg-[#f05d4e] text-white hover:bg-[#d94d3f] hover:shadow-[#f05d4e]/30'
                   }`}
                 >
                   <AnimatePresence mode="wait">
                     {isSaving ? (
                       <motion.div
                         key="saving"
                         initial={{ y: 15, opacity: 0 }}
                         animate={{ y: 0, opacity: 1 }}
                         exit={{ y: -15, opacity: 0 }}
                         transition={{ duration: 0.15 }}
                         className="flex items-center gap-3"
                       >
                         <div className="relative">
                            <RefreshCw size={18} className="animate-spin" />
                            <motion.div 
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1.5, opacity: [0, 1, 0] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                              className="absolute inset-0 bg-white/50 rounded-full blur-sm"
                            />
                         </div>
                         <span className="font-black tracking-widest uppercase text-xs">Locking In...</span>
                       </motion.div>
                     ) : (
                       <motion.div
                         key="idle"
                         initial={{ y: -15, opacity: 0 }}
                         animate={{ y: 0, opacity: 1 }}
                         exit={{ y: 15, opacity: 0 }}
                         transition={{ duration: 0.15 }}
                         className="flex items-center gap-2"
                       >
                         <Save size={18} strokeWidth={2.5} />
                         <span>Save Changes</span>
                       </motion.div>
                     )}
                   </AnimatePresence>
                   
                   {/* Light Glint Effect */}
                   {!isSaving && (
                     <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                   )}
                 </motion.button>
                 <div className="mt-4 flex items-center justify-center gap-2">
                   <div className="flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                   </div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                     Auto-save Active
                   </p>
                 </div>
              </div>
            </div>
          </div>


        </div>

        {/* Segments List Area */}
        <div className="flex-1 space-y-4 min-w-0 pb-20">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={segments.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {segments.map((segment, index) => {
            const isEditingEn = editingEnglish === segment.id
            const isEditingAr = editingArabic === segment.id
            
            // Check if this is a Parent (Heading 1)
            const isParent = segment.type === 'heading' && (segment.level === 1);
            const isCollapsed = isParent && collapsedSections.has(segment.id);
            const isDraggingThis = activeId === segment.id;
            const isExpanded = expandedSegments.has(segment.id) && !isDraggingThis;
            
            // Find parent H1 to check if we are hidden
            let isHidden = false;
            if (!isParent) {
              for (let i = index - 1; i >= 0; i--) {
                if (segments[i].type === 'heading' && segments[i].level === 1) {
                  if (collapsedSections.has(segments[i].id)) {
                    isHidden = true;
                  }
                  break;
                }
              }
            }

            return (
              <div 
                key={segment.id}
                style={{ 
                  display: isHidden ? 'none' : 'block',
                  opacity: isDraggingThis ? 0 : 1,
                  marginTop: isHidden ? 0 : (isParent ? (index === 0 ? 0 : 40) : 0),
                  marginBottom: isHidden ? 0 : 16,
                  pointerEvents: isHidden ? 'none' : 'auto'
                }}
                className=""
              >
                {index === 0 && <InsertionPoint onClick={() => addSegment('paragraph', 'top')} />}
                
                <SortableItem id={segment.id} isParent={isParent}>
                  {({ dragHandleProps, isDragging, attributes, listeners }) => (
                    <div className={`relative ${isParent ? '' : 'ml-12'}`}>
                      {/* Vertical Connector Line for nested items */}
                      {!isParent && (
                        <div className="absolute -left-6 top-0 bottom-0 w-px bg-slate-200">
                          <div className="absolute top-8 left-0 w-4 h-px bg-slate-200 rounded-full" />
                        </div>
                      )}

                      <div className={`bg-white border rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden hover:shadow-2xl hover:shadow-slate-300/50 ${
                        isParent 
                          ? 'border-slate-300 ring-8 ring-slate-100/50' 
                          : segment.needsUpdate 
                            ? 'border-amber-200 ring-2 ring-amber-50' 
                            : 'border-slate-200 hover:border-slate-300'
                      }`}>
                        <SegmentTileHeader
                          segment={segment}
                          index={index}
                          isParent={isParent}
                          isExpanded={isExpanded}
                          onToggle={() => isParent ? toggleSection(segment.id) : toggleSegment(segment.id)}
                          dragHandleProps={{...dragHandleProps, ...attributes}}
                          statusBadge={<StatusBadge segment={segment} />}
                          titleNode={(
                            <input
                              type="text"
                              placeholder={isParent ? "Section title..." : `${segment.type.charAt(0).toUpperCase() + segment.type.slice(1)} reference...`}
                              value={segment.refTitle || ''}
                              onChange={(e) => handleRefTitleChange(segment.id, e.target.value)}
                              className={`bg-transparent border-none outline-none text-sm font-bold w-full transition-colors placeholder:italic hover:bg-white/5 px-2 py-1 rounded ${
                                isParent 
                                  ? 'text-white placeholder:text-slate-500' 
                                  : 'text-slate-800 placeholder:text-slate-300'
                              } ${outfit.className}`}
                            />
                          )}
                          actionButtons={(
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSegment(segment.id)
                                }}
                                className={`p-2 rounded-xl transition-all ${
                                  isParent 
                                    ? 'text-slate-500 hover:bg-white/10 hover:text-white' 
                                    : 'text-slate-400 hover:bg-white hover:shadow-sm hover:text-slate-900 border border-transparent hover:border-slate-200'
                                }`}
                                title="Open Panel"
                              >
                                <Type size={18} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteSegment(segment.id)
                                }}
                                className={`p-2 rounded-xl transition-all ${
                                  isParent 
                                    ? 'text-slate-500 hover:bg-red-500/20 hover:text-red-400' 
                                    : 'text-slate-300 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-100'
                                }`}
                                title="Delete Segment"
                                disabled={segments.length <= 1}
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        />

                        {/* Segment Content */}
                        {isExpanded && !isCollapsed && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-x divide-slate-200">
                            {/* English Panel */}
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">English</label>
                                <span className="text-xs text-gray-400">v{segment.englishVersion}</span>
                              </div>
                              
                              {/* List Type Editor */}
                              {segment.type === 'list' ? (
                                <div className="space-y-0.5">
                                  {/* List Type Toggle */}
                                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                                    <span className="text-xs text-gray-500">List type:</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleListType(segment.id)}
                                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                                        !segment.ordered 
                                          ? 'bg-primary/10 text-primary border border-primary/20' 
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      <List size={12} /> Bulleted
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleListType(segment.id)}
                                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                                        segment.ordered 
                                          ? 'bg-primary/10 text-primary border border-primary/20' 
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      <ListOrdered size={12} /> Numbered
                                    </button>
                                  </div>
                                  
                                  {(segment.items_en || [{ text: '', indent: 0 }]).map((item, idx) => (
                                    <div 
                                      key={idx} 
                                      className="flex items-start gap-1"
                                      style={{ marginLeft: `${(typeof item === 'object' ? item.indent : 0) * 20}px` }}
                                    >
                                      <span className="w-6 text-right shrink-0 text-slate-700 text-base py-0 select-none font-medium leading-normal">
                                        {getListMarker(segment.items_en || [], idx, !!segment.ordered)}
                                      </span>
                                      <SegmentTiptapEditor
                                        content={typeof item === 'object' ? item.text : String(item)}
                                        onChange={(html) => handleListItemEnChange(segment.id, idx, html)}
                                        className="flex-1 py-0 px-1 border border-transparent rounded text-base hover:bg-slate-50 focus-within:bg-white focus-within:border-blue-200 focus-within:shadow-sm transition-all [&_p]:!my-0 [&_p]:!leading-normal"
                                        placeholder={`Item ${idx + 1}...`}
                                        placeholderClassName="text-base px-1 py-0 leading-normal"
                                      />
                                      <div className="flex shrink-0">
                                        <button type="button" onClick={() => moveListItemUp(segment.id, 'en', idx)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Move up">
                                          <ArrowUp size={12} />
                                        </button>
                                        <button type="button" onClick={() => moveListItemDown(segment.id, 'en', idx)} disabled={idx >= (segment.items_en?.length || 1) - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Move down">
                                          <ArrowDown size={12} />
                                        </button>
                                        <button type="button" onClick={() => outdentListItem(segment.id, 'en', idx)} disabled={(typeof item === 'object' ? item.indent : 0) === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Outdent">
                                          <ChevronLeft size={12} />
                                        </button>
                                        <button type="button" onClick={() => indentListItem(segment.id, 'en', idx)} disabled={(typeof item === 'object' ? item.indent : 0) >= 3} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Indent">
                                          <ChevronRight size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeListItem(segment.id, 'en', idx)}
                                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                          disabled={(segment.items_en || []).length <= 1}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => addListItem(segment.id, 'en')}
                                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2"
                                  >
                                    <Plus size={14} /> Add item
                                  </button>
                                </div>
                              ) : segment.type === 'image' ? (
                                <div className="space-y-3">
                                  {segment.image ? (
                                    <div className="relative group w-full aspect-[1920/720] overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                                      <img 
                                        src={segment.image} 
                                        alt="Segment asset" 
                                        className="h-full w-full object-contain"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const fileInput = document.getElementById(`upload-${segment.id}`);
                                          if (fileInput) fileInput.click();
                                        }}
                                        className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 text-xs font-medium text-gray-700 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        Replace
                                      </button>
                                      {/* Hidden input for replace */}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id={`upload-${segment.id}`}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) handleImageUpload(segment.id, file)
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id={`upload-${segment.id}`}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) handleImageUpload(segment.id, file)
                                        }}
                                      />
                                      <label htmlFor={`upload-${segment.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                                        <ImageIcon size={24} className="text-gray-400" />
                                        <span className="text-sm font-medium text-gray-600">Click to upload image</span>
                                        <span className="text-xs text-gray-500">JPG, PNG, GIF up to 5MB</span>
                                      </label>
                                    </div>
                                  )}
                                  <SegmentTiptapEditor
                                    content={segment.english}
                                    onChange={(html) => handleEnglishChange(segment.id, html)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm text-gray-500 bg-white"
                                    placeholder="Image caption (optional)..."
                                  />
                                </div>
                              ) : segment.type === 'video' ? (
                                 <div className="space-y-3">
                                  {segment.url ? (
                                    <div className="relative group w-full aspect-video overflow-hidden rounded-lg border border-gray-200 bg-black flex items-center justify-center">
                                      <video 
                                        src={segment.url} 
                                        controls={!segment.url.includes('vimeo')}
                                        className="h-full w-full"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const fileInput = document.getElementById(`upload-video-${segment.id}`);
                                          if (fileInput) fileInput.click();
                                        }}
                                        className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 text-xs font-medium text-gray-700 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                      >
                                        Replace Video
                                      </button>
                                      {/* Hidden input for replace */}
                                      <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        id={`upload-video-${segment.id}`}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) handleVideoUpload(segment.id, file)
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                                      <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        id={`upload-video-${segment.id}`}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) handleVideoUpload(segment.id, file)
                                        }}
                                      />
                                      <label htmlFor={`upload-video-${segment.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                                        <Film size={24} className="text-gray-400" />
                                        <span className="text-sm font-medium text-gray-600">Click to upload video</span>
                                        <span className="text-xs text-gray-500">MP4, WebM up to 50MB</span>
                                      </label>
                                    </div>
                                  )}
                                  <SegmentTiptapEditor
                                    content={segment.english}
                                    onChange={(html) => handleEnglishChange(segment.id, html)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm text-gray-500 bg-white"
                                    placeholder="Video caption (optional)..."
                                  />
                                </div>
                              ) : segment.type === 'table' ? (
                                <div className="space-y-2">
                                   {isEditingEn ? (
                                      <SegmentTiptapEditor
                                        autoFocus
                                        content={segment.english}
                                        onChange={(html) => handleEnglishChange(segment.id, html)}
                                        onBlur={() => setEditingEnglish(null)}
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white min-h-[120px] overflow-auto"
                                        placeholder="Table..."
                                      />
                                   ) : (
                                     <div
                                       onClick={() => setEditingEnglish(segment.id)}
                                       className="p-3 bg-gray-50 rounded-lg cursor-text hover:bg-gray-100 transition-colors min-h-[120px] overflow-auto tiptap"
                                     >
                                       <div dangerouslySetInnerHTML={{ __html: segment.english }} />
                                     </div>
                                   )}
                                </div>
                              ) : segment.type === 'heading' ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-gray-500">Level:</span>
                                    {[1, 2, 3].map(level => (
                                      <button
                                        key={level}
                                        onClick={() => handleLevelChange(segment.id, level)}
                                        className={`px-2 py-1 text-xs font-bold rounded ${
                                          (segment.level || 2) === level
                                            ? 'bg-gray-800 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                      >
                                        H{level}
                                      </button>
                                    ))}
                                  </div>
                                  {isEditingEn ? (
                                     <SegmentTiptapEditor
                                       autoFocus
                                       content={segment.english}
                                       onChange={(html) => handleEnglishChange(segment.id, html)}
                                       onBlur={() => setEditingEnglish(null)}
                                       className={`w-full p-3 border border-gray-200 rounded-lg bg-white min-h-[60px] ${getHeadingClass(segment.level || 2)}`}
                                       placeholder={`Heading ${segment.level || 2}...`}
                                     />
                                  ) : (
                                    <div
                                      onClick={() => setEditingEnglish(segment.id)}
                                      className={`p-3 bg-gray-50 rounded-lg cursor-text hover:bg-gray-100 transition-colors min-h-[60px] overflow-hidden ${getHeadingClass(segment.level || 2)}`}
                                    >
                                      {segment.english ? (
                                        <div dangerouslySetInnerHTML={{ __html: segment.english }} />
                                      ) : (
                                        <span className="text-gray-400 italic text-base font-normal">Click to add heading...</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : segment.type === 'horizontalRule' ? (
                                <div className="py-8 flex items-center justify-center">
                                  <div className="w-full relative flex items-center justify-center">
                                    <div className="absolute inset-x-0 h-px bg-gray-200" />
                                    <span className="relative bg-white px-2 text-xs font-medium text-gray-400 border border-gray-100 rounded-full shadow-sm">
                                      Separator
                                    </span>
                                  </div>
                                </div>
                              ) : segment.type === 'imageSlider' ? (
                                <div className="space-y-4">
                                  {/* Image Grid */}
                                  <ImageSliderGrid
                                    images={segment.images || []}
                                    onReorder={(newImages) => {
                                      setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, images: newImages, updatedAt: new Date().toISOString() } : s))
                                      scheduleAutoSave()
                                    }}
                                    onRemove={(index) => handleRemoveImageFromSlider(segment.id, index)}
                                  >
                                    <label className="cursor-pointer aspect-[4/3] flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600 bg-white">
                                      <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files) handleImageSliderUpload(segment.id, e.target.files)
                                          // Reset input to allow re-uploading same file if needed
                                          e.target.value = '' 
                                        }}
                                      />
                                      <Plus size={24} />
                                      <span className="text-xs font-medium">Add Images</span>
                                    </label>
                                  </ImageSliderGrid>
                                </div>
                              ) : isEditingEn ? (
                                 <SegmentTiptapEditor
                                   autoFocus
                                   content={segment.english}
                                   onChange={(html) => handleEnglishChange(segment.id, html)}
                                   onBlur={() => setEditingEnglish(null)}
                                   className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white min-h-[100px]"
                                   placeholder="Enter English content..."
                                 />
                              ) : (
                                <div
                                  onClick={() => setEditingEnglish(segment.id)}
                                  className="p-3 bg-gray-50 rounded-lg text-sm cursor-text hover:bg-gray-100 transition-colors min-h-[100px] overflow-hidden"
                                >
                                  {segment.english ? (
                                    <div dangerouslySetInnerHTML={{ __html: segment.english }} />
                                  ) : (
                                    <span className="text-gray-400 italic">Click to add English content...</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Arabic Panel */}
                            <div className="p-4 bg-blue-50/30">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">Arabic</label>
                                <span className="text-xs text-gray-400">
                                  {segment.arabicVersion > 0 ? `synced with v${segment.arabicVersion}` : 'not translated'}
                                </span>
                              </div>
                              
                              {/* List Type Editor */}
                              {segment.type === 'list' ? (
                                <div className="space-y-0.5 mt-[45px]" dir="rtl">
                                  {(segment.items_ar || []).length === 0 ? (
                                    <div className="text-gray-400 italic text-sm text-right">لا توجد عناصر</div>
                                  ) : null}
                                  {(segment.items_ar || []).map((item, idx) => (
                                    <div 
                                      key={idx} 
                                      className="flex items-start gap-1"
                                      style={{ marginRight: `${(typeof item === 'object' ? item.indent : 0) * 20}px` }}
                                    >
                                      <span className="w-6 text-left shrink-0 text-slate-700 text-base py-0 select-none font-medium leading-normal">
                                        {getListMarker(segment.items_ar || [], idx, !!segment.ordered)}
                                      </span>
                                      <SegmentTiptapEditor
                                        dir="rtl"
                                        lang="ar"
                                        content={typeof item === 'object' ? item.text : String(item)}
                                        onChange={(html) => handleListItemArChange(segment.id, idx, html)}
                                        className="flex-1 py-0 px-1 border border-transparent rounded text-base text-right hover:bg-slate-50 focus-within:bg-white focus-within:border-blue-200 focus-within:shadow-sm transition-all [&_p]:!my-0 [&_p]:!leading-normal"
                                        placeholder={`عنصر ${idx + 1}...`}
                                        placeholderClassName="text-base px-1 py-0 leading-normal"
                                      />
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => addListItem(segment.id, 'ar')}
                                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2"
                                  >
                                    <Plus size={14} /> إضافة عنصر
                                  </button>
                                  
                                  {segment.needsUpdate && (
                                    <div className="mt-4 pt-4 border-t border-blue-100 flex justify-end">
                                      <button
                                        onClick={() => handleConfirmSync(segment.id)}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                      >
                                        <Check size={14} />
                                        Confirm Translation Sync
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : segment.type === 'horizontalRule' ? (
                                <div className="py-8 flex items-center justify-center" dir="rtl">
                                  <div className="w-full relative flex items-center justify-center">
                                    <div className="absolute inset-x-0 h-px bg-gray-200" />
                                    <span className="relative bg-white px-2 text-xs font-medium text-gray-400 border border-gray-100 rounded-full shadow-sm">
                                      فاصل
                                    </span>
                                  </div>
                                </div>
                              ) : segment.type === 'imageSlider' ? (
                                <div className="space-y-4" dir="rtl">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 opacity-75">
                                    {(segment.images || []).map((imgUrl, index) => (
                                      <div key={index} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                        <img src={imgUrl} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-400 text-center italic">
                                    يتم مشاركة صور العرض من النسخة الإنجليزية
                                  </p>
                                </div>
                              ) : segment.type === 'image' ? (
                                <div className="space-y-3">
                                  {segment.image_ar ? (
                                    <div className="relative group w-full aspect-[1920/720] overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                                      <img 
                                        src={segment.image_ar} 
                                        alt="Arabic version asset" 
                                        className="h-full w-full object-contain"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const fileInput = document.getElementById(`upload-ar-${segment.id}`);
                                          if (fileInput) fileInput.click();
                                        }}
                                        className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 text-xs font-medium text-gray-700 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        استبدال
                                      </button>
                                      {/* Hidden input for replace */}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id={`upload-ar-${segment.id}`}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) handleArabicImageUpload(segment.id, file)
                                        }}
                                      />
                                    </div>
                                  ) : segment.image ? (
                                    <div>
                                      <div className="opacity-70 grayscale hover:grayscale-0 transition-all mb-2">
                                        <img 
                                          src={segment.image} 
                                          alt="English version (shared)" 
                                          className="max-h-32 rounded border border-gray-200"
                                        />
                                      </div>
                                      <div className="border-2 border-dashed border-blue-200 rounded-lg p-4 text-center hover:bg-blue-50 transition-colors">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          id={`upload-ar-${segment.id}`}
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleArabicImageUpload(segment.id, file)
                                          }}
                                        />
                                        <label htmlFor={`upload-ar-${segment.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                                          <ImageIcon size={20} className="text-blue-400" />
                                          <span className="text-xs text-blue-600">رفع صورة عربية منفصلة (اختياري)</span>
                                        </label>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 italic text-sm text-right">لم يتم رفع صورة بعد</div>
                                  )}
                                  <SegmentTiptapEditor
                                    dir="rtl"
                                    lang="ar"
                                    content={segment.arabic}
                                    onChange={(html) => handleArabicChange(segment.id, html)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm bg-white"
                                    placeholder="وصف الصورة (اختياري)..."
                                  />
                                </div>
                              ) : segment.type === 'video' ? (
                                 <div className="space-y-3">
                                   {segment.url ? (
                                     <div className="relative w-full aspect-video overflow-hidden rounded-lg border border-gray-200 bg-black flex items-center justify-center">
                                        <video 
                                          src={segment.url} 
                                          controls={!segment.url.includes('vimeo')}
                                          className="h-full w-full"
                                        />
                                     </div>
                                   ) : (
                                     <div className="text-gray-400 italic text-sm text-center border-2 border-dashed border-gray-200 rounded-lg p-6">No video uploaded yet</div>
                                   )}
                                   <SegmentTiptapEditor
                                     dir="rtl"
                                     lang="ar"
                                     content={segment.arabic}
                                     onChange={(html) => handleArabicChange(segment.id, html)}
                                     className="w-full p-2 border border-gray-200 rounded text-sm bg-white"
                                     placeholder="وصف الفيديو (اختياري)..."
                                   />
                                 </div>
                              ) : segment.type === 'table' ? (
                                <div className="space-y-2">
                                   {isEditingAr ? (
                                      <SegmentTiptapEditor
                                        autoFocus
                                        dir="rtl"
                                        lang="ar"
                                        content={segment.arabic}
                                        onChange={(html) => handleArabicChange(segment.id, html)}
                                        onBlur={() => setEditingArabic(null)}
                                        className="w-full p-3 border border-gray-200 rounded-lg bg-white min-h-[120px] overflow-auto text-right"
                                        placeholder="جدول..."
                                      />
                                   ) : (
                                     <div
                                       onClick={() => setEditingArabic(segment.id)}
                                       dir="rtl"
                                       className={`p-3 rounded-lg cursor-text hover:bg-blue-100/50 transition-colors min-h-[120px] overflow-auto text-right tiptap ${
                                         segment.needsUpdate ? 'bg-amber-100/50 border border-amber-200' : 'bg-white/50'
                                       }`}
                                     >
                                        {segment.arabic ? (
                                          <div dangerouslySetInnerHTML={{ __html: segment.arabic }} />
                                        ) : (
                                          <span className="text-gray-400 italic">انقر لإضافة الجدول العربي...</span>
                                        )}
                                     </div>
                                   )}
                                </div>
                              ) : segment.type === 'heading' ? (
                                <div className="mt-[42px]">
                                  {isEditingAr ? (
                                    <SegmentTiptapEditor
                                      autoFocus
                                      dir="rtl"
                                      lang="ar"
                                      content={segment.arabic}
                                      onChange={(html) => handleArabicChange(segment.id, html)}
                                      onBlur={() => setEditingArabic(null)}
                                      className={`w-full p-3 border border-gray-200 rounded-lg bg-white min-h-[60px] text-right ${getHeadingClass(segment.level || 2)}`}
                                      placeholder={`عنوان مستوى ${segment.level || 2}...`}
                                    />
                                  ) : (
                                    <div
                                      onClick={() => setEditingArabic(segment.id)}
                                      dir="rtl"
                                      className={`p-3 rounded-lg cursor-text hover:bg-blue-100/50 transition-colors min-h-[60px] text-right overflow-hidden ${
                                        segment.needsUpdate ? 'bg-amber-100/50 border border-amber-200' : 'bg-white/50'
                                      } ${getHeadingClass(segment.level || 2)}`}
                                    >
                                      {segment.arabic ? (
                                        <div dangerouslySetInnerHTML={{ __html: segment.arabic }} />
                                      ) : (
                                        <span className="text-gray-400 italic text-base font-normal">انقر لإضافة العنوان...</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : isEditingAr ? (
                                <SegmentTiptapEditor
                                  autoFocus
                                  dir="rtl"
                                  lang="ar"
                                  content={segment.arabic}
                                  onChange={(html) => handleArabicChange(segment.id, html)}
                                  onBlur={() => setEditingArabic(null)}
                                  className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white min-h-[100px]"
                                  placeholder="أدخل المحتوى بالعربية..."
                                />
                              ) : (
                                <div
                                  onClick={() => setEditingArabic(segment.id)}
                                  dir="rtl"
                                  className={`p-3 rounded-lg text-sm cursor-text hover:bg-blue-100/50 transition-colors min-h-[100px] text-right overflow-hidden ${
                                    segment.needsUpdate ? 'bg-amber-100/50 border border-amber-200' : 'bg-white/50'
                                  }`}
                                >
                                  {segment.arabic ? (
                                    <div dangerouslySetInnerHTML={{ __html: segment.arabic }} />
                                  ) : (
                                    <span className="text-gray-400 italic">انقر لإضافة المحتوى العربي...</span>
                                  )}
                                </div>
                              )}
                              
                              {segment.needsUpdate && (
                                <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                                  <AlertTriangle size={12} />
                                  English has changed since last translation
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </SortableItem>
                <InsertionPoint onClick={() => addSegment('paragraph', segment.id)} />
              </div>
            );
          })}
        </SortableContext>

        <DragOverlay adjustScale={false} dropAnimation={dropAnimation}>
          {activeId ? (() => {
            const segment = segments.find(s => s.id === activeId)
            if (!segment) return null
            return <SegmentOverlayContent segment={segment} segments={segments} />
          })() : null}
        </DragOverlay>
      </DndContext>
      </div>
      </div>
      </>
      )}
    </div>
    </div>
  )
}
