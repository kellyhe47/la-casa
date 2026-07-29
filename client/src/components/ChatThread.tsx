import React, { useEffect, useRef } from "react";
import { WordIllustration } from "./AbuelaArt";

export interface ChatMessage {
  id: string;
  sender: "abuela" | "sofia";
  type: "voice-note" | "text" | "image";
  text?: string;
  imageUrl?: string;
  targetWord?: string;
  audioBuffer?: ArrayBuffer;
}

interface ChatThreadProps {
  messages: ChatMessage[];
  onPlayVoiceNote?: (msg: ChatMessage) => void;
  isTyping?: boolean;
}

export function ChatThread({ messages, onPlayVoiceNote, isTyping }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Keep the newest message in view as the thread grows
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  return (
    <div
      ref={scrollRef}
      data-testid="chat-thread"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "12px 4px 8px",
        overflowY: "auto",
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Spacer pins a short thread to the bottom without breaking scrolling
          (justify-content: flex-end makes overflowed messages unreachable) */}
      <div style={{ marginTop: "auto" }} />
      {messages.map((msg) => {
        const isAbuela = msg.sender === "abuela";
        return (
          <div
            key={msg.id}
            data-sender={msg.sender}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isAbuela ? "flex-start" : "flex-end",
              gap: 6,
            }}
          >
            {/* Photo / reading target */}
            {msg.targetWord && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#FBE2D3",
                  border: "5px solid #6F4B35",
                  borderRadius: "18px 18px 18px 6px",
                  padding: 10,
                }}
              >
                {msg.imageUrl ? (
                  <img
                    src={msg.imageUrl}
                    alt={msg.targetWord}
                    style={{ width: 220, height: 150, objectFit: "cover", borderRadius: 10, display: "block" }}
                  />
                ) : (
                  <WordIllustration word={msg.targetWord} />
                )}
                <div
                  style={{
                    fontFamily: "'Baloo 2', sans-serif",
                    fontWeight: 800,
                    fontSize: 44,
                    lineHeight: 1.1,
                    color: "#6F4B35",
                    textAlign: "center",
                    paddingTop: 6,
                  }}
                >
                  {msg.targetWord}
                </div>
              </div>
            )}

            {/* Voice note bubble */}
            {msg.type === "voice-note" && (
              <button
                type="button"
                onClick={() => onPlayVoiceNote?.(msg)}
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#FBE2D3",
                  border: "5px solid #6F4B35",
                  borderRadius: "18px 18px 18px 6px",
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontFamily: "'Baloo 2', sans-serif",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "#E0674A",
                    border: "4px solid #6F4B35",
                    display: "grid",
                    placeItems: "center",
                    flex: "none",
                  }}
                >
                  <svg viewBox="0 0 20 20" width="18" height="18">
                    <path d="M 6 3 L 17 10 L 6 17 Z" fill="#FFFAF0" stroke="#6F4B35" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <svg viewBox="0 0 110 34" width="110" height="34" aria-hidden>
                  <g fill="#B3402F">
                    {[12, 7, 3, 9, 5, 12, 6, 10, 4, 11].map((y, i) => (
                      <rect key={i} x={2 + i * 10} y={y} width="6" height={34 - y * 2} rx="3" />
                    ))}
                  </g>
                </svg>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#6F4B35" }}>0:04</div>
              </button>
            )}

            {/* Text bubble */}
            {msg.type === "text" && msg.text && (
              <div
                style={{
                  alignSelf: isAbuela ? "flex-start" : "flex-end",
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 700,
                  fontSize: isAbuela ? 21 : 20,
                  color: isAbuela ? "#6F4B35" : "#FFFAF0",
                  background: isAbuela ? "#FFFAF0" : "#E0674A",
                  border: "5px solid #6F4B35",
                  borderRadius: isAbuela ? "18px 18px 18px 6px" : "18px 18px 6px 18px",
                  padding: "8px 14px",
                }}
              >
                {isAbuela ? `“${msg.text}”` : msg.text}
              </div>
            )}
          </div>
        );
      })}

      {/* Abuela typing / content loading indicator */}
      {isTyping && (
        <div
          data-testid="typing-indicator"
          style={{
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#FFFAF0",
            border: "5px solid #6F4B35",
            borderRadius: "18px 18px 18px 6px",
            padding: "12px 16px",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#B3402F",
                animation: `typing-blink 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
          <style>{`
            @keyframes typing-blink {
              0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
              30% { opacity: 1; transform: translateY(-3px); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
