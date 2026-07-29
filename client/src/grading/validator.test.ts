import { describe, it, expect, beforeEach } from "vitest";
import { validateSentence } from "./validator";
import { SkillGraph } from "../graph/SkillGraph";
import demoState from "../../../content/demo-state.json";

describe("validateSentence()", () => {
  let graph: SkillGraph;

  beforeEach(() => {
    graph = new SkillGraph(demoState.nodes as any);
  });

  // AC6: only mastered nodes + one frontier target allowed
  it("AC6a: sentence with only mastered words passes (milk, the)", () => {
    // 'milk' → v_groc1 (mastered), 'the' → s_the (mastered)
    expect(validateSentence("the milk", graph, null)).toBe(true);
  });

  it("AC6b: sentence with mastered + frontier target passes", () => {
    // beans → g_ee (frontier target) + g_cvc (mastered) + v_groc2 (mastered)
    expect(validateSentence("the beans", graph, "g_ee")).toBe(true);
  });

  it("AC6c: sentence with unmastered non-frontier node fails", () => {
    // 'shop' → g_sh (NOT mastered, mastery ~0.447), if g_sh is not the frontier target
    // Use a node that's definitely cold (mastery 0) and not frontier target
    // 'restaurant' → v_restaurant (mastery 0, no prereqs so could be in frontier actually)
    // Use 'chocolate' → v_chocolate (mastery 0) with no frontier target
    expect(validateSentence("chocolate", graph, null)).toBe(false);
  });

  it("AC6d: empty sentence returns false", () => {
    expect(validateSentence("", graph, null)).toBe(false);
  });
});
