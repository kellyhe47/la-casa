import { readAsset, ttsCacheKey, writeAsset } from '../assetCache.js'
import { apiKey, callUpstream, sendUpstreamFailure } from '../upstream.js'

const sendAudio = (res, bytes) => {
  res.setHeader('Content-Type', 'audio/mpeg')
  res.send(Buffer.from(bytes))
}

export async function ttsHandler(req, res) {
  const { text, voiceId, lang } = req.body ?? {}

  // PRD §5: almost all TTS text is a fixed string, so the hit rate approaches
  // 100% after a few sessions — and ElevenLabs bills per character.
  const key = ttsCacheKey({ text, voiceId, lang })
  const cached = await readAsset({ key, provider: 'elevenlabs' })
  if (cached) {
    return sendAudio(res, cached.bytes)
  }

  const result = await callUpstream({
    provider: 'elevenlabs',
    url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    init: {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey('elevenlabs'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        // Pin the language (es-MX -> "es") — without this the model
        // auto-detects per line, and short exclamations can render with a
        // noticeably different accent/intonation
        ...(lang ? { language_code: lang.split('-')[0].toLowerCase() } : {}),
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  })
  if (!result.ok) {
    // Failures are never cached — the next call retries the provider.
    return sendUpstreamFailure(res, result.failure)
  }

  const buffer = Buffer.from(await result.response.arrayBuffer())
  await writeAsset({ key, kind: 'tts', mime: 'audio/mpeg', bytes: buffer })

  sendAudio(res, buffer)
}
