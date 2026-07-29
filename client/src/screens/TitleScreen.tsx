import React, { useCallback, useState } from "react";
import { TitleScene } from "../assets/AssetStore";

interface TitleScreenProps {
  onAdvance: () => void;
  onSessionStart?: () => void;
}

type State = "idle" | "requesting" | "mic-check" | "denied" | "transition";

export function TitleScreen({ onAdvance, onSessionStart }: TitleScreenProps) {
  const [state, setState] = useState<State>("idle");

  const handleJugar = useCallback(async () => {
    onSessionStart?.();
    setState("requesting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setState("mic-check");
      // Half-second mic check — any audio passes
      setTimeout(() => {
        setState("transition");
        setTimeout(onAdvance, 1900);
      }, 800);
    } catch {
      setState("denied");
    }
  }, [onAdvance, onSessionStart]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      {/* Scene SVG fills the background */}
      <div style={{ position: "absolute", inset: 0 }}>
        <TitleScene />
      </div>

      {/* Overlay controls */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 28,
        }}
      >
        {state === "idle" && (
          <button
            onClick={handleJugar}
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800,
              fontSize: 52,
              color: "#FFFAF0",
              background: "#E0674A",
              border: "8px solid #6F4B35",
              borderRadius: 40,
              padding: "16px 48px",
              cursor: "pointer",
              boxShadow: "0 8px 0 #6F4B35, 0 12px 24px rgba(0,0,0,0.4)",
              animation: "jugar-pulse 1.8s ease-in-out infinite",
              minWidth: 200,
              minHeight: 80,
            }}
          >
            ¡Jugar!
          </button>
        )}

        {state === "requesting" && (
          <div style={{ color: "#FFFAF0", fontSize: 28, textAlign: "center", background: "rgba(0,0,0,0.6)", padding: "24px 40px", borderRadius: 20 }}>
            <p>Permitir acceso al micrófono...</p>
          </div>
        )}

        {state === "mic-check" && (
          <div style={{ color: "#FFFAF0", fontSize: 32, textAlign: "center", background: "rgba(0,0,0,0.7)", padding: "32px 48px", borderRadius: 24 }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>🎤</p>
            <p>¡Di <strong>¡Hola!</strong></p>
            <div style={{ width: 120, height: 8, background: "#E0674A", borderRadius: 4, margin: "16px auto", animation: "waveform 0.5s ease-in-out infinite alternate" }} />
          </div>
        )}

        {state === "denied" && (
          <div
            style={{
              background: "rgba(253, 243, 227, 0.97)",
              border: "4px solid #C98A54",
              borderRadius: 24,
              padding: "32px 48px",
              maxWidth: 480,
              textAlign: "center",
              color: "#6F4B35",
              fontFamily: "'Baloo 2', sans-serif",
            }}
          >
            <p style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
              La Casa needs a microphone to play.
              Please allow access in your browser settings and refresh.
            </p>
          </div>
        )}

        {state === "transition" && (
          <div style={{ color: "#FFF6D8", fontSize: 28, opacity: 0.8 }}>
            ¡Vamos!
          </div>
        )}
      </div>

      <style>{`
        @keyframes jugar-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes waveform {
          from { transform: scaleX(0.6); opacity: 0.6; }
          to { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
