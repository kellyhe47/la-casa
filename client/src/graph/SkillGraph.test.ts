import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

/* ------------------------------------------------------------------ *
 * TICKET 013 — E6: truncate node attempts to the last 50 on serialize
 *
 * `GraphNode.attempts` is append-only and unbounded, but recordItemBoundary
 * only ever reads the last 20. Truncating to the last 50 per node ON SERIALIZE
 * keeps the wire payload flat at ~6KB forever. The in-memory graph keeps its
 * full history for the life of the session.
 * ------------------------------------------------------------------ */

const MAX_SERIALIZED_ATTEMPTS = 50;

/** `count` attempts with strictly increasing timestamps, mostly passes. */
function attemptSeq(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: 1_000 + i,
    result: (i % 9 === 0 ? 0 : 1) as 0 | 1,
  }));
}

function nodeWith(id: string, attemptCount: number) {
  return {
    id,
    type: "grapheme",
    label: id,
    prereqs: [],
    confusion: false,
    mastery: 0.5,
    peakMastery: 0.6,
    lastSeen: 1_000,
    attempts: attemptSeq(attemptCount),
  };
}

describe("SkillGraph — attempts truncation on serialize (E6)", () => {
  it("E6: a node with 120 attempts serializes with exactly 50", () => {
    const g = new SkillGraph([nodeWith("n_hot", 120)] as any);

    const json = g.toJSON();

    expect(json.nodes[0].attempts.length).toBe(MAX_SERIALIZED_ATTEMPTS);
  });

  it("E6: the 50 kept are the MOST RECENT — the newest survives, the oldest does not", () => {
    const source = attemptSeq(120);
    const g = new SkillGraph([nodeWith("n_hot", 120)] as any);

    const kept = g.toJSON().nodes[0].attempts;
    const keptStamps = kept.map((a) => a.timestamp);

    expect(keptStamps).toContain(source[119].timestamp); // newest survives
    expect(keptStamps).not.toContain(source[0].timestamp); // oldest is dropped
    expect(keptStamps).not.toContain(source[69].timestamp); // last one outside the window
    expect(keptStamps).toContain(source[70].timestamp); // first one inside the window
  });

  it("E6: attempt order is preserved oldest-to-newest within the kept window", () => {
    const source = attemptSeq(120);
    const g = new SkillGraph([nodeWith("n_hot", 120)] as any);

    const kept = g.toJSON().nodes[0].attempts;

    expect(kept).toEqual(source.slice(-MAX_SERIALIZED_ATTEMPTS));
    const stamps = kept.map((a) => a.timestamp);
    expect(stamps).toEqual([...stamps].sort((a, b) => a - b));
  });

  // GUARD — passes today. Truncation must be a no-op below the cap.
  it("E6 GUARD: a node with fewer than 50 attempts is serialized unchanged", () => {
    const g = new SkillGraph([nodeWith("n_cool", 12)] as any);

    expect(g.toJSON().nodes[0].attempts).toEqual(attemptSeq(12));
  });

  // GUARD — passes today. Off-by-one: exactly 50 must survive intact.
  it("E6 GUARD: a node with exactly 50 attempts is serialized unchanged", () => {
    const g = new SkillGraph([nodeWith("n_edge", 50)] as any);

    expect(g.toJSON().nodes[0].attempts).toEqual(attemptSeq(50));
  });

  it("E6: truncation does not mutate the live in-memory graph", () => {
    const g = new SkillGraph([nodeWith("n_hot", 120)] as any);

    const json = g.toJSON();

    // The session keeps its full history...
    expect(g.getNode("n_hot")!.attempts.length).toBe(120);
    expect(g.nodes[0].attempts.length).toBe(120);
    // ...so the serialized array must be a copy, not the live one spliced.
    expect(json.nodes[0].attempts).not.toBe(g.getNode("n_hot")!.attempts);
    // A second serialize still yields 50 (not 50-of-50-of-...).
    expect(g.toJSON().nodes[0].attempts.length).toBe(MAX_SERIALIZED_ATTEMPTS);
    expect(g.getNode("n_hot")!.attempts.length).toBe(120);
  });

  // GUARD — passes today. The coupling called out in the PRD: _allAttempts is
  // rebuilt from node.attempts, so the kept window must stay ≥ 20.
  it("E6 GUARD: round-trip leaves recordItemBoundary ≥ 20 attempts of history", () => {
    const g = new SkillGraph([nodeWith("n_hot", 120)] as any, 5);
    const wire = JSON.parse(JSON.stringify(g.toJSON()));
    const reloaded = new SkillGraph(wire.nodes, wire.independence);

    expect((reloaded as any)._allAttempts.length).toBeGreaterThanOrEqual(20);
    expect(reloaded.getNode("n_hot")!.attempts.length).toBeGreaterThanOrEqual(20);
  });

  // GUARD — passes today. Ticket 006 (E5) must not regress through a
  // truncating serialize.
  it("E6 GUARD: independence still round-trips through a truncating serialize", () => {
    const g = new SkillGraph([nodeWith("n_hot", 120)] as any, 7);
    const wire = JSON.parse(JSON.stringify(g.toJSON()));

    expect(wire.independence).toBe(7);
    expect(new SkillGraph(wire.nodes, wire.independence).independence()).toBe(7);
  });
});

