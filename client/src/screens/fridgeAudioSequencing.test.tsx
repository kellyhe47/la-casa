// TICKET 023 — Papá's fridge audio must play SEQUENTIALLY, not on top of itself.
//
// THE BUG THIS FILE EXISTS FOR: the user spelled a word correctly and heard the
// praise line and the next-word prompt AT THE SAME TIME.
//
// `FridgeScreen.playAudio` awaits `audio.play()`, whose promise resolves when
// playback *starts*. It is not a sequencing primitive:
//
//   1. Nothing waits — the success line is fired unawaited and a fixed 2000ms
//      `setTimeout` swaps `currentWord`, retriggering the mount prompt effect
//      regardless of whether the praise is still playing.
//   2. Nothing stops — `audioRef.current = audio` overwrites the ref but never
//      pauses the outgoing element, so both `Audio` objects play at once.
//
// Every test below RENDERS THE REAL SCREEN and asserts on the observable audio
// contract: which TTS clips were requested, in what ORDER, and which elements
// were stopped. None of them calls `playAudio` directly.
//
// ── jsdom hazards, both handled here rather than worked around ──
//   * `URL.createObjectURL` does not exist in jsdom, so the screen's audio path
//     silently dies in its own catch unless we install one. We do.
//   * `onended` never fires on its own, so the tests DRIVE it: `new Audio(...)`
//     is tracked and `ended` is dispatched at the exact moment a clip should
//     finish. `HTMLMediaElement.prototype.play` is likewise under test control,
//     so "still playing", "ended" and "failed to start" are all reachable.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import React from "react";

import { FridgeScreen } from "./FridgeScreen";
import { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { getLine, hasLine } from "../pipeline/lines";
import demoState from "../../../content/demo-state.json";
import { voices } from "../../../content/voices.json";
import type { GraphNode } from "../graph/types";

const DAD_VOICE_ID = (voices as any)["voice.papa"].elevenLabsVoiceID;

/** sessionMissedWords is served last-first: "fish" first, then "milk". */
const MISSED = ["milk", "fish"];
const BAND = 3;

const cleanGraph = () => new SkillGraph(demoState.nodes as unknown as GraphNode[], 5, []);

/* ------------------------------------------------------------------ *
 * audio harness — every Audio element the screen builds is tracked
 * ------------------------------------------------------------------ */

const RealAudio = globalThis.Audio;
let audios: HTMLAudioElement[] = [];
const TrackedAudio: any = function (src?: string) {
  const el = new (RealAudio as any)(src);
  audios.push(el);
  return el; // a constructor returning an object wins over `this`
};
vi.stubGlobal("Audio", TrackedAudio);

// jsdom ships no object-URL support; without this the screen never gets as far
// as constructing an Audio at all.
(URL as any).createObjectURL = vi.fn(() => "blob:fridge-test");
(URL as any).revokeObjectURL = vi.fn();

/** What `play()` does this test: resolve (clip started), or reject (failed). */
let playBehavior: () => Promise<void> = () => Promise.resolve();
/** Elements `pause()` was invoked on, in order — the "stop the outgoing clip"
 *  observable. */
let paused: HTMLAudioElement[] = [];

Object.defineProperty(HTMLMediaElement.prototype, "play", {
  writable: true,
  value: vi.fn(function (this: HTMLAudioElement) {
    return playBehavior();
  }),
});
Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  writable: true,
  value: vi.fn(function (this: HTMLAudioElement) {
    paused.push(this);
  }),
});

let tts: ReturnType<typeof vi.spyOn>;

/** Everything Papá was asked to say, in order. */
const dadSaid = (): string[] =>
  (tts.mock.calls as any[])
    .map(([args]) => args)
    .filter((a: any) => a.voiceId === DAD_VOICE_ID)
    .map((a: any) => String(a.text));

/** The authored prompt for a word at this screen's band. */
function promptFor(word: string): string {
  const specific = `dad.fridge.prompt.${word}`;
  const key = hasLine(specific) ? specific : "dad.fridge.prompt.default";
  return getLine(key, BAND).replace(/\{word\}/g, word);
}
const successLine = (word: string) =>
  getLine("dad.fridge.success", BAND).replace(/\{word\}/g, word);

/** Settle the promise chain without moving the clock — the whole point of
 *  these tests is that the scene advances on AUDIO, not on elapsed time. */
async function flush(times = 10) {
  for (let i = 0; i < times; i++) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await Promise.resolve();
    });
  }
}

/** Fire the real `ended` event on a clip — jsdom never does it for us. */
async function endClip(el: HTMLAudioElement) {
  await act(async () => {
    el.dispatchEvent(new Event("ended"));
  });
  await flush();
}

const magnets = () =>
  Array.from(document.querySelectorAll('[data-testid="magnet"]')) as HTMLElement[];
const slots = () =>
  Array.from(document.querySelectorAll('[data-testid="letter-slot"]')) as HTMLElement[];

function place(letter: string, slotIdx: number) {
  const magnet = magnets().find((el) => (el.textContent || "").trim() === letter);
  if (!magnet) throw new Error(`no "${letter}" magnet in the tray`);
  fireEvent.click(magnet);
  fireEvent.click(slots()[slotIdx]);
}

