import React, { useState, useCallback, useEffect, useRef } from "react";
import { FridgeScene } from "../assets/AssetStore";
import { MagnetTray } from "../components/MagnetTray";
import { gradeSpelling } from "../grading/grade";
import { getNodesForWord } from "../grading/wordNodes";
import type { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { voices } from "../../../content/voices.json";

const DAD_VOICE_ID = (voices as any)["voice.papa"].elevenLabsVoiceID;

function getTargetWord(graph: SkillGraph, sessionMissedWords: string[]): string {
  // AC15: (1) missed-then-graced words → (2) frontier target → (3) mastered pool
  if (sessionMissedWords.length > 0) {
    const lastMissed = sessionMissedWords[sessionMissedWords.length - 1];
    if (lastMissed) return lastMissed;
  }
  const frontier = graph.frontier();
  if (frontier.length > 0) {
    const nodeWordMap: Record<string, string> = {
      g_sh: "fish", g_ee: "beans", g_th: "this", g_vb: "van",
      g_z: "zip", g_scl: "stop", g_ae: "cake", g_ch: "cheese",
      v_groc2: "beans", v_groc1: "milk",
    };
    const word = nodeWordMap[frontier[0].id];
    if (word) return word;
  }
  // Mastered pool fallback
  return "milk";
}

interface FridgeScreenProps {
  graph: SkillGraph;
  seed: string;
  onAdvance: () => void;
  independence: number;
  sessionMissedWords: string[];
}

interface StickyNote {
  word: string;
  rotation: number;
  color: string;
}

const NOTE_COLORS = ["#E8917A", "#F2C066", "#9DBBA4", "#B39ECF"];

export function FridgeScreen({ graph, seed, onAdvance, independence, sessionMissedWords }: FridgeScreenProps) {
  const [currentWord, setCurrentWord] = useState(() => getTargetWord(graph, sessionMissedWords));
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [itemCompleted, setItemCompleted] = useState(false);
  const [loopState, setLoopState] = useState<"wait" | "prompt" | "dragging" | "stick" | "goodnight">("prompt");
  const [trayKey, setTrayKey] = useState(0); // force remount MagnetTray on new word
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(async (text: string, voiceId: string) => {
    try {
      const buffer = await contentPipeline.fetchTTS({ text, voiceId, lang: "en-US" });
      const blob = new Blob([buffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
    } catch {
      // Living-scene wait: audio late (R8.4.3)
    }
  }, []);

  // Dad's spoken prompt on mount/new word
  useEffect(() => {
    const dadPrompts: Record<string, string> = {
      fish: "Write a note for Mamá — tell her we got the fish!",
      beans: "Let's leave a note about the beans, mija!",
      milk: "Can you write milk on the note for Mamá?",
      shop: "Write shop on the note, so Mamá knows where we went!",
      stop: "Write a note — we had to stop at the store!",
      the: "Write the — it's the most important word!",
      van: "Tell Mamá we saw a van! Can you spell it?",
      default: `Spell ${currentWord} on the note for Mamá!`,
    };
    const prompt = dadPrompts[currentWord] || dadPrompts.default;
    // Speak the word (R4.4.1: no caption, audio only)
    playAudio(prompt, DAD_VOICE_ID);
    setLoopState("prompt");
  }, [currentWord]);

  const handleWordComplete = useCallback((word: string) => {
    // Grade (deterministic, R7.3)
    const isCorrect = gradeSpelling(word, currentWord);
    if (!isCorrect) return; // MagnetTray handles wrong letter wobble

    const nodeIds = getNodesForWord(currentWord);
    graph.update(nodeIds, 1);
    graph.recordItemBoundary();

    setStickyNotes((prev) => [
      ...prev,
      {
        word: currentWord,
        rotation: (Math.random() - 0.5) * 8,
        color: NOTE_COLORS[prev.length % NOTE_COLORS.length],
      },
    ]);

    setItemCompleted(true);
    setLoopState("stick");

    // Speak completion
    playAudio(`¡Sí! ${currentWord}! Excellent, mija!`, DAD_VOICE_ID);

    // Move to next word after short delay
    setTimeout(() => {
      const nextWord = getTargetWord(graph, []);
      setCurrentWord(nextWord);
      setTrayKey((k) => k + 1);
      setLoopState("prompt");
      contentPipeline.prefetchNext({ beat: "fridge", frontierTarget: graph.frontier()[0]?.id || "g_sh", independenceBand: independence, seed });
    }, 2000);
  }, [currentWord, graph, playAudio, independence, seed]);

  const handleExit = useCallback(async () => {
    if (!itemCompleted) return;
    setLoopState("goodnight");
    await playAudio("Uy... ¡a dormir, mija! You did great today!", DAD_VOICE_ID);
    setTimeout(onAdvance, 1800);
  }, [itemCompleted, playAudio, onAdvance]);

  const handleReplayPrompt = useCallback(() => {
    const dadPrompts: Record<string, string> = {
      fish: "fish", beans: "beans", milk: "milk", shop: "shop",
      stop: "stop", van: "van", the: "the",
    };
    playAudio(dadPrompts[currentWord] || currentWord, DAD_VOICE_ID);
  }, [currentWord, playAudio]);

  return (
    <div
      data-testid="fridge-screen"
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", fontFamily: "'Baloo 2', sans-serif" }}
    >
      {/* Background scene */}
      <div style={{ position: "absolute", inset: 0 }}>
        <FridgeScene />
      </div>

      {/* Sticky notes on fridge door */}
      <div style={{ position: "absolute", top: 80, left: "32%", width: 200 }}>
        {stickyNotes.map((note, i) => (
          <div
            key={i}
            style={{
              background: note.color,
              border: "3px solid #6F4B35",
              borderRadius: 8,
              padding: "8px 16px",
              transform: `rotate(${note.rotation}deg) translateY(${i * -8}px)`,
              position: "absolute",
              top: i * 12,
              left: i * 4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              zIndex: i + 1,
              animation: "stick-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 20, color: "#6F4B35" }}>
              para Mamá:
            </span>
            <br />
            <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 26, color: "#6F4B35" }}>
              {note.word}
            </span>
          </div>
        ))}
      </div>

      {/* Note card with speaker button — shows what's being spelled */}
      <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", background: "#FFFAF0", border: "3px solid #C98A54", borderRadius: 16, padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 16, color: "#9A7B5A" }}>para Mamá:</span>
        {/* Speaker replay button — R4.4.2: speaker button on note card */}
        <button
          onClick={handleReplayPrompt}
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#E0674A",
            border: "3px solid #6F4B35",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 3px 0 #6F4B35",
            animation: loopState === "prompt" ? "speaker-ping 2s ease-in-out infinite" : "none",
          }}
        >
          <span style={{ fontSize: 22 }}>🔊</span>
        </button>
        {/* NOTE: target word NOT shown — R4.4.1 */}
      </div>

      {/* Magnet tray + Sofía's hands — bottom-center */}
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 520 }}>
        <div style={{ background: "#C98A54", borderRadius: "20px 20px 0 0", padding: 16, boxShadow: "0 -8px 32px rgba(0,0,0,0.4)" }}>
          <MagnetTray
            key={trayKey}
            targetWord={currentWord}
            onWordComplete={handleWordComplete}
          />
        </div>
        {/* Sofía's hands (red sleeve cuffs) */}
        <div style={{ background: "#B3402F", height: 40, display: "flex", justifyContent: "space-between", padding: "0 40px", alignItems: "center" }}>
          <div style={{ width: 80, height: 30, background: "#D7AB87", borderRadius: "0 0 24px 24px", border: "3px solid #6F4B35" }} />
          <div style={{ width: 80, height: 30, background: "#D7AB87", borderRadius: "0 0 24px 24px", border: "3px solid #6F4B35" }} />
        </div>
      </div>

      {/* "¡A dormir!" exit — only after first completed item */}
      {itemCompleted && (
        <button
          data-testid="exit-button"
          onClick={handleExit}
          disabled={loopState === "goodnight"}
          style={{
            position: "absolute",
            bottom: 160,
            right: 24,
            background: "#F2C066",
            color: "#6F4B35",
            border: "4px solid #6F4B35",
            borderRadius: 20,
            padding: "10px 24px",
            fontSize: 20,
            fontWeight: 800,
            fontFamily: "'Baloo 2', sans-serif",
            cursor: "pointer",
            boxShadow: "0 4px 0 #6F4B35",
            animation: loopState === "goodnight" ? "dad-yawn 1.8s ease-in-out" : "none",
          }}
        >
          😴 ¡A dormir!
        </button>
      )}

      <style>{`
        @keyframes stick-pop {
          0% { transform: scale(0.5) rotate(var(--rot, 0deg)); opacity: 0; }
          70% { transform: scale(1.1) rotate(var(--rot, 0deg)); }
          100% { transform: scale(1) rotate(var(--rot, 0deg)); opacity: 1; }
        }
        @keyframes speaker-ping {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); box-shadow: 0 4px 0 #6F4B35, 0 0 20px rgba(224,103,74,0.5); }
        }
        @keyframes dad-yawn {
          0% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(0.95) rotate(-3deg); }
          50% { transform: scale(1.05) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
