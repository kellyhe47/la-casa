// TICKET 014 — PRD v2 E7 / E8 (locked decision D16).
//
// E7. Startup: UUID present + state found → hydrate, skip nothing, run the
//     normal rail (Abuela → Papá → Mamá). Resume is SILENT — no "welcome back"
//     anywhere. The fiction is one continuous evening; only the band and node
//     mastery differ.
// E8. Exact band resume: the saved band is restored as-is regardless of how
//     long the kid has been away — no time-based warm-down. This overrides the
//     MVP's `R5.3: sessions start at band 3` for RETURNING players only; new
//     players (no saved state) still start at 3.
//
// ── PINNED SHAPE (implementation constraint) ────────────────────────────────
// Hydration is async; `startSession()` is sync and MUST STAY sync — locked
// tests (appStore.test.ts AC2, telemetry.test.ts E4) call it and read `graph`
// on the very next line, so it may never return a promise and never leave
// `graph` null. The split is therefore:
//
//   startSession(): void        // unchanged. Fresh demo graph @ band 3.
//   hydrate(): Promise<void>    // NEW. GET /state/:id, upgrade the graph in place.
//   hasSavedState: boolean      // NEW. false until hydrate() finds saved state.
//
// `hydrate()` must:
//   • GET `/state/${getLearnerId()}` with apiHeaders() (X-Learner-Id === :id)
//   • 200 → graph = new SkillGraph(body.graph.nodes,
//                                  body.graph.independence ?? body.independence,
//                                  body.graph.attempts)     // ← 021's 3rd arg
//           and hasSavedState = true
//   • 404 → hasSavedState = false, graph untouched, NO client_error (new player)
//   • any other failure → hasSavedState = false, graph untouched, never throws
//   • never leave `graph` null and never change `screen`
//
// App.tsx calls startSession() then `void hydrate()` — gameplay is never
// blocked on the network.
//
// NOTE: this file is `.ts` (per ticket), so the render assertions below use
// React.createElement rather than JSX.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";

// ── Environment stubs the screens need in order to render at all ────────────
vi.mock("../pipeline/sentenceGen", () => ({
  generateBedtimeSentence: vi.fn(async () => null),
  masteredWords: vi.fn(() => []),
}));

const MockSR = vi.fn(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  continuous: false,
  interimResults: false,
  onresult: null,
  onerror: null,
  onend: null,
}));
(globalThis as any).SpeechRecognition = MockSR;
(globalThis as any).webkitSpeechRecognition = MockSR;

Object.defineProperty(HTMLMediaElement.prototype, "play", {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});
Object.defineProperty(HTMLMediaElement.prototype, "pause", { writable: true, value: vi.fn() });

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { createAppStore, type AppStore } from "./appStore";
import { getLearnerId } from "./learnerId";
import { SkillGraph } from "../graph/SkillGraph";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";
import { TitleScreen } from "../screens/TitleScreen";
import { LivingRoomScreen } from "../screens/LivingRoomScreen";
import { FridgeScreen } from "../screens/FridgeScreen";
import { BedroomScreen } from "../screens/BedroomScreen";
import { OffRampScreen } from "../screens/OffRampScreen";

// ── fetch router ────────────────────────────────────────────────────────────

type StateReply =
  | { kind: "found"; body: unknown }
  | { kind: "status"; status: number }
  | { kind: "network-error" };

let stateReply: StateReply = { kind: "status", status: 404 };

interface Call {
  url: string;
  init: RequestInit;
}

function calls(): Call[] {
  return mockFetch.mock.calls.map(([url, init]) => ({
    url: String(url),
    init: (init ?? {}) as RequestInit,
  }));
}

function callsTo(pred: (url: string) => boolean): Call[] {
  return calls().filter((c) => pred(c.url));
}

function methodOf(c: Call): string {
  return (c.init.method ?? "GET").toUpperCase();
}

function headerOf(init: RequestInit | undefined, name: string): string | undefined {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const hit = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return hit ? headers[hit] : undefined;
}

/** Every event posted to POST /events, flattened. */
function postedEvents(): Array<{ type: string; payload: any }> {
  return callsTo((u) => u === "/events").flatMap(
    (c) => JSON.parse(String(c.init.body ?? "{}")).events ?? [],
  );
}

