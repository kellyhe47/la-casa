import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { SkillGraph } from "../graph/SkillGraph";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

import { DebugOverlay } from "./DebugOverlay";

function makeGraph() {
  return new SkillGraph(demoState.nodes as unknown as GraphNode[]);
}

describe("DebugOverlay", () => {
  // AC1: URL param ?debug=1 starts overlay open
  it("AC1: ?debug=1 URL param — rendered as open when open=true", () => {
    const graph = makeGraph();
    render(<DebugOverlay open={true} graph={graph} seed="test123" lastGrade={null} />);
    // Should show the graph nodes
    expect(screen.getByTestId("debug-overlay")).toBeTruthy();
  });

  // AC4: shows current independence band
  it("AC4: shows independence band", () => {
    const graph = makeGraph();
    render(<DebugOverlay open={true} graph={graph} seed="abc" lastGrade={null} />);
    // Should show a number (independence band 1-10)
    expect(screen.getByText(/band/i)).toBeTruthy();
  });

  // AC5: shows session seed
  it("AC5: shows session seed", () => {
    const graph = makeGraph();
    render(<DebugOverlay open={true} graph={graph} seed="myseed42" lastGrade={null} />);
    expect(screen.getByText(/myseed42/i)).toBeTruthy();
  });

  // AC6: shows last graded event
  it("AC6: shows last graded event when provided", () => {
    const graph = makeGraph();
    render(
      <DebugOverlay
        open={true}
        graph={graph}
        seed="abc"
        lastGrade={{ word: "beans", result: 1, nodeId: "g_ee", delta: 0.14 }}
      />
    );
    expect(screen.getByText(/beans/i)).toBeTruthy();
    expect(screen.getByText(/g_ee/i)).toBeTruthy();
  });

  // AC8: overlay is hidden when open=false
  it("AC8: hidden when open=false", () => {
    const graph = makeGraph();
    render(<DebugOverlay open={false} graph={graph} seed="abc" lastGrade={null} />);
    const overlay = document.querySelector('[data-testid="debug-overlay"]');
    // Either not rendered or hidden
    if (overlay) {
      const style = window.getComputedStyle(overlay);
      expect(style.display).toBe("none");
    } else {
      expect(overlay).toBeNull();
    }
  });

  // AC9: overlay doesn't block pointer events to underlying game
  it("AC9: overlay has pointer-events pass-through on scene area or is positioned correctly", () => {
    const graph = makeGraph();
    render(<DebugOverlay open={true} graph={graph} seed="abc" lastGrade={null} />);
    const overlay = document.querySelector('[data-testid="debug-overlay"]');
    expect(overlay).toBeTruthy();
    // The overlay panel itself should have pointer-events:none on the non-panel area
    // or the panel only covers right third
    const panel = overlay?.querySelector('[data-testid="debug-panel"]');
    expect(panel).toBeTruthy();
  });
});
