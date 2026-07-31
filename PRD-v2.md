# La Casa — PRD v2: Observability, Persistence, Caching

> Scope: a single ~24-hour build on top of the shipped MVP ([PRD.md](./PRD.md)).
> Target: Railway production, demoed live.
> Vocabulary: [CONTEXT.md](./CONTEXT.md).

**Why this build:** the MVP proves the pedagogy but is blind, amnesiac, and pays full price for identical content on every session. Three workstreams fix that, plus two correctness bugs that persistence would otherwise turn from harmless into harmful.

---

## 1. Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| D1 | State store | Railway Postgres, sole source of truth. No SQLite (Railway's filesystem is ephemeral — a `.db` file is wiped every deploy). |
| D2 | Identity | Anonymous device UUID, generated client-side, held in localStorage, sent on every API call. No login, no PII. |
| D3 | Content cache | Server-side, **global across all users**, on demand only. No offline pre-generation. |
| D4 | What gets cached | Images (`word`) and TTS (`text`, `voiceId`, `lang`). **Not** text/LLM. |
| D5 | Cache storage | Postgres. No R2/S3. |
| D6 | Cache expiry | Permanent. Prompts are deterministic; bust manually if prompt wording changes. |
| D7 | Band-driven scaffolding | Authored JSON variants, **not** LLM-generated. Mom and Dad only. |
| D8 | Band tiers | 1–4 Spanish-first · 5–6 bilingual · 7–10 English-only. Monotonically increasing English. |
| D9 | Band-down rule | 2 consecutive misses → −1 band. |
| D10 | Fridge misses | 2+ wrong letters on a word = one failure event = 2 misses = one band down. **Max one per fridge scene**, then recording stops. No fridge grace path. |
| D11 | Telemetry store | Postgres, one `events` table, three types. Log everything, successes included. |
| D12 | Telemetry UI | Self-built dashboard at `/observability`, Chart.js, 3 charts. No Grafana/Metabase/SaaS. |
| D13 | State write cadence | Every item boundary, fire-and-forget. |
| D14 | New game | Warm-seed reset, fresh UUID (old row preserved), confirm dialog, hidden for first-time players. |
| D15 | Dead `prefetchNext` | Delete. |
| D16 | Band on resume | Exact resume — a returning kid restarts at the band they left, with no time-based warm-down. Overrides the MVP's `R5.3: sessions start at band 3`. Decay is handled by D9: a genuinely rusty kid misses twice and the scaffolding returns within a minute. |

---

## 2. Workstream A — Error visibility

**Problem.** All three proxy routes return an identical `503 {error:'stub'}` for three unrelated conditions: missing API key, upstream error, upstream throw/timeout. [image.js](server/routes/image.js) and [generate.js](server/routes/generate.js) log nothing at all. Only [tts.js:33](server/routes/tts.js:33) has a `console.error`. **Today, if OpenAI starts rejecting requests mid-demo, the client silently degrades to SVG and nobody knows why.**

**A1.** Each route distinguishes and reports the three cases:
- no API key → `503 {error:'not_configured', provider}`
- upstream non-2xx → `502 {error:'upstream', provider, status}`, upstream body logged (truncated 500 chars)
- throw/timeout → `504 {error:'upstream_unreachable', provider}`

**A2.** Every upstream call is wrapped with a timer; `console.error` on every failure including provider, status, duration, and the truncated body.

**A3.** `GET /health` reports, per provider: key present (bool), last success timestamp, last failure timestamp.

**Acceptance:** killing `OPENAI_API_KEY` and killing network reachability produce visibly different status codes and log lines.

---

## 3. Workstream B — Cleanup (do before measuring)

**B1. Delete the three dead `prefetchNext` calls** ([LivingRoomScreen.tsx:204](client/src/screens/LivingRoomScreen.tsx:204), [FridgeScreen.tsx:134](client/src/screens/FridgeScreen.tsx:134), [BedroomScreen.tsx:138](client/src/screens/BedroomScreen.tsx:138)) and the `prefetchNext` method.