function installFetch(): void {
  mockFetch.mockImplementation(async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    const method = (init?.method ?? "GET").toUpperCase();
    if (u.startsWith("/state/") && method === "GET") {
      if (stateReply.kind === "network-error") throw new Error("offline");
      if (stateReply.kind === "status") {
        return {
          ok: false,
          status: stateReply.status,
          json: async () => ({ error: "not_found" }),
        };
      }
      return { ok: true, status: 200, json: async () => stateReply.body };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });
}

// ── fixtures ────────────────────────────────────────────────────────────────

const demoNodes = () => JSON.parse(JSON.stringify(demoState.nodes)) as GraphNode[];

/** The exact wire shape `GET /state/:id` returns: `{ graph, independence }`. */
function serverPayload(graph: SkillGraph) {
  const wire = JSON.parse(JSON.stringify(graph.toJSON()));
  return { graph: wire, independence: wire.independence };
}

function savedAtBand(band: number, mutate?: (g: SkillGraph) => void) {
  const g = new SkillGraph(demoNodes(), band);
  mutate?.(g);
  return serverPayload(g);
}

/** Three independent, un-attempted nodes — the 021 fixture shape. */
function threeNodes(): GraphNode[] {
  return ["n_a", "n_b", "n_c"].map((id) => ({
    id,
    type: "grapheme" as const,
    label: id,
    prereqs: [],
    confusion: false,
    mastery: 0,
    peakMastery: 0,
    lastSeen: null,
    attempts: [],
  }));
}

const TRIO = ["n_a", "n_b", "n_c"];

/** Copy of the demo seed as `startSession()` builds it, for comparison. */
const seedGraph = () => new SkillGraph(demoNodes());

/** Copy — hydrate() is fire-and-forget from App's perspective but awaitable here. */
async function bootWith(store: AppStore): Promise<void> {
  store.getState().startSession();
  await store.getState().hydrate();
}

