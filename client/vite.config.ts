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
    // Every path the client fetches must be listed here, or vite's SPA fallback
    // answers with index.html and the fire-and-forget handlers swallow it —
    // persistence and telemetry then fail silently in dev only.
    proxy: {
      '/generate': 'http://localhost:3001',
      '/tts': 'http://localhost:3001',
      '/image': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
      '/events': 'http://localhost:3001',        // C3 telemetry batches
      '/state': 'http://localhost:3001',         // E3 learner state GET/PUT
      '/debug': 'http://localhost:3001',         // H2/H4 metrics + logs
      '/observability': 'http://localhost:3001', // H1 dashboard
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