/* ------------------------------------------------------------------ *
 * TICKET 021 — the ITEM history must survive a reload unchanged
 *
 * `update(nodeIds, result)` writes one entry per NODE to `node.attempts` but
 * one entry per CALL to the internal item history that `recordItemBoundary()`
 * reads. Since a pass credits EVERY node in `nodeIds`, a 3-node pass writes
 * 3 node entries and 1 item entry. The constructor rebuilds the item history
 * from `node.attempts`, so after save + reload that one item comes back as
 * THREE — and the same play yields a different band depending on whether the
 * kid reloaded.
 *
 * FIX (decided): the item history is an ITEM history — one entry per call —
 * and is therefore SERIALIZED EXPLICITLY rather than rebuilt.
 *
 * IMPLEMENTATION CONTRACT ASSUMED BY THESE TESTS:
 *   constructor(nodes: GraphNode[], independence?: number,
 *               attempts?: Array<{result: 0|1; timestamp: number}>)
 *   toJSON(): { nodes, independence, attempts }   // attempts capped at last 50
 *   - no 3rd arg  → LEGACY FALLBACK: rebuild item history from node.attempts
 *   - 3rd arg     → restore it VERBATIM
 *
 * NOT this ticket: recordItemBoundary's up/down thresholds (ticket 016 owns
 * the band-down rule). This ticket only fixes WHAT GOES INTO the list.
 * ------------------------------------------------------------------ */

