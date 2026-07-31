// TICKET 015 — PRD v2 locked decision D14: "New game — warm-seed reset, fresh
// UUID (old row preserved), confirm dialog, hidden for first-time players."
//
// ── PINNED SHAPE (implementation constraints) ───────────────────────────────
//
// learnerId.ts
//   export function resetLearnerId(): string
//     Mints a fresh uuid, persists it under LEARNER_ID_KEY (replacing the old
//     value), and returns it. Every later getLearnerId() returns the new one.
//     It does NOT touch the server — the old learner row is preserved.
//
// appStore.ts
//   newGame(): void
//     resetLearnerId() → rebuild the WARM DEMO SEED graph at band 3 → clear the
//     session word lists → screen 'title' → hasSavedState = false.
//     It issues NO DELETE, and no request at all against the old uuid.
//
// TitleScreen.tsx — the confirm dialog is IN-APP UI, never window.confirm
// (jsdom does not implement window.confirm, and an in-app dialog is the only
// testable/kid-appropriate option). New optional props:
//   hasSavedState?: boolean   // default false ⇒ control hidden for first-timers
//   onNewGame?: () => void    // called ONLY when the dialog is confirmed
// Required test ids:
//   data-testid="new-game"          the affordance itself (a <button>)
//   role="dialog"                   the confirm dialog
//   data-testid="new-game-confirm"  the confirming button inside it
//   data-testid="new-game-cancel"   the dismissing button inside it
//
// App.tsx passes hasSavedState={state.hasSavedState} and
// onNewGame={() => appStore.getState().newGame()}.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup, within } from "@testing-library/react";
import React from "react";

