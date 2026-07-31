// /observability dashboard + /debug/* routes — PRD v2 §9 (Workstream H), H1/H3/H4.
//
// These routes MUST be registered above the SPA catch-all in `server/app.js`:
// below it, `/observability` quietly answers 200 index.html and every test that
// only checks the status code still passes (PRD §12).

import { buildMetrics, isErrorEvent, resolveWindow } from '../metrics.js'

const LOG_LIMIT = 200

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/**
 * Shared-secret gate for `/observability` and the whole `/debug/*` prefix.
 *
 * CLOSED BY DEFAULT: with `OBSERVABILITY_KEY` unset or empty every gated route
 * is denied. An unconfigured deploy must not become an open window onto learner
 * data. The variable is read per request so rotating it takes effect without a
 * restart — and so a test can flip it on an already-built app.
 */
export function observabilityGate(req, res, next) {
  const expected = process.env.OBSERVABILITY_KEY
  if (!expected || req.query?.key !== expected) {
    // Never fall through to the SPA: a denial that renders the game looks like
    // success to a browser and hides the misconfiguration.
    return res.status(401).json({ error: 'unauthorized' })
  }
  return next()
}

/**
 * The dashboard shell. Ticket 020 (H3) fills these panels with Chart.js reading
 * /debug/metrics; the document identity (`id="observability-dashboard"`, and
 * pointedly NOT the SPA's `id="root"`) is what H1 pins.
 */
export function renderDashboard(key) {
  const q = encodeURIComponent(key ?? '')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Observability &mdash; La Casa</title>
<style>
  body { font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px;
         background: #10131a; color: #e6e8ee }
  h1 { font-size: 18px; margin: 0 0 4px }
  p.sub { margin: 0 0 20px; color: #98a2b3 }
  nav a { color: #7cc4ff; margin-right: 16px }
  .panels { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)) }
  .panel { background: #171b24; border: 1px solid #262c39; border-radius: 8px; padding: 16px }
  .panel h2 { font-size: 14px; margin: 0 0 8px }
  .panel p { color: #98a2b3; margin: 0 }
</style>
</head>
<body>
<main id="observability-dashboard" data-metrics-url="/debug/metrics?key=${q}">
  <h1>La Casa &mdash; observability</h1>
  <p class="sub">Operational view. Aggregates only; no raw learner rows on this page.</p>
  <nav>
    <a href="/debug/metrics?key=${q}&amp;window=1h">metrics (1h)</a>
    <a href="/debug/metrics?key=${q}&amp;window=24h">metrics (24h)</a>
    <a href="/debug/logs?key=${q}">recent events</a>
  </nav>
  <div class="panels">
    <section class="panel" id="panel-upstream"><h2>Upstream health</h2>
      <p>p95 latency and failures per provider.</p></section>
    <section class="panel" id="panel-cache"><h2>Cache hit rate</h2>
      <p>Hits vs misses per provider.</p></section>
    <section class="panel" id="panel-learning"><h2>Learning signal</h2>
      <p>Pass rate and independence band over the timeline.</p></section>
  </div>
</main>
</body>
</html>
`
}

export function dashboardHandler(req, res) {
  res.type('html').send(renderDashboard(req.query?.key))
}

/**
 * H2 — time-bucketed series, never raw rows. Reads a little wider than the
 * window (the store's `since` is exclusive) and lets `buildMetrics` apply the
 * inclusive `from <= ts <= to` filter.
 */
export function metricsHandler(resolveStore) {
  return async (req, res) => {
    const resolved = resolveWindow(req.query?.window)
    const now = Date.now()
    try {
      const store = await resolveStore()
      const rows = await store.queryEvents({ since: new Date(now - resolved.window_ms - 1) })
      res.json(buildMetrics(rows, { window: resolved.window, now }))
    } catch (e) {
      console.error(`[observability] metrics failed error=${e?.message ?? String(e)}`)
      res.status(500).json({ error: 'metrics_unavailable' })
    }
  }
}

function logRow(row) {
  const classAttr = isErrorEvent(row) ? ' class="error"' : ''
  const ts = row.ts instanceof Date ? row.ts.toISOString() : new Date(row.ts).toISOString()
  const cells = [
    row.id,
    ts,
    row.type,
    row.learner_id ?? '',
    JSON.stringify(row.payload ?? {}),
  ]
  return `<tr${classAttr} data-event-id="${row.id}">${cells
    .map((c) => `<td>${escapeHtml(c)}</td>`)
    .join('')}</tr>`
}

export function renderLogs(rows) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Recent events &mdash; La Casa</title>
<style>
  body { font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0; padding: 24px;
         background: #10131a; color: #e6e8ee }
  h1 { font: 600 16px/1.4 ui-sans-serif, system-ui, sans-serif; margin: 0 0 12px }
  table { border-collapse: collapse; width: 100% }
  th, td { border-bottom: 1px solid #262c39; padding: 6px 8px; text-align: left;
           vertical-align: top; word-break: break-word }
  th { color: #98a2b3; font-weight: 600 }
  tr.error { background: #3a1218 }
  tr.error td { color: #ffb4b4 }
</style>
</head>
<body>
<h1>Last ${LOG_LIMIT} events (newest first)</h1>
<table>
<thead><tr><th>id</th><th>ts</th><th>type</th><th>learner</th><th>payload</th></tr></thead>
<tbody>
${rows.map(logRow).join('\n')}
</tbody>
</table>
</body>
</html>
`
}

/** H4 — the fallback view if the charts get cut: last 200 rows, newest first. */
export function logsHandler(resolveStore) {
  return async (req, res) => {
    try {
      const store = await resolveStore()
      const rows = await store.queryEvents({ limit: LOG_LIMIT })
      res.type('html').send(renderLogs(rows))
    } catch (e) {
      console.error(`[observability] logs failed error=${e?.message ?? String(e)}`)
      res.status(500).type('html').send('<h1>logs unavailable</h1>')
    }
  }
}

/**
 * Mount everything behind the one gate. Call this ABOVE the SPA catch-all.
 * The `app.use('/debug', …)` gate covers the whole prefix, including paths no
 * route claims — those 404 as JSON rather than leaking the SPA.
 */
export function registerObservabilityRoutes(app, resolveStore) {
  app.get('/observability', observabilityGate, dashboardHandler)

  app.use('/debug', observabilityGate)
  app.get('/debug/metrics', metricsHandler(resolveStore))
  app.get('/debug/logs', logsHandler(resolveStore))
  app.use('/debug', (req, res) => res.status(404).json({ error: 'not_found' }))
}
