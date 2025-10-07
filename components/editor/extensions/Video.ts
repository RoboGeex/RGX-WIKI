import { Node, mergeAttributes } from '@tiptap/core'

export interface VideoOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      insertVideo: (options: { src: string; poster?: string | null; title?: string | null; controls?: boolean }) => ReturnType
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
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video[src]'
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addCommands() {
    return {
      insertVideo: attrs => ({ chain }) => {
        if (!attrs?.src) {
          return false
        }
        return chain()
          .insertContent({
            type: this.name,
            attrs: {
              ...attrs,
              controls: true,
            },
          })
          .run()
      },
    }
  },
})

export default Video