describe("TICKET 014 — E7/E8: silent hydration on startup with exact band resume", () => {
  let store: AppStore;

  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    installFetch();
    stateReply = { kind: "status", status: 404 };
    store = createAppStore();
  });

  afterEach(() => {
    cleanup();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // E8 — exact band resume
  // ─────────────────────────────────────────────────────────────────────────

  it("E8: saved state at band 7 hydrates to band 7, NOT the MVP's default 3", async () => {
    stateReply = { kind: "found", body: savedAtBand(7) };

    await bootWith(store);

    expect(store.getState().graph).not.toBeNull();
    expect(store.getState().graph!.independence()).toBe(7);
    expect(store.getState().hasSavedState).toBe(true);
  });

  it("E8: saved state at band 1 hydrates to band 1 — no floor pulls it back to 3", async () => {
    stateReply = { kind: "found", body: savedAtBand(1) };

    await bootWith(store);

    expect(store.getState().graph!.independence()).toBe(1);
  });

  it("E8/D16: the saved band is restored as-is however stale the save is (no time-based warm-down)", async () => {
    // A save whose every timestamp is 400 days old. D16: still band 9.
    const ancient = new Date("2025-01-01T00:00:00Z").getTime();
    const payload = savedAtBand(9, (g) => {
      for (const n of g.nodes) {
        n.lastSeen = ancient;
        n.attempts = n.attempts.map((a) => ({ ...a, timestamp: ancient }));
      }
    });
    stateReply = { kind: "found", body: payload };

    await bootWith(store);

    expect(store.getState().graph!.independence()).toBe(9);
  });

  it("E8/R5.3: with NO saved state the demo seed graph is built at band 3", async () => {
    stateReply = { kind: "status", status: 404 };

    await bootWith(store);

    const graph = store.getState().graph!;
    expect(graph.independence()).toBe(3);
    expect(store.getState().hasSavedState).toBe(false);
    // ...and it really is the warm demo seed, not an empty graph.
    expect(graph.nodes.map((n) => n.id)).toEqual(seedGraph().nodes.map((n) => n.id));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // E7 — the request, the 404, and the failure path
  // ─────────────────────────────────────────────────────────────────────────

  it("E7: hydrate GETs /state/<uuid> carrying a matching X-Learner-Id", async () => {
    stateReply = { kind: "found", body: savedAtBand(6) };
    const id = getLearnerId();

    await bootWith(store);

    const gets = callsTo((u) => u.startsWith("/state/")).filter((c) => methodOf(c) === "GET");
    expect(gets).toHaveLength(1);
    expect(gets[0].url).toBe(`/state/${id}`);
    expect(headerOf(gets[0].init, "X-Learner-Id")).toBe(id);
  });

  it("E7: a 404 from GET /state/:id is treated as 'new player', not as an error", async () => {
    stateReply = { kind: "status", status: 404 };

    await expect(bootWith(store)).resolves.toBeUndefined();

    // A 404 is the expected first-visit answer — nothing may be reported.
    expect(postedEvents().filter((e) => e.type === "client_error")).toEqual([]);
    expect(store.getState().graph).not.toBeNull();
    expect(store.getState().hasSavedState).toBe(false);
  });

  it("E7: a failed state fetch degrades to a fresh session rather than blocking startup", async () => {
    stateReply = { kind: "network-error" };

    // Must not reject — startup can never hang on the network.
    await expect(bootWith(store)).resolves.toBeUndefined();

    const state = store.getState();
    expect(state.graph).not.toBeNull();
    expect(state.graph!.independence()).toBe(3);
    expect(state.hasSavedState).toBe(false);
    expect(state.screen).toBe("title");
    // The session is playable: the rail still advances.
    state.setMicState("granted");
    state.advanceBeat();
    expect(store.getState().screen).toBe("living-room");
  });

  it("E7: a 500 from GET /state/:id also degrades to a playable fresh session", async () => {
    stateReply = { kind: "status", status: 500 };

    await expect(bootWith(store)).resolves.toBeUndefined();

    expect(store.getState().graph!.independence()).toBe(3);
    expect(store.getState().hasSavedState).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // E7 — hydrated mastery and item history
  // ─────────────────────────────────────────────────────────────────────────

  it("E7: hydrated node mastery matches what was saved, not the demo seed values", async () => {
    const payload = savedAtBand(6, (g) => {
      g.getNode("g_a")!.mastery = 0.11;
      g.getNode("g_a")!.peakMastery = 0.97;
      g.getNode("g_ee")!.mastery = 0.93;
    });
    stateReply = { kind: "found", body: payload };

    const seedA = seedGraph().getNode("g_a")!.mastery;
    const seedEe = seedGraph().getNode("g_ee")!.mastery;

    await bootWith(store);

    const g = store.getState().graph!;
    expect(g.getNode("g_a")!.mastery).toBeCloseTo(0.11, 10);
    expect(g.getNode("g_a")!.peakMastery).toBeCloseTo(0.97, 10);
    expect(g.getNode("g_ee")!.mastery).toBeCloseTo(0.93, 10);
    // Guard the fixture: these genuinely differ from the seed, so the
    // assertions above can only pass by reading the saved payload.
    expect(seedA).not.toBeCloseTo(0.11, 3);
    expect(seedEe).not.toBeCloseTo(0.93, 3);
  });

  it("021/E7: the saved ITEM history is restored verbatim, not re-derived from node.attempts", async () => {
    // A multi-node pass is ONE item but THREE node attempts, so the two logs
    // provably disagree — only the threaded third constructor arg gets this right.
    const live = new SkillGraph(threeNodes(), 5);
    live.update(TRIO, 1);
    live.recordItemBoundary();
    live.update(["n_a"], 0);
    live.recordItemBoundary();

    const payload = serverPayload(live);
    expect(payload.graph.attempts).toHaveLength(2); // fixture guard: 2 items...
    expect(payload.graph.nodes.flatMap((n: any) => n.attempts)).toHaveLength(4); // ...4 node attempts

    stateReply = { kind: "found", body: payload };
    await bootWith(store);

    expect(store.getState().graph!.toJSON().attempts).toEqual(payload.graph.attempts);
  });

  it("021/E7: a hydrated graph's next recordItemBoundary() behaves exactly as the live graph would", async () => {
    // Sequence chosen so the node-attempt fallback and the true item history
    // DISAGREE about the next band: item history [0,0,1] then a pass stays at
    // 5, while the rebuilt [0,0,1,1,1] then a pass trips the 3-pass streak
    // and promotes to 6.
    const live = new SkillGraph(threeNodes(), 5);
    live.update(["n_a"], 0);
    live.recordItemBoundary();
    live.update(["n_a"], 0);
    live.recordItemBoundary();
    live.update(TRIO, 1);
    live.recordItemBoundary();
    expect(live.independence()).toBe(5); // fixture guard

    stateReply = { kind: "found", body: serverPayload(live) };
    await bootWith(store);

    // Same next item on both.
    live.update(["n_b"], 1);
    live.recordItemBoundary();
    store.getState().recordGrade(["n_b"], 1, "milk");

    expect(store.getState().graph!.independence()).toBe(live.independence());
    expect(store.getState().graph!.independence()).toBe(5);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // E7 — the rail is unchanged, and the resume is silent
  // ─────────────────────────────────────────────────────────────────────────

  it("E7: a hydrated session still starts at `title` and runs the normal rail — nothing is skipped", async () => {
    stateReply = { kind: "found", body: savedAtBand(8) };

    await bootWith(store);

    expect(store.getState().screen).toBe("title");
    store.getState().setMicState("granted");

    const rail: string[] = [];
    for (let i = 0; i < 4; i++) {
      store.getState().advanceBeat();
      rail.push(store.getState().screen);
    }
    expect(rail).toEqual(["living-room", "fridge", "bedroom", "off-ramp"]);
    // Band survived the whole rail — hydration is not undone on advance.
    expect(store.getState().graph!.independence()).toBe(8);
  });

  it("E7: no 'welcome back' / 'resuming' copy is rendered on any screen of a hydrated session", async () => {
    stateReply = { kind: "found", body: savedAtBand(7) };
    await bootWith(store);

    const graph = store.getState().graph!;
    const seed = store.getState().sessionSeed;
    const independence = graph.independence();

    // Anything that would break the "one continuous evening" fiction.
    const RESUME_COPY =
      /welcome\s*back|bienvenid|resuming|resumiendo|reanud|last time|la última vez|la ultima vez|donde lo dejaste|where you left|pick up where|continue where|te extrañ|de vuelta/i;

    const screens: Array<[string, React.ReactElement]> = [
      ["title", React.createElement(TitleScreen, { onAdvance: () => {} })],
      [
        "living-room",
        React.createElement(LivingRoomScreen, {
          graph,
          seed,
          onAdvance: () => {},
          independence,
        } as any),
      ],
      [
        "fridge",
        React.createElement(FridgeScreen, {
          graph,
          seed,
          onAdvance: () => {},
          independence,
          sessionMissedWords: [],
          sessionPassedWords: [],
        } as any),
      ],
      [
        "bedroom",
        React.createElement(BedroomScreen, {
          graph,
          seed,
          onAdvance: () => {},
          independence,
          sessionPassedWords: ["milk"],
        } as any),
      ],
      ["off-ramp", React.createElement(OffRampScreen, {} as any)],
    ];

    for (const [name, element] of screens) {
      const { container, unmount } = render(element);
      const text = container.textContent ?? "";
      expect(text, `${name} rendered resume copy`).not.toMatch(RESUME_COPY);
      // Nor a dedicated welcome/resume affordance.
      expect(
        container.querySelector('[data-testid*="welcome"], [data-testid*="resume"]'),
        `${name} rendered a welcome/resume element`,
      ).toBeNull();
      unmount();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Regression guards — these PASS today and must keep passing.
  // ─────────────────────────────────────────────────────────────────────────

  it("GUARD (passes today): startSession() is synchronous and yields a band-3 graph immediately", () => {
    store.getState().startSession();
    // No await: the graph must be readable on the very next line (locked by
    // appStore.test.ts AC2 and telemetry.test.ts E4).
    const state = store.getState();
    expect(state.graph).not.toBeNull();
    expect(state.graph!.independence()).toBe(3);
    expect(state.screen).toBe("title");
    expect(state.sessionSeed).toBeTruthy();
  });

  it("GUARD (passes today): startSession() issues no network request of its own", () => {
    store.getState().startSession();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
