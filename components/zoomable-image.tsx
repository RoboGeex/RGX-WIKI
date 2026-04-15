'use client'

import React, { useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

interface ZoomableImageProps {
    children: React.ReactNode
}

export function ZoomableImage({ children }: ZoomableImageProps) {
    const [open, setOpen] = useState(false)

    // Create a safe default if children is not an element with src
    let src = ''
    let alt = ''

    try {
        // Attempt to extract src and alt from the child img element
        const child = React.Children.only(children) as React.ReactElement
        src = child.props.src || ''
        alt = child.props.alt || ''
    } catch (e) {
        // Ignore children parsing errors
    }

    return (
        <>
            <div
                onClick={() => setOpen(true)}
                className="cursor-zoom-in block w-full h-full transition-transform hover:scale-[1.01]"
            >
                {children}
            </div>

            {src && (
                <Lightbox
                    open={open}
                    close={() => setOpen(false)}
                    slides={[{ src, alt }]}
                    plugins={[Zoom]}
                    zoom={{ scrollToZoom: true, maxZoomPixelRatio: 5 }}
                    carousel={{ finite: true }}
                    controller={{ closeOnBackdropClick: true }}
                    render={{
                        buttonPrev: () => null,
                        buttonNext: () => null,
                    }}
                />
            )}
        </>
    )
}
