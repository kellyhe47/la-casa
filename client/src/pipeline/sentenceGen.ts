import { contentPipeline } from "./ContentPipeline";
import { validateSentence } from "../grading/validator";
import { WORD_NODES } from "../grading/wordNodes";
import type { SkillGraph } from "../graph/SkillGraph";

/**
 * Bedroom page generation (§4.3, §8.2): one LLM-generated sentence per page,
 * validator-gated so every word is decodable (mastered nodes + the single
 * frontier target). Reject → regenerate; stub/offline → caller falls back to
 * template sentences.
 */

const MAX_ATTEMPTS = 3;

/** Words whose every node is mastered (≥0.8) — the kid can decode these. */
export function masteredWords(graph: SkillGraph): string[] {
  return Object.entries(WORD_NODES)
    .filter(([, nodeIds]) =>
      nodeIds.every((id) => (graph.getNode(id)?.mastery ?? 0) >= 0.8)
    )
    .map(([word]) => word);
}

/** Words that exercise the frontier target node (the word being taught). */
function frontierWords(graph: SkillGraph, frontierTarget: string | null): string[] {
  if (!frontierTarget) return [];
  return Object.entries(WORD_NODES)
    .filter(([, nodeIds]) => nodeIds.includes(frontierTarget))
    .filter(([, nodeIds]) =>
      nodeIds.every(
        (id) => id === frontierTarget || (graph.getNode(id)?.mastery ?? 0) >= 0.8
      )
    )
    .map(([word]) => word);
}

function buildPrompt(vocab: string[], target: string | undefined, avoid: string[], attempt: number): string {
  return [
    `Write ONE simple English sentence (3 to 7 words) for a beginning reader.`,
    `Use ONLY these words: ${vocab.join(", ")}.`,
    target ? `It MUST include the word: ${target}.` : "",
    avoid.length ? `Do NOT reuse these sentences: ${avoid.join(" | ")}` : "",
    attempt > 0 ? `Make it different from previous attempts (variation ${attempt + 1}).` : "",
    `Reply with only the sentence — no quotes, no explanation.`,
  ].filter(Boolean).join("\n");
}

/**
 * Generate the next validated bedtime sentence, or null when generation is
 * unavailable (proxy stub) or nothing validates — caller then uses templates.
 */
export async function generateBedtimeSentence(
  graph: SkillGraph,
  seed: string,
  independence: number,
  usedSentences: string[]
): Promise<string | null> {
  const frontierTarget = graph.frontier()[0]?.id ?? null;
  const vocab = [...new Set([...masteredWords(graph), ...frontierWords(graph, frontierTarget)])];
  if (vocab.length < 3) return null;
  const target = frontierWords(graph, frontierTarget)[0];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const { content } = await contentPipeline.generate({
        beat: `bedroom-page-${usedSentences.length}-a${attempt}`,
        frontierTarget: frontierTarget ?? "none",
        independenceBand: independence,
        seed,
        prompt: buildPrompt(vocab, target, usedSentences, attempt),
      });
      const sentence = (content ?? "").trim().replace(/^["']|["']$/g, "").split("\n")[0].trim();
      const isNew = !usedSentences.some((s) => s.toLowerCase() === sentence.toLowerCase());
      if (sentence && isNew && validateSentence(sentence, graph, frontierTarget)) {
        return sentence;
      }
    } catch {
      return null; // /generate stubbed (no API key) — fall back to templates
    }
  }
  return null;
}
