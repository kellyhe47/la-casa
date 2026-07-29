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
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )
    if (!response.ok) {
      return res.status(503).json({ error: 'stub' })
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    const buffer = await response.arrayBuffer()
    res.send(Buffer.from(buffer))
  } catch (e) {
    res.status(503).json({ error: 'stub' })
  }
}
