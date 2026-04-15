'use client'
import React from 'react'

interface State { hasError: boolean }

/**
 * Wraps a ProseMirror ReactNodeViewRenderer so that if the React subtree
 * crashes (e.g., a destroyed editor reference), the error is swallowed and
 * replaced with a neutral placeholder instead of blowing up the whole page.
 */
export class NodeViewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    // Log for debugging without crashing
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[NodeViewErrorBoundary]', error.message)
    }
  }

  render() {
    if (this.state.hasError) {
      // Invisible placeholder — ProseMirror still owns the node
      return <div data-node-view-error style={{ display: 'contents' }} />
    }
    return this.props.children
  }
}
