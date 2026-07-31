// TICKET 022 — PRD v2 E4 / D13: the state save must fire during REAL gameplay.
//
// THE BUG THIS FILE EXISTS FOR: `saveLearnerState(graph)` is reachable from
// exactly one place — `appStore.recordGrade` — and NO screen calls
// `recordGrade`. All three rooms grade themselves and drive `graph.update` /
// `graph.recordItemBoundary()` directly, so the shipped app never wrote a
// single byte of learner state. A refresh lost the whole session.
//
// WHY THE SUITE MISSED IT: ticket 012's E4 test asserted the write cadence by
// calling `store.recordGrade(...)` — a unit test of an action the screens
// bypass. Nothing drove a save through a screen.
//
// So every test below RENDERS A REAL SCREEN, performs a real interaction, and
// asserts on the observable contract: a `PUT /state/:id` hit the network. None
// of them names `saveLearnerState`, and none of them calls a store action —
// that is the entire point.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import React from "react";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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
import { getLearnerId } from "./learnerId";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

/* ------------------------------------------------------------------ *
 * harness
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

/** Every state write issued so far — the observable contract of E4. */
const puts = (): Call[] => calls((u, i) => u.startsWith("/state/") && i.method === "PUT");

const bodyOf = (call: Call): any => JSON.parse(call.init.body as string);

const postedEvents = (): Array<{ type: string; payload: any }> =>
  calls((u) => u === "/events").flatMap((c) => bodyOf(c).events ?? []);

/** demo-state's nodes carry a pre-baked attempt log; `[]` starts the ITEM
 *  history empty so only the items driven here are in play. */
const cleanGraph = (band = 5) =>
  new SkillGraph(demoState.nodes as unknown as GraphNode[], band, []);

/** jsdom never fires `ended`, and every screen's TTS helper awaits it — a
 *  SUCCESSFUL stub deadlocks the exchange. Reject instead: the catch path
 *  returns immediately (jsdom has no speechSynthesis) and the loop completes.
 *  Images are stubbed for the same reason: no test here is about the network
 *  except the /state/ write itself. */
let tts: ReturnType<typeof vi.spyOn>;
let image: ReturnType<typeof vi.spyOn>;

function silenceContent() {
  tts = vi.spyOn(contentPipeline, "fetchTTS").mockRejectedValue(new Error("no tts in jsdom"));
  image = vi.spyOn(contentPipeline, "fetchImage").mockResolvedValue("blob:stub");
}

/** Read a screen's source. `import.meta.url` is an http URL under vite's
 *  transform, so resolve from the vitest cwd instead. */
function readScreenSource(file: string): string {
  for (const base of [process.cwd(), resolve(process.cwd(), "client")]) {
    const p = resolve(base, "src/screens", file);
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  throw new Error(`could not locate src/screens/${file} from ${process.cwd()}`);
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
describe("022 E4 — the living room saves at every item boundary", () => {
  it("022 E4: a PASS in the living room issues a PUT /state/:id", async () => {
    const g = cleanGraph();
    const id = getLearnerId();
    render(<LivingRoomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} />);

    await speak(getFirstFrontierWord(g));

    expect(puts()).toHaveLength(1);
    expect(puts()[0].url).toBe(`/state/${id}`);
    const body = bodyOf(puts()[0]);
    expect(Array.isArray(body.graph?.nodes)).toBe(true);
    expect(typeof body.independence).toBe("number");
  });

  it("022 E4: a MISS in the living room issues a PUT /state/:id", async () => {
    const g = cleanGraph();
    const id = getLearnerId();
    render(<LivingRoomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} />);

    await speak("qqqqqq"); // nothing like the target word → miss

    expect(puts()).toHaveLength(1);
    expect(puts()[0].url).toBe(`/state/${id}`);
  });

  // AC: exactly ONE save per item boundary — a graced item does not save twice.
  // Two missed items = two boundaries = two PUTs, never three.
  it("022 E4: a graced item saves exactly once — two missed items, two boundaries, two PUTs", async () => {
    const g = cleanGraph();
    const boundary = vi.spyOn(g, "recordItemBoundary");
    render(<LivingRoomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} />);

    await speak("qqqqqq");
    expect(puts()).toHaveLength(1);

    await speak("qqqqqq"); // second miss → the grace branch

    expect(boundary).toHaveBeenCalledTimes(2); // 016's one-boundary-per-item still holds
    expect(puts()).toHaveLength(2); // and exactly one save per boundary
  });

  // AC: the body carries the band AFTER the boundary ticked, not before.
  // Band 5 with an empty item history: the first miss leaves it at 5, the
  // second trips F1's two-consecutive-misses rule and drops it to 4. A save
  // taken before the boundary would write 5 twice.
  it("022 E4: the PUT body carries the band AFTER the boundary ticked", async () => {
    const g = cleanGraph(5);
    render(<LivingRoomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} />);

    await speak("qqqqqq");
    await speak("qqqqqq");

    expect(g.independence()).toBe(4); // the boundary genuinely moved the band
    expect(puts()).toHaveLength(2);
    expect(bodyOf(puts()[0]).independence).toBe(5);
    expect(bodyOf(puts()[1]).independence).toBe(4);
    expect(bodyOf(puts()[1]).graph.independence).toBe(4);
  });

  // AC (E4): a rejected save never interrupts gameplay, and still reports.
  it("022 E4: a rejected save does not interrupt gameplay and emits client_error{kind:'fetch'}", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (String(url).startsWith("/state/")) throw new Error("save failed");
      return okResponse();
    });

    const g = cleanGraph();
    render(<LivingRoomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} />);

    await speak(getFirstFrontierWord(g));

    // The save was genuinely attempted...
    expect(puts()).toHaveLength(1);
    // ...gameplay carried on regardless — the item completed and the exit unlocked.
    const exit = screen.getByTestId("exit-button") as HTMLButtonElement;
    expect(exit.disabled).toBe(false);
    // ...and the failure was reported, not swallowed.
    await vi.waitFor(() => {
      const errors = postedEvents().filter((e) => e.type === "client_error");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].payload.kind).toBe("fetch");
    });
    await new Promise((r) => setTimeout(r, 10)); // let any unhandled rejection surface
  });
});

