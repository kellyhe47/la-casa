import { apiKey, callUpstream, sendUpstreamFailure } from '../upstream.js'

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'

export async function generateBeat(req, res) {
  const { prompt } = req.body ?? {}
  // No prompt = a generic prefetch ping — don't burn tokens on a default prompt
  if (!prompt) {
    return res.status(400).json({ error: 'missing prompt' })
  }

  const result = await callUpstream({
    provider: 'anthropic',
    url: ANTHROPIC_MESSAGES_URL,
    init: {
      method: 'POST',
      headers: {
        'x-api-key': apiKey('anthropic'),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    },
  })
  if (!result.ok) {
    return sendUpstreamFailure(res, result.failure)
  }

  const data = await result.response.json()
  res.json({ content: data?.content?.[0]?.text ?? '' })
}

export const generateHandler = generateBeat
