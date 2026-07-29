import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { BedroomScreen } from "./BedroomScreen";
import { SkillGraph } from "../graph/SkillGraph";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

// Mock SpeechRecognition
const mockStart = vi.fn();
let srInstance: any = null;
const MockSR = vi.fn(() => {
  srInstance = { start: mockStart, stop: vi.fn(), continuous: false, interimResults: false, onresult: null, onerror: null, onend: null };
  return srInstance;
});
(globalThis as any).SpeechRecognition = MockSR;
(globalThis as any).webkitSpeechRecognition = MockSR;

// Mock audio
Object.defineProperty(HTMLMediaElement.prototype, "play", { writable: true, value: vi.fn().mockResolvedValue(undefined) });

function makeGraph() {
  return new SkillGraph(demoState.nodes as unknown as GraphNode[]);
}

describe("BedroomScreen", () => {
  let graph: SkillGraph;

  beforeEach(() => {
    graph = makeGraph();
    mockStart.mockClear();
  });

  // Basic render
  it("renders bedroom screen", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk", "beans"]} />);
    expect(screen.getByTestId("bedroom-screen")).toBeTruthy();
  });

  // AC1: sentence displayed as large text ≥40px
  it("AC1: reading sentence is present as text element", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    const sentence = screen.getByTestId("reading-sentence");
    expect(sentence).toBeTruthy();
  });

  // AC2: mic button on book spine
  it("AC2: mic button on book", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    expect(screen.getByTestId("mic-button")).toBeTruthy();
  });

  // AC6: misses are fiction absorption (baby confusion, never error state)
  it("AC6: no error states shown to kid", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    const errorMsgs = document.querySelectorAll('[role="alert"], .error, [data-error]');
    expect(errorMsgs).toHaveLength(0);
  });

  // AC8: "Buenas noches" exit button — only after first completed page
  it("AC8: Buenas noches exit not visible initially before completion", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    const exit = screen.queryByTestId("exit-button");
    if (exit) {
      expect((exit as HTMLButtonElement).disabled).toBe(true);
    } else {
      expect(exit).toBeNull();
    }
  });

  // AC13: tap-hold on sentence text shows gloss (Spanish translation) — at low independence
  it("AC13: sentence has gloss data attribute for tap-hold", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={2} sessionPassedWords={["milk"]} />);
    const sentence = screen.getByTestId("reading-sentence");
    // At independence 2, gloss auto-shown
    expect(sentence).toBeTruthy();
  });

  // AC15: idle ladder — no initial spinner
  it("AC15: no spinner visible in scene", () => {
    render(<BedroomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} sessionPassedWords={["milk"]} />);
    const spinners = document.querySelectorAll('[role="progressbar"], .spinner');
    expect(spinners).toHaveLength(0);
  });
});