They pass no `prompt`, so [generate.js:6](server/routes/generate.js:6) returns `400` — and `fetchWithRetry` retries twice, so each is **3 doomed requests**. The living room and fridge have no generated text at all, so there is nothing to warm; the bedroom already has a real working prefetch in `prefetchNextSentence` ([BedroomScreen.tsx:58](client/src/screens/BedroomScreen.tsx:58)). Left in place, these would flood the new `events` table with 400s and make the upstream-health chart open on a wall of red during the demo.

**B2. Drop `seed` from the image cache key** ([ContentPipeline.ts:33](client/src/pipeline/ContentPipeline.ts:33)).

`imageHandler` destructures `seed` and never uses it ([image.js:2](server/routes/image.js:2)) — the prompt is purely word-derived, so output is identical. But `sessionSeed` is randomized per session, so **today every session pays to regenerate byte-identical images.** Without this fix the server cache in Workstream D can never be hit.

**B3.** Add `prompt` to `textKey()` ([ContentPipeline.ts:27](client/src/pipeline/ContentPipeline.ts:27)) — latent collision: two different prompts sharing beat/target/band/seed currently return each other's content.

---

## 4. Workstream C — Telemetry

**C1. Schema.** One table, three types, interleaved on a timeline (you almost always want "the grade that failed right after the TTS 503" in one query).

```sql
create table events (
  id          bigserial primary key,
  ts          timestamptz not null default now(),
  learner_id  uuid,
  type        text not null,   -- 'upstream' | 'grade' | 'client_error'
  payload     jsonb not null
);
create index on events (ts desc);
create index on events (type, ts desc);
```

| type | payload |
|---|---|
| `upstream` | `route`, `provider`, `status`, `duration_ms`, `cache_hit` (bool), `error` (on failure) |
| `grade` | `word`, `node_ids`, `result`, `similarity`, `band_before`, `band_after`, `screen` |
| `client_error` | `kind` (fetch/speech/js), `message`, `screen` |

**C2.** Express middleware records one `upstream` row for **every** proxy call, success and failure. Successes are required — without them there is no success *rate* and no latency percentile, and "ElevenLabs is slow" is invisible.

**C3.** `POST /events` accepts client-side batches (`grade`, `client_error`). Fire-and-forget from the client.

**C4.** Retention: `delete from events where ts < now() - interval '30 days'`, run on boot.

**Volume check:** ~60 rows/session. A thousand sessions is 60k rows. Non-issue.

---

## 5. Workstream D — Server-side content cache

**D1. Schema.**

```sql
create table asset_cache (
  key         text primary key,   -- 'img:fish' | 'tts:<sha256(text|voiceId|lang)>'
  kind        text not null,      -- 'image' | 'tts'
  mime        text not null,
  bytes       bytea not null,
  created_at  timestamptz not null default now()
);
```

**D2.** `/image` and `/tts` check the cache before calling the provider; on miss, call, store, return. Global — user A's fish photo serves user B. Every response sets `cache_hit` in its `upstream` event row.

**D3.** No expiry (D6). A `cache_version` prefix on keys is the manual bust mechanism if a prompt changes.

**Why TTS matters more than it looks:** almost all TTS text is a fixed string, not generated. Abuela's voice note is the constant `"Mija, ¿qué dice aquí?"` ([sessionPrefetch.ts:8](client/src/pipeline/sessionPrefetch.ts:8)); Papá's prompts are a hardcoded lookup ([FridgeScreen.tsx:87](client/src/screens/FridgeScreen.tsx:87)); Mamá's lines are literals. Hit rate approaches 100% after a few sessions. ElevenLabs bills per character, and today every session re-pays for identical audio.

**Not cached: text/LLM.** Variety is a feature there — `sentenceGen` deliberately varies its key per page and retry and passes `usedSentences` to avoid repeats. Caching would fight that, and Haiku generating a 5-word sentence is a fraction of a cent.

**Size estimate:** ~45 words × ~500KB images + a few MB of MP3s ≈ 30MB.

---

## 6. Workstream E — Learner persistence

**E1. Schema.**

