// /observability dashboard + /debug/* routes — PRD v2 §9 (Workstream H), H1/H3/H4.
//
// These routes MUST be registered above the SPA catch-all in `server/app.js`:
// below it, `/observability` quietly answers 200 index.html and every test that
// only checks the status code still passes (PRD §12).

import { buildMetrics, isErrorEvent, resolveWindow } from '../metrics.js'

const LOG_LIMIT = 200

/** PRD §9.3 — Chart.js comes from a CDN, not a bundle. */
const CHART_JS_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'

/**
 * The client half of H3. Deliberately key-free: it reads the metrics URL (which
 * already carries the key presented on THIS request) off the dashboard's
 * `data-metrics-url` attribute, so a rotated secret can never go stale here.
 * Plain ES5-ish, no template literals — this text is embedded in a JS template
 * string and must not carry `${` or a closing script tag.
 */
const DASHBOARD_SCRIPT = `
(function () {
  var root = document.getElementById('observability-dashboard')
  if (!root) return
  var metricsUrl = root.getAttribute('data-metrics-url')
  var url = metricsUrl + (metricsUrl.indexOf('?') === -1 ? '?' : '&') + 'window=1h'

  var PROVIDERS = ['elevenlabs', 'openai', 'anthropic']
  var COLORS = { elevenlabs: '#7cc4ff', openai: '#7ee7a8', anthropic: '#f6c177' }
  var FAIL = '#ff5c5c'
  var GRID = '#262c39'
  var TICK = '#98a2b3'
  var EMPTIES = ['empty-upstream', 'empty-cache', 'empty-learning']

  function setEmpty(id, show, text) {
    var node = document.getElementById(id)
    if (!node) return
    if (text) node.textContent = text
    node.style.display = show ? 'flex' : 'none'
  }

  function labelOf(iso) {
    var d = new Date(iso)
    return isNaN(d.getTime()) ? String(iso) : d.toISOString().slice(11, 16)
  }

  // Ascending, de-duplicated bucket timestamps: the shared x axis of a series.
  function bucketsOf(rows) {
    var seen = {}
    var out = []
    rows.forEach(function (r) {
      if (!seen[r.bucket]) { seen[r.bucket] = 1; out.push(r.bucket) }
    })
    out.sort()
    return out
  }

  // upstream/cache carry one row per (bucket, provider) — index them so each
  // provider becomes one dataset aligned to the shared bucket axis.
  function index(rows) {
    var map = {}
    rows.forEach(function (r) { map[r.provider + '|' + r.bucket] = r })
    return map
  }

  function providersIn(rows) {
    var present = {}
    rows.forEach(function (r) { present[r.provider] = 1 })
    var known = PROVIDERS.filter(function (p) { return present[p] })
    Object.keys(present).forEach(function (p) {
      if (known.indexOf(p) === -1) known.push(p)
    })
    return known
  }

  function colorOf(provider, i) {
    return COLORS[provider] || ['#c4b5fd', '#f9a8d4', '#5eead4'][i % 3]
  }

  function baseOptions(scales) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#e6e8ee', boxWidth: 12 } } },
      scales: scales,
    }
  }

  function axis(extra) {
    var a = { grid: { color: GRID }, ticks: { color: TICK } }
    for (var k in extra) a[k] = extra[k]
    return a
  }

  // ---- chart 1: upstream health --------------------------------------------
  // One p95 line per provider; any bucket with failures gets a red point.
  function drawUpstream(rows) {
    setEmpty('empty-upstream', rows.length === 0)
    if (rows.length === 0) return
    var labels = bucketsOf(rows)
    var byKey = index(rows)
    var datasets = providersIn(rows).map(function (provider, i) {
      var color = colorOf(provider, i)
      var points = labels.map(function (b) {
        var r = byKey[provider + '|' + b]
        return r ? r.p95_ms : null
      })
      var failed = labels.map(function (b) {
        var r = byKey[provider + '|' + b]
        return !!(r && r.failures > 0)
      })
      return {
        label: provider,
        data: points,
        borderColor: color,
        backgroundColor: color,
        spanGaps: true,
        tension: 0.25,
        pointRadius: function (ctx) { return failed[ctx.dataIndex] ? 5 : 3 },
        pointBackgroundColor: function (ctx) { return failed[ctx.dataIndex] ? FAIL : color },
        pointBorderColor: function (ctx) { return failed[ctx.dataIndex] ? FAIL : color },
      }
    })
    new Chart(document.getElementById('chart-upstream'), {
      type: 'line',
      data: { labels: labels.map(labelOf), datasets: datasets },
      options: baseOptions({
        x: axis({}),
        y: axis({ beginAtZero: true, title: { display: true, text: 'p95 ms', color: TICK } }),
      }),
    })
  }

  // ---- chart 2: cache hit rate ---------------------------------------------
  function drawCache(rows) {
    setEmpty('empty-cache', rows.length === 0)
    if (rows.length === 0) return
    var labels = bucketsOf(rows)
    var byKey = index(rows)
    var datasets = []
    providersIn(rows).forEach(function (provider, i) {
      var color = colorOf(provider, i)
      datasets.push({
        label: provider + ' hits',
        data: labels.map(function (b) {
          var r = byKey[provider + '|' + b]
          return r ? r.hits : 0
        }),
        backgroundColor: color,
        stack: provider,
      })
      datasets.push({
        label: provider + ' misses',
        data: labels.map(function (b) {
          var r = byKey[provider + '|' + b]
          return r ? r.misses : 0
        }),
        backgroundColor: color + '55',
        borderColor: color,
        borderWidth: 1,
        stack: provider,
      })
    })
    new Chart(document.getElementById('chart-cache'), {
      type: 'bar',
      data: { labels: labels.map(labelOf), datasets: datasets },
      options: baseOptions({
        x: axis({ stacked: true }),
        y: axis({ stacked: true, beginAtZero: true, title: { display: true, text: 'requests', color: TICK } }),
      }),
    })
  }

  // ---- chart 3: learning signal (the protected chart) ----------------------
  // pass_rate is 0..1 and band is 1..10, so they get separate y axes; on one
  // axis the pass rate flattens into the baseline and the chart says nothing.
  function drawLearning(rows) {
    setEmpty('empty-learning', rows.length === 0)
    if (rows.length === 0) return
    var labels = rows.map(function (r) { return labelOf(r.bucket) })
    new Chart(document.getElementById('chart-learning'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'pass rate',
            yAxisID: 'y',
            data: rows.map(function (r) { return r.pass_rate }),
            borderColor: '#7ee7a8',
            backgroundColor: '#7ee7a833',
            fill: true,
            tension: 0.25,
            pointRadius: 3,
          },
          {
            label: 'independence band',
            yAxisID: 'yBand',
            data: rows.map(function (r) { return r.band }),
            borderColor: '#f6c177',
            backgroundColor: '#f6c177',
            borderDash: [5, 4],
            tension: 0.25,
            pointRadius: 3,
            spanGaps: true,
          },
        ],
      },
      options: baseOptions({
        x: axis({}),
        y: axis({
          position: 'left',
          min: 0,
          max: 1,
          title: { display: true, text: 'pass rate', color: TICK },
          ticks: { color: TICK, callback: function (v) { return Math.round(v * 100) + '%' } },
        }),
        yBand: axis({
          position: 'right',
          min: 1,
          max: 10,
          grid: { drawOnChartArea: false, color: GRID },
          title: { display: true, text: 'band', color: TICK },
        }),
      }),
    })
  }

  fetch(url, { headers: { accept: 'application/json' } })
    .then(function (res) {
      if (!res.ok) throw new Error('metrics responded ' + res.status)
      return res.json()
    })
    .then(function (data) {
      var series = (data && data.series) || {}
      drawUpstream(series.upstream || [])
      drawCache(series.cache || [])
      drawLearning(series.learning || [])
    })
    .catch(function (err) {
      EMPTIES.forEach(function (id) {
        setEmpty(id, true, 'Could not load metrics: ' + err.message)
      })
    })
})()
`

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
  .chart-wrap { position: relative; height: 240px; margin-top: 12px }
  .chart-wrap canvas { width: 100% !important; height: 100% !important }
  .chart-empty { position: absolute; inset: 0; display: flex; align-items: center;
                 justify-content: center; text-align: center; padding: 0 12px;
                 color: #98a2b3; background: #171b24; border-radius: 6px }
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
      <p>p95 latency and failures per provider.</p>
      <div class="chart-wrap">
        <canvas id="chart-upstream"></canvas>
        <p class="chart-empty" id="empty-upstream">No data yet &mdash; no upstream calls in this window.</p>
      </div></section>
    <section class="panel" id="panel-cache"><h2>Cache hit rate</h2>
      <p>Hits vs misses per provider.</p>
      <div class="chart-wrap">
        <canvas id="chart-cache"></canvas>
        <p class="chart-empty" id="empty-cache">No data yet &mdash; no cache activity in this window.</p>
      </div></section>
    <section class="panel" id="panel-learning"><h2>Learning signal</h2>
      <p>Pass rate and independence band over the timeline.</p>
      <div class="chart-wrap">
        <canvas id="chart-learning"></canvas>
        <p class="chart-empty" id="empty-learning">No data yet &mdash; no graded attempts in this window.</p>
      </div></section>
  </div>
</main>
<script src="${CHART_JS_CDN}"></script>
<script>${DASHBOARD_SCRIPT}</script>
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
