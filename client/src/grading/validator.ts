import type { SkillGraph } from "../graph/SkillGraph";
import { WORD_NODES } from "./wordNodes";

/**
 * Deterministic decodable-text validator (§8.2, ADR-0001).
 * Returns true only if EVERY word in the sentence maps to:
 *   - a mastered node (mastery ≥ 0.8), OR
 *   - the single specified frontier target node.
 *
 * Words not in WORD_NODES are treated as unmastered (conservative).
 */
export function validateSentence(
  sentence: string,
  graph: SkillGraph,
  frontierTarget: string | null
): boolean {
  if (!sentence.trim()) return false;

  const words = sentence
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  for (const word of words) {
    const nodeIds = WORD_NODES[word];
    if (!nodeIds || nodeIds.length === 0) {
      // Unknown word — reject (conservative)
      return false;
    }

    // Every node for this word must be mastered OR be the frontier target
    for (const nodeId of nodeIds) {
      const node = graph.getNode(nodeId);
      if (!node) return false;
      const mastered = node.mastery >= 0.8;
      const isFrontierTarget = nodeId === frontierTarget;
      if (!mastered && !isFrontierTarget) return false;
    }
  }

  return true;
}
