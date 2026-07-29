import 'dotenv/config'
import { createApp } from './app.js'

const app = createApp()
const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`La Casa proxy running on http://localhost:${PORT}`)
})
