// TICKET 024 — PRD v2 C3 / §4: the running app must EMIT `grade` events.
//
// THE BUG THIS FILE EXISTS FOR: `emitEvent` is called from exactly one place in
// the whole client — `saveState.ts`, and only for `client_error`. Nothing has
// ever emitted a `grade` event, so `/observability`'s Learning-signal chart —
// the one PRD §9 calls "the differentiated chart" — is empty by construction.
// Ticket 019 tested the aggregation by seeding `grade` rows straight into the
// store, so the suite never noticed that no row is ever produced.
//
// This is ticket 022's shape exactly: a mechanism built and never wired to a
// screen. So, as in `saveCadence.test.tsx`, every test below RENDERS A REAL
// SCREEN, performs a real interaction, and asserts on the wire contract — the
// body of `POST /events`. None of them calls `emitEvent`, `commitItemBoundary`
// or any other store action; that is the entire point.
//
// ⚠️ `result` is the NUMBER 0 | 1. `server/metrics.js` counts
// `Number(result) === 1`; a string `'pass'` already cost one iteration on 019.
// The type is asserted explicitly, not just the value.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import React from "react";

// The bedroom prefetches its next page on mount and awaits it on every page
// turn; stub the generator so no test is at the mercy of the network.
vi.mock("../pipeline/sentenceGen", () => ({
  generateBedtimeSentence: vi.fn(async () => null),
  masteredWords: vi.fn(() => []),
}));

import { LivingRoomScreen } from "../screens/LivingRoomScreen";
import { FridgeScreen } from "../screens/FridgeScreen";
import { BedroomScreen } from "../screens/BedroomScreen";
import { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { getFirstFrontierWord } from "../pipeline/sessionPrefetch";
import { getNodesForWord } from "../grading/wordNodes";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

/* ------------------------------------------------------------------ *
 * harness — identical in shape to 022's saveCadence harness
 * ------------------------------------------------------------------ */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

interface Call {
  url: string;
  init: RequestInit;
}

const okResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  arrayBuffer: async () => new ArrayBuffer(8),
});

function calls(predicate: (url: string, init: RequestInit) => boolean): Call[] {
  return mockFetch.mock.calls
    .map(([url, init]) => ({ url: String(url), init: (init ?? {}) as RequestInit }))
    .filter((c) => predicate(c.url, c.init));
}

const bodyOf = (call: Call): any => JSON.parse(call.init.body as string);

/** Every telemetry event posted so far, in order. */
const postedEvents = (): Array<{ type: string; payload: any }> =>
  calls((u) => u === "/events").flatMap((c) => bodyOf(c).events ?? []);

/** The `grade` payloads — the contract `/debug/metrics` aggregates. */
const grades = (): any[] =>
  postedEvents().filter((e) => e.type === "grade").map((e) => e.payload);

/** Assert the fields every `grade` row must carry, whatever the screen. */
function expectWellFormed(payload: any) {
  expect(typeof payload.word, "word").toBe("string");
  expect(String(payload.word).length, "word is populated").toBeGreaterThan(0);
  expect(Array.isArray(payload.node_ids), "node_ids is an array").toBe(true);
  expect(payload.node_ids.length, "node_ids is populated").toBeGreaterThan(0);
  // ⚠️ numeric, never a string — server/metrics.js counts Number(result) === 1
  expect(typeof payload.result, "result must be a NUMBER").toBe("number");
  expect([0, 1]).toContain(payload.result);
  expect(typeof payload.band_before, "band_before").toBe("number");
  expect(typeof payload.band_after, "band_after").toBe("number");
  expect(typeof payload.screen, "screen").toBe("string");
}

/** demo-state's nodes carry a pre-baked attempt log; `[]` starts the ITEM
 *  history empty so only the items driven here are in play. */
const cleanGraph = (band = 5) =>
  new SkillGraph(demoState.nodes as unknown as GraphNode[], band, []);

/** jsdom never fires `ended`, and the screens' TTS helpers await it — a
 *  SUCCESSFUL stub deadlocks the exchange. Reject instead: the catch path
 *  returns immediately and the loop completes. */
let tts: ReturnType<typeof vi.spyOn>;
let image: ReturnType<typeof vi.spyOn>;

function silenceContent() {
  tts = vi.spyOn(contentPipeline, "fetchTTS").mockRejectedValue(new Error("no tts in jsdom"));
  image = vi.spyOn(contentPipeline, "fetchImage").mockResolvedValue("blob:stub");
}

