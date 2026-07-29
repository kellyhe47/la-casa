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
        model: 'gpt-image-1',
        prompt: `Hyper-realistic cartoon illustration of ${word}, warm appetizing Polaroid photo style, cozy family home`,
        n: 1,
        size: '1024x1024',
      }),
    })
    if (!response.ok) {
      return res.status(503).json({ error: 'stub' })
    }
    const data = await response.json()
    res.json({ url: data.data[0].url })
  } catch (e) {
    res.status(503).json({ error: 'stub' })
  }
}
