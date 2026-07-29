import React, { useEffect, useRef, useState } from "react";
import type { Screen } from "../state/types";

interface TransitionScreenProps {
  from: Screen;
  to: Screen;
  onComplete: () => void;
}

const TRANSITION_COLORS: Partial<Record<Screen, string>> = {
  "title": "#FFDF9E",
  "living-room": "#E8917A",
  "fridge": "#F6D992",
  "bedroom": "#B9AECF",
};

export function TransitionScreen({ from, to, onComplete }: TransitionScreenProps) {
  const [canSkip, setCanSkip] = useState(true); // immediately tappable; visual prompt shows after 1s
  const completedRef = useRef(false);

  const complete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    // Allow skip after 1s (R3.2)
    const skipTimer = setTimeout(() => setCanSkip(true), 1000);
    // Auto-advance after ~2.2s
    const autoTimer = setTimeout(complete, 2200);
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(autoTimer);
    };
  }, []);

  const handleClick = () => {
    if (canSkip) complete();
  };

  const fromColor = TRANSITION_COLORS[from] || "#FDF3E3";
  const toColor = TRANSITION_COLORS[to] || "#FDF3E3";

  return (
    <div
      data-testid="transition-screen"
      onClick={handleClick}
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(135deg, ${fromColor}, ${toColor})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: canSkip ? "pointer" : "default",
        animation: "fade-transition 0.5s ease-in",
      }}
    >
      <div style={{ fontFamily: "'Baloo 2', sans-serif", color: "#6F4B35", fontSize: 24, opacity: 0.7 }}>
        {canSkip ? "Tap to skip" : ""}
      </div>
      <style>{`
        @keyframes fade-transition {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
