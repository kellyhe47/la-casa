import React, { useCallback, useState } from "react";
import { TitleScene } from "../assets/AssetStore";

interface TitleScreenProps {
  onAdvance: () => void;
  onSessionStart?: () => void;
  /** D14: the new-game control is hidden until the learner has saved state, so
   *  a first-time player never sees it. Defaults to hidden. */
  hasSavedState?: boolean;
  /** D14: fired ONLY once the confirm dialog is confirmed. */
  onNewGame?: () => void;
}

type State = "idle" | "requesting" | "mic-check" | "denied" | "transition";

export function TitleScreen({
  onAdvance,
  onSessionStart,
  hasSavedState = false,
  onNewGame,
}: TitleScreenProps) {
  const [state, setState] = useState<State>("idle");
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);

  const confirmNewGame = useCallback(() => {
    setConfirmingNewGame(false);
    onNewGame?.();
  }, [onNewGame]);

  const handleJugar = useCallback(async () => {
    onSessionStart?.();
    // If the browser has already granted mic access, skip the permission +
    // mic-check overlays entirely — they'd just flash for a moment.
    let alreadyGranted = false;
    try {
      const status = await navigator.permissions?.query?.({ name: "microphone" as PermissionName });
      alreadyGranted = status?.state === "granted";
    } catch {
      // Permissions API unsupported (e.g. older Safari) — keep the overlays
    }
    if (!alreadyGranted) setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the mic immediately — holding this stream open can make the
      // living room's first SpeechRecognition capture flaky
      stream.getTracks().forEach((t) => t.stop());
      if (alreadyGranted) {
        setState("transition");
        setTimeout(onAdvance, 1900);
        return;
      }
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
      {/* Scene SVG fills the background. On transition we zoom into the front
          door (at ~51%/63% of the scene's 1280×800 box) and hand off to the
          entering-the-house transition. */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "1280 / 800",
            transformOrigin: "51% 63%",
            transform: state === "transition" ? "scale(3.4)" : "scale(1)",
            transition: "transform 1.9s cubic-bezier(0.55, 0, 0.8, 0.4)",
          }}
        >
          <TitleScene />
        </div>
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
      </div>

      {/* D14: new game. Hidden entirely for first-time players, and tucked in
          the corner so it never competes with ¡Jugar!. */}
      {state === "idle" && hasSavedState && (
        <button
          data-testid="new-game"
          aria-label="Empezar un juego nuevo"
          onClick={() => setConfirmingNewGame(true)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: "#6F4B35",
            background: "rgba(253, 243, 227, 0.92)",
            border: "3px solid #C98A54",
            borderRadius: 20,
            padding: "8px 18px",
            cursor: "pointer",
            boxShadow: "0 3px 0 #C98A54",
          }}
        >
          Nuevo juego
        </button>
      )}

      {/* In-app confirm dialog — never window.confirm. */}
      {confirmingNewGame && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nuevo juego"
            style={{
              background: "#FDF3E3",
              border: "6px solid #C98A54",
              borderRadius: 28,
              padding: "28px 36px",
              maxWidth: 460,
              textAlign: "center",
              color: "#6F4B35",
              fontFamily: "'Baloo 2', sans-serif",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
          >
            <p style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>
              ¿Empezar un juego nuevo?
            </p>
            <p style={{ fontSize: 18, marginBottom: 22 }}>
              La casa vuelve a empezar desde el principio.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
              <button
                data-testid="new-game-cancel"
                onClick={() => setConfirmingNewGame(false)}
                style={{
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "#6F4B35",
                  background: "#FFFAF0",
                  border: "4px solid #C98A54",
                  borderRadius: 20,
                  padding: "10px 24px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                data-testid="new-game-confirm"
                onClick={confirmNewGame}
                style={{
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 800,
                  fontSize: 22,
                  color: "#FFFAF0",
                  background: "#E0674A",
                  border: "4px solid #6F4B35",
                  borderRadius: 20,
                  padding: "10px 24px",
                  cursor: "pointer",
                }}
              >
                Sí, empezar
              </button>
            </div>
          </div>
        </div>
      )}

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
