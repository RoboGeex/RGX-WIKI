/**
 * Server-side TipTap JSON → HTML serializer.
 *
 * This module converts stored TipTap JSON nodes into proper HTML strings
 * so the wiki viewer renders content identically to the editor.
 *
 * It is intentionally simple and covers the node/mark types used by the
 * project's TipTap editor configuration.
 */

// ── Helpers ─────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value)
}

// ── Inline mark serialization ───────────────────────────────────────

function applyMarks(html: string, marks?: any[]): string {
  if (!Array.isArray(marks) || marks.length === 0) return html
  return marks.reduce((acc: string, mark: any) => {
    if (!mark || typeof mark.type !== 'string') return acc
    switch (mark.type) {
      case 'bold':
        return '<strong>' + acc + '</strong>'
      case 'italic':
        return '<em>' + acc + '</em>'
      case 'underline':
        return '<u>' + acc + '</u>'
      case 'strike':
        return '<s>' + acc + '</s>'
      case 'code':
        return '<code>' + acc + '</code>'
      case 'link': {
        const href = mark.attrs?.href
        if (!href) return acc
        const target = mark.attrs?.target
          ? escapeAttribute(String(mark.attrs.target))
          : '_blank'
        const rel = 'noopener noreferrer'
        return (
          '<a href="' +
          escapeAttribute(String(href)) +
          '" target="' +
          target +
          '" rel="' +
          rel +
          '">' +
          acc +
          '</a>'
        )
      }
      case 'textStyle': {
        const color = mark.attrs?.color
        if (!color) return acc
        return (
          '<span style="color: ' +
          escapeAttribute(String(color)) +
          '">' +
          acc +
          '</span>'
        )
      }
      case 'highlight': {
        const color = mark.attrs?.color
        const styleAttr = color
          ? ' style="background-color: ' + escapeAttribute(String(color)) + '"'
          : ''
        return '<mark' + styleAttr + '>' + acc + '</mark>'
      }
      default:
        return acc
    }
  }, html)
}

// ── Node serialization ──────────────────────────────────────────────

/**
 * Serialize an array of inline TipTap nodes (text, hardBreak, etc.) to HTML.
 */
function serializeInlineNodes(nodes?: any[]): string {
  if (!Array.isArray(nodes) || nodes.length === 0) return ''
  const parts: string[] = []
  for (const node of nodes) {
    if (!node) continue
    if (node.type === 'text') {
      let html = escapeHtml(typeof node.text === 'string' ? node.text : '')
      html = applyMarks(html, node.marks)
      parts.push(html)
    } else if (node.type === 'hardBreak') {
      parts.push('<br />')
    } else if (node.type === 'image' && node.attrs?.src) {
      const src = escapeAttribute(String(node.attrs.src))
      const altAttr = node.attrs?.alt
        ? ' alt="' + escapeAttribute(String(node.attrs.alt)) + '"'
        : ''
      parts.push('<img src="' + src + '"' + altAttr + ' />')
    } else if (Array.isArray(node.content)) {
      parts.push(serializeInlineNodes(node.content))
    }
  }
  return parts.join('')
}

/**
 * Serialize a single TipTap JSON node to HTML.
 * Supports all block types used in the editor.
 */
