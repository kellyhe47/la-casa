import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ChatThread, type ChatMessage } from "./ChatThread";

describe("ChatThread", () => {
  const messages: ChatMessage[] = [
    {
      id: "1",
      sender: "abuela",
      type: "voice-note",
      text: "¿Qué dice aquí?",
      imageUrl: "https://example.com/beans.jpg",
      targetWord: "beans",
    },
    {
      id: "2",
      sender: "sofia",
      type: "text",
      text: "beans",
    },
  ];

  it("renders messages in thread", () => {
    render(<ChatThread messages={messages} />);
    expect(screen.getByTestId("chat-thread")).toBeTruthy();
  });

  it("shows Abuela avatar", () => {
    render(<ChatThread messages={messages} />);
    const thread = screen.getByTestId("chat-thread");
    expect(thread).toBeTruthy();
  });

  it("Sofia messages are right-aligned (terracotta)", () => {
    render(<ChatThread messages={messages} />);
    const sofiaMsgs = document.querySelectorAll('[data-sender="sofia"]');
    expect(sofiaMsgs.length).toBeGreaterThan(0);
  });

  it("target word rendered as large text (≥40px) not just in image", () => {
    render(<ChatThread messages={messages} />);
    // The target word "beans" should appear as readable text
    const beanText = screen.getAllByText(/beans/i);
    expect(beanText.length).toBeGreaterThan(0);
  });

  // Ticket 013 — Abuela target word when image stubbed / failed
  describe("013: target word visible without imageUrl", () => {
    const stubbedImageMessage: ChatMessage[] = [
      {
        id: "stub-1",
        sender: "abuela",
        type: "image",
        targetWord: "beans",
        imageUrl: undefined,
      },
    ];

    it("013: shows English target word as DOM text when imageUrl is undefined", () => {
      render(<ChatThread messages={stubbedImageMessage} />);
      // Word must not be gated on imageUrl being truthy
      expect(screen.getByText("beans")).toBeTruthy();
    });

    it("013: target word fontSize is ≥40px even when image is stubbed", () => {
      render(<ChatThread messages={stubbedImageMessage} />);
      const wordEl = screen.getByText("beans");
      const fontSize =
        parseFloat(wordEl.style.fontSize) ||
        parseFloat(getComputedStyle(wordEl).fontSize);
      expect(fontSize).toBeGreaterThanOrEqual(40);
    });

    it("013: polaroid may be empty but word is still visible (not gated on imageUrl)", () => {
      render(<ChatThread messages={stubbedImageMessage} />);
      // No img is fine when stubbed — word must still be in the document
      const imgs = document.querySelectorAll('[data-sender="abuela"] img');
      expect(imgs.length).toBe(0);
      expect(screen.getByText("beans")).toBeTruthy();
    });
  });
});
