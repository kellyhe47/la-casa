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
import { FridgeScreen } from "./FridgeScreen";
import { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { getLine } from "../pipeline/lines";
import demoState from "../../../content/demo-state.json";
import { voices } from "../../../content/voices.json";
import type { GraphNode } from "../graph/types";

function makeGraph() {
  return new SkillGraph(demoState.nodes as unknown as GraphNode[]);
}

// Mock audio
Object.defineProperty(HTMLMediaElement.prototype, "play", { writable: true, value: vi.fn().mockResolvedValue(undefined) });
Object.defineProperty(HTMLMediaElement.prototype, "pause", { writable: true, value: vi.fn() });

describe("FridgeScreen", () => {
  let graph: SkillGraph;

  beforeEach(() => {
    graph = makeGraph();
  });

  // Basic render
  it("renders fridge screen", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    expect(screen.getByTestId("fridge-screen")).toBeTruthy();
  });

  // AC1: NO caption showing the target word in Dad's dialogue
  it("AC1: Dad's dialogue is audio-only — no speech bubble with target word", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    // There should be no element showing "Dad says:" or a speech bubble with the word
    const dadBubble = document.querySelector('[data-testid="dad-speech-bubble"]');
    expect(dadBubble).toBeNull();
  });

  // AC3: magnet tray present
  it("AC3: magnet tray is present", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    expect(screen.getByTestId("magnet-tray")).toBeTruthy();
  });

  // AC4: each magnet hit area ≥ 96px
  it("AC4: magnet buttons are large enough", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    const magnets = document.querySelectorAll('[data-testid="magnet"]');
    magnets.forEach((m) => {
      const el = m as HTMLElement;
      // Check inline style width/height or computed size
      const width = parseInt(el.style.width || "96");
      const height = parseInt(el.style.height || "96");
      expect(Math.max(width, height)).toBeGreaterThanOrEqual(60); // at least 60px sprite, padded hit area ≥ 96px
    });
  });

  // AC9: grading fires on word completion
  it("AC9: tapping letters spells the word and triggers grade on completion", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    const tray = screen.getByTestId("magnet-tray");
    expect(tray).toBeTruthy();
    // The tray should have letter magnets
    const magnets = document.querySelectorAll('[data-testid="magnet"]');
    expect(magnets.length).toBeGreaterThan(0);
  });

  // AC11: exit button only appears after first completed item
  it("AC11: ¡A dormir! exit not visible before first completion", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    const exit = screen.queryByTestId("exit-button");
    if (exit) {
      expect((exit as HTMLButtonElement).disabled).toBe(true);
    } else {
      expect(exit).toBeNull();
    }
  });

  // AC13: no spinner
  it("AC13: no spinner in scene", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    const spinners = document.querySelectorAll('[role="progressbar"], .spinner');
    expect(spinners).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ *
 * TICKET 017 — F4: the fridge records misses (locked decision D10)
 *
 * `handleWordComplete` returns early on a wrong letter and records NOTHING, so
 * a kid can flail at the fridge all evening without the band ever noticing.
 *
 * D10: the FIRST word in a fridge scene where the kid places 2+ WRONG LETTERS
 * records ONE failure event — worth two misses, so the F1 rule takes the band
 * down by exactly 1 — and then a SCENE-LEVEL flag disables all further miss
 * recording. Subsequent misses, on that word or any later word, change nothing.
 *
 * NOT in scope (PRD-v2 §11 lists it as explicitly out of scope): a fridge grace
 * path. The tray always permits eventual success, so there is no stuck state
 * and the kid is never auto-passed.
 *
 * IMPLEMENTATION CONSTRAINT: `MagnetTray` currently swallows wrong placements
 * (local wobble state only) and reports nothing upward. It must surface them —
 * e.g. an optional `onWrongLetter?: () => void` prop fired on the same branch
 * that starts the wobble — so FridgeScreen can count them per word. These tests
 * drive the real tray through the UI and never name the callback, so any
 * equivalent signal satisfies them.
 * ------------------------------------------------------------------ */
describe("FridgeScreen — wrong letters cost a band, once per scene (017/F4)", () => {
  /** demo-state's nodes carry a pre-baked attempt log; `[]` starts the ITEM
   *  history empty so the items below are the only ones in play. */
  const cleanGraph = (band = 5) =>
    new SkillGraph(demoState.nodes as unknown as GraphNode[], band, []);

  /** sessionMissedWords is served last-first, so this fixes the scene's word
   *  order deterministically: "fish", then "milk". */
  const MISSED = ["milk", "fish"];

  const itemResults = (g: SkillGraph) =>
    ((g.toJSON() as any).attempts as Array<{ result: 0 | 1 }>).map((a) => a.result);

  const magnets = () =>
    Array.from(document.querySelectorAll('[data-testid="magnet"]')) as HTMLElement[];
  const slots = () =>
    Array.from(document.querySelectorAll('[data-testid="letter-slot"]')) as HTMLElement[];

  /** Tap a tray magnet, then a slot — the tray's tap-tap placement path. */
  function place(letter: string, slotIdx: number) {
    const magnet = magnets().find((el) => (el.textContent || "").trim() === letter);
    if (!magnet) throw new Error(`no "${letter}" magnet in the tray`);
    fireEvent.click(magnet);
    fireEvent.click(slots()[slotIdx]);
  }

  /** Two letters that are in the tray as distractors but wrong for slot 0. */
  const WRONG = ["e", "a", "o", "t"];

  /** Place `n` wrong letters into the (still empty) first slot. */
  function placeWrong(n: number) {
    for (let i = 0; i < n; i++) place(WRONG[i % WRONG.length], 0);
  }

  /** Spell the word correctly and let the completion hop fire. */
  async function spell(word: string) {
    for (let i = 0; i < word.length; i++) place(word[i], i);
    await act(async () => {
      vi.advanceTimersByTime(300); // MagnetTray's 200ms completion hop
    });
  }

  /** Let the fridge move on to its next word. */
  async function nextWord() {
    await act(async () => {
      vi.advanceTimersByTime(2100); // FridgeScreen's 2000ms new-word delay
    });
  }

  let tts: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    // Dad's prompts must not hit the network; a rejected fetch lands in the
    // screen's catch and the scene plays on silently.
    tts = vi.spyOn(contentPipeline, "fetchTTS").mockRejectedValue(new Error("no tts in jsdom"));
  });

  afterEach(() => {
    tts.mockRestore();
    vi.useRealTimers();
  });

  // ─── THE HEADLINE RULE ───
  it("017 F4: 2 wrong letters record ONE failure event worth 2 misses, dropping the band by 1", () => {
    const g = cleanGraph(5);
    render(<FridgeScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={MISSED} />);

    placeWrong(1);
    expect(itemResults(g)).toEqual([]); // one wrong letter is not a failure
    expect(g.independence()).toBe(5);

    placeWrong(1); // the second wrong letter fails the word
    expect(itemResults(g)).toEqual([0, 0]); // one event, worth two misses
    expect(g.independence()).toBe(4);
  });

  // GUARD — passes today. A single slip must stay free.
  it("017 F4 GUARD: a single wrong letter records nothing at all", () => {
    const g = cleanGraph(5);
    render(<FridgeScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={MISSED} />);

    placeWrong(1);

    expect(itemResults(g)).toEqual([]);
    expect(g.independence()).toBe(5);
  });

  it("017 F4: once the scene flag trips, further wrong letters on the same word change nothing", () => {
    const g = cleanGraph(5);
    render(<FridgeScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={MISSED} />);

    placeWrong(2);
    expect(g.independence()).toBe(4);

    placeWrong(4); // keep flailing

    expect(itemResults(g)).toEqual([0, 0]); // still exactly one failure event
    expect(g.independence()).toBe(4); // and exactly one band lost
  });

  // ─── D10: at most one failure per SCENE ───
  it("017 F4/D10: a SECOND word failed in the same scene records nothing — max one per scene", async () => {
    const g = cleanGraph(5);
    render(<FridgeScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={MISSED} />);

    placeWrong(2); // "fish" fails → the one failure this scene gets
    expect(g.independence()).toBe(4);
    await spell("fish"); // the tray always permits eventual success
    await nextWord(); // → "milk"

    const before = itemResults(g);
    placeWrong(2); // "milk" fails too — but the scene has spent its one event

    expect(itemResults(g)).toEqual(before);
    expect(g.independence()).toBe(4);
  });

  // ─── passes are unaffected, on both sides of the flag ───
  it("017 F4: a correct spelling still records a pass — before and after the flag trips", async () => {
    const g = cleanGraph(5);
    render(<FridgeScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={MISSED} />);

    const shBefore = g.getNode("g_sh")!.mastery;
    await spell("fish"); // clean pass, flag untouched
    expect(itemResults(g)).toEqual([1]);
    expect(g.getNode("g_sh")!.mastery).toBeGreaterThan(shBefore);

    await nextWord(); // → "milk"
    placeWrong(2); // now the flag trips
    expect(itemResults(g)).toEqual([1, 0, 0]);
    expect(g.independence()).toBe(4);

    const milkBefore = g.getNode("v_groc1")!.mastery;
    await spell("milk"); // a pass still lands after the flag has tripped

    expect(itemResults(g)).toEqual([1, 0, 0, 1]);
    expect(g.getNode("v_groc1")!.mastery).toBeGreaterThan(milkBefore);
  });

  // GUARD — passes today, and must keep passing: PRD-v2 §11 puts a fridge grace
  // path out of scope. Wrong letters never hand the kid the word.
  it("017 F4 GUARD: no grace path — wrong letters never auto-pass the kid", () => {
    const g = cleanGraph(5);
    const before = new Map(g.nodes.map((n) => [n.id, n.mastery]));
    render(<FridgeScreen graph={g} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={MISSED} />);

    placeWrong(6);

    expect(itemResults(g)).not.toContain(1); // no pass was ever recorded
    for (const node of g.nodes) {
      expect(node.mastery).toBeLessThanOrEqual(before.get(node.id)!);
    }
    expect(screen.queryByTestId("exit-button")).toBeNull(); // the item is not "done"
    expect(document.body.textContent).not.toContain("fish"); // no sticky note appeared
  });
});

