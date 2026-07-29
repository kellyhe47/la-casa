import React, { useState, useCallback, useRef } from "react";

const MAGNET_COLORS = ["#E8917A", "#F2C066", "#9DBBA4", "#B39ECF", "#E0674A"];
const DISTRACTOR_POOL = ["e", "a", "i", "o", "t", "n", "x", "q", "z", "j", "v", "w", "c", "r", "b", "h", "s"];

/** Build tray letters from the word's multiset (each occurrence) plus ~4 distractors. */
function getLetters(word: string): string[] {
  const lower = word.toLowerCase();
  const wordLetters = lower.split("");
  const needed = new Set(wordLetters);
  const distractors = DISTRACTOR_POOL.filter((l) => !needed.has(l)).slice(0, 4);
  return [...wordLetters, ...distractors];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface SlotState {
  letter: string | null;
}

interface MagnetTrayProps {
  targetWord: string;
  onWordComplete: (word: string) => void;
}

export function MagnetTray({ targetWord, onWordComplete }: MagnetTrayProps) {
  const lower = targetWord.toLowerCase();
  const [availableLetters] = useState(() => shuffle(getLetters(lower)));
  const [slots, setSlots] = useState<SlotState[]>(() =>
    Array.from({ length: lower.length }, () => ({ letter: null }))
  );
  const [placedFromTray, setPlacedFromTray] = useState<Set<number>>(new Set());
  const [wobbling, setWobbling] = useState<number | null>(null);
  const [selectedTrayIdx, setSelectedTrayIdx] = useState<number | null>(null);
  const completedRef = useRef(false);

  const getPlacedWord = (s: SlotState[]) => s.map((sl) => sl.letter || "").join("");

  const handleMagnetTap = useCallback((trayIdx: number) => {
    if (placedFromTray.has(trayIdx)) return;
    setSelectedTrayIdx(trayIdx);
  }, [placedFromTray]);

  const handleSlotTap = useCallback((slotIdx: number) => {
    if (selectedTrayIdx === null) return;
    const letter = availableLetters[selectedTrayIdx];
    const correctLetter = lower[slotIdx];

    const newSlots = [...slots];
    if (letter === correctLetter) {
      newSlots[slotIdx] = { letter };
      setSlots(newSlots);
      setPlacedFromTray((prev) => new Set([...prev, selectedTrayIdx]));
      setSelectedTrayIdx(null);

      const word = getPlacedWord(newSlots);
      const allFilled = newSlots.every((s) => s.letter);
      if (allFilled && word === lower && !completedRef.current) {
        completedRef.current = true;
        setTimeout(() => onWordComplete(word), 200);
      }
    } else {
      // Wrong letter: wobble animation, return to tray (R4.4.2)
      setWobbling(selectedTrayIdx);
      setTimeout(() => setWobbling(null), 900);
      setSelectedTrayIdx(null);
    }
  }, [selectedTrayIdx, availableLetters, lower, slots, onWordComplete]);

  const nextEmptySlot = slots.findIndex((s) => !s.letter);

  return (
    <div data-testid="magnet-tray" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Note card with letter slots */}
      <div style={{
        background: "#FFFAF0",
        border: "3px solid #C98A54",
        borderRadius: 16,
        padding: "12px 16px",
        display: "flex",
        gap: 8,
        justifyContent: "center",
      }}>
        {slots.map((slot, i) => (
          <div
            key={i}
            data-testid="letter-slot"
            onClick={() => handleSlotTap(i)}
            style={{
              width: 58,
              height: 68,
              border: slot.letter ? "3px solid #6F4B35" : "2px dashed #C98A54",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: slot.letter ? "#FBE7A8" : "#FFFAF0",
              cursor: selectedTrayIdx !== null && !slot.letter ? "pointer" : "default",
              boxShadow: i === nextEmptySlot && selectedTrayIdx !== null ? "0 0 0 3px #F2C066" : "none",
              transition: "box-shadow 0.2s",
            }}
          >
            <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 32, color: "#6F4B35" }}>
              {slot.letter || ""}
            </span>
          </div>
        ))}
      </div>

      {/* Wooden magnet tray */}
      <div style={{
        background: "#C98A54",
        borderRadius: 12,
        padding: "8px 12px",
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "center",
        minHeight: 96,
        boxShadow: "0 4px 0 #8A5B36",
      }}>
        {availableLetters.map((letter, i) => {
          const isPlaced = placedFromTray.has(i);
          const isWobbling = wobbling === i;
          const isSelected = selectedTrayIdx === i;
          const color = MAGNET_COLORS[i % MAGNET_COLORS.length];

          return (
            <div
              key={i}
              data-testid="magnet"
              onClick={() => !isPlaced && handleMagnetTap(i)}
              style={{
                width: 62,
                height: 62,
                minWidth: 62,
                minHeight: 62,
                padding: 4,
                borderRadius: 8,
                background: isPlaced ? "rgba(201,138,84,0.3)" : color,
                border: `5px solid ${isSelected ? "#F2C066" : "#6F4B35"}`,
                boxShadow: isPlaced ? "none" : `0 4px 0 #6F4B35`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isPlaced ? "default" : "pointer",
                opacity: isPlaced ? 0.3 : 1,
                transform: isSelected ? "scale(1.1)" : isWobbling ? "rotate(-15deg)" : "none",
                animation: isWobbling ? "wobble-back 0.9s ease-in-out" : "none",
                transition: isWobbling ? "none" : "transform 0.15s, opacity 0.2s",
              }}
            >
              <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 28, color: "#FFFAF0", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
                {isPlaced ? "" : letter}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes wobble-back {
          0% { transform: scale(1.1); }
          20% { transform: rotate(-15deg) scale(1.05); }
          40% { transform: rotate(10deg) scale(1.02); }
          60% { transform: rotate(-5deg) scale(1.01); }
          80% { transform: rotate(3deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
