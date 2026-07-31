---
id: 002
title: "A1/A2 — three-way upstream error taxonomy + timed calls"
status: green
depends_on: [001]
touches: [server/app.js, server/upstream.js, server/routes/generate.js, server/routes/image.js, server/routes/tts.js]
iterations: 1
test_files: [server/routes.test.js]
branch: ""
---

## Scope

PRD §2 (Workstream A), criteria A1 and A2. Today all three proxy routes collapse three
unrelated failures into an identical `503 {error:'stub'}`, and two of them log nothing.

Replace that with a three-way taxonomy on **each** of `/generate`, `/tts`, `/image`:

| Condition | Status | Body |
|---|---|---|
| API key missing | `503` | `{error:'not_configured', provider}` |
| upstream responded non-2xx | `502` | `{error:'upstream', provider, status}` |
| upstream threw / timed out | `504` | `{error:'upstream_unreachable', provider}` |

A2: wrap every upstream call in a timer. On **every** failure `console.error` a line
carrying provider, status, duration in ms, and the upstream body truncated to 500 chars.

Providers are named `anthropic` (/generate), `elevenlabs` (/tts), `openai` (/image).

**Convert `server/routes/generate.js` off the `@anthropic-ai/sdk` client to a plain
`fetch` against the Anthropic Messages API** (`POST https://api.anthropic.com/v1/messages`,
headers `x-api-key`, `anthropic-version: 2023-06-01`). This is required so all three
routes share one timed-fetch helper and all three are mockable at the same seam.
Keep the model id `claude-haiku-4-5` and the existing `400 {error:'missing prompt'}`
behaviour for a bodyless request.

Put the shared timing/classification helper in `server/upstream.js`.

**Not in scope:** recording events to the store (that is ticket 008) and `/health`
(ticket 003).

## Acceptance criteria

All three failure modes are tested **per route** (9 cases), with `fetch` mocked.

- [ ] `/generate` with no `ANTHROPIC_API_KEY` → 503 `{error:'not_configured', provider:'anthropic'}`
- [ ] `/generate`, key set, upstream returns 500 → 502 `{error:'upstream', provider:'anthropic', status:500}`
- [ ] `/generate`, key set, fetch rejects → 504 `{error:'upstream_unreachable', provider:'anthropic'}`
- [ ] `/tts` with no `ELEVENLABS_API_KEY` → 503 `not_configured` / `elevenlabs`
- [ ] `/tts`, upstream 401 → 502 `upstream` / `elevenlabs` / status 401
- [ ] `/tts`, fetch rejects → 504 `upstream_unreachable` / `elevenlabs`
- [ ] `/image` with no `OPENAI_API_KEY` → 503 `not_configured` / `openai`
- [ ] `/image`, upstream 429 → 502 `upstream` / `openai` / status 429
- [ ] `/image`, fetch rejects → 504 `upstream_unreachable` / `openai`
- [ ] On a non-2xx upstream, `console.error` is called with a message containing the provider, the status, a duration, and the upstream body
- [ ] An upstream body longer than 500 chars is truncated to at most 500 chars in the log line
- [ ] Success paths still work: `/generate` returns `{content}`, `/image` returns `{url}`, `/tts` returns audio bytes with `Content-Type: audio/mpeg`
- [ ] `/generate` with no `prompt` in the body still returns 400 `{error:'missing prompt'}`
- [ ] `/generate` no longer imports `@anthropic-ai/sdk`

## Test plan

_(test-writer fills in)_

## Attempt log

- iter 1: implemented taxonomy via new `server/upstream.js` seam; generate.js converted
  off @anthropic-ai/sdk to plain fetch. 67/67 server tests green. Regression gate caught
  4 stale MVP-era assertions in `client/src/__tests__/scaffold.test.ts` pinning the
  superseded `{error:'stub'}` / bare `{ok:true}` contract — routed to the test-writer as a
  wrong-test fix, NOT charged to the implementer.
