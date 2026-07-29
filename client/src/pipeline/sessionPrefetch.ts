import { contentPipeline } from "./ContentPipeline";
import type { SkillGraph } from "../graph/SkillGraph";
import { voices } from "../../../content/voices.json";

export const ABUELA_VOICE_ID = voices["voice.abuela"].elevenLabsVoiceID;
export const ABUELA_LANG = "es-MX";
export const VOICE_NOTE_TEXT = "Mija, ¿qué dice aquí?";

/** First living-room item — deterministic from graph frontier. */
export function getFirstFrontierWord(graph: SkillGraph): string {
  const frontier = graph.frontier();
  if (frontier.length === 0) return "milk";
  const node = frontier[0];
  const nodeWordMap: Record<string, string> = {
    g_sh: "fish", g_ee: "beans", g_th: "this", g_vb: "van",
    g_z: "zip", g_scl: "stop", g_ae: "cake", g_ch: "cheese",
    v_groc2: "beans", v_groc1: "milk",
  };
  return nodeWordMap[node.id] || "milk";
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
