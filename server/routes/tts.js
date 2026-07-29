export async function ttsHandler(req, res) {
  const { text, voiceId, lang } = req.body
  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: 'stub' })
  }
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
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
      }
    )
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`[tts] ElevenLabs ${response.status} for voice ${voiceId}: ${body.slice(0, 500)}`)
      return res.status(503).json({ error: 'stub' })
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    const buffer = await response.arrayBuffer()
    res.send(Buffer.from(buffer))
  } catch (e) {
    console.error(`[tts] request failed for voice ${voiceId}: ${e.message}`)
    res.status(503).json({ error: 'stub' })
  }
}