```sql
create table learners (
  id          uuid primary key,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
create table learner_state (
  learner_id  uuid primary key references learners(id),
  graph       jsonb not null,
  independence int not null,
  updated_at  timestamptz not null default now()
);
```

Shaped so a player code or profile picker can be layered on later as a column + lookup route, not a migration.

**E2.** Client generates a UUID on first visit, stores it in localStorage, sends it as `X-Learner-Id` on every request. localStorage holds **only** the UUID — no graph mirror, so there is no divergence/reconciliation logic.

**E3.** `GET /state/:id` → `{graph, independence}` or 404. `PUT /state/:id` upserts. Both scoped by the header UUID.

**E4. Write cadence:** every item boundary (D13), fire-and-forget, `.catch()` logs a `client_error`. A failed save never interrupts gameplay. ~30 writes/session of ~6KB.

**E5. `SkillGraph` constructor must accept a saved independence value.** [SkillGraph.ts:11](client/src/graph/SkillGraph.ts:11) hardcodes `_independence = 3`. `toJSON()` writes the band out; nothing can read it back. **Without this the headline feature silently half-fails — nodes resume, band always snaps to 3.** Highest-risk line in this PRD; build it early and test it explicitly.

**E6. Truncate `attempts` to the last 50 per node on serialize.** `GraphNode.attempts` is append-only and unbounded; `recordItemBoundary` only ever reads the last 20. Keeps the payload flat at ~6KB forever. Note the coupling: `_allAttempts` is rebuilt from `node.attempts` in the constructor, so truncating below ~20 would corrupt band computation.

**E7. Startup flow:** UUID present + state found → hydrate, skip nothing, run the normal rail (Abuela → Papá → Mamá). Resume is **silent** — no "welcome back". The fiction is one continuous evening. Only the band and node mastery differ.

**E8. Exact band resume (D16).** The saved band is restored as-is regardless of how long the kid has been away — no time-based warm-down. New players (no saved state) default to 3, preserving the MVP's `R5.3` behaviour. Skill decay needs no special rule: a rusty kid trips the 2-consecutive-miss rule (F1) within the first minute and the scaffolding returns on its own.

---

## 7. Workstream F — Band-down fix

**Problem.** Bands ratchet upward and realistically never fall. Down requires ≥3 misses in the last 5 ([SkillGraph.ts:78](client/src/graph/SkillGraph.ts:78)), but grace caps consecutive misses at 2; the bedroom grace writes a **fake pass**; and the fridge records only passes. Today this is invisible because every session resets to band 3. **Persistence makes it bite: a struggling kid climbs to 7+ and is permanently stranded in an English-only world.** F must ship with E.

**F1.** Band-down rule → **2 consecutive misses = −1 band** (floor 1). This is exactly the grace trigger, so the rule reads: *every graced item costs a band.*

**F2.** Delete the fake pass at [BedroomScreen.tsx:153](client/src/screens/BedroomScreen.tsx:153). `graph.update(uniqueNodeIds, 1)` after a double failure credits **every node in the sentence at full mastery** for a sentence the kid could not read — a straight correctness bug that inverts "generous credit, precise blame", independent of bands.

**F3.** Call `recordItemBoundary()` on the miss branches in the living room and bedroom, not only on pass/grace.

**F4. Fridge misses (D10).** `handleWordComplete` currently returns early on a wrong letter ([FridgeScreen.tsx:106](client/src/screens/FridgeScreen.tsx:106)) and records nothing. New behaviour: the first word in a fridge scene where the kid places 2+ wrong letters records one failure event (2 misses → one band down), then a scene-level flag disables all further miss recording. Subsequent misses change nothing. No grace path — the tray always permits eventual success, so there is no stuck state.

**Net shape:** up 1 slowly (needs a 3-pass streak), down 1 immediately on a failed item. A kid can never get stranded.

---

## 8. Workstream G — Band-tiered dialogue