// Speech recognition — the mic path in the living room and the bedroom.
const mockStart = vi.fn();
let srInstance: any = null;
const MockSR = vi.fn(() => {
  srInstance = {
    start: mockStart,
    stop: vi.fn(),
    continuous: false,
    interimResults: false,
    onresult: null,
    onerror: null,
    onend: null,
  };
  return srInstance;
});
(globalThis as any).SpeechRecognition = MockSR;
(globalThis as any).webkitSpeechRecognition = MockSR;

Object.defineProperty(HTMLMediaElement.prototype, "play", {
  writable: true,
  value: vi.fn().mockRejectedValue(new Error("no audio in jsdom")),
});
Object.defineProperty(HTMLMediaElement.prototype, "pause", { writable: true, value: vi.fn() });

/** Drive one spoken attempt through a screen's recognition handler. */
async function speak(transcript: string) {
  fireEvent.click(screen.getByTestId("mic-button"));
  await act(async () => {
    await srInstance.onresult({ results: [[{ transcript }]] } as any);
  });
}

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
  mockFetch.mockImplementation(async () => okResponse());
  contentPipeline.clearCache();
  silenceContent();
});

afterEach(() => {
  tts.mockRestore();
  image.mockRestore();
  cleanup();
});

/* ------------------------------------------------------------------ *
 * LIVING ROOM
 * ------------------------------------------------------------------ */
describe("024 C3 — the living room emits grade events", () => {
  // AC: a living-room pass emits one grade event with result: 1
  // AC: `screen` identifies the scene; `word` and `node_ids` are populated
  // AC: `result` is the NUMBER 1
  it("024 C3: a living-room PASS posts one grade event with numeric result 1", async () => {
    const g = cleanGraph(5);
    const word = getFirstFrontierWord(g);
    render(<LivingRoomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} />);

    await speak(word);

    expect(grades()).toHaveLength(1);
    const payload = grades()[0];
    expectWellFormed(payload);
    expect(payload.result).toBe(1);
    expect(payload.word).toBe(word);
    expect(payload.node_ids).toEqual(getNodesForWord(word));
    expect(payload.screen).toBe("living-room");
  });

  // AC: a living-room miss emits one grade event with result: 0
  // AC: `result` is the NUMBER 0
  it("024 C3: a living-room MISS posts one grade event with numeric result 0", async () => {
    const g = cleanGraph(5);
    const word = getFirstFrontierWord(g);
    render(<LivingRoomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} />);

    await speak("qqqqqq"); // nothing like the target word → miss

    expect(grades()).toHaveLength(1);
    const payload = grades()[0];
    expectWellFormed(payload);
    expect(payload.result).toBe(0);
    expect(payload.result).not.toBe("0"); // the 019 regression, spelled out
    expect(payload.word).toBe(word);
    expect(payload.screen).toBe("living-room");
  });

  // AC: band_before and band_after straddle the boundary — on a band-down item
  //     they differ by 1.
  // AC: exactly one grade event per item boundary — no duplicates on a graced
  //     item (the second miss IS the graced item).
  //
  // Band 5, empty item history: the first miss leaves the band at 5, the second
  // trips F1's two-consecutive-misses rule and drops it to 4. A payload built
  // entirely before OR entirely after the boundary cannot produce both rows.
  it("024 C3: band_before/band_after straddle the boundary, one event per item", async () => {
    const g = cleanGraph(5);
    render(<LivingRoomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} />);

    await speak("qqqqqq");
    await speak("qqqqqq"); // second miss → the grace branch

    expect(g.independence()).toBe(4); // the boundary genuinely moved the band
    expect(grades(), "one grade event per item boundary, never two").toHaveLength(2);

    expect(grades()[0].band_before).toBe(5);
    expect(grades()[0].band_after).toBe(5);

    expect(grades()[1].band_before).toBe(5);
    expect(grades()[1].band_after).toBe(4);
    expect(grades()[1].band_before - grades()[1].band_after).toBe(1);
  });

  // AC: a failing /events post does not interrupt gameplay.
  it("024 C3: a rejected /events post never interrupts gameplay", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (String(url) === "/events") throw new Error("telemetry down");
      return okResponse();
    });

    const g = cleanGraph(5);
    render(<LivingRoomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} />);

    await speak(getFirstFrontierWord(g));

    // The event was genuinely attempted...
    expect(calls((u) => u === "/events").length).toBeGreaterThan(0);
    // ...and the item still completed: the exit unlocked.
    const exit = screen.getByTestId("exit-button") as HTMLButtonElement;
    expect(exit.disabled).toBe(false);
    // ...and the state save still went out alongside it.
    expect(calls((u, i) => u.startsWith("/state/") && i.method === "PUT")).toHaveLength(1);
    await new Promise((r) => setTimeout(r, 10)); // let any unhandled rejection surface
  });
});

