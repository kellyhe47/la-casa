import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const clientRoot = __dirname
const monorepoRoot = path.resolve(__dirname, '..')
const gauntletRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      allow: [gauntletRoot],
    },
    proxy: {
      '/generate': 'http://localhost:3001',
      '/tts': 'http://localhost:3001',
      '/image': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(clientRoot, 'src/test-setup.ts')],
    server: {
      fs: {
        allow: [gauntletRoot],
      },
    },
  }
})
