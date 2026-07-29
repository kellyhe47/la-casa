import React from "react";

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
      {/* Book frame */}
      <div
        style={{
          background: "#FFFAF0",
          border: "6px solid #6F4B35",
          borderRadius: "8px 24px 24px 8px",
          padding: "24px 48px",
          width: 880,
          maxWidth: "100%",
          minHeight: 120,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Book spine */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 24, background: "#C98A54", borderRadius: "8px 0 0 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Mic button ON the book spine */}
          <button
            data-testid="mic-button"
            onClick={onAttempt}
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: isListening ? "#C0492F" : "#E0674A",
              border: "5px solid #6F4B35",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 5px 0 #6F4B35",
              animation: !isListening ? "book-mic-pulse 1.6s ease-in-out infinite" : "book-mic-listen 0.8s ease-in-out infinite",
              marginLeft: 44, // extend out from spine
            }}
          >
            {isListening ? (
              <div data-testid="waveform">
                <svg width="40" height="24">
                  {[3, 7, 11, 8, 14, 10, 7, 5, 12, 9, 6, 4].map((h, i) => (
                    <rect key={i} x={i * 3 + 1} y={(14 - h / 2)} width={2} height={h} rx={1} fill="#FFF6D8" opacity={0.9} />
                  ))}
                </svg>
              </div>
            ) : (
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="13" y="4" width="10" height="16" rx="5" fill="#FFFAF0" />
                <path d="M6 18 Q6 28 18 28 Q30 28 30 18" stroke="#FFFAF0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <line x1="18" y1="28" x2="18" y2="33" stroke="#FFFAF0" strokeWidth="2.5" />
                <line x1="13" y1="33" x2="23" y2="33" stroke="#FFFAF0" strokeWidth="2.5" />
              </svg>
            )}
          </button>
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

      <style>{`
        @keyframes book-mic-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); box-shadow: 0 6px 0 #6F4B35, 0 0 20px rgba(224,103,74,0.4); }
        }
        @keyframes book-mic-listen {
          0%, 100% { transform: scale(1.05); }
          50% { transform: scale(0.98); }
        }
      `}</style>
    </div>
  );
}
