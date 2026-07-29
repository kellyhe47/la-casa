import React, { useEffect, useRef, useState } from "react";
import type { Screen } from "../state/types";
import { TransitionScene } from "../assets/scenes/TransitionScene";

interface TransitionScreenProps {
  from: Screen;
  to: Screen;
  onComplete: () => void;
}

export function TransitionScreen({ from: _from, to: _to, onComplete }: TransitionScreenProps) {
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

  return (
    <div
      data-testid="transition-screen"
      onClick={handleClick}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: canSkip ? "pointer" : "default",
        overflow: "hidden",
        background: "#FBE2D3",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <TransitionScene />
      </div>
    </div>
  );
}
