/**
 * SafeBubbleMenu.ts
 *
 * A patched version of @tiptap/extension-bubble-menu that guards against
 * the "Cannot read properties of null (reading 'domFromPos')" crash.
 *
 * The upstream bug: BubbleMenuView.updatePosition() calls editor.view.coordsAtPos()
 * (via posToDOMRect) BEFORE checking shouldShow. When the editor is being torn down,
 * view.docView is already null at this point which causes the crash.
 *
 * Our fix: monkey-patch the updatePosition method on every BubbleMenuView instance
 * to add an early-exit guard for destroyed/invalid views.
 */

import BubbleMenuExt from '@tiptap/extension-bubble-menu'

export const SafeBubbleMenu = BubbleMenuExt.extend({
  addProseMirrorPlugins() {
    // Call the parent to get the original plugins
    const plugins = this.parent?.() ?? []

    // Monkey-patch each plugin's view() factory to wrap updatePosition
    return plugins.map((plugin: any) => {
      const originalView = plugin.spec?.view
      if (typeof originalView !== 'function') return plugin

      const patchedView = (editorView: any) => {
        const instance = originalView(editorView)
        if (!instance) return instance

        const originalUpdatePosition = instance.updatePosition?.bind(instance)
        if (!originalUpdatePosition) return instance

        instance.updatePosition = function (...args: any[]) {
          try {
            // Guard: if the view is destroyed or docView is null, skip position update
            const v = this.view ?? editorView
            if (!v || v.isDestroyed || !(v as any).docView) return
            if (!v.dom || !v.dom.isConnected) return
            originalUpdatePosition(...args)
          } catch (e: any) {
            // Silently ignore position calculation errors during editor teardown
            if (
              e?.message?.includes('domFromPos') ||
              e?.message?.includes('coordsAtPos') ||
              e?.message?.includes('Cannot read properties of null')
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