const mockGetUserMedia = vi.fn();
Object.defineProperty(globalThis, "navigator", {
  value: { ...globalThis.navigator, mediaDevices: { getUserMedia: mockGetUserMedia } },
  writable: true,
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { TitleScreen } from "./TitleScreen";
import { createAppStore, type AppStore } from "../state/appStore";
import { getLearnerId, LEARNER_ID_KEY } from "../state/learnerId";
import { SkillGraph } from "../graph/SkillGraph";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const demoNodes = () => JSON.parse(JSON.stringify(demoState.nodes)) as GraphNode[];

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

function methodOf(c: Call): string {
  return (c.init.method ?? "GET").toUpperCase();
}

/** A returning player: a hydrated band-7 graph with real mastery on the books. */
function makeReturningStore(): AppStore {
  const store = createAppStore();
  store.getState().startSession();
  const graph = new SkillGraph(demoNodes(), 7);
  graph.getNode("g_a")!.mastery = 0.95;
  store.setState({ graph, hasSavedState: true } as never);
  return store;
}

/** Render the title screen wired to a real store, as App.tsx does. */
function renderTitle(store: AppStore) {
  return render(
    <TitleScreen
      onAdvance={() => {}}
      hasSavedState={store.getState().hasSavedState}
      onNewGame={() => store.getState().newGame()}
    />,
  );
}

describe("TICKET 015 — D14: new game (warm-seed reset, fresh uuid, confirm dialog)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetUserMedia.mockReset();
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [] });
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  });

  afterEach(() => {
    cleanup();
  });

  // ── visibility ───────────────────────────────────────────────────────────

  it("D14 (guards today's behaviour): the new-game control is NOT rendered for a first-time player", () => {
    const store = createAppStore();
    store.getState().startSession(); // no saved state ⇒ hasSavedState falsy

    renderTitle(store);

    expect(screen.queryByTestId("new-game")).toBeNull();
  });

  it("D14: the new-game control IS rendered once saved state exists", () => {
    const store = makeReturningStore();

    renderTitle(store);

    const control = screen.getByTestId("new-game");
    expect(control).toBeTruthy();
    expect(control.tagName.toLowerCase()).toBe("button");
    // It must read as a new-game affordance, not an unlabelled icon.
    expect((control.textContent ?? "") + (control.getAttribute("aria-label") ?? "")).toMatch(
      /nuevo|new game|empezar|start over/i,
    );
  });

  // ── the confirm dialog ───────────────────────────────────────────────────

  it("D14: clicking the control opens a confirm dialog and changes no state on its own", () => {
    const store = makeReturningStore();
    const idBefore = getLearnerId();
    const graphBefore = store.getState().graph;

    renderTitle(store);
    fireEvent.click(screen.getByTestId("new-game"));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByTestId("new-game-confirm")).toBeTruthy();
    expect(within(dialog).getByTestId("new-game-cancel")).toBeTruthy();

    // Nothing has happened yet.
    expect(getLearnerId()).toBe(idBefore);
    expect(localStorage.getItem(LEARNER_ID_KEY)).toBe(idBefore);
    expect(store.getState().graph).toBe(graphBefore);
    expect(store.getState().graph!.independence()).toBe(7);
  });

  it("D14: cancelling the dialog leaves the learner id and the graph untouched", () => {
    const store = makeReturningStore();
    const idBefore = getLearnerId();
    const graphBefore = store.getState().graph;

    renderTitle(store);
    fireEvent.click(screen.getByTestId("new-game"));
    fireEvent.click(screen.getByTestId("new-game-cancel"));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(getLearnerId()).toBe(idBefore);
    expect(localStorage.getItem(LEARNER_ID_KEY)).toBe(idBefore);
    expect(store.getState().graph).toBe(graphBefore);
    expect(store.getState().graph!.independence()).toBe(7);
    expect(store.getState().graph!.getNode("g_a")!.mastery).toBeCloseTo(0.95, 10);
    // The control is still available afterwards.
    expect(screen.getByTestId("new-game")).toBeTruthy();
  });

  // ── confirming ───────────────────────────────────────────────────────────

  it("D14: confirming mints a NEW uuid and persists it to localStorage", () => {
    const store = makeReturningStore();
    const idBefore = getLearnerId();
    expect(idBefore).toMatch(UUID_RE);

    renderTitle(store);
    fireEvent.click(screen.getByTestId("new-game"));
    act(() => {
      fireEvent.click(screen.getByTestId("new-game-confirm"));
    });

    const idAfter = localStorage.getItem(LEARNER_ID_KEY);
    expect(idAfter).toMatch(UUID_RE);
    expect(idAfter).not.toBe(idBefore);
    expect(getLearnerId()).toBe(idAfter);
  });

  it("D14: confirming resets the graph to the WARM demo seed at band 3", () => {
    const store = makeReturningStore();

    renderTitle(store);
    fireEvent.click(screen.getByTestId("new-game"));
    act(() => {
      fireEvent.click(screen.getByTestId("new-game-confirm"));
    });

    const graph = store.getState().graph!;
    expect(graph.independence()).toBe(3);
    expect(store.getState().hasSavedState).toBe(false);

    // Warm seed, not an empty/cold graph: same node set, same seed mastery.
    const seed = new SkillGraph(demoNodes());
    expect(graph.nodes.map((n) => n.id)).toEqual(seed.nodes.map((n) => n.id));
    expect(graph.getNode("g_a")!.mastery).toBeCloseTo(seed.getNode("g_a")!.mastery, 10);
    expect(graph.getNode("g_a")!.mastery).not.toBeCloseTo(0.95, 3); // the old value is gone
    expect(graph.frontier().length).toBeGreaterThan(0);
  });

  it("D14: confirming issues NO delete request — the old learner row is preserved", () => {
    const store = makeReturningStore();
    const oldId = getLearnerId();

    renderTitle(store);
    fireEvent.click(screen.getByTestId("new-game"));
    mockFetch.mockClear();
    act(() => {
      fireEvent.click(screen.getByTestId("new-game-confirm"));
    });

    expect(calls().filter((c) => methodOf(c) === "DELETE")).toEqual([]);
    // Nothing may be written against the old uuid either.
    expect(calls().filter((c) => c.url.includes(oldId))).toEqual([]);
  });

  it("D14: after confirming, the app is in a playable fresh-session state", () => {
    const store = makeReturningStore();
    store.getState().recordWordResult("milk", 1);
    store.getState().recordWordResult("shell", 0);

    renderTitle(store);
    fireEvent.click(screen.getByTestId("new-game"));
    act(() => {
      fireEvent.click(screen.getByTestId("new-game-confirm"));
    });

    const state = store.getState();
    expect(state.graph).not.toBeNull();
    expect(state.screen).toBe("title");
    expect(state.sessionSeed).toBeTruthy();
    expect(state.sessionPassedWords).toEqual([]);
    expect(state.sessionMissedWords).toEqual([]);

    // The rail runs from the top.
    state.setMicState("granted");
    state.advanceBeat();
    expect(store.getState().screen).toBe("living-room");

    // And grading works on the reset graph.
    store.getState().recordGrade(["g_a"], 1, "cat");
    expect(store.getState().sessionPassedWords).toEqual(["cat"]);

    // The dialog closed itself.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // ── regression guards — pass today ───────────────────────────────────────

  it("GUARD (passes today): with no saved state the title screen still shows exactly one button", () => {
    render(<TitleScreen onAdvance={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toMatch(/¡Jugar!/i);
  });

  it("GUARD (passes today): ¡Jugar! still requests the mic", async () => {
    const store = makeReturningStore();
    renderTitle(store);
    await act(async () => {
      fireEvent.click(screen.getByText(/¡Jugar!/i));
    });
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
  });
});
