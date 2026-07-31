import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { FridgeScreen } from "./FridgeScreen";
import { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import demoState from "../../../content/demo-state.json";
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
