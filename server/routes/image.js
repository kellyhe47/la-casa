export async function imageHandler(req, res) {
  const { word, seed } = req.body
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'stub' })
  }
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1-mini',
        prompt: `Hyper-realistic cartoon illustration of ${word}, warm appetizing Polaroid photo style, cozy family home`,
        n: 1,
        size: '1024x1024',
        quality: 'low',
      }),
    })
    if (!response.ok) {
      return res.status(503).json({ error: 'stub' })
    }
    const data = await response.json()
    const item = data.data?.[0]
    // gpt-image-1 returns base64 (b64_json); DALL-E-style models return a url
    const url = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null)
    if (!url) {
      return res.status(503).json({ error: 'stub' })
    }
    res.json({ url })
  } catch (e) {
    res.status(503).json({ error: 'stub' })
  }
}
