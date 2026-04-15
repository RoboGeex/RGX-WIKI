import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ImageSliderComponent from './ImageSliderComponent'

export interface ImageSliderOptions {
  HTMLAttributes: Record<string, any>
}

export interface ImageSlideData {
  url: string
  caption?: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageSlider: {
      insertImageSlider: (options: { images: (string | ImageSlideData)[]; textAlign?: string | null }) => ReturnType
    }
  }
}

const ImageSlider = Node.create<ImageSliderOptions>({
  name: 'imageSlider',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'tiptap-image-slider',
      },
    }
  },

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: element => {
          const raw = element.getAttribute('data-images')
          if (!raw) return []
          try {
            const parsed = JSON.parse(raw)
            if (!Array.isArray(parsed)) return []

            // Normalize strings to { url, caption } objects for backwards compatibility
            return parsed.map(item => {
              if (typeof item === 'string') {
                return { url: item, caption: '' }
              }
              return item
            })
          } catch {
            return []
          }
        },
        renderHTML: attributes => {
          const images = Array.isArray(attributes.images) ? attributes.images : []
          return {
            'data-images': JSON.stringify(images),
          }
        },
      },
      title: {
        default: null,
      },
      layoutMode: {
        default: 'fit',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-layout-mode': attributes.layoutMode,
        }),
      },
      textAlign: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-align': attributes.textAlign,
          style: `text-align: ${attributes.textAlign}`,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-slider"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const images = Array.isArray(node.attrs?.images) ? node.attrs.images : []
    const slides = images
      .filter((img) => img && (typeof img === 'string' || img.url))
      .map((img) => {
        const url = typeof img === 'string' ? img : img.url
        const caption = typeof img === 'string' ? '' : (img.caption || '')

        const children = [['img', { src: url }]] as any[]
        if (caption) {
          children.push(['div', { class: 'tiptap-image-caption' }, caption])
        }

        return ['div', { class: 'tiptap-image-slide' }, ...children]
      })

    return [
      'div',
      mergeAttributes(
        { 'data-type': 'image-slider' },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      ['div', { class: 'tiptap-image-slider-track' }, ...slides],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageSliderComponent, {
      stopEvent: ({ event }: any) => {
        const target = event?.target as HTMLElement | null
        if (!target) return false
        return Boolean(target.closest('button, label, input, .absolute'))
      },
    })
  },

  addCommands() {
    return {
      insertImageSlider: ({ images, textAlign }) => ({ chain }) => {
        const validImages = Array.isArray(images) ? images.filter(Boolean) : []
        if (!validImages.length) {
          return false
        }

        const normalizedImages = validImages.map(img => {
          if (typeof img === 'string') return { url: img, caption: '' }
          return img
        })

        return chain().insertContent({
          type: this.name,
          attrs: { images: normalizedImages, textAlign: textAlign || 'center' },
        }).run()
      },
    }
  },
})

export default ImageSlider