/* ------------------------------------------------------------------ *
 * FRIDGE
 * ------------------------------------------------------------------ */
describe("022 E4 — the fridge saves at every item boundary", () => {
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

  it("022 E4: a correct spelling at the fridge issues a PUT /state/:id", async () => {
    const g = cleanGraph();
    const id = getLearnerId();
    render(
      <FridgeScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={MISSED} />
    );

    await spell("fish");

    expect(puts()).toHaveLength(1);
    expect(puts()[0].url).toBe(`/state/${id}`);
    expect(puts()[0].init.method).toBe("PUT");
  });

  // The F4 scene failure records TWO graph.update() calls but ONE boundary —
  // it must stay ONE save, not two.
  it("022 E4: a fridge scene failure (2+ wrong letters) issues exactly ONE PUT /state/:id", () => {
    const g = cleanGraph(5);
    const boundary = vi.spyOn(g, "recordItemBoundary");
    render(
      <FridgeScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={MISSED} />
    );

    placeWrong(1);
    expect(puts()).toHaveLength(0); // a single slip is not an item boundary

    placeWrong(1); // the second wrong letter fails the word

    expect(boundary).toHaveBeenCalledTimes(1);
    expect(puts()).toHaveLength(1);
    expect(bodyOf(puts()[0]).independence).toBe(4); // post-boundary band, not 5
  });
});

/* ------------------------------------------------------------------ *
 * BEDROOM
 * ------------------------------------------------------------------ */
describe("022 E4 — the bedroom saves at every item boundary", () => {
  const PASSED_WORDS = ["milk", "beans"];
  const sentenceText = () => screen.getByTestId("reading-sentence").textContent || "";

  it("022 E4: a bedroom page PASS issues a PUT /state/:id", async () => {
    const g = cleanGraph();
    const id = getLearnerId();
    render(
      <BedroomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={PASSED_WORDS} />
    );

    await speak(sentenceText()); // read the page exactly → pass

    expect(puts()).toHaveLength(1);
    expect(puts()[0].url).toBe(`/state/${id}`);
    expect(bodyOf(puts()[0]).graph.nodes.length).toBeGreaterThan(0);
  });

  it("022 E4: a bedroom page MISS issues a PUT /state/:id", async () => {
    const g = cleanGraph();
    const id = getLearnerId();
    render(
      <BedroomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={PASSED_WORDS} />
    );

    await speak("qqqqq zzzzz"); // nothing like the page → miss

    expect(puts()).toHaveLength(1);
    expect(puts()[0].url).toBe(`/state/${id}`);
  });
});

/* ------------------------------------------------------------------ *
 * STRUCTURAL — the cheapest guard against this regression coming back
 * ------------------------------------------------------------------ */
describe("022 E4 STRUCTURAL — no screen ticks the boundary without saving", () => {
  it("022 E4: no direct graph.recordItemBoundary() call remains in any screen", () => {
    for (const file of ["LivingRoomScreen.tsx", "FridgeScreen.tsx", "BedroomScreen.tsx"]) {
      const source = readScreenSource(file);
      expect(source, `${file} still ticks the item boundary without saving`).not.toMatch(
        /graph\.recordItemBoundary\s*\(/
      );
    }
  });
});
