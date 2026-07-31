import express from 'express'
import cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

import { getProviderHealth } from './providerHealth.js'
import { hasApiKey, notConfigured, sendUpstreamFailure } from './upstream.js'
import { getStore } from './store.js'
import { learnerIdOf, recordUpstreamEvent, runWithTelemetry } from './telemetry.js'
import { generateBeat } from './routes/generate.js'
import { ttsHandler } from './routes/tts.js'
import { imageHandler } from './routes/image.js'
import { eventsHandler } from './routes/events.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(__dirname, '../client/dist')

/**
 * Guard a provider-backed route: with no API key we answer 503 not_configured
 * and never reach the network.
 */
function requireProvider(provider, handler) {
  return async (req, res) => {
    if (!hasApiKey(provider)) {
      // This path never reaches callUpstream, so it records its own row —
      // a misconfigured key is exactly the failure telemetry must surface.
      recordUpstreamEvent({
        provider,
        status: 503,
        durationMs: 0,
        error: `not_configured:${provider}`,
      })
      return sendUpstreamFailure(res, notConfigured(provider))
    }
    return handler(req, res)
  }
}

/**
 * `store` is optional: tests inject a memory store, production falls back to
 * `getStore()`. `getStore()` is async but createApp must stay synchronous, so
 * the promise is created lazily and only awaited when a row is written.
 */
export function createApp({ store } = {}) {
  const app = express()

  let storePromise = null
  const resolveStore = () => (storePromise ??= Promise.resolve(store ?? getStore()))
  app.locals.resolveStore = resolveStore

  app.use(cors())
  app.use(express.json())

  // Bind the per-request telemetry context before any route runs, so the
  // callUpstream seam can attribute rows without threading `req` through every
  // handler signature.
  app.use((req, res, next) => {
    runWithTelemetry({ resolveStore, route: req.path, learnerId: learnerIdOf(req) }, next)
  })

  app.get('/health', (req, res) => {
    // Process-local only — must answer even when Postgres is down.
    res.json({ ok: true, providers: getProviderHealth() })
  })

  app.post('/generate', requireProvider('anthropic', generateBeat))
  app.post('/tts', requireProvider('elevenlabs', ttsHandler))
  app.post('/image', requireProvider('openai', imageHandler))

  app.post('/events', eventsHandler(resolveStore))

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
