import { defineConfig } from 'vitest/config'

// The suite is fast in isolation (~1s) but a few cases — notably
// observability.test.js's window-exclusion test — do real polling and have been
// observed timing out on the 5000ms default when the client suite runs on the
// same machine at the same time. The work is unchanged; only the ceiling moves,
// so a genuinely hung test still fails rather than hanging the run.
export default defineConfig({
  test: {
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
