import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(globalThis, "navigator", {
  value: {
    ...globalThis.navigator,
    mediaDevices: { getUserMedia: mockGetUserMedia },
  },
  writable: true,
});

// Mock SpeechRecognition
const mockStart = vi.fn();
const mockStop = vi.fn();
const MockSpeechRecognition = vi.fn(() => ({
  start: mockStart,
  stop: mockStop,
  continuous: false,
  interimResults: false,
  onresult: null,
  onerror: null,
  onend: null,
}));
(globalThis as any).SpeechRecognition = MockSpeechRecognition;
(globalThis as any).webkitSpeechRecognition = MockSpeechRecognition;

import { TitleScreen } from "./TitleScreen";

describe("TitleScreen", () => {
  beforeEach(() => {
    mockGetUserMedia.mockReset();
    mockStart.mockReset();
    mockStop.mockReset();
  });

  // AC1: renders ¡Jugar! button
  it("AC1: renders ¡Jugar! button", () => {
    render(<TitleScreen onAdvance={() => {}} />);
    expect(screen.getByText(/¡Jugar!/i)).toBeTruthy();
  });

  // AC2: only one interactive control (¡Jugar! button)
  it("AC2: only the ¡Jugar! button in idle state", () => {
    render(<TitleScreen onAdvance={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toMatch(/¡Jugar!/i);
  });

  // AC3: clicking ¡Jugar! calls getUserMedia
  it("AC3: clicking ¡Jugar! requests mic permission", async () => {
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [] });
    render(<TitleScreen onAdvance={() => {}} />);
    const btn = screen.getByText(/¡Jugar!/i);
    await act(async () => { fireEvent.click(btn); });
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  // AC5: mic denied shows calm message
  it("AC5: mic denied shows adult-facing calm message", async () => {
    mockGetUserMedia.mockRejectedValue(new Error("Permission denied"));
    render(<TitleScreen onAdvance={() => {}} />);
    const btn = screen.getByText(/¡Jugar!/i);
    await act(async () => { fireEvent.click(btn); });
    // Should show microphone needed message
    expect(screen.getByText(/microphone/i)).toBeTruthy();
    // ¡Jugar! button should not be shown again
    const buttons = screen.queryAllByRole("button");
    const jugarButtons = buttons.filter(b => /¡jugar!/i.test(b.textContent || ""));
    expect(jugarButtons).toHaveLength(0);
  });

  // AC8: session seed is set when ¡Jugar! is clicked
  it("AC8: session seed is set on ¡Jugar! click", async () => {
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [] });
    let seedSet = false;
    render(<TitleScreen onAdvance={() => {}} onSessionStart={() => { seedSet = true; }} />);
    const btn = screen.getByText(/¡Jugar!/i);
    await act(async () => { fireEvent.click(btn); });
    expect(seedSet).toBe(true);
  });
});
