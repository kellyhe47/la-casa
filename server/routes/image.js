import {
  apiKey,
  callUpstream,
  noteUpstreamFailure,
  sendUpstreamFailure,
} from '../upstream.js'

export async function imageHandler(req, res) {
  const { word } = req.body ?? {}

  const result = await callUpstream({
    provider: 'openai',
    url: 'https://api.openai.com/v1/images/generations',
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey('openai')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1-mini',
        prompt: `Hyper-realistic cartoon illustration of ${word}, warm appetizing Polaroid photo style, cozy family home`,
        n: 1,
        size: '1024x1024',
        quality: 'low',
      }),
    },
  })
  if (!result.ok) {
    return sendUpstreamFailure(res, result.failure)
  }

  const data = await result.response.json()
  const item = data?.data?.[0]
  // gpt-image-1 returns base64 (b64_json); DALL-E-style models return a url
  const url = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null)
  if (!url) {
    // 2xx but the payload is unusable — still an upstream fault.
    return sendUpstreamFailure(
      res,
      noteUpstreamFailure({
        provider: 'openai',
        status: result.response.status,
        durationMs: result.durationMs,
        body: 'image response contained neither url nor b64_json',
      })
    )
  }

  res.json({ url })
}
