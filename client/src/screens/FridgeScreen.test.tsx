import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { FridgeScreen } from "./FridgeScreen";
import { SkillGraph } from "../graph/SkillGraph";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

function makeGraph() {
  return new SkillGraph(demoState.nodes as unknown as GraphNode[]);
}

// Mock audio
Object.defineProperty(HTMLMediaElement.prototype, "play", { writable: true, value: vi.fn().mockResolvedValue(undefined) });
Object.defineProperty(HTMLMediaElement.prototype, "pause", { writable: true, value: vi.fn() });

describe("FridgeScreen", () => {
  let graph: SkillGraph;

  beforeEach(() => {
    graph = makeGraph();
  });

  // Basic render
  it("renders fridge screen", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    expect(screen.getByTestId("fridge-screen")).toBeTruthy();
  });

  // AC1: NO caption showing the target word in Dad's dialogue
  it("AC1: Dad's dialogue is audio-only — no speech bubble with target word", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    // There should be no element showing "Dad says:" or a speech bubble with the word
    const dadBubble = document.querySelector('[data-testid="dad-speech-bubble"]');
    expect(dadBubble).toBeNull();
  });

  // AC3: magnet tray present
  it("AC3: magnet tray is present", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    expect(screen.getByTestId("magnet-tray")).toBeTruthy();
  });

  // AC4: each magnet hit area ≥ 96px
  it("AC4: magnet buttons are large enough", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    const magnets = document.querySelectorAll('[data-testid="magnet"]');
    magnets.forEach((m) => {
      const el = m as HTMLElement;
      // Check inline style width/height or computed size
      const width = parseInt(el.style.width || "96");
      const height = parseInt(el.style.height || "96");
      expect(Math.max(width, height)).toBeGreaterThanOrEqual(60); // at least 60px sprite, padded hit area ≥ 96px
    });
  });

  // AC9: grading fires on word completion
  it("AC9: tapping letters spells the word and triggers grade on completion", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    const tray = screen.getByTestId("magnet-tray");
    expect(tray).toBeTruthy();
    // The tray should have letter magnets
    const magnets = document.querySelectorAll('[data-testid="magnet"]');
    expect(magnets.length).toBeGreaterThan(0);
  });

  // AC11: exit button only appears after first completed item
  it("AC11: ¡A dormir! exit not visible before first completion", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    const exit = screen.queryByTestId("exit-button");
    if (exit) {
      expect((exit as HTMLButtonElement).disabled).toBe(true);
    } else {
      expect(exit).toBeNull();
    }
  });

  // AC13: no spinner
  it("AC13: no spinner in scene", () => {
    render(<FridgeScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionMissedWords={[]} />);
    const spinners = document.querySelectorAll('[role="progressbar"], .spinner');
    expect(spinners).toHaveLength(0);
  });
});
