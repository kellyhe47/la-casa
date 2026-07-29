import { createStore } from "zustand/vanilla";
import { SkillGraph } from "../graph/SkillGraph";
import type { Screen, MicState } from "./types";
import { SCREEN_ORDER } from "./types";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

export interface AppState {
  screen: Screen;
  sessionSeed: string;
  micState: MicState;
  graph: SkillGraph | null;
  debugOpen: boolean;
  // Collected session data for bedroom sentences
  sessionMissedWords: string[];
  sessionPassedWords: string[];

  // Actions
  startSession: () => void;
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
    sessionMissedWords: [],
    sessionPassedWords: [],

    startSession() {
      const seed = Math.random().toString(36).slice(2, 10);
      const graph = new SkillGraph(demoState.nodes as unknown as GraphNode[]);
      set({ sessionSeed: seed, graph, screen: "title", micState: "idle" });
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
