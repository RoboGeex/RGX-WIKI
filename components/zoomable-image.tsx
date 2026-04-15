'use client'

import React, { useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

interface ZoomableImageProps {
    children: React.ReactNode
    className?: string
}

export function ZoomableImage({ children, className = '' }: ZoomableImageProps) {
    const [open, setOpen] = useState(false)

    // Create a safe default if children is not an element with src
    let src = ''
    let alt = ''
    let childStyle: React.CSSProperties = {}

    try {
        // Attempt to extract src, alt, and style from the child img element
        const child = React.Children.only(children) as React.ReactElement
        src = child.props.src || ''
        alt = child.props.alt || ''
        childStyle = child.props.style || {}
    } catch (e) {
        // Ignore children parsing errors
    }

    const isSvg = src.toLowerCase().endsWith('.svg') || src.includes('.svg?') || src.includes('data:image/svg+xml')

    return (
        <>
            <div
                onClick={() => setOpen(true)}
                className={`cursor-zoom-in block w-full h-full transition-transform hover:scale-[1.01] ${className}`}
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
                    styles={{
                        root: {
                            "--yarl__container_background_color": "#ffffff",
                            "--yarl__color_button": "#000000",
                            "--yarl__color_button_active": "#666666",
                        },
                    }}
                    render={{
                        buttonPrev: () => null,
                        buttonNext: () => null,
                        slide: ({ slide, rect }) => {
                            const slideIsSvg = slide.src.toLowerCase().endsWith('.svg') || slide.src.includes('.svg?') || slide.src.includes('data:image/svg+xml');
                            
                            // Use the child's style (which contains whitespace trim scale/clipPath)
                            // But ensure we don't accidentally constrain width/height if it was set to small values
                            const baseStyle = { ...childStyle };
                            delete (baseStyle as any).width;
                            delete (baseStyle as any).height;

                            return (
                                <div className="flex items-center justify-center w-full h-full pointer-events-none">
                                    <img
                                        src={slide.src}
                                        alt={slide.alt}
                                        className="yarl__slide_image pointer-events-auto"
                                        style={{
                                            ...baseStyle,
                                            width: slideIsSvg ? rect.width : undefined,
                                            height: slideIsSvg ? rect.height : undefined,
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                        }}
                                    />
                                </div>
                            );
                        }
                    }}
                />
            )}
        </>
    )
}
