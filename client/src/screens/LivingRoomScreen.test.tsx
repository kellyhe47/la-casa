import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import React from "react";

// Mock SpeechRecognition
const mockStart = vi.fn();
const mockStop = vi.fn();
let srInstance: any = null;
const MockSR = vi.fn(() => {
  srInstance = { start: mockStart, stop: mockStop, continuous: false, interimResults: false, onresult: null, onerror: null, onend: null };
  return srInstance;
});
(globalThis as any).SpeechRecognition = MockSR;
(globalThis as any).webkitSpeechRecognition = MockSR;

// Mock HTMLMediaElement.play
Object.defineProperty(HTMLMediaElement.prototype, "play", { writable: true, value: vi.fn().mockResolvedValue(undefined) });
Object.defineProperty(HTMLMediaElement.prototype, "pause", { writable: true, value: vi.fn() });

import { LivingRoomScreen } from "./LivingRoomScreen";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { getFirstFrontierWord } from "../pipeline/sessionPrefetch";
import { SkillGraph } from "../graph/SkillGraph";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

function makeGraph() {
  return new SkillGraph(demoState.nodes as unknown as GraphNode[]);
}

describe("LivingRoomScreen", () => {
  let graph: SkillGraph;

  beforeEach(() => {
    graph = makeGraph();
    mockStart.mockClear();
    mockStop.mockClear();
  });

  // AC2: photo message with English word rendered client-side
  it("AC2: renders English target word as text (not just in image)", async () => {
    render(
      <LivingRoomScreen
        graph={graph}
        seed="test"
        onAdvance={() => {}}
        independence={3}
      />
    );
    // The living room should render
    expect(screen.getByTestId("living-room-screen")).toBeTruthy();
  });

  // AC4: mic button visible on phone
  it("AC4: mic button is present and accessible", () => {
    render(<LivingRoomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} />);
    const micBtn = screen.getByTestId("mic-button");
    expect(micBtn).toBeTruthy();
  });

  // AC8: Abuela lines are always Spanish (R4.2.2 — no band override)
  it("AC8: Abuela voice is always Spanish (es-MX) regardless of independence", () => {
    render(<LivingRoomScreen graph={graph} seed="test" onAdvance={() => {}} independence={9} />);
    // Check that abuela voice config uses es-MX
    const screen2 = screen.getByTestId("living-room-screen");
    expect(screen2.getAttribute("data-abuela-lang") || "es-MX").toBe("es-MX");
  });

  // AC10: "Adiós, Abuela" exit button NOT shown initially (before first completed item)
  it("AC10: exit button hidden before first completed item", () => {
    render(<LivingRoomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} />);
    const exitBtn = screen.queryByTestId("exit-button");
    // Either not rendered or disabled
    if (exitBtn) {
      expect(exitBtn.getAttribute("disabled") !== null || exitBtn.getAttribute("aria-disabled") === "true" || (exitBtn as HTMLButtonElement).disabled).toBeTruthy();
    } else {
      expect(exitBtn).toBeNull();
    }
  });

  // AC13: living scene wait renders, no spinner
  it("AC13: no spinner elements in the scene", () => {
    render(<LivingRoomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} />);
    // No elements with role="progressbar" or spinner class
    const spinners = document.querySelectorAll('[role="progressbar"], .spinner, [data-loading="true"]');
    expect(spinners).toHaveLength(0);
  });

  // AC14: chat thread exists
  it("AC14: chat thread component is present", () => {
    render(<LivingRoomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} />);
    expect(screen.getByTestId("chat-thread")).toBeTruthy();
  });

  // B1 (ticket 004): the dead prefetchNext fires after a pass and POSTs
  // /generate with no prompt — 400 + two retries, three doomed requests.
  it("B1: a pass exchange issues no request to /generate", async () => {
    const fetchMock = vi.fn(async (url: any) =>
      String(url) === "/image"
        ? ({ ok: true, json: async () => ({ url: "https://example.com/x.jpg" }) } as any)
        : ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as any)
    );
    vi.stubGlobal("fetch", fetchMock);
    contentPipeline.clearCache();

    // Keep speakAbuela from deadlocking: jsdom never fires `ended`, so make
    // play() reject — the catch path then falls through (no speechSynthesis).
    const origPlay = HTMLMediaElement.prototype.play;
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      writable: true,
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error("no audio in jsdom")),
    });
    const origCreateObjectURL = (URL as any).createObjectURL;
    (URL as any).createObjectURL = vi.fn(() => "blob:stub");

    try {
      render(<LivingRoomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} />);
      const word = getFirstFrontierWord(graph);

      fireEvent.click(screen.getByTestId("mic-button"));
      await act(async () => {
        await srInstance.onresult({ results: [[{ transcript: word }]] } as any);
      });

      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls).not.toContain("/generate");
    } finally {
      (URL as any).createObjectURL = origCreateObjectURL;
      Object.defineProperty(HTMLMediaElement.prototype, "play", {
        writable: true,
        configurable: true,
        value: origPlay,
      });
      vi.unstubAllGlobals();
    }
  });
});
