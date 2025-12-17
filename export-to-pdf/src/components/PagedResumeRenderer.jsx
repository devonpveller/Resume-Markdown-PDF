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

        // Measure from hidden print-container
        const printContainer = hiddenPrintRef.current
        const displayContainer = printRef.current
        const firstChild = displayContainer.firstElementChild

        if (!printContainer || !firstChild) {
            console.error('Missing containers:', { printContainer: !!printContainer, firstChild: !!firstChild })
            return
        }

        // Measure from print container (accurate for PDF)
        const printHeight = printContainer.scrollHeight
        const displayHeight = firstChild.scrollHeight
        const pageHeight = 10 * 96 // 10 inches of content per page

        console.log('Print container height:', printHeight)
        console.log('Display container first child height:', displayHeight)
        console.log('Height ratio:', (displayHeight / printHeight).toFixed(4))
        console.log('Ratio difference from 1.0:', Math.abs((displayHeight / printHeight) - 1.0).toFixed(4))

        // Find manual page breaks in display container
        const pageBreakElements = Array.from(displayContainer.querySelectorAll('[style*="page-break"]'))
        console.log('Found manual page break elements:', pageBreakElements.length)
        console.log('Page break element details:', pageBreakElements.map(el => ({
            tag: el.tagName,
            style: el.getAttribute('style'),
            offsetTop: el.offsetTop
        })))

        const allBreaks = []

        // Get manual page break positions from display
        const manualBreaks = pageBreakElements.map((elem, index) => {
            const offsetTop = elem.offsetTop
            console.log(`Manual page break ${index + 1} at:`, offsetTop, 'px')
            return { position: offsetTop, isManual: true }
        }).sort((a, b) => a.position - b.position)

        // Calculate natural breaks between manual breaks (and before first, after last)
        const segments = []

        // Segment before first manual break (if any)
        if (manualBreaks.length > 0) {
            segments.push({ start: 0, end: manualBreaks[0].position })

            for (let i = 0; i < manualBreaks.length - 1; i++) {
                segments.push({ start: manualBreaks[i].position, end: manualBreaks[i + 1].position })
            }

            segments.push({ start: manualBreaks[manualBreaks.length - 1].position, end: firstChild.scrollHeight })
        } else {
            segments.push({ start: 0, end: firstChild.scrollHeight })
        }

        console.log('Content segments:', segments)
        console.log('Number of segments:', segments.length)

        // Calculate height ratio for diagnostics
        const heightRatio = displayHeight / printHeight

        // Add natural breaks within each segment
        segments.forEach((segment, segIndex) => {
            const segmentHeight = segment.end - segment.start
            const numPagesInSegment = Math.ceil(segmentHeight / pageHeight)

            console.log(`Segment ${segIndex}: height=${segmentHeight}px, pages=${numPagesInSegment}`)

            for (let i = 1; i < numPagesInSegment; i++) {
                // Calculate natural break position
                const basePosition = segment.start + (i * pageHeight)

                // Dynamic adjustment based on WHICH NATURAL BREAK this is overall
                // Not based on segment, but on the absolute page number
                const overallBreakNumber = allBreaks.length + 1

                // Progressive adjustment: first break needs to go down, subsequent breaks need to go up more
                let adjustment = 0
                if (overallBreakNumber === 1) {
                    // First natural page break (1-2)
                    adjustment = 20
                } else if (overallBreakNumber === 2) {
                    // Second natural break (2-3) - needs smaller upward correction
                    adjustment = -20
                } else {
                    // Later breaks (3-4+) - need larger upward correction
                    adjustment = -40
                }

                const naturalBreak = basePosition + adjustment
                allBreaks.push({ position: naturalBreak, isManual: false })
                console.log(`  Natural break ${i} in segment ${segIndex} (overall break #${overallBreakNumber}):`, {
                    basePosition,
                    adjustment,
                    finalPosition: naturalBreak,
                    heightRatio: heightRatio.toFixed(3),
                    isFirstSegment: segIndex === 0,
                    overallBreakNumber
                })
            }
        })

        // Add manual breaks
        allBreaks.push(...manualBreaks)

        // Sort and deduplicate by position
        const sortedBreaks = allBreaks
            .sort((a, b) => a.position - b.position)
            .filter((breakItem, index, arr) =>
                index === 0 || breakItem.position !== arr[index - 1].position
            )
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
                    {pageBreakPositions.map((breakItem, i) => (
                        <div
                            key={i}
                            className="page-break-indicator"
                            style={{
                                position: 'absolute',
                                left: '-0.5in',
                                right: '-0.5in',
                                top: `${breakItem.position}px`,
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
                                fontWeight: 'bold',
                                textAlign: 'center'
                            }}>
                                <div>Page {i + 1} / {i + 2}</div>
                                {breakItem.isManual && <div style={{ fontSize: '8px', marginTop: '2px' }}>Manual</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default PagedResumeRenderer
