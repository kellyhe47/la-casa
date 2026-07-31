import type { GraphNode } from "./types";

/** E6: most recent attempts kept per node when serializing. */
const MAX_SERIALIZED_ATTEMPTS = 50;

export class SkillGraph {
  nodes: GraphNode[];
  private _independence: number;
  // Track all graded attempts for independence computation
  private _allAttempts: Array<{ result: 0 | 1; timestamp: number }>;

  /**
   * @param attempts the saved ITEM history (one entry per graded item, not per
   *   node). Restored VERBATIM when supplied. When absent — a pre-021 saved
   *   state — fall back to rebuilding it from node.attempts so legacy payloads
   *   still hydrate rather than coming back empty.
   */
  constructor(
    nodes: GraphNode[],
    independence?: number,
    attempts?: Array<{ result: 0 | 1; timestamp: number }>,
  ) {
    this.nodes = nodes.map((n) => ({ ...n, attempts: [...(n.attempts || [])] }));
    // E5: resume a saved band when one is supplied; E8/R5.3: new players start at 3
    this._independence = independence ?? 3;

    if (attempts) {
      this._allAttempts = attempts.map((a) => ({ ...a }));
      return;
    }

    // Legacy fallback: no serialized item history, so approximate it from the
    // per-node attempt logs (exactly the pre-021 behaviour).
    this._allAttempts = [];
    for (const node of this.nodes) {
      for (const attempt of node.attempts) {
        this._allAttempts.push(attempt);
      }
    }
    this._allAttempts.sort((a, b) => a.timestamp - b.timestamp);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  frontier(): GraphNode[] {
    return this.nodes.filter((node) => {
      if (node.mastery >= 0.8) return false;
      // All prereqs must be mastered (≥ 0.8)
      for (const prereqId of node.prereqs) {
        const prereq = this.getNode(prereqId);
        if (!prereq || prereq.mastery < 0.8) return false;
      }
      return true;
    });
  }

  /**
   * Update mastery after a graded attempt.
   * Pass (result=1): credits ALL provided nodeIds
   * Miss (result=0): debits ONLY the FIRST nodeId (frontier target), ignores rest
   */
  update(nodeIds: string[], result: 0 | 1): void {
    const now = Date.now();
    const toUpdate = result === 1 ? nodeIds : [nodeIds[0]];

    for (const id of toUpdate) {
      const node = this.getNode(id);
      if (!node) continue;
      node.mastery = 0.7 * node.mastery + 0.3 * result;
      if (node.mastery > node.peakMastery) node.peakMastery = node.mastery;
      node.lastSeen = now;
      node.attempts.push({ timestamp: now, result });
    }

    this._allAttempts.push({ timestamp: now, result });
  }

  /**
   * Call at each item boundary to allow independence to tick.
   * Implements hysteresis: moves at most 1 band per call.
   */
  recordItemBoundary(): void {
    const recent = this._allAttempts.slice(-20);
    if (recent.length === 0) return;
    const accuracy = recent.reduce((sum, a) => sum + a.result, 0) / recent.length;
    const candidate = Math.min(10, Math.max(1, Math.round(accuracy * 10)));

    const last5 = this._allAttempts.slice(-5);
    const missCount = last5.filter((a) => a.result === 0).length;
    const isPassStreak =
      this._allAttempts.slice(-3).every((a) => a.result === 1) &&
      this._allAttempts.length >= 3;

    if (candidate > this._independence && isPassStreak) {
      this._independence = Math.min(10, this._independence + 1);
    } else if (missCount >= 3) {
      this._independence = Math.max(1, this._independence - 1);
    }
  }

  independence(): number {
    return this._independence;
  }

  /**
   * E6: serialize with each node's attempt log capped at the last 50, keeping
   * the wire payload flat at ~6KB forever. Truncation happens HERE, not on
   * record — the live session keeps its full history, so the returned nodes
   * (and their attempt arrays) are copies, never the live ones spliced.
   *
   * 50 is a floor with margin: recordItemBoundary reads the last 20, so a
   * smaller window would corrupt band computation after a reload.
   *
   * 021: the ITEM history rides along under `attempts` — one entry per graded
   * item — because it can no longer be re-derived from node.attempts (a
   * multi-node pass is one item but N node attempts). Same last-50 cap, same
   * copy-not-splice rule.
   */
  toJSON(): {
    nodes: GraphNode[];
    independence: number;
    attempts: Array<{ result: 0 | 1; timestamp: number }>;
  } {
    return {
      nodes: this.nodes.map((n) => ({
        ...n,
        attempts: n.attempts.slice(-MAX_SERIALIZED_ATTEMPTS),
      })),
      independence: this._independence,
      attempts: this._allAttempts.slice(-MAX_SERIALIZED_ATTEMPTS),
    };
  }
}
