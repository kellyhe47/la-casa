import { contentPipeline } from "./ContentPipeline";
import type { SkillGraph } from "../graph/SkillGraph";
import { voices } from "../../../content/voices.json";

export const ABUELA_VOICE_ID = voices["voice.abuela"].elevenLabsVoiceID;
export const ABUELA_LANG = "es-MX";
export const VOICE_NOTE_TEXT = "Mija, ¿qué dice aquí?";

/** Words per node, in presentation order. A node stays on the frontier for
 *  several passes (mastery EMA), so each node offers multiple words — the loop
 *  never re-serves the same word/photo back-to-back (PRD §living-room loop). */
const NODE_WORDS: Record<string, string[]> = {
  g_sh: ["fish", "shop", "ship", "wish"],
  g_ee: ["beans", "cheese"],
  g_th: ["this", "that", "with"],
  g_vb: ["van", "bat", "vine"],
  g_z: ["zip", "zoo", "buzz"],
  g_scl: ["stop", "spin", "snack", "swim"],
  g_ae: ["cake", "rice"],
  g_ch: ["cheese", "chicken", "chips"],
  v_groc2: ["beans", "rice", "apples"],
  v_groc1: ["milk", "bread", "eggs"],
};

/**
 * Next living-room target — deterministic from graph frontier, skipping words
 * already used this visit so every exchange gets a fresh word + photo. When
 * every frontier word has been used, falls back to the frontier's first word.
 */
export function getFrontierWord(graph: SkillGraph, exclude: string[] = []): string {
  const frontier = graph.frontier();
  if (frontier.length === 0) return "milk";
  for (const node of frontier) {
    for (const word of NODE_WORDS[node.id] ?? []) {
      if (!exclude.includes(word)) return word;
    }
  }
  return NODE_WORDS[frontier[0].id]?.[0] ?? "milk";
}

/** First living-room item — deterministic from graph frontier. */
export function getFirstFrontierWord(graph: SkillGraph): string {
  return getFrontierWord(graph);
}

/**
 * Warm the pipeline caches for the first living-room exchange as soon as the
 * app loads. The title screen + mic gate + house transition then cover the
 * generation latency (R8.4.1). Fire-and-forget: failures fall back to the
 * living-scene wait like any other late content.
 */
export function prefetchSessionStart(graph: SkillGraph, seed: string): void {
  const word = getFirstFrontierWord(graph);
  contentPipeline.fetchImage({ word, seed }).catch(() => {});
  contentPipeline
    .fetchTTS({ text: VOICE_NOTE_TEXT, voiceId: ABUELA_VOICE_ID, lang: ABUELA_LANG })
    .catch(() => {});
}
