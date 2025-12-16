import React, { useEffect, useRef, useState } from 'react'
import ResumeRenderer from './ResumeRenderer'

function PagedResumeRenderer({ markdown }) {
    const printRef = useRef(null)
    const hiddenPrintRef = useRef(null)
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
        if (!printRef.current || !hiddenPrintRef.current) return

        // Use the hidden print-container for measurements (what Puppeteer sees)
        const printContainer = hiddenPrintRef.current.firstElementChild
        const displayContainer = printRef.current
        const firstChild = displayContainer.firstElementChild
        
        if (!printContainer || !firstChild) return
        
        // Measure from print container (accurate for PDF)
        const printHeight = printContainer.scrollHeight
        const pageHeight = 10 * 96 // 10 inches of content per page
        
        console.log('Print container height:', printHeight)
        console.log('Display container first child height:', firstChild.scrollHeight)
        
        // Find manual page breaks in display container
        const pageBreakElements = Array.from(displayContainer.querySelectorAll('[style*="page-break"]'))
        console.log('Found manual page break elements:', pageBreakElements.length)
        
        const allBreaks = []
        
        // Get manual page break positions from display
        const manualBreaks = pageBreakElements.map((elem, index) => {
            const offsetTop = elem.offsetTop
            console.log(`Manual page break ${index + 1} at:`, offsetTop, 'px')
            return offsetTop
        }).sort((a, b) => a - b)
        
        // Create segments
        const segments = []
        
        if (manualBreaks.length > 0) {
            segments.push({ start: 0, end: manualBreaks[0] })
            
            for (let i = 0; i < manualBreaks.length - 1; i++) {
                segments.push({ start: manualBreaks[i], end: manualBreaks[i + 1] })
            }
            
            segments.push({ start: manualBreaks[manualBreaks.length - 1], end: firstChild.scrollHeight })
        } else {
            segments.push({ start: 0, end: firstChild.scrollHeight })
        }
        
        console.log('Content segments:', segments)
        
        // Add natural breaks within each segment
        segments.forEach((segment, segIndex) => {
            const segmentHeight = segment.end - segment.start
            const numPagesInSegment = Math.ceil(segmentHeight / pageHeight)
            
            console.log(`Segment ${segIndex}: height=${segmentHeight}px, pages=${numPagesInSegment}`)
            
            for (let i = 1; i < numPagesInSegment; i++) {
                // Calculate natural break position
                // Use print container measurements to determine adjustment
                const basePosition = segment.start + (i * pageHeight)
                
                // Dynamic adjustment: compare rendering vs expected
                // First page typically needs slight downward adjustment due to initial spacing
                // Subsequent pages in later segments may need slight upward adjustment
                const heightRatio = firstChild.scrollHeight / printHeight
                const isFirstSegment = segIndex === 0
                
                // Adaptive adjustment based on rendering difference
                let adjustment = 0
                if (Math.abs(heightRatio - 1.0) > 0.01) {
                    // If there's significant height difference, apply proportional adjustment
                    adjustment = isFirstSegment ? 20 : -10
                } else {
                    // Minimal adjustment for well-matched rendering
                    adjustment = isFirstSegment ? 10 : -5
                }
                
                const naturalBreak = basePosition + adjustment
                allBreaks.push(naturalBreak)
                console.log(`  Natural break ${i} in segment ${segIndex} at:`, naturalBreak, `px (adj: ${adjustment}px, ratio: ${heightRatio.toFixed(3)})`)
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
            <div className="print-container" ref={hiddenPrintRef}>
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
