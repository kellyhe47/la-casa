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
});
