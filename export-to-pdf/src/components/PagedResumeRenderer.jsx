import React, { useEffect, useRef, useState } from 'react'
import ResumeRenderer from './ResumeRenderer'

function PagedResumeRenderer({ markdown }) {
    const printRef = useRef(null)
    const [pageBreakPositions, setPageBreakPositions] = useState([])

    useEffect(() => {
        if (!markdown) return

        // Wait longer for fonts and rendering to stabilize
        const timer = setTimeout(() => {
            // Ensure fonts are loaded
            if (document.fonts) {
                document.fonts.ready.then(() => {
                    // Additional delay after fonts load
                    setTimeout(detectPageBreaks, 500)
                })
            } else {
                detectPageBreaks()
            }
        }, 1000)

        return () => clearTimeout(timer)
    }, [markdown])

    const detectPageBreaks = () => {
        if (!printRef.current) return

        const container = printRef.current
        const pageBreakElements = Array.from(container.querySelectorAll('[style*="page-break"]'))
        
        const firstChild = container.firstElementChild
        if (!firstChild) return
        
        const contentHeight = firstChild.scrollHeight
        const pageHeight = 10 * 96 // 10 inches of content per page
        
        console.log('Content height:', contentHeight)
        console.log('Found manual page break elements:', pageBreakElements.length)
        
        const allBreaks = []
        
        // Get manual page break positions
        const manualBreaks = pageBreakElements.map((elem, index) => {
            const offsetTop = elem.offsetTop
            console.log(`Manual page break ${index + 1} at:`, offsetTop, 'px')
            return offsetTop
        }).sort((a, b) => a - b)
        
        // Calculate natural breaks between manual breaks (and before first, after last)
        const segments = []
        
        // Segment before first manual break (if any)
        if (manualBreaks.length > 0) {
            segments.push({ start: 0, end: manualBreaks[0] })
        } else {
            segments.push({ start: 0, end: contentHeight })
        }
        
        // Segments between manual breaks
        for (let i = 0; i < manualBreaks.length - 1; i++) {
            segments.push({ start: manualBreaks[i], end: manualBreaks[i + 1] })
        }
        
        // Segment after last manual break (if any)
        if (manualBreaks.length > 0) {
            segments.push({ start: manualBreaks[manualBreaks.length - 1], end: contentHeight })
        }
        
        console.log('Content segments:', segments)
        
        // Add natural breaks within each segment
        segments.forEach((segment, segIndex) => {
            const segmentHeight = segment.end - segment.start
            const numPagesInSegment = Math.ceil(segmentHeight / pageHeight)
            
            console.log(`Segment ${segIndex}: height=${segmentHeight}px, pages=${numPagesInSegment}`)
            
            // Add natural breaks for this segment
            for (let i = 1; i < numPagesInSegment; i++) {
                // Different adjustments for different segments
                // First segment (before any manual breaks) needs +20px
                // Later segments need -10px
                const adjustment = segIndex === 0 ? 20 : -10
                const naturalBreak = segment.start + (i * pageHeight) + adjustment
                allBreaks.push(naturalBreak)
                console.log(`  Natural break ${i} in segment ${segIndex} at:`, naturalBreak, `px (${adjustment > 0 ? '+' : ''}${adjustment}px adj)`)
            }
        })
        
        // Add manual breaks
        allBreaks.push(...manualBreaks)
        
        // Sort and deduplicate
        const sortedBreaks = Array.from(new Set(allBreaks)).sort((a, b) => a - b)
        
        console.log('Final combined page breaks:', sortedBreaks)
        setPageBreakPositions(sortedBreaks)
    }

    return (
        <div className="pages-wrapper">
            {/* Continuous content for PDF export (hidden on screen, visible in print) */}
            <div className="print-container">
                <ResumeRenderer markdown={markdown} />
            </div>
            
            {/* Screen preview - continuous content with page boundaries */}
            <div className="pages-container">
                <div 
                    ref={printRef}
                    className="resume-container"
                    style={{
                        height: 'auto',
                        maxHeight: 'none',
                        minHeight: 'auto',
                        position: 'relative'
                    }}
                >
                    <ResumeRenderer markdown={markdown} />
                    
                    {/* Visual page break indicators */}
                    {pageBreakPositions.map((position, i) => (
                        <div
                            key={i}
                            className="page-break-indicator"
                            style={{
                                position: 'absolute',
                                left: '-0.5in',
                                right: '-0.5in',
                                top: `${position}px`,
                                height: '2px',
                                background: 'linear-gradient(90deg, #ff0000 0%, #ff0000 50%, transparent 50%)',
                                backgroundSize: '20px 2px',
                                zIndex: 1000,
                                pointerEvents: 'none'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                left: '50%',
                                top: '-12px',
                                transform: 'translateX(-50%)',
                                background: '#ff0000',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 'bold'
                            }}>
                                Page {i + 1} / {i + 2}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default PagedResumeRenderer
