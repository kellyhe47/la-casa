import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BookInstrument } from "./BookInstrument";

describe("BookInstrument", () => {
  it("renders the sentence", () => {
    render(
      <BookInstrument
        sentence="The beans are in the soup."
        onAttempt={() => {}}
        isListening={false}
      />
    );
    expect(screen.getByTestId("reading-sentence")).toBeTruthy();
    expect(screen.getByText(/beans/i)).toBeTruthy();
  });

  it("renders mic button", () => {
    render(
      <BookInstrument
        sentence="The beans are in the soup."
        onAttempt={() => {}}
        isListening={false}
      />
    );
    expect(screen.getByTestId("mic-button")).toBeTruthy();
  });

  it("shows waveform bars when listening", () => {
    render(
      <BookInstrument
        sentence="The beans are in the soup."
        onAttempt={() => {}}
        isListening={true}
      />
    );
    const waveform = document.querySelector('[data-testid="waveform"]');
    expect(waveform).toBeTruthy();
  });
});
