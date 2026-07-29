import Anthropic from '@anthropic-ai/sdk'

export async function generateBeat(req, res) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const { prompt } = req.body
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt || 'Generate a beat for La Casa game' }],
    })
    res.json({ content: message.content[0].text })
  } catch (e) {
    res.status(503).json({ error: 'stub' })
  }
}

export const generateHandler = generateBeat
