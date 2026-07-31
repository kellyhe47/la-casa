import { apiKey, callUpstream, sendUpstreamFailure } from '../upstream.js'

export async function ttsHandler(req, res) {
  const { text, voiceId, lang } = req.body ?? {}

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
    return sendUpstreamFailure(res, result.failure)
  }

  const buffer = await result.response.arrayBuffer()
  res.setHeader('Content-Type', 'audio/mpeg')
  res.send(Buffer.from(buffer))
}
