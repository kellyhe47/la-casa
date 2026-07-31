// Thin data layer for La Casa (PRD §4.1).
//
// Two implementations behind one interface:
//   createMemoryStore()  — self-contained, no pg, used by every test
//   createPgStore(url)   — pg-backed, applies schema.sql on first use
//   getStore()           — pg when DATABASE_URL is set, memory otherwise

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const clone = (value) => (value === undefined ? value : structuredClone(value))

export function createMemoryStore() {
  const events = []
  const assets = new Map()
  const learners = new Map()
  const learnerState = new Map()
  let nextEventId = 1

  const eventRow = (row) => ({
    id: row.id,
    ts: new Date(row.ts.getTime()),
    learner_id: row.learner_id,
    type: row.type,
    payload: clone(row.payload),
  })

  return {
    async insertEvent({ learner_id = null, type, payload, ts }) {
      const row = {
        id: nextEventId++,
        ts: ts ? new Date(ts.getTime ? ts.getTime() : ts) : new Date(),
        learner_id,
        type,
        payload: clone(payload),
      }
      events.push(row)
      return eventRow(row)
    },

    async queryEvents({ type, since, limit } = {}) {
      let rows = events
      if (type !== undefined && type !== null) rows = rows.filter((r) => r.type === type)
      if (since) rows = rows.filter((r) => r.ts.getTime() > new Date(since).getTime())
      rows = [...rows].sort((a, b) => b.ts.getTime() - a.ts.getTime() || b.id - a.id)
      if (limit !== undefined && limit !== null) rows = rows.slice(0, limit)
      return rows.map(eventRow)
    },

    async deleteEventsOlderThan(date) {
      const cutoff = new Date(date).getTime()
      const kept = events.filter((r) => r.ts.getTime() >= cutoff)
      const deleted = events.length - kept.length
      events.length = 0
      events.push(...kept)
      return deleted
    },

    async getAsset(key) {
      const asset = assets.get(key)
      if (!asset) return null
      return { ...asset, bytes: Buffer.from(asset.bytes) }
    },

    async putAsset({ key, kind, mime, bytes }) {
      const row = {
        key,
        kind,
        mime,
        bytes: Buffer.from(bytes),
        created_at: assets.get(key)?.created_at ?? new Date(),
      }
      assets.set(key, row)
      return { ...row, bytes: Buffer.from(row.bytes) }
    },

    async upsertLearner(id) {
      const now = new Date()
      const existing = learners.get(id)
      const row = existing
        ? { ...existing, last_seen: now }
        : { id, created_at: now, last_seen: now }
      learners.set(id, row)
      return { id: row.id, created_at: new Date(row.created_at), last_seen: new Date(row.last_seen) }
    },

    async getLearnerState(id) {
      const state = learnerState.get(id)
      if (!state) return null
      return { graph: clone(state.graph), independence: state.independence }
    },

    async putLearnerState(id, { graph, independence }) {
      learnerState.set(id, { graph: clone(graph), independence })
      return { graph: clone(graph), independence }
    },
  }
}

export function createPgStore(connectionString) {
  let ready = null

  async function pool() {
    if (!ready) {
      ready = (async () => {
        const { default: pg } = await import('pg')
        const p = new pg.Pool({ connectionString })
        await p.query(readFileSync(join(__dirname, 'schema.sql'), 'utf8'))
        return p
      })()
    }
    return ready
  }

  async function query(text, params) {
    const p = await pool()
    return p.query(text, params)
  }

  return {
    async insertEvent({ learner_id = null, type, payload, ts }) {
      const { rows } = await query(
        `insert into events (ts, learner_id, type, payload)
         values (coalesce($1, now()), $2, $3, $4)
         returning id, ts, learner_id, type, payload`,
        [ts ?? null, learner_id, type, JSON.stringify(payload ?? {})],
      )
      return rows[0]
    },

    async queryEvents({ type, since, limit } = {}) {
      const { rows } = await query(
        `select id, ts, learner_id, type, payload
           from events
          where ($1::text is null or type = $1)
            and ($2::timestamptz is null or ts > $2)
          order by ts desc, id desc
          limit $3`,
        [type ?? null, since ?? null, limit ?? null],
      )
      return rows
    },

    async deleteEventsOlderThan(date) {
      const { rowCount } = await query('delete from events where ts < $1', [date])
      return rowCount
    },

    async getAsset(key) {
      const { rows } = await query(
        'select key, kind, mime, bytes, created_at from asset_cache where key = $1',
        [key],
      )
      return rows[0] ?? null
    },

    async putAsset({ key, kind, mime, bytes }) {
      const { rows } = await query(
        `insert into asset_cache (key, kind, mime, bytes)
         values ($1, $2, $3, $4)
         on conflict (key) do update
           set kind = excluded.kind, mime = excluded.mime, bytes = excluded.bytes
         returning key, kind, mime, bytes, created_at`,
        [key, kind, mime, Buffer.from(bytes)],
      )
      return rows[0]
    },

    async upsertLearner(id) {
      const { rows } = await query(
        `insert into learners (id) values ($1)
         on conflict (id) do update set last_seen = now()
         returning id, created_at, last_seen`,
        [id],
      )
      return rows[0]
    },

    async getLearnerState(id) {
      const { rows } = await query(
        'select graph, independence from learner_state where learner_id = $1',
        [id],
      )
      return rows[0] ?? null
    },

    async putLearnerState(id, { graph, independence }) {
      const { rows } = await query(
        `insert into learner_state (learner_id, graph, independence)
         values ($1, $2, $3)
         on conflict (learner_id) do update
           set graph = excluded.graph, independence = excluded.independence, updated_at = now()
         returning graph, independence`,
        [id, JSON.stringify(graph ?? {}), independence],
      )
      return rows[0]
    },
  }
}

export async function getStore() {
  const url = process.env.DATABASE_URL
  return url ? createPgStore(url) : createMemoryStore()
}
