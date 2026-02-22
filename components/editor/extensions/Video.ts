import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import VideoComponent from './VideoComponent'

export interface VideoOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      insertVideo: (options: {
        src: string
        poster?: string | null
        title?: string | null
        controls?: boolean
        provider?: string | null
        width?: string | null
        align?: string | null
      }) => ReturnType
    }
  }
}

const Video = Node.create<VideoOptions>({
  name: 'video',
  group: 'block',
  draggable: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        controls: true,
      },
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      poster: {
        default: null,
      },
      title: {
        default: null,
      },
      controls: {
        default: true,
      },
      provider: {
        default: null,
      },
      width: {
        default: '100%',
        renderHTML: (attributes: Record<string, any>) => ({
          width: attributes.width,
          style: `width: ${attributes.width}`
        }),
      },
      align: {
        default: 'center',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-align': attributes.align,
          style: `text-align: ${attributes.align}`
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video[src]',
      },
      {
        tag: 'iframe[data-video-provider="vimeo"]',
        getAttrs: (element) => {
          const el = element as HTMLElement
          return {
            src: el.getAttribute('src'),
            provider: 'vimeo',
            controls: false,
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const provider = HTMLAttributes.provider || (typeof HTMLAttributes.src === 'string' && HTMLAttributes.src.includes('vimeo.com') ? 'vimeo' : null)
    if (provider === 'vimeo') {
      return [
        'div',
        { class: 'tiptap-video-embed aspect-video w-full rounded-2xl border border-gray-200 bg-black shadow-lg overflow-hidden' },
        [
          'iframe',
          {
            src: HTMLAttributes.src,
            title: HTMLAttributes.title || 'Vimeo video',
            allow: 'autoplay; fullscreen; picture-in-picture',
            allowfullscreen: 'true',
            'data-video-provider': 'vimeo',
            class: 'h-full w-full',
          },
        ],
      ]
    }
    const { provider: _provider, ...videoAttrs } = HTMLAttributes
    return ['video', mergeAttributes(this.options.HTMLAttributes, videoAttrs)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoComponent)
  },

  addCommands() {
    return {
      insertVideo: attrs => ({ chain }) => {
        if (!attrs?.src) {
          return false
        }
        const src = typeof attrs.src === 'string' ? attrs.src : ''
        const provider = attrs.provider || (src.includes('vimeo.com') ? 'vimeo' : null)
        return chain()
          .insertContent({
            type: this.name,
            attrs: {
              ...attrs,
              provider,
              controls: provider === 'vimeo' ? false : true,
            },
          })
          .run()
      },
    }
  },
})

export default Video