/** Spell the word correctly and let the tray's 200ms completion hop fire.
 *  Deliberately advances 300ms and NOT a millisecond more — anything that only
 *  happens at t+2000ms is the bug. */
async function spell(word: string) {
  for (let i = 0; i < word.length; i++) place(word[i], i);
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
  await flush();
}

function mount() {
  return render(
    <FridgeScreen
      graph={cleanGraph()}
      seed="test"
      onAdvance={() => {}}
      independence={BAND}
      sessionMissedWords={MISSED}
    />
  );
}

/** The 🔊 replay button — the only button on screen before an item completes. */
const speakerButton = () => screen.getByRole("button");

beforeEach(() => {
  vi.useFakeTimers();
  audios = [];
  paused = [];
  playBehavior = () => Promise.resolve();
  contentPipeline.clearCache();
  tts = vi.spyOn(contentPipeline, "fetchTTS").mockResolvedValue(new ArrayBuffer(8) as any);
});

afterEach(() => {
  tts.mockRestore();
  cleanup();
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ *
 * SEQUENCING — the praise must finish before the next prompt begins
 * ------------------------------------------------------------------ */
describe("023 — Papá's fridge lines play one at a time", () => {
  // AC: `playAudio` does not resolve while a clip is still playing.
  // AC: the next-word prompt is not driven by a fixed 2s timer racing the audio.
  it("023: the next-word prompt does not start while the praise is still playing", async () => {
    mount();
    await flush();
    expect(dadSaid()).toEqual([promptFor("fish")]);

    await spell("fish");
    expect(dadSaid()).toEqual([promptFor("fish"), successLine("fish")]);

    // Five seconds of wall clock pass and the praise clip has NOT ended.
    // Nothing may start on a timer — the scene waits for the audio.
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await flush();

    expect(dadSaid(), "the next prompt spoke over the praise").toEqual([
      promptFor("fish"),
      successLine("fish"),
    ]);
  });

  // AC: `playAudio` resolves on `ended`.
  // AC: after a correct spelling the next-word prompt starts only AFTER the
  //     success line ends.
  it("023: the next-word prompt starts as soon as the praise ends", async () => {
    mount();
    await flush();
    await spell("fish");
    expect(dadSaid()).toHaveLength(2);

    const praise = audios[audios.length - 1];
    await endClip(praise); // the ONLY thing that happens — the clock does not move

    expect(dadSaid()).toEqual([
      promptFor("fish"),
      successLine("fish"),
      promptFor("milk"),
    ]);
  });

  // AC: a rejected/failed `play()` resolves immediately rather than hanging the
  // scene — the R8.4.3 swallow-on-failure guarantee. This is also the shape the
  // locked screen tests run in, so the fix must not deadlock them.
  it("023: a rejected play() resolves the wait immediately — the scene never hangs", async () => {
    playBehavior = () => Promise.reject(new Error("no audio in jsdom"));

    mount();
    await flush();
    await spell("fish");

    // No `ended` will ever come and the clock has not reached 2000ms; the scene
    // must have moved on anyway rather than stalling on dead audio.
    expect(dadSaid()).toEqual([
      promptFor("fish"),
      successLine("fish"),
      promptFor("milk"),
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * AT MOST ONE CLIP AUDIBLE
 * ------------------------------------------------------------------ */
describe("023 — at most one Papá clip is ever audible", () => {
  // AC: starting a new clip stops the previously playing one.
  // AC: the replay button still speaks the current word (R4.4.2).
  it("023: the replay button stops the clip already playing, then speaks the current word", async () => {
    mount();
    await flush();
    expect(audios).toHaveLength(1);
    const prompt = audios[0];
    tts.mockClear();

    fireEvent.click(speakerButton());
    await flush();

    expect(audios).toHaveLength(2);
    expect(paused, "the outgoing prompt kept playing under the replay").toContain(prompt);
    expect(dadSaid()).toEqual(["fish"]); // R4.4.2: the word itself, not the prompt
  });

  // AC: leaving the scene still cancels pending audio (`cancelledRef` kept).
  it("023: leaving the scene stops every clip it started and drops late audio", async () => {
    tts.mockReset();
    let landTTS: (b: ArrayBuffer) => void = () => {};
    // First two clips resolve normally; the third TTS is still in flight when
    // the scene is left.
    tts
      .mockResolvedValueOnce(new ArrayBuffer(8) as any)
      .mockResolvedValueOnce(new ArrayBuffer(8) as any)
      .mockImplementation(
        () => new Promise<ArrayBuffer>((res) => { landTTS = res; })
      );

    const { unmount } = mount();
    await flush();
    fireEvent.click(speakerButton()); // a second clip
    await flush();
    expect(audios).toHaveLength(2);

    fireEvent.click(speakerButton()); // a third — still fetching
    await flush();
    unmount();

    for (const clip of audios) {
      expect(paused, "a clip was left playing after the scene was left").toContain(clip);
    }

    landTTS(new ArrayBuffer(8)); // the late response lands after the exit
    await flush();
    expect(audios, "late audio spoke over the next scene").toHaveLength(2);
  });
});
