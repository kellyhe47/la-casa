import React, { useState, useEffect, useCallback, useRef } from "react";
import { LivingRoomScene } from "../assets/AssetStore";
import { ChatThread, type ChatMessage } from "../components/ChatThread";
import { grade } from "../grading/grade";
import { getNodesForWord } from "../grading/wordNodes";
import type { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { STORY_BIBLE } from "../pipeline/storyBible";
import { voices } from "../../../content/voices.json";

const ABUELA_VOICE_ID = voices["voice.abuela"].elevenLabsVoiceID;
const ABUELA_LANG = "es-MX";

type LoopState =
  | "wait"
  | "arrival"
  | "listening"
  | "thinking"
  | "pass"
  | "miss"
  | "grace"
  | "goodbye";

interface LivingRoomScreenProps {
  graph: SkillGraph;
  seed: string;
  onAdvance: () => void;
  independence: number;
}

function getFirstFrontierWord(graph: SkillGraph): string {
  const frontier = graph.frontier();
  if (frontier.length === 0) return "milk";
  const node = frontier[0];
  // Map frontier node to a representative word
  const nodeWordMap: Record<string, string> = {
    g_sh: "fish", g_ee: "beans", g_th: "this", g_vb: "van",
    g_z: "zip", g_scl: "stop", g_ae: "cake", g_ch: "cheese",
    v_groc2: "beans", v_groc1: "milk",
  };
  return nodeWordMap[node.id] || "milk";
}

export function LivingRoomScreen({ graph, seed, onAdvance, independence }: LivingRoomScreenProps) {
  const [loopState, setLoopState] = useState<LoopState>("arrival");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentWord, setCurrentWord] = useState(() => getFirstFrontierWord(graph));
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [missCount, setMissCount] = useState(0);
  const [itemCompleted, setItemCompleted] = useState(false);
  const [isExitDimmed, setIsExitDimmed] = useState(true);
  const [micActive, setMicActive] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playAudio = useCallback(async (text: string, voiceId: string) => {
    try {
      const buffer = await contentPipeline.fetchTTS({ text, voiceId, lang: ABUELA_LANG });
      const blob = new Blob([buffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
      return new Promise<void>((res) => { audio.onended = () => res(); });
    } catch {
      // Living-scene wait: audio late, absorb silently
    }
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const fetchCurrentImage = useCallback(async (word: string) => {
    try {
      const url = await contentPipeline.fetchImage({ word, seed });
      setCurrentImageUrl(url);
      return url;
    } catch {
      return null; // living-scene wait
    }
  }, [seed]);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = async (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript || "";
      setMicActive(false);
      setLoopState("thinking");
      // Grade with deterministic pure function (ADR-0001)
      const result = grade(transcript, currentWord);
      const nodeIds = getNodesForWord(currentWord);

      if (result.pass) {
        graph.update(nodeIds, 1);
        graph.recordItemBoundary();
        setItemCompleted(true);
        setIsExitDimmed(false);
        setMissCount(0);
        addMessage({ id: Date.now().toString(), sender: "sofia", type: "text", text: currentWord });
        // Abuela's delighted reply (prefetch next item)
        const replyText = `¡Sí! Dice "${currentWord}", ¡qué bien, mija!`;
        addMessage({ id: (Date.now() + 1).toString(), sender: "abuela", type: "text", text: replyText });
        await playAudio(replyText, ABUELA_VOICE_ID);
        setLoopState("arrival");
        // Move to next word from frontier
        const nextWord = getFirstFrontierWord(graph);
        setCurrentWord(nextWord);
        fetchCurrentImage(nextWord);
        // Prefetch next beat
        contentPipeline.prefetchNext({ beat: "abuela", frontierTarget: graph.frontier()[0]?.id || "g_sh", independenceBand: independence, seed });
      } else {
        const newMissCount = missCount + 1;
        setMissCount(newMissCount);
        graph.update([nodeIds[0] || "g_sh"], 0);

        if (newMissCount >= 2) {
          // Grace pattern (R2.1)
          const graceText = `Ahh — dice "${currentWord}", mija. ¡Muy bien!`;
          addMessage({ id: Date.now().toString(), sender: "abuela", type: "text", text: graceText });
          await playAudio(graceText, ABUELA_VOICE_ID);
          setItemCompleted(true);
          setIsExitDimmed(false);
          setMissCount(0);
          graph.recordItemBoundary();
          setLoopState("arrival");
          const nextWord = getFirstFrontierWord(graph);
          setCurrentWord(nextWord);
          fetchCurrentImage(nextWord);
        } else {
          // Miss — Abuela re-prompts
          const missText = "¿Cómo, mija? No te escuché bien...";
          addMessage({ id: Date.now().toString(), sender: "abuela", type: "text", text: missText });
          await playAudio(missText, ABUELA_VOICE_ID);
          setLoopState("listening");
          setMicActive(true);
          startListening();
        }
      }
    };
    rec.onerror = () => {
      setMicActive(false);
      setLoopState("arrival");
    };
    rec.start();
    recRef.current = rec;
    setMicActive(true);
    setLoopState("listening");
  }, [currentWord, missCount, graph, addMessage, playAudio, fetchCurrentImage, independence, seed]);

  // Initialize first message on mount
  useEffect(() => {
    fetchCurrentImage(currentWord).then((imgUrl) => {
      addMessage({
        id: "init-image",
        sender: "abuela",
        type: "image",
        imageUrl: imgUrl || undefined,
        targetWord: currentWord,
      });
      addMessage({
        id: "init-voicenote",
        sender: "abuela",
        type: "voice-note",
        text: "Mija, ¿qué dice aquí?",
      });
    });
  }, []);

  const handleMicClick = useCallback(() => {
    if (loopState !== "listening") {
      startListening();
    } else {
      recRef.current?.stop();
      setMicActive(false);
      setLoopState("arrival");
    }
  }, [loopState, startListening]);

  const handleExit = useCallback(async () => {
    if (!itemCompleted || isExitDimmed) return;
    setLoopState("goodbye");
    const goodbyeText = "¡Te quiero, mija! ¡Hasta luego!";
    addMessage({ id: "goodbye", sender: "abuela", type: "text", text: goodbyeText });
    await playAudio(goodbyeText, ABUELA_VOICE_ID);
    setTimeout(onAdvance, 600);
  }, [itemCompleted, isExitDimmed, addMessage, playAudio, onAdvance]);

  const micPulsing = loopState === "arrival" || loopState === "pass";

  return (
    <div
      data-testid="living-room-screen"
      data-abuela-lang={ABUELA_LANG}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", fontFamily: "'Baloo 2', sans-serif" }}
    >
      {/* Background scene */}
      <div style={{ position: "absolute", inset: 0 }}>
        <LivingRoomScene />
      </div>

      {/* Chat thread overlay — slides from side, never covers bottom hands zone */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 380,
          height: "calc(100% - 200px)",
          background: "rgba(255,250,240,0.96)",
          borderLeft: "3px solid #C98A54",
          borderRadius: "16px 0 0 16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Presence line */}
        <div style={{ background: "#E0674A", color: "#FFFAF0", padding: "8px 16px", fontSize: 13, fontWeight: 600 }}>
          Abuela · {loopState === "listening" ? "escuchando..." : "en línea"}
        </div>

        <ChatThread messages={messages} onPlayVoiceNote={(msg) => {
          if (msg.audioBuffer) {
            const blob = new Blob([msg.audioBuffer], { type: "audio/mpeg" });
            const audio = new Audio(URL.createObjectURL(blob));
            audio.play();
          }
        }} />
      </div>

      {/* Sofía's hands + phone (bottom-center) */}
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 320 }}>
        {/* Phone frame */}
        <div style={{ background: "#2A2A3A", borderRadius: "24px 24px 0 0", padding: 16, paddingBottom: 8, boxShadow: "0 -8px 32px rgba(0,0,0,0.5)" }}>
          {/* Mic button ON the phone */}
          <button
            data-testid="mic-button"
            onClick={handleMicClick}
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: micActive ? "#C0492F" : "#E0674A",
              border: "6px solid #6F4B35",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              animation: micPulsing ? "mic-pulse 1.4s ease-in-out infinite" : micActive ? "mic-listen 0.8s ease-in-out infinite" : "none",
              boxShadow: "0 6px 0 #6F4B35",
              transition: "background 0.2s",
            }}
          >
            {micActive ? (
              <svg width="48" height="48" viewBox="0 0 48 48">
                {/* Live waveform bars */}
                {[4, 8, 12, 6, 10, 14, 8, 6, 12, 10, 8, 4].map((h, i) => (
                  <rect key={i} x={i * 3.5 + 2} y={(16 - h / 2)} width={2.5} height={h} rx={1.25} fill="#FFF6D8" opacity={0.9} />
                ))}
              </svg>
            ) : (
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="18" y="8" width="12" height="20" rx="6" fill="#FFFAF0" />
                <path d="M10 24 Q10 36 24 36 Q38 36 38 24" stroke="#FFFAF0" strokeWidth="3" fill="none" strokeLinecap="round" />
                <line x1="24" y1="36" x2="24" y2="42" stroke="#FFFAF0" strokeWidth="3" />
                <line x1="18" y1="42" x2="30" y2="42" stroke="#FFFAF0" strokeWidth="3" />
              </svg>
            )}
          </button>
          <p style={{ color: "#FFFAF0", textAlign: "center", fontSize: 12, marginTop: 8, opacity: 0.7 }}>
            {loopState === "listening" ? "Escuchando..." : "Toca para hablar"}
          </p>
        </div>

        {/* Sofía's hands holding the phone (red sleeve cuffs) */}
        <div style={{ background: "#B3402F", height: 40, display: "flex", justifyContent: "space-between", padding: "0 20px", alignItems: "center" }}>
          <div style={{ width: 60, height: 30, background: "#D7AB87", borderRadius: "0 0 20px 20px", border: "3px solid #6F4B35" }} />
          <div style={{ width: 60, height: 30, background: "#D7AB87", borderRadius: "0 0 20px 20px", border: "3px solid #6F4B35" }} />
        </div>
      </div>

      {/* "Adiós, Abuela" exit button — diegetic, only after first completed item */}
      {itemCompleted && (
        <button
          data-testid="exit-button"
          onClick={handleExit}
          disabled={isExitDimmed || loopState === "listening" || loopState === "thinking"}
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: isExitDimmed ? "rgba(201,138,84,0.3)" : "#C98A54",
            color: isExitDimmed ? "rgba(255,250,240,0.4)" : "#FFFAF0",
            border: "3px solid #6F4B35",
            borderRadius: 20,
            padding: "8px 20px",
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "'Baloo 2', sans-serif",
            cursor: isExitDimmed ? "default" : "pointer",
            transition: "all 0.3s",
          }}
        >
          Adiós, Abuela 👋
        </button>
      )}

      <style>{`
        @keyframes mic-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 6px 0 #6F4B35; }
          50% { transform: scale(1.08); box-shadow: 0 8px 0 #6F4B35, 0 0 24px rgba(224,103,74,0.5); }
        }
        @keyframes mic-listen {
          0%, 100% { transform: scale(1.05); }
          50% { transform: scale(0.98); }
        }
      `}</style>
    </div>
  );
}
