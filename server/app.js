import express from 'express'
import cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

import { getProviderHealth } from './providerHealth.js'
import { hasApiKey, notConfigured, sendUpstreamFailure } from './upstream.js'
import { generateBeat } from './routes/generate.js'
import { ttsHandler } from './routes/tts.js'
import { imageHandler } from './routes/image.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(__dirname, '../client/dist')

/**
 * Guard a provider-backed route: with no API key we answer 503 not_configured
 * and never reach the network.
 */
function requireProvider(provider, handler) {
  return async (req, res) => {
    if (!hasApiKey(provider)) {
      return sendUpstreamFailure(res, notConfigured(provider))
    }
    return handler(req, res)
  }
}

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/health', (req, res) => {
    // Process-local only — must answer even when Postgres is down.
    res.json({ ok: true, providers: getProviderHealth() })
  })

  app.post('/generate', requireProvider('anthropic', generateBeat))
  app.post('/tts', requireProvider('elevenlabs', ttsHandler))
  app.post('/image', requireProvider('openai', imageHandler))

  // Production: serve the built client (SPA) when it exists.
  // Keep this LAST — PRD §9 registers /observability and /debug/* above it.
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  return app
}
