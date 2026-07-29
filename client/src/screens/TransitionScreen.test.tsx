import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TransitionScreen } from "./TransitionScreen";
import { OffRampScreen } from "./OffRampScreen";

describe("TransitionScreen", () => {
  // Guard (015): skippable on tap — regression guard, may already pass
  it("015 guard: AC2+AC3 click calls onComplete when skipped", () => {
    const onComplete = vi.fn();
    render(<TransitionScreen from="living-room" to="fridge" onComplete={onComplete} />);
    // Click to skip
    const el = screen.getByTestId("transition-screen");
    fireEvent.click(el);
    expect(onComplete).toHaveBeenCalled();
  });

  // Guard (015): no canvas — regression guard, may already pass
  it("015 guard: AC7 renders without canvas", () => {
    const onComplete = vi.fn();
    render(<TransitionScreen from="living-room" to="fridge" onComplete={onComplete} />);
    const canvases = document.querySelectorAll("canvas");
    expect(canvases).toHaveLength(0);
  });

  // Ticket 015 — House transition not gradient-only
  it("015: shows SVG house-travel content inside transition-screen", () => {
    const onComplete = vi.fn();
    render(<TransitionScreen from="living-room" to="fridge" onComplete={onComplete} />);
    const root = screen.getByTestId("transition-screen");
    const svg = root.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("015: has a transition-scene layer (not gradient + Tap to skip only)", () => {
    const onComplete = vi.fn();
    render(<TransitionScreen from="living-room" to="fridge" onComplete={onComplete} />);
    const root = screen.getByTestId("transition-screen");
    // Implementer must add a scene layer — either data-testid or an svg with viewBox
    const scene =
      root.querySelector('[data-testid="transition-scene"]') ||
      root.querySelector("svg[viewBox]");
    expect(scene).toBeTruthy();
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
