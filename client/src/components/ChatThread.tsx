import React from "react";

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
}

function AbuelaAvatar() {
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#C98A54", border: "3px solid #6F4B35", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        {/* Face */}
        <circle cx="20" cy="20" r="18" fill="#D7AB87" />
        {/* Curly gray hair */}
        <path d="M5 16 Q6 4 20 6 Q34 4 35 16" fill="#CFC3B4" />
        <circle cx="8" cy="14" r="5" fill="#CFC3B4" />
        <circle cx="32" cy="14" r="5" fill="#CFC3B4" />
        {/* Round glasses */}
        <circle cx="15" cy="20" r="4" fill="none" stroke="#6F4B35" strokeWidth="1.5" />
        <circle cx="25" cy="20" r="4" fill="none" stroke="#6F4B35" strokeWidth="1.5" />
        <line x1="19" y1="20" x2="21" y2="20" stroke="#6F4B35" strokeWidth="1.5" />
        {/* Blush */}
        <circle cx="11" cy="24" r="3" fill="#F2A9A0" opacity="0.6" />
        <circle cx="29" cy="24" r="3" fill="#F2A9A0" opacity="0.6" />
        {/* Smile */}
        <path d="M15 27 Q20 31 25 27" fill="none" stroke="#6F4B35" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function ChatThread({ messages, onPlayVoiceNote }: ChatThreadProps) {
  return (
    <div
      data-testid="chat-thread"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "12px 8px",
        overflowY: "auto",
        maxHeight: "100%",
      }}
    >
      {messages.map((msg) => {
        const isAbuela = msg.sender === "abuela";
        return (
          <div
            key={msg.id}
            data-sender={msg.sender}
            style={{
              display: "flex",
              flexDirection: isAbuela ? "row" : "row-reverse",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            {isAbuela && <AbuelaAvatar />}

            <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Image / target-word polaroid — show whenever targetWord is set */}
              {msg.targetWord && (
                <div
                  style={{
                    background: "#FFFAF0",
                    border: "4px solid #C98A54",
                    borderRadius: 12,
                    padding: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  {msg.imageUrl ? (
                    <img
                      src={msg.imageUrl}
                      alt={msg.targetWord}
                      style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 8, display: "block" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 160,
                        height: 160,
                        borderRadius: 8,
                        background: "#FDF3E3",
                        display: "block",
                      }}
                    />
                  )}
                  {/* Target word client-rendered — R4.2.5 */}
                  <p
                    style={{
                      fontFamily: "'Baloo 2', sans-serif",
                      fontWeight: 800,
                      fontSize: 42,
                      color: "#6F4B35",
                      textAlign: "center",
                      margin: "8px 0 0",
                      lineHeight: 1,
                    }}
                  >
                    {msg.targetWord}
                  </p>
                </div>
              )}

              {/* Voice note bubble */}
              {msg.type === "voice-note" && (
                <div
                  style={{
                    background: isAbuela ? "#FDF3E3" : "#E0674A",
                    color: isAbuela ? "#6F4B35" : "#FFFAF0",
                    borderRadius: isAbuela ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    cursor: "pointer",
                  }}
                  onClick={() => onPlayVoiceNote?.(msg)}
                >
                  <span style={{ fontSize: 18 }}>▶</span>
                  {/* Waveform visualization */}
                  <svg width="60" height="20">
                    {[3, 8, 5, 12, 7, 10, 4, 9, 6, 11, 5, 8, 3].map((h, i) => (
                      <rect
                        key={i}
                        x={i * 4 + 2}
                        y={(20 - h) / 2}
                        width={3}
                        height={h}
                        rx={1.5}
                        fill={isAbuela ? "#C98A54" : "#FFF6D8"}
                        opacity={0.8}
                      />
                    ))}
                  </svg>
                  <span style={{ fontSize: 12 }}>nota de voz</span>
                </div>
              )}

              {/* Text bubble */}
              {msg.type === "text" && msg.text && (
                <div
                  style={{
                    background: isAbuela ? "#FDF3E3" : "#E0674A",
                    color: isAbuela ? "#6F4B35" : "#FFFAF0",
                    borderRadius: isAbuela ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
                    padding: "10px 16px",
                    fontSize: 16,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    fontFamily: "'Baloo 2', sans-serif",
                  }}
                >
                  {msg.text}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
