import React from "react";
import { MicButton } from "./MicButton";

interface BookInstrumentProps {
  sentence: string;
  onAttempt: () => void;
  isListening: boolean;
  gloss?: string;
  independence?: number;
}

export function BookInstrument({ sentence, onAttempt, isListening, gloss, independence = 5 }: BookInstrumentProps) {
  const showGlossAuto = independence <= 2;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Book frame — no brown spine strip under the mic */}
      <div
        style={{
          background: "#FFFAF0",
          border: "6px solid #6F4B35",
          borderRadius: 24,
          padding: "24px 48px 24px 96px",
          width: 880,
          maxWidth: "100%",
          minHeight: 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          boxSizing: "border-box",
        }}
      >
        {/* Same living-room mic — circular, flashing invite ring, no brown backing */}
        <div
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <MicButton
            onClick={onAttempt}
            isListening={isListening}
            pulse={!isListening}
            size={110}
          />
        </div>

        {/* Reading sentence — largest text on screen ≥40px (AC1) */}
        <p
          data-testid="reading-sentence"
          style={{
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 50,
            color: "#6F4B35",
            textAlign: "center",
            lineHeight: 1.3,
            margin: 0,
            textShadow: "0 1px 3px rgba(58,36,23,0.2)",
            WebkitTextStroke: "1.5px #3A2417",
          }}
        >
          {sentence}
        </p>

        {/* Gloss — auto-shown at bands 1-2, tap-hold at 3-4, never before attempt at 5+ */}
        {showGlossAuto && gloss && (
          <p style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 20, color: "#9A7B5A", marginTop: 8 }}>
            ({gloss})
          </p>
        )}

        {/* Faint page lines */}
        <div style={{ position: "absolute", inset: "16px 32px", pointerEvents: "none" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ borderBottom: "1px solid rgba(201,138,84,0.15)", marginBottom: 36 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
