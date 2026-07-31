import 'dotenv/config'
import { createApp } from './app.js'
import { pruneEvents } from './events.js'

const app = createApp()
const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`La Casa proxy running on http://localhost:${PORT}`)
})

// PRD §4 C4: 30-day retention, swept on boot. Never fatal.
app.locals
  .resolveStore()
  .then(pruneEvents)
  .then((deleted) => {
    if (deleted) console.log(`[events] retention sweep deleted ${deleted} row(s)`)
  })
  .catch((e) => console.error(`[events] retention sweep failed: ${e?.message ?? e}`))
