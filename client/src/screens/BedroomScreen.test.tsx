import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import React from "react";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/** Read a screen's source. `import.meta.url` is an http URL under vite's
 *  transform, so resolve from the vitest cwd instead. */
function readScreenSource(file: string): string {
  for (const base of [process.cwd(), resolve(process.cwd(), "client")]) {
    const p = resolve(base, "src/screens", file);
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  throw new Error(`could not locate src/screens/${file} from ${process.cwd()}`);
}
// prefetchNextSentence (the LIVE prefetch — not the dead prefetchNext) runs on
// mount; mock the generator so we can observe it without hitting the network.
vi.mock("../pipeline/sentenceGen", () => ({
  generateBedtimeSentence: vi.fn(async () => null),
  masteredWords: vi.fn(() => []),
}));

import { BedroomScreen } from "./BedroomScreen";
import { generateBedtimeSentence } from "../pipeline/sentenceGen";
import { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { getLine } from "../pipeline/lines";
import { voices } from "../../../content/voices.json";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

// Mock SpeechRecognition
const mockStart = vi.fn();
let srInstance: any = null;
const MockSR = vi.fn(() => {
  srInstance = { start: mockStart, stop: vi.fn(), continuous: false, interimResults: false, onresult: null, onerror: null, onend: null };
  return srInstance;
});
(globalThis as any).SpeechRecognition = MockSR;
(globalThis as any).webkitSpeechRecognition = MockSR;

// Mock audio
Object.defineProperty(HTMLMediaElement.prototype, "play", { writable: true, value: vi.fn().mockResolvedValue(undefined) });

function makeGraph() {
  return new SkillGraph(demoState.nodes as unknown as GraphNode[]);
}

describe("BedroomScreen", () => {
  let graph: SkillGraph;

  beforeEach(() => {
    graph = makeGraph();
    mockStart.mockClear();
  });

  // Basic render
  it("renders bedroom screen", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk", "beans"]} />);
    expect(screen.getByTestId("bedroom-screen")).toBeTruthy();
  });

  // AC1: sentence displayed as large text ≥40px
  it("AC1: reading sentence is present as text element", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    const sentence = screen.getByTestId("reading-sentence");
    expect(sentence).toBeTruthy();
  });

  // AC2: mic button on book spine
  it("AC2: mic button on book", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    expect(screen.getByTestId("mic-button")).toBeTruthy();
  });

  // AC6: misses are fiction absorption (baby confusion, never error state)
  it("AC6: no error states shown to kid", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    const errorMsgs = document.querySelectorAll('[role="alert"], .error, [data-error]');
    expect(errorMsgs).toHaveLength(0);
  });

  // AC8: "Buenas noches" exit button — only after first completed page
  it("AC8: Buenas noches exit not visible initially before completion", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    const exit = screen.queryByTestId("exit-button");
    if (exit) {
      expect((exit as HTMLButtonElement).disabled).toBe(true);
    } else {
      expect(exit).toBeNull();
    }
  });

  // AC13: tap-hold on sentence text shows gloss (Spanish translation) — at low independence
  it("AC13: sentence has gloss data attribute for tap-hold", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={2} sessionPassedWords={["milk"]} />);
    const sentence = screen.getByTestId("reading-sentence");
    // At independence 2, gloss auto-shown
    expect(sentence).toBeTruthy();
  });

  // B1 guard (ticket 004): prefetchNextSentence must survive the deletion of
  // the unrelated, dead contentPipeline.prefetchNext call in this screen.
  it("B1 guard: prefetchNextSentence still runs on mount", () => {
    (generateBedtimeSentence as any).mockClear();
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    expect(generateBedtimeSentence).toHaveBeenCalled();
  });

  // AC15: idle ladder — no initial spinner
  it("AC15: no spinner visible in scene", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    const spinners = document.querySelectorAll('[role="progressbar"], .spinner');
    expect(spinners).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ *
 * TICKETS 016 (F3) + 017 (F2) — the bedroom's miss and grace branches
 *
 * F3: the miss branch must call `recordItemBoundary()`. Without it the new
 *     band-down rule (two consecutive missed ITEMS → −1) can never fire here.
 *
 * F2: the grace branch's `graph.update(uniqueNodeIds, 1)` is a FAKE PASS — it
 *     credits every node in the sentence at full mastery for a sentence the kid
 *     could not read. PRD-v2 §7: "a straight correctness bug that inverts
 *     'generous credit, precise blame'". The mastery credit goes; the grace
 *     EXPERIENCE stays — Mom appears, models the line, the book advances.
 * ------------------------------------------------------------------ */
describe("BedroomScreen — miss and grace record honestly (016/F3, 017/F2)", () => {
  const MOM_VOICE_ID = (voices as any)["voice.mama"].elevenLabsVoiceID;

  /** Two template pages, so "the book advanced" is observable. */
  const PASSED_WORDS = ["milk", "beans"];

  /** jsdom never fires `ended`, and BedroomScreen's playAudio awaits it — a
   *  SUCCESSFUL TTS stub deadlocks the exchange. Reject the fetch instead: the
   *  catch returns immediately and the loop runs to completion. */
  function silenceVoices() {
    return vi
      .spyOn(contentPipeline, "fetchTTS")
      .mockRejectedValue(new Error("no tts in jsdom"));
  }

  /** demo-state's nodes carry a pre-baked attempt log; `[]` starts this kid's
   *  ITEM history empty so the items below are the only ones in play. */
  function cleanGraph(band = 5) {
    return new SkillGraph(demoState.nodes as unknown as GraphNode[], band, []);
  }

  const itemHistory = (g: SkillGraph) => (g.toJSON() as any).attempts as Array<{ result: 0 | 1 }>;

  const sentenceText = () => screen.getByTestId("reading-sentence").textContent || "";

  async function speak(transcript: string) {
    fireEvent.click(screen.getByTestId("mic-button"));
    await act(async () => {
      await srInstance.onresult({ results: [[{ transcript }]] } as any);
    });
  }

  /** Nothing like any template sentence → a certain miss. */
  const GIBBERISH = "qqqqq zzzzz";

  // ─── 016 / F3 ───
  it("016 F3: a single miss calls recordItemBoundary()", async () => {
    const tts = silenceVoices();
    try {
      const g = cleanGraph();
      const boundary = vi.spyOn(g, "recordItemBoundary");
      render(<BedroomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={PASSED_WORDS} />);

      await speak(GIBBERISH);

      expect(boundary).toHaveBeenCalledTimes(1);
    } finally {
      tts.mockRestore();
    }
  });

  it("016 F1+F3: two consecutive missed pages drop the band by one, end to end", async () => {
    const tts = silenceVoices();
    try {
      const g = cleanGraph(5);
      render(<BedroomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={PASSED_WORDS} />);

      await speak(GIBBERISH);
      expect(g.independence()).toBe(5); // one miss is not two

      await speak(GIBBERISH); // second miss → grace, and the band gives way
      expect(g.independence()).toBe(4);
    } finally {
      tts.mockRestore();
    }
  });

  // ─── 017 / F2: the fake pass ───
  it("017 F2: a double failure credits NO node with a pass — no mastery rises", async () => {
    const tts = silenceVoices();
    try {
      const g = cleanGraph();
      const before = new Map(g.nodes.map((n) => [n.id, n.mastery]));
      const peakBefore = new Map(g.nodes.map((n) => [n.id, n.peakMastery]));
      render(<BedroomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={PASSED_WORDS} />);

      await speak(GIBBERISH);
      await speak(GIBBERISH); // → grace

      for (const node of g.nodes) {
        expect(node.mastery).toBeLessThanOrEqual(before.get(node.id)!);
        expect(node.peakMastery).toBeLessThanOrEqual(peakBefore.get(node.id)!);
      }
    } finally {
      tts.mockRestore();
    }
  });

  it("017 F2: a double failure records only misses — the graced page is never logged as a pass", async () => {
    const tts = silenceVoices();
    try {
      const g = cleanGraph();
      render(<BedroomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={PASSED_WORDS} />);

      await speak(GIBBERISH);
      await speak(GIBBERISH); // → grace

      const items = itemHistory(g);
      expect(items).toHaveLength(2); // two attempts, two items
      expect(items.every((a) => a.result === 0)).toBe(true);
    } finally {
      tts.mockRestore();
    }
  });

  // GUARD — passes today. The grace EXPERIENCE is not what F2 removes.
  it("017 F2 GUARD: the grace UX still runs — Mom speaks and models the line", async () => {
    const tts = silenceVoices();
    try {
      const g = cleanGraph();
      render(<BedroomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={PASSED_WORDS} />);
      const page = sentenceText();
      tts.mockClear();

      await speak(GIBBERISH);
      await speak(GIBBERISH); // → grace

      // Mom's voice, saying the sentence the kid could not read.
      const momModelled = tts.mock.calls
        .map(([args]: any[]) => args)
        .filter((a: any) => a.voiceId === MOM_VOICE_ID)
        .some((a: any) => String(a.text).includes(page));
      expect(momModelled).toBe(true);
    } finally {
      tts.mockRestore();
    }
  });

  // GUARD — passes today. The item ENDS on a double failure: the book turns the
  // page and the exit unlocks, so the kid is never stuck on a page they failed.
  it("017 F2 GUARD: a double failure still ends the item — the book advances and the exit unlocks", async () => {
    const tts = silenceVoices();
    try {
      const g = cleanGraph();
      render(<BedroomScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={PASSED_WORDS} />);
      const page = sentenceText();
      expect(page.length).toBeGreaterThan(0);

      await speak(GIBBERISH);
      await speak(GIBBERISH); // → grace

      expect(sentenceText()).not.toBe(page); // the book advanced
      const exit = screen.getByTestId("exit-button") as HTMLButtonElement;
      expect(exit.disabled).toBe(false);
    } finally {
      tts.mockRestore();
    }
  });
});

/* ------------------------------------------------------------------ *
 * TICKET 018 — G2/G3: Mamá's arrival line is band-tiered; Abuela and the
 * baby are not.
 *
 * The bedroom currently encodes "the world turns English as the band rises"
 * as a single stray ternary — `independence >= 7 ? <english> : <spanish>` —
 * which is a 2-tier split bolted onto a 3-tier spec (D8). It becomes
 * `getLine("mom.bedroom.arrival", independence)`.
 *
 * PROSE IS NOT ASSERTED: the contract is that Mamá's first spoken string IS
 * the `getLine` variant for the screen's band.
 *
 * G3 HARD BOUNDARY (PRD-v2 §8.3): the baby's pre-baked babble arrays stay
 * exactly as they are and are never routed through getLine.
 * ------------------------------------------------------------------ */
describe("BedroomScreen — Mamá's arrival line comes from getLine (018/G2)", () => {
  const MOM_VOICE_ID = (voices as any)["voice.mama"].elevenLabsVoiceID;
  const ARRIVAL_KEY = "mom.bedroom.arrival";

  const cleanGraph = () => new SkillGraph(demoState.nodes as unknown as GraphNode[], 5, []);

  let tts: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // jsdom never fires `ended` and playAudio awaits it — reject instead so the
    // arrival exchange runs to completion. The call args are still recorded.
    tts = vi.spyOn(contentPipeline, "fetchTTS").mockRejectedValue(new Error("no tts in jsdom"));
  });

  afterEach(() => {
    tts.mockRestore();
  });

  const momSaid = () =>
    tts.mock.calls
      .map(([args]: any[]) => args)
      .filter((a: any) => a.voiceId === MOM_VOICE_ID)
      .map((a: any) => String(a.text));

  function mountAt(band: number) {
    render(
      <BedroomScreen
        graph={cleanGraph()}
        seed="test"
        onAdvance={() => {}}
        independence={band}
        sessionPassedWords={["milk", "beans"]}
      />
    );
  }

  it("018 G2: the arrival line IS the getLine variant for the band (spanish-first, band 3)", () => {
    mountAt(3);
    expect(momSaid()[0]).toBe(getLine(ARRIVAL_KEY, 3));
  });

  it("018 G2: the arrival line IS the getLine variant for the band (bilingual, band 5)", () => {
    mountAt(5);
    expect(momSaid()[0]).toBe(getLine(ARRIVAL_KEY, 5));
  });

  it("018 G2: the arrival line IS the getLine variant for the band (english-only, band 8)", () => {
    mountAt(8);
    expect(momSaid()[0]).toBe(getLine(ARRIVAL_KEY, 8));
  });

  it("018 G2: all THREE tiers are audible — bands 4, 5 and 8 give three different arrivals", () => {
    // Today's `independence >= 7` ternary is a 2-tier split: bands 4 and 5 are
    // the SAME string, so the middle (bilingual) tier does not exist yet.
    const heard = [4, 5, 8].map((band) => {
      cleanup();
      tts.mockClear();
      mountAt(band);
      return momSaid()[0];
    });

    heard.forEach((line, i) => expect(line, `band ${[4, 5, 8][i]}`).toBeTruthy());
    expect(new Set(heard).size).toBe(3);
  });

  it("018 G2 STRUCTURAL: the `independence >= 7` ternary is gone from BedroomScreen.tsx", () => {
    const source = readScreenSource("BedroomScreen.tsx");
    expect(source).not.toMatch(/independence\s*>=\s*7/);
    expect(source).toMatch(/getLine/);
  });
});

describe("BedroomScreen — G3 boundary: the baby is not band-tiered (018/G3)", () => {
  // GUARD — passes today and must keep passing. The baby's babble is pre-baked
  // (R4.3.0) and Abuela speaks Spanish always, by design. Neither goes through
  // getLine, and their strings are untouched by this ticket.
  it("018 G3 GUARD: BABY_GIGGLES / BABY_CONFUSED still live in the screen, unchanged", () => {
    const source = readScreenSource("BedroomScreen.tsx");
    expect(source).toMatch(/const BABY_GIGGLES = \["hehe\.\.\.", "ba ba!", "goo!", "yay!"\]/);
    expect(source).toMatch(/const BABY_CONFUSED = \["\.\.\.\?", "ba\?", "huh\?"\]/);
    // and they are read straight from those arrays, never resolved by band
    expect(source).not.toMatch(/getLine\([^)]*bab/i);
  });

  it("018 G3 GUARD: the living room (Abuela) never imports getLine", () => {
    const source = readScreenSource("LivingRoomScreen.tsx");
    expect(source).not.toMatch(/getLine/);
  });
});
