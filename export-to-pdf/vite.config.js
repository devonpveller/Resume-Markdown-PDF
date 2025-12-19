import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execAsync = promisify(exec)

// Store custom export directory
let customExportDir = null

// Plugin to handle PDF export API
const exportApiPlugin = () => ({
    name: 'export-api',
    configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
            // Export path info endpoint
            if (req.url === '/api/export-path' && req.method === 'GET') {
                const today = new Date().toISOString().split('T')[0]
                const defaultDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
                const exportDir = customExportDir || defaultDir
                const fullPath = path.join(exportDir, `Resume-Devon-Veller-${today}.pdf`)

                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({
                    path: fullPath
                }))
                return
            }

            // Set export directory endpoint
            if (req.url === '/api/set-export-dir' && req.method === 'POST') {
                let body = ''
                req.on('data', chunk => { body += chunk.toString() })
                req.on('end', () => {
                    try {
                        const { directory } = JSON.parse(body)

                        // Validate directory exists
                        if (!fs.existsSync(directory)) {
                            res.writeHead(400, { 'Content-Type': 'application/json' })
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Directory does not exist'
                            }))
                            return
                        }

                        customExportDir = directory
                        const today = new Date().toISOString().split('T')[0]
                        const fullPath = path.join(directory, `Resume-Devon-Veller-${today}.pdf`)

                        console.log('Export directory updated to:', directory)

                        res.writeHead(200, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({
                            success: true,
                            path: fullPath
                        }))
                    } catch (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({
                            success: false,
                            error: error.message
                        }))
                    }
                })
                return
            }

            // Export PDF endpoint
            if (req.url === '/api/export-pdf' && req.method === 'POST') {
                try {
                    console.log('Export PDF requested...')

                    // Set environment variable for custom export directory
                    const env = { ...process.env }
                    if (customExportDir) {
                        env.EXPORT_DIR = customExportDir
                    }

                    // Run the export script
                    const { stdout, stderr } = await execAsync('npm run export', {
                        cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url))),
                        env
                    })

                    if (stderr && !stderr.includes('ExperimentalWarning')) {
                        console.error('Export stderr:', stderr)
                    }

                    console.log('Export completed:', stdout)

                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({
                        success: true,
                        message: 'PDF exported successfully',
                        output: stdout
                    }))
                } catch (error) {
                    console.error('Export failed:', error)
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({
                        success: false,
                        error: error.message
                    }))
                }
            } else {
                next()
            }
        })
    }
})

export default defineConfig({
    plugins: [react(), exportApiPlugin()],
    base: './', // Use relative paths for Electron compatibility
    server: {
        port: 3000,
        strictPort: true,
        fs: {
            // Allow serving files from parent directory
            allow: ['..']
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})
