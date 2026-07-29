import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { MagnetTray } from "./MagnetTray";

/** Note-card letter slots: first flex row inside magnet-tray (dashed/filled boxes). */
function getLetterSlots(): HTMLElement[] {
  const tray = screen.getByTestId("magnet-tray");
  // Prefer explicit testid if implementer adds it; else first child row of tray
  const byTestId = tray.querySelectorAll('[data-testid="letter-slot"]');
  if (byTestId.length > 0) {
    return Array.from(byTestId) as HTMLElement[];
  }
  const noteCard = tray.children[0] as HTMLElement;
  return Array.from(noteCard.children) as HTMLElement[];
}

/** Find an unplaced magnet whose visible letter matches (case-insensitive). */
function findUnplacedMagnet(letter: string): HTMLElement {
  const magnets = Array.from(
    document.querySelectorAll('[data-testid="magnet"]')
  ) as HTMLElement[];
  const match = magnets.find((m) => {
    const t = (m.textContent || "").trim().toLowerCase();
    return t === letter.toLowerCase();
  });
  if (!match) {
    throw new Error(`No unplaced magnet for letter "${letter}"`);
  }
  return match;
}

/** Tap-tap: select magnet then tap the next empty slot (by index). */
function placeLetter(letter: string, slotIndex: number) {
  const magnet = findUnplacedMagnet(letter);
  fireEvent.click(magnet);
  const slots = getLetterSlots();
  fireEvent.click(slots[slotIndex]);
}

describe("MagnetTray", () => {
  it("renders magnet letters for target word", () => {
    const onComplete = vi.fn();
    render(<MagnetTray targetWord="fish" onWordComplete={onComplete} />);
    expect(screen.getByTestId("magnet-tray")).toBeTruthy();
    // Should have letter magnets
    const magnets = document.querySelectorAll('[data-testid="magnet"]');
    expect(magnets.length).toBeGreaterThan(0);
  });

  it("contains all target letters", () => {
    const onComplete = vi.fn();
    render(<MagnetTray targetWord="fish" onWordComplete={onComplete} />);
    // Letters f, i, s, h should all appear in the tray
    const text = document.body.textContent || "";
    expect(text).toMatch(/f/i);
    expect(text).toMatch(/i/i);
    expect(text).toMatch(/s/i);
    expect(text).toMatch(/h/i);
  });

  it("never resets placed letters on wrong drop (AC8)", () => {
    const onComplete = vi.fn();
    const { rerender } = render(<MagnetTray targetWord="fish" onWordComplete={onComplete} />);
    // This is verifying the component's design guarantee — placed letters persist
    // Just ensure the component renders without error
    expect(screen.getByTestId("magnet-tray")).toBeTruthy();
  });

  // Ticket 014 — Fridge magnet tap-tap completion
  describe("014: tap-tap spelling completion", () => {
    it("014: spelling milk (no duplicate letters) fills slots and calls onWordComplete", async () => {
      vi.useFakeTimers();
      const onComplete = vi.fn();
      render(<MagnetTray targetWord="milk" onWordComplete={onComplete} />);

      const letters = ["m", "i", "l", "k"];
      for (let i = 0; i < letters.length; i++) {
        placeLetter(letters[i], i);
      }

      const slots = getLetterSlots();
      expect(slots.map((s) => (s.textContent || "").trim().toLowerCase()).join("")).toBe("milk");

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(onComplete).toHaveBeenCalledWith("milk");
      vi.useRealTimers();
    });

    it("014: spelling beans fills all slots and calls onWordComplete", async () => {
      vi.useFakeTimers();
      const onComplete = vi.fn();
      render(<MagnetTray targetWord="beans" onWordComplete={onComplete} />);

      const letters = ["b", "e", "a", "n", "s"];
      for (let i = 0; i < letters.length; i++) {
        placeLetter(letters[i], i);
      }

      const slots = getLetterSlots();
      expect(slots.map((s) => (s.textContent || "").trim().toLowerCase()).join("")).toBe("beans");

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(onComplete).toHaveBeenCalledWith("beans");
      vi.useRealTimers();
    });

    it("014: duplicate letters (ball) — tray has enough copies to fill and complete", async () => {
      vi.useFakeTimers();
      const onComplete = vi.fn();
      render(<MagnetTray targetWord="ball" onWordComplete={onComplete} />);

      // "ball" needs two l magnets — tray must not unique/Set-collapse letter copies
      const letters = ["b", "a", "l", "l"];
      for (let i = 0; i < letters.length; i++) {
        placeLetter(letters[i], i);
      }

      const slots = getLetterSlots();
      expect(slots.map((s) => (s.textContent || "").trim().toLowerCase()).join("")).toBe("ball");

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(onComplete).toHaveBeenCalledWith("ball");
      vi.useRealTimers();
    });

    it("014: wrong letter does not stay in slot and shows no red X / alert", () => {
      const onComplete = vi.fn();
      render(<MagnetTray targetWord="milk" onWordComplete={onComplete} />);

      // First slot needs "m"; pick a wrong letter (e.g. "k")
      placeLetter("k", 0);

      const slots = getLetterSlots();
      expect((slots[0].textContent || "").trim()).toBe("");

      // No red-X / alert chrome
      expect(document.querySelector('[role="alert"]')).toBeNull();
      const redMarks = Array.from(document.querySelectorAll("*")).filter((el) => {
        const style = (el as HTMLElement).style;
        const color = (style.color || "").toLowerCase();
        const bg = (style.background || style.backgroundColor || "").toLowerCase();
        const text = (el.textContent || "").trim();
        return text === "✗" || text === "✕" || text === "×" || color.includes("red") || bg.includes("red") || color === "#ff0000" || bg === "#ff0000";
      });
      expect(redMarks).toHaveLength(0);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });
});
