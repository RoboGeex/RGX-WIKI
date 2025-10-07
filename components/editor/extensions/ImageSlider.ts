import { Node, mergeAttributes } from '@tiptap/core'

export interface ImageSliderOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageSlider: {
      insertImageSlider: (options: { images: string[] }) => ReturnType
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
            return Array.isArray(parsed) ? parsed : []
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
    const images: string[] = Array.isArray(node.attrs?.images) ? node.attrs.images : []
    const slides = images
      .filter(Boolean)
      .map((src: string) => ['div', { class: 'tiptap-image-slide' }, ['img', { src }]])

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

  addCommands() {
    return {
      insertImageSlider: ({ images }) => ({ chain }) => {
        const validImages = Array.isArray(images) ? images.filter(Boolean) : []
        if (!validImages.length) {
          return false
        }
        return chain().insertContent({
          type: this.name,
          attrs: { images: validImages },
        }).run()
      },
    }
  },
})

export default ImageSlider
