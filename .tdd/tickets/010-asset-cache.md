---
id: 010
title: "D1/D2/D3 — server-side global asset cache for images and TTS"
status: green
depends_on: [005, 008]
touches: [server/store.js, server/schema.sql, server/assetCache.js, server/routes/image.js, server/routes/tts.js, server/app.js]
iterations: 1
test_files: [server/assetCache.test.js]
branch: ""
---

## Scope

PRD §5 (Workstream D). `/image` and `/tts` check the cache before calling the provider;
on miss they call, store, and return. The cache is **global across all users** (D3) —
user A's fish photo serves user B — and **permanent**, no expiry (D6).

Key format is fixed by PRD §5.1:
- image → `img:<word>`
- tts → `tts:<sha256(text|voiceId|lang)>`

D3: a `cache_version` prefix on keys is the manual bust mechanism.

Every response sets `cache_hit` truthfully in its `upstream` event row (ticket 008 wrote
`false` unconditionally; this ticket makes it real).

**Text/LLM is explicitly NOT cached** (D4, PRD §5) — `/generate` must be left alone.

## Acceptance criteria

- [ ] First `/image` for a word calls the provider once, stores bytes, and returns the image
- [ ] Second `/image` for the **same word** makes **no** provider call and returns identical bytes
- [ ] A second `/image` from a *different* `X-Learner-Id` still hits the cache (global, not per-user)
- [ ] First `/tts` for a `(text, voiceId, lang)` triple calls the provider; the second does not
- [ ] Changing **any** of text, voiceId or lang produces a different key and a fresh provider call
- [ ] The TTS key is `tts:` + the sha256 of `text|voiceId|lang`
- [ ] The image key is `img:<word>`
- [ ] A cache hit writes an `upstream` event with `cache_hit:true`; a miss writes `cache_hit:false`
- [ ] Changing the `cache_version` prefix busts the cache — the next call goes to the provider
- [ ] An upstream **failure** is not cached: after a 502, a retry calls the provider again
- [ ] `/generate` is never cached — two identical `/generate` calls both reach the provider
- [ ] `asset_cache` DDL in `schema.sql` matches PRD §5.1 exactly (`key` pk, `kind`, `mime`, `bytes bytea`, `created_at`)

## Test plan

_(test-writer fills in)_

## Attempt log
