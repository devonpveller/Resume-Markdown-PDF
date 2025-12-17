import puppeteer from 'puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function exportPDF() {
    console.log('🚀 Starting PDF export process...')

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
        const page = await browser.newPage()

        // Set viewport to match letter size
        await page.setViewport({
            width: 816,  // 8.5 inches at 96 DPI
            height: 1056, // 11 inches at 96 DPI
            deviceScaleFactor: 2
        })

        console.log('📄 Loading resume from dev server...')

        // Load the built Vite app
        await page.goto('http://localhost:3000', {
            waitUntil: 'networkidle0',
            timeout: 30000
        })

        console.log('⏳ Waiting for fonts to load...')

        // Wait for fonts to be ready
        await page.evaluateHandle('document.fonts.ready')

        // Additional wait for rendering stability
        await new Promise(resolve => setTimeout(resolve, 2000))

        console.log('✨ Generating PDF...')

        // Generate timestamp for filename
        const timestamp = new Date().toISOString().split('T')[0]

        // Determine output path
        let outputPath
        if (process.env.EXPORT_DIR) {
            // If EXPORT_DIR ends with .pdf, use it as the full path
            if (process.env.EXPORT_DIR.endsWith('.pdf')) {
                outputPath = process.env.EXPORT_DIR
            } else {
                // Otherwise treat it as a directory
                outputPath = path.join(process.env.EXPORT_DIR, `Resume-Devon-Veller-${timestamp}.pdf`)
            }
        } else {
            // Default to export-to-pdf directory
            outputPath = path.join(__dirname, '..', `Resume-Devon-Veller-${timestamp}.pdf`)
        }

        console.log('Export path:', outputPath)

        // Generate PDF with exact settings
        await page.pdf({
            path: outputPath,
            format: 'Letter',
            printBackground: true,
            margin: {
                top: '0in',
                right: '0in',
                bottom: '0in',
                left: '0in'
            },
            preferCSSPageSize: false,
            displayHeaderFooter: false
        })

        console.log(`✅ PDF exported successfully: ${outputPath}`)

        return outputPath

    } catch (error) {
        console.error('❌ Error during PDF export:', error)
        throw error
    } finally {
        await browser.close()
    }
}

// Run export
exportPDF()
    .then(pdfPath => {
        console.log('🎉 Export complete!')
        process.exit(0)
    })
    .catch(error => {
        console.error('Failed to export PDF:', error)
        process.exit(1)
    })