export function serializeNode(node: any): string {
  if (!node || typeof node !== 'object') return ''

  switch (node.type) {
    case 'doc': {
      if (!Array.isArray(node.content)) return ''
      return node.content.map((child: any) => serializeNode(child)).join('')
    }
    case 'paragraph': {
      const attrs = node.attrs || {}
      const align = attrs.textAlign || attrs.align
      const styleAttr = align ? ` style="text-align: ${escapeAttribute(align)}"` : ''
      const inner = serializeInlineNodes(node.content)
      return '<p' + styleAttr + '>' + (inner || '') + '</p>'
    }
    case 'heading': {
      const level = (node.attrs?.level >= 1 && node.attrs?.level <= 6) ? node.attrs.level : 2
      const attrs = node.attrs || {}
      const align = attrs.textAlign || attrs.align
      const styleAttr = align ? ` style="text-align: ${escapeAttribute(align)}"` : ''
      const inner = serializeInlineNodes(node.content)
      return `<h${level}${styleAttr}>${inner}</h${level}>`
    }
    case 'bulletList': {
      if (!Array.isArray(node.content)) return ''
      const items = node.content.map((child: any) => serializeNode(child)).join('')
      return '<ul>' + items + '</ul>'
    }
    case 'orderedList': {
      if (!Array.isArray(node.content)) return ''
      const start = node.attrs?.start
      const startAttr = start && start !== 1 ? ` start="${start}"` : ''
      const items = node.content.map((child: any) => serializeNode(child)).join('')
      return '<ol' + startAttr + '>' + items + '</ol>'
    }
    case 'listItem': {
      if (!Array.isArray(node.content)) return '<li></li>'
      const inner = node.content.map((child: any) => serializeNode(child)).join('')
      return '<li>' + inner + '</li>'
    }
    case 'blockquote': {
      if (!Array.isArray(node.content)) return '<blockquote></blockquote>'
      const inner = node.content.map((child: any) => serializeNode(child)).join('')
      return '<blockquote>' + inner + '</blockquote>'
    }
    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const inner = serializeInlineNodes(node.content)
      const langClass = lang ? ` class="language-${escapeAttribute(lang)}"` : ''
      return '<pre><code' + langClass + '>' + inner + '</code></pre>'
    }
    case 'horizontalRule': {
      return '<hr />'
    }
    case 'hardBreak': {
      return '<br />'
    }
    case 'table': {
      if (!Array.isArray(node.content)) return ''
      const inner = node.content.map((child: any) => serializeNode(child)).join('')
      return '<table>' + inner + '</table>'
    }
    case 'tableRow': {
      if (!Array.isArray(node.content)) return ''
      const inner = node.content.map((child: any) => serializeNode(child)).join('')
      return '<tr>' + inner + '</tr>'
    }
    case 'tableHeader': {
      if (!Array.isArray(node.content)) return '<th></th>'
      const attrs = node.attrs || {}
      const styleParts: string[] = []
      if (attrs.background) styleParts.push(`background-color: ${escapeAttribute(attrs.background)}`)
      if (attrs.colspan && attrs.colspan > 1) styleParts.push('')
      const colspanAttr = attrs.colspan && attrs.colspan > 1 ? ` colspan="${attrs.colspan}"` : ''
      const rowspanAttr = attrs.rowspan && attrs.rowspan > 1 ? ` rowspan="${attrs.rowspan}"` : ''
      const styleAttr = styleParts.filter(Boolean).length > 0 ? ` style="${styleParts.filter(Boolean).join('; ')}"` : ''
      const inner = node.content.map((child: any) => serializeNode(child)).join('')
      return '<th' + colspanAttr + rowspanAttr + styleAttr + '>' + inner + '</th>'
    }
    case 'tableCell': {
      if (!Array.isArray(node.content)) return '<td></td>'
      const attrs = node.attrs || {}
      const styleParts: string[] = []
      if (attrs.background) styleParts.push(`background-color: ${escapeAttribute(attrs.background)}`)
      const colspanAttr = attrs.colspan && attrs.colspan > 1 ? ` colspan="${attrs.colspan}"` : ''
      const rowspanAttr = attrs.rowspan && attrs.rowspan > 1 ? ` rowspan="${attrs.rowspan}"` : ''
      const styleAttr = styleParts.length > 0 ? ` style="${styleParts.join('; ')}"` : ''
      const inner = node.content.map((child: any) => serializeNode(child)).join('')
      return '<td' + colspanAttr + rowspanAttr + styleAttr + '>' + inner + '</td>'
    }
    default: {
      // Unknown node: try to serialize its content if any
      if (Array.isArray(node.content)) {
        return node.content.map((child: any) => serializeNode(child)).join('')
      }
      return ''
    }
  }
}

/**
 * Convert a TipTap JSON node (as stored in json_en / json_ar) to HTML.
 * This is the main entry point for the wiki viewer.
 */
export function tiptapJsonToHtml(jsonNode: any): string {
  if (!jsonNode || typeof jsonNode !== 'object') return ''
  return serializeNode(jsonNode)
}
