import React, { useState, useCallback, useEffect, useRef } from "react";
import { FridgeScene } from "../assets/AssetStore";
import { MagnetTray } from "../components/MagnetTray";
import { EXIT_BUTTON_ANCHOR } from "../components/exitButtonAnchor";
import { gradeSpelling } from "../grading/grade";
import { getNodesForWord } from "../grading/wordNodes";
import type { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { appStore } from "../state/appStore";
import { getFrontierWord } from "../pipeline/sessionPrefetch";
import { getLine, hasLine } from "../pipeline/lines";
import { voices } from "../../../content/voices.json";

const DAD_VOICE_ID = (voices as any)["voice.papa"].elevenLabsVoiceID;

function getTargetWord(graph: SkillGraph, sessionMissedWords: string[], exclude: string[]): string {
  // AC15: (1) missed-then-graced words → (2) frontier target → (3) mastered pool.
  // Words already passed this session (read with Abuela) or already spelled at
  // the fridge are excluded so the child is never re-tested on the same word.
  const missed = sessionMissedWords.filter((w) => !exclude.includes(w));
  if (missed.length > 0) {
    return missed[missed.length - 1];
  }
  return getFrontierWord(graph, exclude);
}

interface FridgeScreenProps {
  graph: SkillGraph;
  /** Session seed + independence band — part of every screen's props contract
   *  (App passes them to all rooms); this room's content is graph-derived. */
  seed: string;
  onAdvance: () => void;
  independence: number;
  sessionMissedWords: string[];
  sessionPassedWords?: string[];
}

interface StickyNote {
  word: string;
  rotation: number;
  color: string;
}

const NOTE_COLORS = ["#E8917A", "#F2C066", "#9DBBA4", "#B39ECF"];

/** 018/G2: an authored Papá line for this band, with the one supported
 *  placeholder filled in. `{word}` is the only placeholder the table uses. */
function dadLine(key: string, band: number, word: string): string {
  return getLine(key, band).replace(/\{word\}/g, word);
}

/** The prompt key for a word — its own authored variant when there is one,
 *  otherwise the generic prompt, which spells the word out via `{word}`. */
function promptKeyFor(word: string): string {
  const specific = `dad.fridge.prompt.${word}`;
  return hasLine(specific) ? specific : "dad.fridge.prompt.default";
}

export function FridgeScreen({ graph, onAdvance, independence, sessionMissedWords, sessionPassedWords = [] }: FridgeScreenProps) {
  // Words already served this visit — never ask for the same word twice
  const usedWordsRef = useRef<Set<string>>(new Set());
  const pickWord = useCallback(() => {
    const exclude = [...usedWordsRef.current, ...sessionPassedWords];
    const word = getTargetWord(graph, sessionMissedWords, exclude);
    usedWordsRef.current.add(word);
    return word;
  }, [graph, sessionMissedWords, sessionPassedWords]);
  const [currentWord, setCurrentWord] = useState(() => pickWord());
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [itemCompleted, setItemCompleted] = useState(false);
  const [loopState, setLoopState] = useState<"wait" | "prompt" | "dragging" | "stick" | "goodnight">("prompt");
  const [trayKey, setTrayKey] = useState(0); // force remount MagnetTray on new word
  // 017/F4 (locked decision D10): wrong letters cost a band, at most once per
  // scene. `wrongLettersRef` counts rejected placements for the CURRENT word and
  // resets with every new word; `sceneFailureRecordedRef` latches after the one
  // failure this scene is allowed to record, so later flailing changes nothing.
  const wrongLettersRef = useRef(0);
  const sceneFailureRecordedRef = useRef(false);
  /** The clip currently on the speakers — at most one, ever (023). */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Resolvers for clips still being awaited, so leaving the scene can never
   *  strand a caller on audio that will now never end. */
  const pendingRef = useRef<Set<() => void>>(new Set());
  // Flipped on unmount — a TTS response landing late must not speak over the
  // bedroom scene (only Mamá and the baby talk there)
  const cancelledRef = useRef(false);

  useEffect(() => {
    // StrictMode remounts after running cleanup — un-cancel on (re)mount
    cancelledRef.current = false;
    const pending = pendingRef.current;
    return () => {
      cancelledRef.current = true;
      audioRef.current?.pause();
      audioRef.current = null;
      for (const finish of [...pending]) finish();
    };
  }, []);

  /**
   * 023: play one Papá clip from start to FINISH.
   *
   * `audio.play()` resolves when playback *starts*, so awaiting it sequences
   * nothing — that is how the praise and the next-word prompt ended up audible
   * at the same time. This resolves only on a genuine end signal: the `ended`
   * event, a media `error`, or a `play()` that never got going. Never a timer.
   *
   * Starting a clip stops the outgoing one, so at most one is ever audible, and
   * every failure path still resolves — late or missing audio must not block
   * gameplay (R8.4.3).
   */
  const playAudio = useCallback(async (text: string, voiceId: string) => {
    try {
      const buffer = await contentPipeline.fetchTTS({ text, voiceId, lang: "en-US" });
      if (cancelledRef.current) return; // scene already left — drop the audio
      audioRef.current?.pause(); // stop whatever is still playing
      const blob = new Blob([buffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          pendingRef.current.delete(finish);
          audio.removeEventListener("ended", finish);
          audio.removeEventListener("error", finish);
          resolve();
        };
        pendingRef.current.add(finish);
        audio.addEventListener("ended", finish);
        audio.addEventListener("error", finish);
        // A rejected play() settles in the same microtask chain — no timer, and
        // no way for dead audio to hang the scene.
        Promise.resolve(audio.play()).catch(finish);
      });
    } catch {
      // Living-scene wait: audio late (R8.4.3)
    }
  }, []);

  // Dad's spoken prompt on mount/new word
  useEffect(() => {
    // 018/G2: the prompt is the authored variant for this session's band —
    // Spanish-first low, bilingual in the middle, English only up top (D8).
    const prompt = dadLine(promptKeyFor(currentWord), independence, currentWord);
    // Speak the word (R4.4.1: no caption, audio only)
    playAudio(prompt, DAD_VOICE_ID);
    setLoopState("prompt");
    wrongLettersRef.current = 0; // 017/F4: wrong letters are counted per word
  }, [currentWord]);

  /**
   * 017/F4: the FIRST word in this scene that collects 2+ wrong letters records
   * ONE failure event — two item misses, so F1's two-consecutive-misses rule
   * takes the band down by exactly 1 — and then latches the scene flag.
   *
   * There is deliberately NO grace path (PRD-v2 §11 puts it out of scope): the
   * tray always permits eventual success, so the kid is never stuck and is
   * never auto-passed.
   */
  const handleWrongLetter = useCallback(() => {
    if (sceneFailureRecordedRef.current) return; // one failure per scene, ever
    wrongLettersRef.current += 1;
    if (wrongLettersRef.current < 2) return; // a single slip stays free
    sceneFailureRecordedRef.current = true;

    const nodeIds = getNodesForWord(currentWord);
    const target = nodeIds[0] || "g_sh";
    graph.update([target], 0);
    graph.update([target], 0);
    // Two updates, ONE boundary — and therefore exactly one save and, 024/C3,
    // exactly one grade event.
    appStore.getState().commitItemBoundary(graph, {
      word: currentWord,
      nodeIds: nodeIds.length > 0 ? nodeIds : [target],
      result: 0,
      screen: "fridge",
    });
  }, [currentWord, graph]);

  const handleWordComplete = useCallback(async (word: string) => {
    // Grade (deterministic, R7.3)
    const isCorrect = gradeSpelling(word, currentWord);
    if (!isCorrect) return; // MagnetTray handles wrong letter wobble

    const nodeIds = getNodesForWord(currentWord);
    graph.update(nodeIds, 1);
    appStore.getState().commitItemBoundary(graph, {
      word: currentWord,
      nodeIds,
      result: 1,
      screen: "fridge",
    });
    appStore.getState().recordWordResult(currentWord, 1);

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

    // 023: the praise plays to the END before anything else speaks. Awaited,
    // not raced against a fixed timer — the scene advances on audio, and the
    // next word's prompt can no longer start over the top of Papá.
    await playAudio(dadLine("dad.fridge.success", independence, currentWord), DAD_VOICE_ID);
    if (cancelledRef.current) return; // scene left while Papá was talking

    const nextWord = pickWord();
    setCurrentWord(nextWord);
    setTrayKey((k) => k + 1);
    setLoopState("prompt");
  }, [currentWord, graph, playAudio, pickWord, independence]);

  const handleExit = useCallback(async () => {
    if (!itemCompleted) return;
    setLoopState("goodnight");
    await playAudio(dadLine("dad.fridge.goodnight", independence, currentWord), DAD_VOICE_ID);
    setTimeout(onAdvance, 1800);
  }, [itemCompleted, playAudio, onAdvance, independence, currentWord]);

  /** R4.4.2: the speaker button re-says the target word itself — the prompt's
   *  scaffolding is band-tiered, but the word the child is spelling is not. */
  const handleReplayPrompt = useCallback(() => {
    playAudio(currentWord, DAD_VOICE_ID);
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

      {/* Sticky notes on the lower fridge door — one row of 3; a 4th note
          starts a new layer from the left, stacking over the first row */}
      <div style={{ position: "absolute", top: 270, left: "36%", width: 380 }}>
        {stickyNotes.map((note, i) => (
          <div
            key={i}
            style={{
              background: note.color,
              border: "3px solid #6F4B35",
              borderRadius: 8,
              padding: "8px 12px",
              transform: `rotate(${note.rotation}deg)`,
              position: "absolute",
              top: Math.floor(i / 3) * 14,
              left: (i % 3) * 122 + Math.floor(i / 3) * 10,
              width: 118,
              whiteSpace: "nowrap",
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              zIndex: i + 1,
              animation: "stick-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 16, color: "#6F4B35" }}>
              para Mamá:
            </span>
            <br />
            <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22, color: "#6F4B35" }}>
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

      {/* Magnet tray — bottom-center. Deliberate deviation from the fridge mock:
          the design has Sofía's hands holding the tray, but the hand blocks and
          their red sleeve-cuff bar read as a stray band under the letters, so
          the tray sits flush to the bottom edge on its own. Matches the same
          decision in the bedroom. */}
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 520 }}>
        <div style={{ background: "#C98A54", borderRadius: "20px 20px 0 0", padding: 16, boxShadow: "0 -8px 32px rgba(0,0,0,0.4)" }}>
          <MagnetTray
            key={trayKey}
            targetWord={currentWord}
            onWordComplete={handleWordComplete}
            onWrongLetter={handleWrongLetter}
          />
        </div>
      </div>

      {/* "¡A dormir!" exit — only after first completed item */}
      {itemCompleted && (
        <button
          data-testid="exit-button"
          onClick={handleExit}
          disabled={loopState === "goodnight"}
          style={{
            ...EXIT_BUTTON_ANCHOR,
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