describe("SkillGraph — item history is one entry per item, serialized (021)", () => {
  // update() stamps with Date.now(); fake timers give every call a distinct,
  // deterministic timestamp so the rebuilt-vs-restored comparison never hinges
  // on sub-millisecond ordering.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const tick = () => vi.advanceTimersByTime(1000);

  /** Three independent, un-attempted nodes. */
  const threeNodes = () =>
    [nodeWith("n_a", 0), nodeWith("n_b", 0), nodeWith("n_c", 0)] as any;

  const TRIO = ["n_a", "n_b", "n_c"];

  /** The item history as it is serialized. */
  const itemHistory = (g: SkillGraph): Array<{ result: 0 | 1; timestamp: number }> =>
    (g.toJSON() as any).attempts;

  const wireOf = (g: SkillGraph) => JSON.parse(JSON.stringify(g.toJSON()));

  /** Hydrate the way a post-021 client will: nodes + band + item history. */
  const hydrate = (wire: any) =>
    new SkillGraph(wire.nodes, wire.independence, wire.attempts);

  // ─── AC: one entry per item, not per node ───
  it("021: a multi-node pass appends exactly ONE entry to the item history", () => {
    const g = new SkillGraph(threeNodes(), 5);

    g.update(TRIO, 1);

    // Three nodes each got credited...
    expect(g.getNode("n_a")!.attempts.length).toBe(1);
    expect(g.getNode("n_b")!.attempts.length).toBe(1);
    expect(g.getNode("n_c")!.attempts.length).toBe(1);
    // ...but that was ONE item.
    expect(itemHistory(g)).toHaveLength(1);
    expect(itemHistory(g)[0].result).toBe(1);
  });

  // ─── AC: toJSON() emits the third field ───
  it("021: toJSON() emits `attempts` alongside `nodes` and `independence`", () => {
    const g = new SkillGraph(threeNodes(), 5);
    g.update(TRIO, 1);

    const json = g.toJSON() as any;

    expect(Object.keys(json).sort()).toEqual(["attempts", "independence", "nodes"]);
    expect(Array.isArray(json.attempts)).toBe(true);
    expect(() => JSON.stringify(json)).not.toThrow();
  });

  // ─── AC: hydrated item history === live item history ───
  it("021 ROUND-TRIP: hydrated item history equals the live one — same length, entries, order", () => {
    const g = new SkillGraph(threeNodes(), 5);
    g.update(TRIO, 1); tick();
    g.update(["n_a"], 0); tick();
    g.update(["n_a", "n_b"], 1); tick();
    g.update(TRIO, 1); tick();
    g.update(["n_b"], 0); tick();

    const live = itemHistory(g);
    expect(live).toHaveLength(5); // 5 items, NOT 5 nodes-worth

    const hydrated = hydrate(wireOf(g));

    expect(itemHistory(hydrated)).toEqual(live);
  });

  // ─── AC: restored VERBATIM from the third argument ───
  it("021: the third constructor argument is restored verbatim, not re-derived from nodes", () => {
    const saved = [
      { timestamp: 10, result: 1 as const },
      { timestamp: 20, result: 0 as const },
      { timestamp: 30, result: 1 as const },
    ];

    const g = new SkillGraph(threeNodes(), 7, saved);

    expect(itemHistory(g)).toEqual(saved);
  });

  // ══════════════ THE BEHAVIOURAL CRUX ══════════════
  // Same play, same band on both sides of a reload. This is the whole ticket.
  //
  // 016 NOTE: this case originally discriminated through the band-DOWN rule
  // (item history [0,0,0,1] → 3 misses in the last 5 → drop; the rebuilt
  // [0,0,0,1,1,1] → only 2 → no drop). Ticket 016 replaces that rule with
  // "two CONSECUTIVE misses", which a multi-node pass can never change (a pass
  // expands into 1s either way), so the down path can no longer tell the two
  // histories apart. The discriminator moved to the band-UP rule, which the
  // expansion does change: 3 items vs 7.
  it("021 CRUX: live and hydrated graphs produce the SAME band from recordItemBoundary()", () => {
    const live = new SkillGraph(threeNodes(), 5);
    // One miss (a miss debits only nodeIds[0]) then two 3-node passes.
    live.update(["n_a"], 0); tick();
    live.update(TRIO, 1); tick();
    live.update(TRIO, 1); tick();

    const reloaded = hydrate(wireOf(live));

    live.recordItemBoundary();
    reloaded.recordItemBoundary();

    // Live sees 3 items [0,1,1] — the last three are not all passes, so there
    // is no streak and the band holds at 5.
    expect(live.independence()).toBe(5);
    // A rebuild from node.attempts would see [0,1,1,1,1,1,1]: last three all
    // passes, candidate 9 > 5 → promoted to 6. Same play, different kid.
    expect(reloaded.independence()).toBe(live.independence());
  });

  // ─── AC: a 3-pass streak counts three ITEMS, not three nodes ───
  it("021: three multi-node passes are a 3-item streak; ONE 3-node pass is not", () => {
    // (a) one 3-node pass = one item → no streak → no band-up after reload
    const one = new SkillGraph(threeNodes(), 5);
    one.update(TRIO, 1); tick();
    const oneReloaded = hydrate(wireOf(one));
    oneReloaded.recordItemBoundary();
    expect(oneReloaded.independence()).toBe(5);

    // (b) three multi-node passes = three items → streak → band-up after reload
    const three = new SkillGraph(threeNodes(), 5);
    three.update(TRIO, 1); tick();
    three.update(TRIO, 1); tick();
    three.update(TRIO, 1); tick();
    const threeReloaded = hydrate(wireOf(three));
    threeReloaded.recordItemBoundary();
    expect(threeReloaded.independence()).toBe(6);
  });

  // ─── AC: serialized item history capped at the last 50 ───
  it("021: the serialized item history is capped at the last 50 items, most-recent kept, order preserved", () => {
    const g = new SkillGraph(threeNodes(), 5);
    const expected: Array<{ result: 0 | 1; timestamp: number }> = [];
    for (let i = 0; i < 60; i++) {
      const result = (i % 7 === 0 ? 0 : 1) as 0 | 1;
      expected.push({ timestamp: Date.now(), result });
      g.update(result === 1 ? TRIO : ["n_a"], result);
      tick();
    }

    const serialized = itemHistory(g);

    expect(serialized).toHaveLength(MAX_SERIALIZED_ATTEMPTS);
    expect(serialized).toEqual(expected.slice(-MAX_SERIALIZED_ATTEMPTS));
    // newest kept, oldest dropped, order oldest→newest
    expect(serialized[serialized.length - 1].timestamp).toBe(expected[59].timestamp);
    expect(serialized.map((a) => a.timestamp)).not.toContain(expected[0].timestamp);
    const stamps = serialized.map((a) => a.timestamp);
    expect(stamps).toEqual([...stamps].sort((a, b) => a - b));
  });

  it("021: serializing does not mutate the live graph's item history", () => {
    const g = new SkillGraph(threeNodes(), 5);
    for (let i = 0; i < 60; i++) {
      g.update(TRIO, 1);
      tick();
    }

    const first = itemHistory(g);
    const second = itemHistory(g);

    expect(first).toHaveLength(MAX_SERIALIZED_ATTEMPTS);
    // Not 50-of-50-of-… : the live list is untouched, so a second serialize
    // yields the same 50, from a copy rather than the live array spliced.
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect((g as any)._allAttempts).toHaveLength(60);
  });

  // ─── AC: legacy fallback — a pre-021 saved state still hydrates ───
  it("021 LEGACY FALLBACK: with no third argument the item history is rebuilt from node.attempts", () => {
    const g = new SkillGraph(threeNodes(), 5);
    g.update(TRIO, 1); tick();
    g.update(["n_a"], 0); tick();

    // A pre-021 payload: nodes + independence only, no `attempts` key.
    const legacy = wireOf(g);
    delete legacy.attempts;

    const reloaded = new SkillGraph(legacy.nodes, legacy.independence);

    expect(reloaded.independence()).toBe(5);
    // Rebuilt exactly as today: every node attempt, sorted by timestamp.
    const rebuilt = legacy.nodes
      .flatMap((n: any) => n.attempts)
      .sort((a: any, b: any) => a.timestamp - b.timestamp);
    expect(itemHistory(reloaded)).toEqual(rebuilt);
    expect(itemHistory(reloaded)).toHaveLength(4); // 3 nodes credited + 1 miss
  });

  // GUARD — passes today. Ticket 006 must not regress.
  it("021 GUARD: ticket 006 band round-trip still holds (band 7 saves and hydrates as 7)", () => {
    const g = new SkillGraph(threeNodes(), 7);
    g.update(TRIO, 1); tick();

    const wire = wireOf(g);

    expect(wire.independence).toBe(7);
    expect(new SkillGraph(wire.nodes, wire.independence).independence()).toBe(7);
    expect(hydrate(wire).independence()).toBe(7);
    expect(new SkillGraph(threeNodes()).independence()).toBe(3);
  });

  // GUARD — passes today. Ticket 013's PER-NODE cap is separate from the new
  // per-ITEM cap and must keep working.
  it("021 GUARD: ticket 013's per-node 50-cap still holds", () => {
    const g = new SkillGraph([nodeWith("n_hot", 120)] as any, 5);

    expect(g.toJSON().nodes[0].attempts).toHaveLength(MAX_SERIALIZED_ATTEMPTS);
    expect(g.getNode("n_hot")!.attempts).toHaveLength(120);
  });
});

