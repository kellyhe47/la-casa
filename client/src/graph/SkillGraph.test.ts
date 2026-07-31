import { describe, it, expect, beforeEach } from "vitest";
import { SkillGraph } from "./SkillGraph";
import demoState from "../../../content/demo-state.json";

describe("SkillGraph", () => {
  let graph: SkillGraph;

  beforeEach(() => {
    graph = new SkillGraph(demoState.nodes as any);
  });

  // AC1: loads without throwing
  it("AC1: loads from demo-state.json without throwing", () => {
    expect(graph).toBeDefined();
    expect(graph.nodes.length).toBe(25);
  });

  // AC2: frontier() — g_sh and g_ee should be in frontier (mastery ~0.447, prereqs mastered)
  it("AC2: frontier includes g_sh and g_ee (prereqs mastered, own mastery < 0.8)", () => {
    const frontier = graph.frontier();
    const ids = frontier.map((n) => n.id);
    expect(ids).toContain("g_sh");
    expect(ids).toContain("g_ee");
    // g_ch prereq is g_sh which is NOT mastered → not in frontier
    expect(ids).not.toContain("g_ch");
  });

  // AC3: pass credits ALL nodes the word contains
  it("AC3: pass on beans credits g_ee, g_cvc, v_groc2", () => {
    const beforeEe = graph.getNode("g_ee")!.mastery;
    const beforeCvc = graph.getNode("g_cvc")!.mastery;
    const beforeGroc2 = graph.getNode("v_groc2")!.mastery;

    graph.update(["g_ee", "g_cvc", "v_groc2"], 1);

    expect(graph.getNode("g_ee")!.mastery).toBeGreaterThan(beforeEe);
    expect(graph.getNode("g_cvc")!.mastery).toBeGreaterThan(beforeCvc);
    expect(graph.getNode("v_groc2")!.mastery).toBeGreaterThan(beforeGroc2);
  });

  // AC4: miss debits ONLY the frontier target node
  it("AC4: miss on g_sh only debits g_sh, not g_cvc", () => {
    const beforeCvc = graph.getNode("g_cvc")!.mastery;
    graph.update(["g_sh"], 0);
    expect(graph.getNode("g_cvc")!.mastery).toBe(beforeCvc);
    // g_sh should go down
    expect(graph.getNode("g_sh")!.mastery).toBeLessThan(0.447);
  });

  // AC5: ~3 consecutive passes from 0.447 crosses 0.8
  it("AC5: 3+ consecutive passes bring g_sh from ~0.447 to ≥ 0.8", () => {
    // Starting mastery ~0.447: after 3 passes with rule mastery = 0.7*m + 0.3*1
    // 0.447 → 0.613 → 0.729 → 0.810 — should cross 0.8
    graph.update(["g_sh"], 1);
    graph.update(["g_sh"], 1);
    graph.update(["g_sh"], 1);
    const mastery = graph.getNode("g_sh")!.mastery;
    expect(mastery).toBeGreaterThanOrEqual(0.8);
    // After mastering, g_ch should now appear in frontier (prereq met)
    const frontier = graph.frontier();
    expect(frontier.map((n) => n.id)).toContain("g_ch");
  });

  // AC6: independence() returns 3 from demo-state (R5.3)
  it("AC6: independence() returns 3 from demo-state", () => {
    expect(graph.independence()).toBe(3);
  });

  // AC7: independence moves at most 1 per item boundary; hysteresis rules
  it("AC7: independence increases by at most 1 per pass boundary (hysteresis)", () => {
    const initial = graph.independence();
    // Simulate a streak of passes — should increase slowly
    for (let i = 0; i < 5; i++) {
      graph.update(["g_sh"], 1);
      graph.recordItemBoundary();
    }
    const after = graph.independence();
    expect(after).toBeLessThanOrEqual(initial + 5); // max 1 per boundary
    expect(after).toBeGreaterThanOrEqual(initial);
  });

  // AC8: serializable to JSON
  it("AC8: serializes to JSON without circular refs", () => {
    const json = graph.toJSON();
    expect(() => JSON.stringify(json)).not.toThrow();
    expect(json.nodes).toBeDefined();
    expect(json.independence).toBeDefined();
  });

  // Mastery update rule
  it("mastery update rule: mastery = 0.7 * mastery + 0.3 * result", () => {
    const node = graph.getNode("g_sh")!;
    const before = node.mastery; // ~0.447
    graph.update(["g_sh"], 1);
    const expected = 0.7 * before + 0.3 * 1;
    expect(graph.getNode("g_sh")!.mastery).toBeCloseTo(expected, 5);
  });
});

