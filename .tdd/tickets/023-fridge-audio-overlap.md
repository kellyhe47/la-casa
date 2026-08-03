---
id: 023
title: "Dad's fridge audio overlaps instead of playing sequentially"
status: green
depends_on: [018]
touches: [client/src/screens/FridgeScreen.tsx]
iterations: 1
test_files: [client/src/screens/fridgeAudioSequencing.test.tsx]
branch: ""
---

> **Found by the user in gameplay:** after spelling a word correctly, Papá's
> praise and his next-word prompt play **on top of each other**.

## The defect

`FridgeScreen.playAudio` (line ~93) awaits `audio.play()`, but that promise
resolves when playback **starts**, not when it finishes. It is therefore not a
sequencing primitive at all. Two consequences:

1. **Nothing waits.** Line 163 fires the success line, then line 166 sets a
   2000ms `setTimeout` that swaps `currentWord`, which retriggers the mount
   effect at line 113 and starts the next prompt — regardless of whether the
   praise is still playing. Any success line longer than 2s overlaps.
2. **Nothing stops.** `audioRef.current = audio` overwrites the ref but never
   pauses the outgoing element, so both `Audio` objects keep playing.

## Fix

- `playAudio` resolves only when playback genuinely ends — `onended`, plus
  `onerror`/rejection so a failure can never hang the scene.
- Before starting a clip, stop and detach whatever is currently playing, so at
  most one Papá line is ever audible.
- The success → next-word transition awaits the praise instead of racing a
  fixed 2s timer.

**Keep:** the `cancelledRef` scene-exit guard (audio must still be dropped when
the scene is left) and the swallow-on-failure behaviour — late or missing audio
must never block gameplay (MVP R8.4.3).

⚠️ **jsdom:** `onended` never fires under jsdom, and the existing locked screen
tests deliberately force `HTMLMediaElement.prototype.play` to reject so
exchanges complete. The fix must keep those tests green — i.e. a rejected
`play()` must resolve the wait immediately rather than hanging.

## Acceptance criteria

- [ ] `playAudio` does not resolve while a clip is still playing — it resolves on `ended`
- [ ] A rejected/failed `play()` resolves immediately rather than hanging the scene
- [ ] Starting a new clip stops the previously playing one (at most one Papá line audible)
- [ ] After a correct spelling, the next-word prompt starts only **after** the success line ends
- [ ] The next-word prompt is not driven by a fixed 2s timer racing the audio
- [ ] Leaving the scene still cancels pending audio (`cancelledRef` behaviour preserved)
- [ ] Existing locked Fridge tests still pass, including the F4 scene-failure path
- [ ] Replay button still speaks the current word

## Test plan

`client/src/screens/fridgeAudioSequencing.test.tsx` — 5 tests, all RED. Every one
renders the real `FridgeScreen` and asserts on the observable audio contract:
which TTS clips were requested, in what order, and which `Audio` elements were
stopped. `playAudio` is never called directly.

jsdom handling: `URL.createObjectURL` is installed by the test (jsdom has none —
without it the screen's audio path dies in its own catch and no `Audio` is ever
built); `globalThis.Audio` is wrapped so every element is tracked; `ended` is
dispatched by the test at the moment a clip should finish;
`HTMLMediaElement.prototype.play` is switchable between resolve and reject.

| Criterion | Test |
| --- | --- |
| resolves on `ended`, not on `play()`; no fixed 2s timer | the next-word prompt does not start while the praise is still playing |
| next prompt starts only after the success line ends | the next-word prompt starts as soon as the praise ends |
| a rejected `play()` resolves immediately, never hangs | a rejected play() resolves the wait immediately — the scene never hangs |
| starting a clip stops the outgoing one; replay still speaks the current word | the replay button stops the clip already playing, then speaks the current word |
| leaving the scene cancels pending audio (`cancelledRef`) | leaving the scene stops every clip it started and drops late audio |
| existing locked Fridge tests, incl. the F4 path | covered by the locked `FridgeScreen.test.tsx` / `saveCadence.test.tsx` — no new test |

Implementation constraints pinned: the scene must advance on the audio `ended`
event (or an equivalent real end signal), never on elapsed time; a clip that
fails to start must resolve the wait in the same tick; every element the screen
creates must be paused before the next one starts and again on unmount.

## Attempt log
