import { createStore } from "zustand/vanilla";
import { SkillGraph } from "../graph/SkillGraph";
import type { Screen, MicState } from "./types";
import { SCREEN_ORDER } from "./types";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";
import { saveLearnerState } from "./saveState";
import { apiHeaders, getLearnerId, resetLearnerId } from "./learnerId";

/** The wire shape of `GET /state/:id`. `independence` rides both on the graph
 *  (021's `toJSON()`) and at the top level (E4's save envelope). */
interface SavedStateReply {
  graph?: {
    nodes?: GraphNode[];
    independence?: number;
    attempts?: Array<{ result: 0 | 1; timestamp: number }>;
  };
  independence?: number;
}

export interface AppState {
  screen: Screen;
  sessionSeed: string;
  micState: MicState;
  graph: SkillGraph | null;
  debugOpen: boolean;
  /** E7: true once hydrate() has found saved state on the server. Drives the
   *  D14 new-game affordance, which stays hidden for first-time players. */
  hasSavedState: boolean;
  // Collected session data for bedroom sentences
  sessionMissedWords: string[];
  sessionPassedWords: string[];

  // Actions
  startSession: () => void;
  /** E7/E8: fetch the saved graph and upgrade the live one in place. Async and
   *  fire-and-forget — gameplay is never blocked on the network, and a missing
   *  or failed fetch silently leaves the fresh band-3 session alone. */
  hydrate: () => Promise<void>;
  /** D14: warm-seed reset onto a brand-new uuid. The old learner row is
   *  preserved server-side — nothing is deleted and nothing is written. */
  newGame: () => void;
  advanceBeat: () => void;
  setMicState: (s: MicState) => void;
  recordGrade: (nodeIds: string[], result: 0 | 1, word: string) => void;
  /** Track pass/miss word lists only — for screens that update the graph themselves */
  recordWordResult: (word: string, result: 0 | 1) => void;
  setDebugOpen: (open: boolean) => void;
}

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore() {
  return createStore<AppState>((set, get) => ({
    screen: "title",
    sessionSeed: "",
    micState: "idle",
    graph: null,
    debugOpen: false,
    hasSavedState: false,
    sessionMissedWords: [],
    sessionPassedWords: [],

    startSession() {
      const seed = Math.random().toString(36).slice(2, 10);
      const graph = new SkillGraph(demoState.nodes as unknown as GraphNode[]);
      set({ sessionSeed: seed, graph, screen: "title", micState: "idle" });
    },

    async hydrate() {
      // E7: the resume is SILENT. Nothing here touches `screen`, `sessionSeed`
      // or the rail — only the band and node mastery differ.
      try {
        if (typeof fetch !== "function") return;
        const res = await fetch(`/state/${getLearnerId()}`, {
          method: "GET",
          headers: apiHeaders(),
        });
        // 404 is the expected first-visit answer, not an error — no telemetry.
        // Any other status degrades to the fresh session already in place.
        if (!res || !res.ok) return;
        const body = (await res.json()) as SavedStateReply | null;
        const saved = body?.graph;
        if (!saved || !Array.isArray(saved.nodes) || saved.nodes.length === 0) return;
        // E8/D16: the saved band is restored exactly as-is, however stale the
        // save. A rusty kid trips the 2-consecutive-miss rule within the first
        // minute and the scaffolding returns on its own.
        const graph = new SkillGraph(
          saved.nodes,
          saved.independence ?? body?.independence,
          saved.attempts,
        );
        set({ graph, hasSavedState: true });
      } catch {
        // Offline, malformed JSON, anything: startup can never hang or throw.
      }
    },

    newGame() {
      // D14: a fresh uuid, so the previous learner row is preserved untouched
      // on the server. No DELETE, and no request at all against the old id.
      resetLearnerId();
      const seed = Math.random().toString(36).slice(2, 10);
      const graph = new SkillGraph(demoState.nodes as unknown as GraphNode[]);
      set({
        sessionSeed: seed,
        graph,
        screen: "title",
        micState: "idle",
        hasSavedState: false,
        sessionMissedWords: [],
        sessionPassedWords: [],
      });
    },

    advanceBeat() {
      const { screen, micState } = get();
      // Mic must be granted to advance past title
      if (screen === "title" && micState !== "granted") return;
      if (screen === "off-ramp") return;
      const idx = SCREEN_ORDER.indexOf(screen);
      if (idx < SCREEN_ORDER.length - 1) {
        set({ screen: SCREEN_ORDER[idx + 1] });
      }
    },

    setMicState(s: MicState) {
      set({ micState: s });
    },

    recordGrade(nodeIds: string[], result: 0 | 1, word: string) {
      const { graph } = get();
      if (!graph) return;
      graph.update(nodeIds, result);
      graph.recordItemBoundary();
      // E4/D13: fire-and-forget save at every item boundary, after the band has
      // ticked so the written independence is the live one.
      saveLearnerState(graph);
      if (result === 0) {
        set((state) => ({ sessionMissedWords: [...state.sessionMissedWords, word] }));
      } else {
        set((state) => ({ sessionPassedWords: [...state.sessionPassedWords, word] }));
      }
    },

    recordWordResult(word: string, result: 0 | 1) {
      if (result === 0) {
        set((state) => ({ sessionMissedWords: [...state.sessionMissedWords, word] }));
      } else {
        set((state) => ({ sessionPassedWords: [...state.sessionPassedWords, word] }));
      }
    },

    setDebugOpen(open: boolean) {
      set({ debugOpen: open });
    },
  }));
}

/** Singleton store */
export const appStore = createAppStore();