// ── Ticket 006 / PRD-v2 §6 E5 ────────────────────────────────────────────────
// The SkillGraph constructor must accept a saved independence band so a reloaded
// session resumes at the band it was saved at instead of snapping back to 3.
//
// IMPLEMENTATION CONTRACT ASSUMED BY THESE TESTS:
//   new SkillGraph(nodes: GraphNode[], independence?: number)
// i.e. a SECOND OPTIONAL POSITIONAL argument. One-arg construction must keep
// working (client/src/state/appStore.ts:42 relies on it) and must still yield 3.
describe("SkillGraph — saved independence hydration (E5)", () => {
  /**
   * Drive a graph's independence band up to `target` by repeated
   * single-node pass + item boundary cycles.
   *
   * recordItemBoundary() moves at most 1 band per call and only on a 3-pass
   * streak, so this needs several cycles. Passes only, so the band is monotonic
   * upward and cannot overshoot: we re-check after every boundary.
   *
   * Single-node updates on purpose: update() pushes ONE entry to the internal
   * _allAttempts per call but one entry per node to node.attempts, so a
   * multi-node update would make the rehydrated attempt list disagree with the
   * live one for reasons unrelated to this ticket.
   */
  function driveToBand(g: SkillGraph, target: number, maxCycles = 200): void {
    for (let i = 0; i < maxCycles && g.independence() < target; i++) {
      g.update(["g_sh"], 1);
      g.recordItemBoundary();
    }
  }

  function freshGraph(): SkillGraph {
    return new SkillGraph(demoState.nodes as any);
  }

  /** Serialize through real JSON so we test what actually hits storage. */
  function saveAtBand(target: number) {
    const g = freshGraph();
    driveToBand(g, target);
    // PRECONDITION: if the driver failed, the round-trip test below would be
    // vacuous (serialize 3, assert 3 — green today, proving nothing).
    expect(g.independence()).toBe(target);
    return JSON.parse(JSON.stringify(g.toJSON())) as {
      nodes: any[];
      independence: number;
    };
  }

  // ─── THE HEADLINE TEST (PRD-v2 §12 risk #1) ───
  it("E5 ROUND-TRIP: saved at band 7, reloaded graph reports independence 7", () => {
    const saved = saveAtBand(7);
    expect(saved.independence).toBe(7); // the band really was written out

    const reloaded = new SkillGraph(saved.nodes as any, saved.independence);

    expect(reloaded.independence()).toBe(7);
  });

  it("E5: band 1 (floor) round-trips through construction", () => {
    const g = new SkillGraph(demoState.nodes as any, 1);
    expect(g.independence()).toBe(1);
  });

  it("E5: band 10 (ceiling) round-trips through construction", () => {
    const g = new SkillGraph(demoState.nodes as any, 10);
    expect(g.independence()).toBe(10);
  });

  // REGRESSION GUARD — passes today. E8/R5.3: new players start at band 3.
  it("REGRESSION GUARD: constructing with no independence argument yields 3", () => {
    const g = new SkillGraph(demoState.nodes as any);
    expect(g.independence()).toBe(3);
  });

  it("E5: hydrated nodes and per-node mastery match the serialized source", () => {
    const saved = saveAtBand(7);
    const reloaded = new SkillGraph(saved.nodes as any, saved.independence);

    expect(reloaded.nodes.length).toBe(saved.nodes.length);
    expect(reloaded.nodes.map((n) => n.id)).toEqual(saved.nodes.map((n: any) => n.id));
    for (const source of saved.nodes) {
      const hydrated = reloaded.getNode(source.id)!;
      expect(hydrated).toBeDefined();
      expect(hydrated.mastery).toBe(source.mastery);
      expect(hydrated.peakMastery).toBe(source.peakMastery);
      expect(hydrated.attempts.length).toBe(source.attempts.length);
    }
  });

  it("E5: hydrated graph's next recordItemBoundary sees restored attempt history, not an empty one", () => {
    const saved = saveAtBand(7);
    // Rebuild at band 5 with the SAME (all-recent-passes) attempt history.
    const reloaded = new SkillGraph(saved.nodes as any, 5);
    expect(reloaded.independence()).toBe(5);

    // No update() call — the only attempts available are the rehydrated ones.
    // With a restored history of recent passes: candidate 10 > 5 and the last 3
    // are passes, so the band ticks to 6. With an EMPTY _allAttempts,
    // recordItemBoundary() returns early and the band would stay 5.
    reloaded.recordItemBoundary();
    expect(reloaded.independence()).toBe(6);
  });

  // REGRESSION GUARD — passes today. Proves the _allAttempts rebuild from
  // node.attempts still happens, independent of the new parameter.
  it("REGRESSION GUARD: _allAttempts is rebuilt from node.attempts (one-arg construction)", () => {
    const saved = saveAtBand(7);
    const reloaded = new SkillGraph(saved.nodes as any);
    expect(reloaded.independence()).toBe(3);

    reloaded.recordItemBoundary();
    expect(reloaded.independence()).toBe(4);
  });

  it("E5: toJSON() still emits both nodes and independence, and a hydrated graph re-emits its saved band", () => {
    const saved = saveAtBand(7);
    const reloaded = new SkillGraph(saved.nodes as any, saved.independence);

    const json = reloaded.toJSON();
    expect(json.nodes).toBeDefined();
    expect(json.nodes.length).toBe(saved.nodes.length);
    expect(json.independence).toBe(7);
    expect(() => JSON.stringify(json)).not.toThrow();
  });
});
