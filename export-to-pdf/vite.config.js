import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Plugin to handle PDF export API
const exportApiPlugin = () => ({
    name: 'export-api',
    configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/export-pdf' && req.method === 'POST') {
                try {
                    console.log('Export PDF requested...')

                    // Run the export script
                    const { stdout, stderr } = await execAsync('npm run export', {
                        cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)))
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
        assetsDir: 'assets'
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})
