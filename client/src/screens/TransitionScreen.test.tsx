import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { TransitionScreen } from "./TransitionScreen";
import { OffRampScreen } from "./OffRampScreen";

describe("TransitionScreen", () => {
  // AC2: transition is skippable after 1s on any tap
  it("AC2+AC3: renders and calls onComplete when skipped", () => {
    const onComplete = vi.fn();
    render(<TransitionScreen from="living-room" to="fridge" onComplete={onComplete} />);
    // Click to skip
    const el = screen.getByTestId("transition-screen");
    fireEvent.click(el);
    expect(onComplete).toHaveBeenCalled();
  });

  // AC7: CSS animation (not canvas/paint)
  it("AC7: renders as div/svg, not canvas", () => {
    const onComplete = vi.fn();
    render(<TransitionScreen from="living-room" to="fridge" onComplete={onComplete} />);
    const canvases = document.querySelectorAll("canvas");
    expect(canvases).toHaveLength(0);
  });
});

describe("OffRampScreen", () => {
  // AC4: shows warm end message, no error language
  it("AC4: renders warm message without error language", () => {
    render(<OffRampScreen />);
    // Should contain the specified text
    expect(screen.getByText(/durmiendo/i)).toBeTruthy();
    // Should NOT contain error words
    const text = document.body.textContent || "";
    expect(text.toLowerCase()).not.toMatch(/error/);
    expect(text.toLowerCase()).not.toMatch(/failed/);
    expect(text.toLowerCase()).not.toMatch(/crash/);
  });

  // AC5: no retry button
  it("AC5: no retry button on off-ramp", () => {
    render(<OffRampScreen />);
    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);
  });
});