**Problem.** "The world turns English as the band rises" is currently two `if` statements: gloss auto-show at ≤2 ([BookInstrument.tsx:13](client/src/components/BookInstrument.tsx:13)) and Mamá's arrival line at ≥7 ([BedroomScreen.tsx:219](client/src/screens/BedroomScreen.tsx:219)). `INDEPENDENCE_RULES` ([storyBible.ts:37](client/src/pipeline/storyBible.ts:37)) and `BEAT_TEMPLATES` ([beatSchema.ts:39](client/src/pipeline/beatSchema.ts:39)) are fully specified and imported by nothing. `buildPrompt` ([sentenceGen.ts:37](client/src/pipeline/sentenceGen.ts:37)) accepts `independence` and ignores it.

**G1.** New `content/lines.json`: for every Mom and Dad line, three authored variants keyed by tier.

| Tier | Bands | Form |
|---|---|---|
| `spanish-first` | 1–4 | Line delivered in Spanish; English only for the target word. Most support. |
| `bilingual` | 5–6 | Full line in Spanish, then full line in English. |
| `english-only` | 7–10 | No Spanish. Least support. |

**G2.** `getLine(key, band)` resolves tier → variant. Replaces the hardcoded `dadPrompts` tables ([FridgeScreen.tsx:87](client/src/screens/FridgeScreen.tsx:87) and :146) and Mamá's literals.

**G3. Out of scope:** Abuela (Spanish always, by design) and the baby's babble. Their strings stay as-is.

**Why authored, not LLM:** deterministic, zero latency, no mid-demo failure mode, and it keeps the TTS cache hit rate near 100% because the string set stays small and fixed. Sessions start at band 3 → `spanish-first`, as designed.

---

## 9. Workstream H — `/observability` dashboard

**H1.** Route at `/observability`, gated by a shared secret query param. **Must be registered before the SPA catch-all** at [app.js:58](server/app.js:58), or it silently returns the game.

**H2.** Aggregate endpoints (`/debug/metrics?window=1h`) returning time-bucketed series — not raw rows.

**H3.** Three charts, Chart.js from CDN:

1. **Upstream health** — p95 latency line per provider (ElevenLabs / OpenAI / Anthropic), failures as red markers. The original question: *is it breaking?*
2. **Cache hit rate** — hits vs. misses per provider over time. The cost story in one picture.
3. **Learning signal** — pass rate and independence band over the session timeline. Not ops telemetry: evidence the pedagogy works. **Protect this one if time runs short** — 1 and 2 are table stakes; 3 is the differentiated chart.

**H4.** `GET /debug/logs?key=…` — last 200 rows as an HTML table, errors highlighted. Fallback if charts get cut.

---

## 10. Build order

Sequenced so the riskiest item is proven early and each step is independently demoable.

| # | Work | Est. |
|---|---|---|
| 1 | A — Error visibility | 1h |
| 2 | B — Delete dead prefetch, fix image cache key | 0.5h |
| 3 | C — Postgres + `events` + middleware | 2h |
| 4 | D — Server-side asset cache | 2h |
| 5 | E — Persistence (UUID, routes, **constructor fix**, truncation) | 3h |
| 6 | New game button + confirm dialog | 1h |
| 7 | F — Band-down fix | 1.5h |
| 8 | G — Band-tiered Mom/Dad lines | 2.5h |
| 9 | H — `/observability` dashboard | 3h |

**~17h in a 24h window** — deliberate slack.

**If behind:** cut H3 down to H4 (table instead of charts). **Do not split 5 and 7** — persistence without the band-down fix ships the mode that strands kids in English.

---

## 11. Explicitly out of scope

- Pre-generating the content pool offline
- Object storage (R2/S3) for assets
- Player codes or profile pickers
- LLM-generated character dialogue
- A fridge grace path
- Alerting (the dashboard is watched live)
- Any ASR change

---

## 12. Known risks

| Risk | Mitigation |
|---|---|
| `SkillGraph` constructor drops saved band (E5) | Build first, explicit test: save at band 7, reload, assert 7 |
| `/observability` shadowed by SPA catch-all | Register routes before `app.get('*')` |
| Dead prefetch floods the health chart with 400s | B1 before C |
| Image cache never hits | B2 before D |
| Postgres publicly exposed | Keep it on Railway's private network; no external BI tool |
| Debug routes leak learner data | Shared-secret gate on `/observability` and `/debug/*` |
