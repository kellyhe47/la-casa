import { imageCacheKey, readAsset, writeAsset } from '../assetCache.js'
import {
  apiKey,
  callUpstream,
  noteUpstreamFailure,
  sendUpstreamFailure,
} from '../upstream.js'

const dataUrl = (b64) => `data:image/png;base64,${b64}`

export async function imageHandler(req, res) {
  const { word } = req.body ?? {}

  // PRD §5 D2: the cache is checked before the provider. A hit never touches
  // the network; `readAsset` writes the cache_hit upstream row itself.
  const key = imageCacheKey(word)
  const cached = await readAsset({ key, provider: 'openai' })
  if (cached) {
    return res.json({ url: dataUrl(Buffer.from(cached.bytes).toString('base64')) })
  }

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
    // Failures are never cached — the next call retries the provider.
    return sendUpstreamFailure(res, result.failure)
  }

  const data = await result.response.json()
  const item = data?.data?.[0]
  // gpt-image-1 returns base64 (b64_json); DALL-E-style models return a url
  const url = item?.url ?? (item?.b64_json ? dataUrl(item.b64_json) : null)
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

  // Only a base64 payload carries bytes to cache. A response with just a remote
  // url is passed through untouched — fetching it to fill the cache would be a
  // second, unlogged network call.
  if (item?.b64_json) {
    await writeAsset({
      key,
      kind: 'image',
      mime: 'image/png',
      bytes: Buffer.from(item.b64_json, 'base64'),
    })
  }

  res.json({ url })
}
