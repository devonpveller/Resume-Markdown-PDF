import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
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
