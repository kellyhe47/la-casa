import React, { useEffect, useCallback, useRef } from "react";
import { useStore } from "zustand";
import { appStore } from "./state/appStore";
import { TitleScreen } from "./screens/TitleScreen";
import { LivingRoomScreen } from "./screens/LivingRoomScreen";
import { FridgeScreen } from "./screens/FridgeScreen";
import { BedroomScreen } from "./screens/BedroomScreen";
import { TransitionScreen } from "./screens/TransitionScreen";
import { OffRampScreen } from "./screens/OffRampScreen";
import { DebugOverlay } from "./components/DebugOverlay";
import { prefetchSessionStart } from "./pipeline/sessionPrefetch";
import { startIntroSound } from "./audio/introSound";
import type { Screen } from "./state/types";

// Check ?debug=1 URL param
const urlParams = new URLSearchParams(window.location.search);
const debugStartOpen = urlParams.get("debug") === "1";

export default function App() {
  const state = useStore(appStore);
  const { screen, sessionSeed, graph, debugOpen, hasSavedState, sessionMissedWords, sessionPassedWords } = state;
  const prevScreenRef = useRef<Screen | null>(null);
  const hydrateStartedRef = useRef(false);
  const [showTransition, setShowTransition] = React.useState(false);
  const [transitionFrom, setTransitionFrom] = React.useState<Screen>("title");
  const [lastGrade, setLastGrade] = React.useState<{ word: string; result: 0 | 1; nodeId: string; delta: number } | null>(null);

  // Init debug overlay from URL param
  useEffect(() => {
    if (debugStartOpen) {
      appStore.getState().setDebugOpen(true);
    }
  }, []);

  // Debug overlay keyboard toggle: Backspace ×3 within 600ms
  useEffect(() => {
    let backspaceCount = 0;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        backspaceCount++;
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { backspaceCount = 0; }, 600);
        if (backspaceCount >= 3) {
          backspaceCount = 0;
          appStore.getState().setDebugOpen(!appStore.getState().debugOpen);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Start session on first load and warm the first exchange's caches (image +
  // voice note) so the title screen + transition hide the generation latency.
  // Guarded so StrictMode's double-invoke can't re-roll the seed.
  useEffect(() => {
    if (!appStore.getState().graph) {
      appStore.getState().startSession();
    }
    const { graph: g, sessionSeed: s } = appStore.getState();
    if (g && s) prefetchSessionStart(g, s);
    // E7/E8: hydrate the saved band + mastery in the background. Deliberately
    // NOT awaited — first paint and the rail never wait on the network, and a
    // 404 (new player) or a failure just leaves the fresh band-3 session up.
    // The resume is silent: no copy anywhere says "welcome back".
    // Guarded like startSession above so StrictMode doesn't double-fetch.
    if (!hydrateStartedRef.current) {
      hydrateStartedRef.current = true;
      void appStore
        .getState()
        .hydrate()
        .then(() => {
          // The seed graph's frontier may differ from the hydrated one, so warm
          // the real first exchange once the saved mastery has landed.
          const { graph: g2, sessionSeed: s2, hasSavedState: resumed } = appStore.getState();
          if (resumed && g2 && s2) prefetchSessionStart(g2, s2);
        });
    }
    // Background music from app open (falls back to first interaction if
    // the browser blocks autoplay); fades out when Abuela first speaks
    startIntroSound();
  }, []);

  const handleAdvance = useCallback(() => {
    const from = appStore.getState().screen;
    if (from === "off-ramp") return;
    prevScreenRef.current = from;
    setTransitionFrom(from);
    setShowTransition(true);
  }, []);

  const handleTransitionComplete = useCallback(() => {
    setShowTransition(false);
    appStore.getState().advanceBeat();
  }, []);

  const independence = graph?.independence() ?? 3;

  const renderScreen = () => {
    if (!graph) return null;

    if (showTransition) {
      const nextIdx = ["title", "living-room", "fridge", "bedroom", "off-ramp"].indexOf(screen) + 1;
      const nextScreen = (["title", "living-room", "fridge", "bedroom", "off-ramp"][nextIdx] || "off-ramp") as Screen;
      return (
        <TransitionScreen
          from={transitionFrom}
          to={nextScreen}
          onComplete={handleTransitionComplete}
        />
      );
    }

    switch (screen) {
      case "title":
        return (
          <TitleScreen
            onAdvance={() => {
              // After mic granted + check, advance via transition
              appStore.getState().setMicState("granted");
              handleAdvance();
            }}
            hasSavedState={hasSavedState}
            onNewGame={() => {
              appStore.getState().newGame();
              const { graph: fresh, sessionSeed: seed } = appStore.getState();
              if (fresh && seed) prefetchSessionStart(fresh, seed);
            }}
          />
        );

      case "living-room":
        return (
          <LivingRoomScreen
            graph={graph}
            seed={sessionSeed}
            onAdvance={handleAdvance}
            independence={independence}
          />
        );

      case "fridge":
        return (
          <FridgeScreen
            graph={graph}
            seed={sessionSeed}
            onAdvance={handleAdvance}
            independence={independence}
            sessionMissedWords={sessionMissedWords}
            sessionPassedWords={sessionPassedWords}
          />
        );

      case "bedroom":
        return (
          <BedroomScreen
            graph={graph}
            seed={sessionSeed}
            onAdvance={handleAdvance}
            independence={independence}
            sessionPassedWords={sessionPassedWords}
          />
        );

      case "off-ramp":
        return <OffRampScreen />;

      default:
        return <OffRampScreen />;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0a0a0a",
        fontFamily: "'Baloo 2', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Letterboxed 16:10 stage — fits laptop so bottom chrome isn't clipped */}
      <div
        style={{
          position: "relative",
          width: "min(100%, calc((100vh - 48px) * 1280 / 800))",
          maxWidth: 1280,
          aspectRatio: "1280 / 800",
          border: "8px solid #000000",
          borderRadius: 20,
          overflow: "hidden",
          background: "#1a1a2e",
          boxShadow: "0 24px 80px rgba(0,0,0,0.65)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {renderScreen()}
        </div>

        {graph && (
          <DebugOverlay
            open={debugOpen}
            graph={graph}
            seed={sessionSeed}
            lastGrade={lastGrade}
          />
        )}
      </div>
    </div>
  );
}
