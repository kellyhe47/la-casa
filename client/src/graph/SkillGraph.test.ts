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