/* ------------------------------------------------------------------ *
 * TICKET 016 — F1: the band comes DOWN on TWO CONSECUTIVE MISSES
 *
 * PRD-v2 §7: "Bands ratchet upward and realistically never fall... a
 * struggling kid climbs to 7+ and is permanently stranded in an English-only
 * world." The MVP rule — ≥3 misses in the last 5 items — can never fire,
 * because grace caps consecutive misses at 2. Locked decision D9 replaces it:
 *
 *   DOWN: the last TWO items are both misses  → independence − 1, floor 1
 *   UP:   unchanged — candidate > band AND the last 3 items are all passes,
 *         ceiling 10
 *
 * Since two consecutive misses is exactly the grace trigger, the rule reads:
 * every graced item costs a band. Net shape: up 1 slowly, down 1 immediately
 * on a failed item — a kid can never get stranded.
 *
 * 021 CONTEXT: `_allAttempts` is a per-ITEM history (one entry per update()
 * call), so "two consecutive misses" means two consecutive ITEMS. Nothing here
 * may reintroduce per-node counting.
 *
 * Hysteresis is unchanged: one recordItemBoundary() call moves the band by at
 * most one, however many misses piled up since the last call.
 * ------------------------------------------------------------------ */

describe("SkillGraph — band-down on two consecutive misses (016/F1)", () => {
  /** Three independent, un-attempted nodes. */
  const threeNodes = () =>
    [nodeWith("n_a", 0), nodeWith("n_b", 0), nodeWith("n_c", 0)] as any;
  const TRIO = ["n_a", "n_b", "n_c"];

  /** One missed item (a miss debits only the frontier target). */
  const miss = (g: SkillGraph) => g.update(["n_a"], 0);
  /** One passed item (a pass credits every node in the item). */
  const pass = (g: SkillGraph) => g.update(TRIO, 1);

  const at = (band: number) => new SkillGraph(threeNodes(), band);

  // ─── THE HEADLINE RULE ───
  it("016 F1: two consecutive misses drop the band by exactly 1", () => {
    const g = at(5);

    miss(g);
    g.recordItemBoundary();
    expect(g.independence()).toBe(5); // one miss is not two — nothing moves yet

    miss(g);
    g.recordItemBoundary();
    expect(g.independence()).toBe(4); // exactly one band, not two
  });

  it("016 F1: hysteresis — a single boundary call never moves more than one band, however many misses accumulated", () => {
    const two = at(8);
    miss(two);
    miss(two);
    two.recordItemBoundary();
    expect(two.independence()).toBe(7);

    const five = at(8);
    for (let i = 0; i < 5; i++) miss(five);
    five.recordItemBoundary();
    expect(five.independence()).toBe(7);
  });

  it("016 F1: a third consecutive miss followed by a boundary drops another band", () => {
    const g = at(5);

    miss(g);
    g.recordItemBoundary();
    miss(g);
    g.recordItemBoundary();
    expect(g.independence()).toBe(4);

    miss(g);
    g.recordItemBoundary();
    expect(g.independence()).toBe(3);
  });

  // ─── consecutiveness ───

  // GUARD — passes today. The misses must be adjacent: a pass between them
  // resets the run, so the band holds.
  it("016 F1 GUARD: miss, pass, miss does NOT drop the band — the misses must be consecutive", () => {
    const g = at(5);

    miss(g);
    pass(g);
    miss(g);
    g.recordItemBoundary();

    expect(g.independence()).toBe(5);
  });

  // The superseded MVP rule, stated as its own case: under ≥3-in-5 this drops,
  // under D9 it must not — the last item is a pass, so there is no live run.
  it("016 F1: the ≥3-misses-in-5 rule is GONE — three misses followed by a pass does not drop the band", () => {
    const g = at(5);

    miss(g);
    miss(g);
    miss(g);
    pass(g);
    g.recordItemBoundary();

    expect(g.independence()).toBe(5);
  });

  // ─── the floor ───
  it("016 F1: the band floors at 1 and never goes below, however many misses accumulate", () => {
    const g = at(2);

    miss(g);
    miss(g);
    g.recordItemBoundary();
    expect(g.independence()).toBe(1);

    for (let i = 0; i < 20; i++) {
      miss(g);
      g.recordItemBoundary();
      expect(g.independence()).toBe(1);
    }
  });

  // ─── band-up is untouched ───

  // GUARD — passes today. Up stays slow: a 3-pass streak, one band at a time.
  it("016 F1 GUARD: band-up still requires a 3-pass streak", () => {
    const g = at(5);

    pass(g);
    g.recordItemBoundary();
    expect(g.independence()).toBe(5);

    pass(g);
    g.recordItemBoundary();
    expect(g.independence()).toBe(5);

    pass(g);
    g.recordItemBoundary();
    expect(g.independence()).toBe(6);
  });

  // GUARD — passes today.
  it("016 F1 GUARD: band-up is still capped at 10", () => {
    const g = at(9);

    for (let i = 0; i < 30; i++) {
      pass(g);
      g.recordItemBoundary();
      expect(g.independence()).toBeLessThanOrEqual(10);
    }

    expect(g.independence()).toBe(10);
  });

  // ─── PRD §7's stranding scenario, on the real demo graph ───
  it("016 F1 STRANDING: from band 7, two consecutive misses land the kid at 6", () => {
    // Third arg `[]`: demo-state's nodes carry a pre-baked attempt log, and the
    // legacy fallback would rebuild an item history out of it. Start this kid's
    // item history empty so the two misses below are the only items in play.
    const g = new SkillGraph(demoState.nodes as any, 7, []);

    g.update(["g_sh"], 0);
    g.recordItemBoundary();
    g.update(["g_sh"], 0);
    g.recordItemBoundary();

    expect(g.independence()).toBe(6);
  });

  it("016 F1: recovery works — after a drop, three passes climb back", () => {
    const g = at(5);

    miss(g);
    miss(g);
    g.recordItemBoundary();
    expect(g.independence()).toBe(4);

    for (let i = 0; i < 3; i++) {
      pass(g);
      g.recordItemBoundary();
    }

    expect(g.independence()).toBe(5);
  });
});
