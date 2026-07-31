import type { GraphNode } from "./types";

export class SkillGraph {
  nodes: GraphNode[];
  private _independence: number;
  // Track all graded attempts for independence computation
  private _allAttempts: Array<{ result: 0 | 1; timestamp: number }>;

  constructor(nodes: GraphNode[], independence?: number) {
    this.nodes = nodes.map((n) => ({ ...n, attempts: [...(n.attempts || [])] }));
    // E5: resume a saved band when one is supplied; E8/R5.3: new players start at 3
    this._independence = independence ?? 3;
    this._allAttempts = [];
    // Load existing attempts from nodes into global list for independence computation
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

  toJSON(): { nodes: GraphNode[]; independence: number } {
    return {
      nodes: this.nodes,
      independence: this._independence,
    };
  }
}
