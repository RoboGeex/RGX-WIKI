export type LessonSectionKey = 'summary' | 'lesson'

const SECTION_MARKERS: Record<LessonSectionKey, string> = {
  summary: '[[RGX_SECTION:SUMMARY]]',
  lesson: '[[RGX_SECTION:LESSON]]',
}

const EMPTY_PARAGRAPH_NODE = { type: 'paragraph' }

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function normalizeText(value: string): string {
  return value.trim().toUpperCase()
}

function collectNodeText(node: any): string {
  if (!node || typeof node !== 'object') return ''
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text
  }
  if (!Array.isArray(node.content)) return ''
  return node.content.map((child: any) => collectNodeText(child)).join('')
}

function isSectionMarkerNode(node: any, section: LessonSectionKey): boolean {
  if (!node || typeof node !== 'object' || node.type !== 'paragraph') return false
  return normalizeText(collectNodeText(node)) === normalizeText(SECTION_MARKERS[section])
}

function createMarkerNode(section: LessonSectionKey) {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text: SECTION_MARKERS[section] }],
  }
}

function ensureDoc(nodes: any[]) {
  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : [clone(EMPTY_PARAGRAPH_NODE)],
  }
}

function docNodes(doc: any): any[] {
  return Array.isArray(doc?.content) ? doc.content : []
}

export function splitDocumentBySection(doc: any): {
  summaryDoc: any
  lessonDoc: any
  hasMarkers: boolean
} {
  const nodes = docNodes(doc)
  if (nodes.length === 0) {
    return {
      summaryDoc: ensureDoc([]),
      lessonDoc: ensureDoc([]),
      hasMarkers: false,
    }
  }

  const summaryNodes: any[] = []
  const lessonNodes: any[] = []
  let currentSection: LessonSectionKey = 'lesson'
  let hasMarkers = false

  for (const node of nodes) {
    if (isSectionMarkerNode(node, 'summary')) {
      currentSection = 'summary'
      hasMarkers = true
      continue
    }
    if (isSectionMarkerNode(node, 'lesson')) {
      currentSection = 'lesson'
      hasMarkers = true
      continue
    }
    if (currentSection === 'summary') {
      summaryNodes.push(clone(node))
    } else {
      lessonNodes.push(clone(node))
    }
  }

  if (!hasMarkers) {
    return {
      summaryDoc: ensureDoc([]),
      lessonDoc: ensureDoc(nodes.map((node) => clone(node))),
      hasMarkers,
    }
  }

  return {
    summaryDoc: ensureDoc(summaryNodes),
    lessonDoc: ensureDoc(lessonNodes),
    hasMarkers,
  }
}

export function buildDocumentFromSections(summaryDoc: any, lessonDoc: any) {
  const summaryNodes = docNodes(summaryDoc).filter(
    (node) => !isSectionMarkerNode(node, 'summary') && !isSectionMarkerNode(node, 'lesson')
  )
  const lessonNodes = docNodes(lessonDoc).filter(
    (node) => !isSectionMarkerNode(node, 'summary') && !isSectionMarkerNode(node, 'lesson')
  )

  return {
    type: 'doc',
    content: [
      createMarkerNode('summary'),
      ...summaryNodes.map((node) => clone(node)),
      createMarkerNode('lesson'),
      ...lessonNodes.map((node) => clone(node)),
    ],
  }
}

function blockText(block: any, locale: 'en' | 'ar'): string {
  if (!block || typeof block !== 'object') return ''
  const textValue = locale === 'ar' ? block.ar : block.en
  if (typeof textValue === 'string' && textValue.trim()) return textValue
  const htmlValue = locale === 'ar' ? block.html_ar : block.html_en
  if (typeof htmlValue === 'string' && htmlValue.trim()) {
    return htmlValue.replace(/<[^>]*>/g, ' ')
  }
  return ''
}

export function splitBodyBlocksBySection<T extends Record<string, any>>(
  blocks: T[],
  locale: 'en' | 'ar'
): {
  summaryBlocks: T[]
  lessonBlocks: T[]
  hasMarkers: boolean
} {
  const summaryBlocks: T[] = []
  const lessonBlocks: T[] = []
  let currentSection: LessonSectionKey = 'lesson'
  let hasMarkers = false

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    const markerText = normalizeText(blockText(block, locale))
    if (block.type === 'paragraph' && markerText === normalizeText(SECTION_MARKERS.summary)) {
      currentSection = 'summary'
      hasMarkers = true
      continue
    }
    if (block.type === 'paragraph' && markerText === normalizeText(SECTION_MARKERS.lesson)) {
      currentSection = 'lesson'
      hasMarkers = true
      continue
    }
    if (currentSection === 'summary') {
      summaryBlocks.push(block)
    } else {
      lessonBlocks.push(block)
    }
  }

  if (!hasMarkers) {
    return {
      summaryBlocks: [],
      lessonBlocks: blocks,
      hasMarkers,
    }
  }

  return {
    summaryBlocks,
    lessonBlocks,
    hasMarkers,
  }
}