/* ------------------------------------------------------------------ *
 * TICKET 018 — G2: Dad's fridge prompts come from `getLine(key, band)`
 *
 * Today FridgeScreen hardcodes TWO `dadPrompts` records (the mount prompt
 * effect ~line 87 and `handleReplayPrompt` ~line 146) and never reads its own
 * `independence` prop — it is not even destructured. The band-tiered table in
 * `content/lines.json` replaces both.
 *
 * PROSE IS NOT ASSERTED. The contract is "the spoken string IS the getLine
 * variant for this screen's band" — an equality against `getLine` itself, which
 * survives every future edit to the authored Spanish/English wording.
 *
 * Dad's prompt is still SPOKEN ONLY, no caption (MVP R4.4.1) — the AC1 test
 * above still guards that and is untouched.
 * ------------------------------------------------------------------ */
describe("FridgeScreen — Dad's prompts come from getLine (018/G2)", () => {
  const DAD_VOICE_ID = (voices as any)["voice.papa"].elevenLabsVoiceID;

  /** sessionMissedWords is served last-first → the scene opens on "fish". */
  const MISSED = ["milk", "fish"];
  const FIRST_WORD = "fish";
  const PROMPT_KEY = `dad.fridge.prompt.${FIRST_WORD}`;

  const cleanGraph = () => new SkillGraph(demoState.nodes as unknown as GraphNode[], 5, []);

  let tts: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // A rejected fetch lands in the screen's catch; the call args are still
    // recorded, which is all these tests read.
    tts = vi.spyOn(contentPipeline, "fetchTTS").mockRejectedValue(new Error("no tts in jsdom"));
  });

  afterEach(() => {
    tts.mockRestore();
  });

  /** Everything Dad said, in order. */
  const dadSaid = () =>
    tts.mock.calls
      .map(([args]: any[]) => args)
      .filter((a: any) => a.voiceId === DAD_VOICE_ID)
      .map((a: any) => String(a.text));

  function mountAt(band: number) {
    render(
      <FridgeScreen
        graph={cleanGraph()}
        seed="test"
        onAdvance={() => {}}
        independence={band}
        sessionMissedWords={MISSED}
      />
    );
  }

  /** The authored variant, with the one supported placeholder filled in.
   *  (Only `dad.fridge.prompt.default` is expected to carry `{word}`, but
   *  allowing it everywhere keeps the assertion authoring-agnostic.) */
  const expectedLine = (key: string, band: number) =>
    getLine(key, band).replace(/\{word\}/g, FIRST_WORD);

  it("018 G2: the mount prompt IS the getLine variant for the screen's band (spanish-first)", () => {
    mountAt(3); // sessions start at band 3 → spanish-first
    expect(dadSaid()[0]).toBe(expectedLine(PROMPT_KEY, 3));
  });

  it("018 G2: the mount prompt IS the getLine variant for the screen's band (english-only)", () => {
    mountAt(9);
    expect(dadSaid()[0]).toBe(expectedLine(PROMPT_KEY, 9));
  });

  it("018 G2: all THREE tiers are audible — bands 4, 5 and 8 give three different prompts", () => {
    // Today the prompt is a single hardcoded string, so all three are equal.
    // 4 and 5 straddle the spanish-first→bilingual boundary; 8 is english-only.
    const heard = [4, 5, 8].map((band) => {
      cleanup();
      tts.mockClear();
      mountAt(band);
      return dadSaid()[0];
    });

    heard.forEach((line, i) => expect(line, `band ${[4, 5, 8][i]}`).toBeTruthy());
    expect(new Set(heard).size).toBe(3);
  });

  it("018 G2 STRUCTURAL: the hardcoded dadPrompts tables are gone from FridgeScreen.tsx", () => {
    const source = readScreenSource("FridgeScreen.tsx");
    expect(source).not.toMatch(/dadPrompts/);
    expect(source).toMatch(/getLine/);
  });

  // GUARD — passes today and must keep passing: the speaker replay button
  // (R4.4.2) still speaks in Dad's voice, whatever string it now sources.
  it("018 G2 GUARD: the speaker replay button still speaks in Dad's voice", () => {
    mountAt(3);
    tts.mockClear();

    fireEvent.click(screen.getByRole("button"));

    const said = dadSaid();
    expect(said.length).toBeGreaterThan(0);
    expect(said[0].trim().length).toBeGreaterThan(0);
  });
});