/* ------------------------------------------------------------------ *
 * FRIDGE
 * ------------------------------------------------------------------ */
describe("024 C3 — the fridge emits grade events", () => {
  /** sessionMissedWords is served last-first: "fish", then "milk". */
  const MISSED = ["milk", "fish"];

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

  /** Letters present in the tray as distractors but wrong for slot 0. */
  const WRONG = ["e", "a", "o", "t"];
  const placeWrong = (n: number) => {
    for (let i = 0; i < n; i++) place(WRONG[i % WRONG.length], 0);
  };

  async function spell(word: string) {
    for (let i = 0; i < word.length; i++) place(word[i], i);
    await act(async () => {
      vi.advanceTimersByTime(300); // MagnetTray's 200ms completion hop
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // AC: a fridge correct spelling emits one grade event with result: 1
  it("024 C3: a correct spelling at the fridge posts one grade event with numeric result 1", async () => {
    const g = cleanGraph(5);
    render(
      <FridgeScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={MISSED} />
    );

    await spell("fish");

    expect(grades()).toHaveLength(1);
    const payload = grades()[0];
    expectWellFormed(payload);
    expect(payload.result).toBe(1);
    expect(payload.word).toBe("fish");
    expect(payload.node_ids).toEqual(getNodesForWord("fish"));
    expect(payload.screen).toBe("fridge");
  });

  // AC: a fridge scene failure emits one grade event with result: 0
  // AC: exactly one event per boundary — F4 makes TWO graph.update() calls but
  //     only ONE boundary, so it must stay ONE event.
  it("024 C3: a fridge scene failure posts exactly ONE grade event with numeric result 0", () => {
    const g = cleanGraph(5);
    render(
      <FridgeScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={MISSED} />
    );

    placeWrong(1);
    expect(grades(), "a single slip is not an item boundary").toHaveLength(0);

    placeWrong(1); // the second wrong letter fails the word

    expect(grades()).toHaveLength(1);
    const payload = grades()[0];
    expectWellFormed(payload);
    expect(payload.result).toBe(0);
    expect(payload.word).toBe("fish");
    expect(payload.screen).toBe("fridge");
    expect(payload.band_before).toBe(5);
    expect(payload.band_after).toBe(4); // the F4 failure costs exactly one band
  });
});

/* ------------------------------------------------------------------ *
 * BEDROOM
 * ------------------------------------------------------------------ */
describe("024 C3 — the bedroom emits grade events", () => {
  const PASSED_WORDS = ["milk", "beans"];
  const sentenceText = () => screen.getByTestId("reading-sentence").textContent || "";
  const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

  // AC: a bedroom page pass emits one grade event
  it("024 C3: a bedroom page PASS posts one grade event with numeric result 1", async () => {
    const g = cleanGraph(5);
    render(
      <BedroomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={PASSED_WORDS} />
    );
    const sentence = sentenceText();

    await speak(sentence); // read the page exactly → pass

    expect(grades()).toHaveLength(1);
    const payload = grades()[0];
    expectWellFormed(payload);
    expect(payload.result).toBe(1);
    expect(payload.screen).toBe("bedroom");
    // the item is the PAGE, so `word` names the page's text (or a word of it)
    expect(squash(sentence)).toContain(squash(String(payload.word)));
  });

  // AC: a bedroom miss emits one grade event
  it("024 C3: a bedroom page MISS posts one grade event with numeric result 0", async () => {
    const g = cleanGraph(5);
    render(
      <BedroomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={PASSED_WORDS} />
    );
    const sentence = sentenceText();

    await speak("qqqqq zzzzz"); // nothing like the page → miss

    expect(grades()).toHaveLength(1);
    const payload = grades()[0];
    expectWellFormed(payload);
    expect(payload.result).toBe(0);
    expect(payload.screen).toBe("bedroom");
    expect(squash(sentence)).toContain(squash(String(payload.word)));
  });
});
