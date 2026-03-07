/**
 * SafeBubbleMenu.ts
 *
 * A patched version of @tiptap/extension-bubble-menu that guards against
 * various crashes (like "dataset of null") by monkey-patching updatePosition globally.
 *
 * The upstream bug: BubbleMenuView.updatePosition() can call editor.view.coordsAtPos()
 * or access dataset before checking if the node still exists or if the view is destroyed.
 */

import BubbleMenuExt, { BubbleMenuView } from '@tiptap/extension-bubble-menu'

// Global monkey-patch for BubbleMenuView to guard against the "dataset of null" crash
if (typeof window !== 'undefined' && (BubbleMenuView.prototype as any).updatePosition) {
  const originalUpdatePosition = BubbleMenuView.prototype.updatePosition
  BubbleMenuView.prototype.updatePosition = function (this: any, ...args: any[]) {
    try {
      // Early exit if the view is already destroyed
      if (this.view?.isDestroyed) return
      
      // Use any cast to avoid "Argument of type 'any[]' is not assignable to parameter of type '[]'" error
      return (originalUpdatePosition as any).apply(this, args)
    } catch (e: any) {
      // Silently ignore position calculation errors during teardown or rapid state changes
      if (
        e?.message?.includes('domFromPos') ||
        e?.message?.includes('coordsAtPos') ||
        e?.message?.includes('Cannot read properties of null') ||
        e?.message?.includes('dataset')
      ) {
        return
      }
      throw e
    }
  }
}

export const SafeBubbleMenu = BubbleMenuExt.extend({
  addProseMirrorPlugins() {
    // Call the parent to get the original plugins
    const plugins = this.parent?.() ?? []

    // Continue to provide the extension-level guard as a secondary safety layer
    return plugins.map((plugin: any) => {
      const originalView = plugin.spec?.view
      if (typeof originalView !== 'function') return plugin

      const patchedView = (editorView: any) => {
        const instance = originalView(editorView)
        if (!instance) return instance

        const originalUpdatePosition = instance.updatePosition?.bind(instance)
        if (!originalUpdatePosition) return instance

        instance.updatePosition = function (this: any, ...args: any[]) {
          try {
            const v = this.view ?? editorView
            if (!v || v.isDestroyed || !(v as any).docView) return
            if (!v.dom || !v.dom.isConnected) return
            return (originalUpdatePosition as any)(...args)
          } catch (e: any) {
            if (
              e?.message?.includes('domFromPos') ||
              e?.message?.includes('coordsAtPos') ||
              e?.message?.includes('Cannot read properties of null') ||
              e?.message?.includes('dataset')
            ) {
              return
            }
            throw e
          }
        }

        return instance
      }

      // Rebuild the plugin with the patched view factory
      const { Plugin } = require('prosemirror-state')
      return new Plugin({
        ...plugin.spec,
        view: patchedView,
      })
    })
  },
})
