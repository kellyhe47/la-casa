// TICKET 012 / PRD v2 E2 — the anonymous device UUID (D2).
//
// Generated on first visit, held in localStorage under LEARNER_ID_KEY, sent as
// `X-Learner-Id` on every API call. localStorage holds ONLY this uuid — never a
// graph or state mirror, so there is nothing to diverge or reconcile.

/** The single localStorage key this app is allowed to write. */
export const LEARNER_ID_KEY = 'lacasa.learnerId'

/** The header every API request must carry (E2 / E3). */
export const LEARNER_ID_HEADER = 'X-Learner-Id'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Only used when localStorage is unavailable (private mode, storage disabled),
 *  so the id at least stays stable for the life of the page. localStorage is
 *  the source of truth whenever it works — a module variable would not survive
 *  a reload. */
let fallbackId: string | null = null

function storage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null
  } catch {
    return null
  }
}

function readStored(): string | null {
  try {
    const raw = storage()?.getItem(LEARNER_ID_KEY) ?? null
    return raw && UUID_RE.test(raw) ? raw : null
  } catch {
    return null
  }
}

function generateUuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  // Defensive fallback for environments without crypto.randomUUID.
  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** The device's learner uuid, minted on first call and persisted thereafter. */
export function getLearnerId(): string {
  const store = storage()
  if (!store) return (fallbackId ??= generateUuid())

  const stored = readStored()
  if (stored) return stored

  const id = generateUuid()
  try {
    store.setItem(LEARNER_ID_KEY, id)
  } catch {
    // Storage refused the write — the in-memory fallback carries the session.
    fallbackId ??= id
    return fallbackId
  }
  return id
}

/** Standard headers for every JSON API call: content type + learner identity.
 *  A plain object (not a Headers instance) so callers can inspect/extend it. */
export function apiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    [LEARNER_ID_HEADER]: getLearnerId(),
  }
}
