import Anthropic from '@anthropic-ai/sdk'

export async function generateBeat(req, res) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const { prompt } = req.body
  // No prompt = a generic prefetch ping — don't burn tokens on a default prompt
  if (!prompt) {
    return res.status(400).json({ error: 'missing prompt' })
  }
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    res.json({ content: message.content[0].text })
  } catch (e) {
    res.status(503).json({ error: 'stub' })
  }
}

export const generateHandler = generateBeat
