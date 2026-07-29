import express from 'express'
import cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(__dirname, '../client/dist')

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/health', (req, res) => {
    res.json({ ok: true })
  })

  app.post('/generate', async (req, res) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'stub' })
    }
    try {
      const { generateBeat } = await import('./routes/generate.js')
      return generateBeat(req, res)
    } catch (e) {
      res.status(503).json({ error: 'stub' })
    }
  })

  app.post('/tts', async (req, res) => {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(503).json({ error: 'stub' })
    }
    try {
      const { ttsHandler } = await import('./routes/tts.js')
      return ttsHandler(req, res)
    } catch (e) {
      res.status(503).json({ error: 'stub' })
    }
  })

  app.post('/image', async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'stub' })
    }
    try {
      const { imageHandler } = await import('./routes/image.js')
      return imageHandler(req, res)
    } catch (e) {
      res.status(503).json({ error: 'stub' })
    }
  })

  // Production: serve the built client (SPA) when it exists
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  return app
}
