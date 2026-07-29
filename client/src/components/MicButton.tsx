import React from "react";

interface MicButtonProps {
  onClick: () => void;
  isListening?: boolean;
  /** Invite pulse (flashing ring) — on when idle and awaiting a tap */
  pulse?: boolean;
  /** Diameter in px. Living-room hero is ~156 (SVG r=78). */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Shared hero mic — same terracotta circle + cream icon + flashing invite
 * ring used on the living-room phone. Keep this the single source of truth
 * so every scene's mic looks identical.
 */
export function MicButton({
  onClick,
  isListening = false,
  pulse = true,
  size = 156,
  className,
  style,
}: MicButtonProps) {
  const invite = pulse && !isListening;
  // Match LivingRoomScene proportions: r=78 with strokeWidth=10 → ~6.4% of diameter
  const borderWidth = Math.max(6, Math.round(size * (10 / 156)));

  return (
    <>
      <button
        data-testid="mic-button"
        className={className}
        onClick={onClick}
        aria-label="Micrófono"
        style={{
          width: size,
          height: size,
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          border: `${borderWidth}px solid #6F4B35`,
          background: isListening ? "#C0492F" : "#E0674A",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          padding: 0,
          boxSizing: "border-box",
          boxShadow: "none",
          animation: invite ? "mic-pulse 1.4s ease-in-out infinite" : "none",
          ...style,
        }}
      >
        {isListening ? (
          <div data-testid="waveform" aria-hidden>
            <svg width="48" height="28" viewBox="0 0 48 28">
              {[6, 12, 18, 14, 22, 16, 12, 8, 20, 14, 10, 6].map((h, i) => (
                <rect
                  key={i}
                  x={i * 4}
                  y={(28 - h) / 2}
                  width={2.5}
                  height={h}
                  rx={1.25}
                  fill="#FFFAF0"
                />
              ))}
            </svg>
          </div>
        ) : (
          // Same cream mic glyph as LivingRoomScene.tsx (phone overlay)
          <svg width="56" height="72" viewBox="0 0 72 100" aria-hidden>
            <rect x="24" y="8" width="24" height="44" rx="12" fill="#FFFAF0" stroke="#6F4B35" strokeWidth="3" />
            <path
              d="M 14 52 q 0 28 22 28 q 22 0 22 -28 M 36 80 v 14 M 22 94 h 28"
              fill="none"
              stroke="#6F4B35"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 14 52 q 0 28 22 28 q 22 0 22 -28 M 36 80 v 14 M 22 94 h 28"
              fill="none"
              stroke="#FFFAF0"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      <style>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224,103,74,0.45); }
          50% { box-shadow: 0 0 0 18px rgba(224,103,74,0); }
        }
      `}</style>
    </>
  );
}
