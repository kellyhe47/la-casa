import React, { useState, useEffect, useCallback, useRef } from "react";
import { LivingRoomScene } from "../assets/AssetStore";
import { ChatThread, type ChatMessage } from "../components/ChatThread";
import { AbuelaAvatar } from "../components/AbuelaArt";
import { grade } from "../grading/grade";
import { getNodesForWord } from "../grading/wordNodes";
import type { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { voices } from "../../../content/voices.json";

const ABUELA_VOICE_ID = voices["voice.abuela"].elevenLabsVoiceID;
const ABUELA_LANG = "es-MX";
const VOICE_NOTE_TEXT = "Mija, ¿qué dice aquí?";

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
  const nodeWordMap: Record<string, string> = {
    g_sh: "fish", g_ee: "beans", g_th: "this", g_vb: "van",
    g_z: "zip", g_scl: "stop", g_ae: "cake", g_ch: "cheese",
    v_groc2: "beans", v_groc1: "milk",
  };
  return nodeWordMap[node.id] || "milk";
}

/** Prefer ElevenLabs; fall back to browser speech when proxy stubs (no key). */
async function speakAbuela(text: string): Promise<void> {
  try {
    const buffer = await contentPipeline.fetchTTS({
      text,
      voiceId: ABUELA_VOICE_ID,
      lang: ABUELA_LANG,
    });
    const blob = new Blob([buffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    await new Promise<void>((res) => {
      audio.onended = () => res();
      audio.onerror = () => res();
    });
    return;
  } catch {
    // Proxy stub / missing key — browser TTS so the note is still audible in demo
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    await new Promise<void>((resolve) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-MX";
      u.rate = 0.92;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }
}

export function LivingRoomScreen({ graph, seed, onAdvance, independence }: LivingRoomScreenProps) {
  const [loopState, setLoopState] = useState<LoopState>("arrival");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentWord, setCurrentWord] = useState(() => getFirstFrontierWord(graph));
  const [missCount, setMissCount] = useState(0);
  const [itemCompleted, setItemCompleted] = useState(false);
  const [isExitDimmed, setIsExitDimmed] = useState(true);
  const [micActive, setMicActive] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const startedRef = useRef(false);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const playVoiceNote = useCallback(async (text: string) => {
    await speakAbuela(text);
  }, []);

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
      const result = grade(transcript, currentWord);
      const nodeIds = getNodesForWord(currentWord);

      if (result.pass) {
        graph.update(nodeIds, 1);
        graph.recordItemBoundary();
        setItemCompleted(true);
        setIsExitDimmed(false);
        setMissCount(0);
        addMessage({ id: Date.now().toString(), sender: "sofia", type: "text", text: currentWord });
        const replyText = `¡Sí! Dice "${currentWord}", ¡qué bien, mija!`;
        addMessage({ id: (Date.now() + 1).toString(), sender: "abuela", type: "text", text: replyText });
        await playVoiceNote(replyText);
        setLoopState("arrival");
        const nextWord = getFirstFrontierWord(graph);
        setCurrentWord(nextWord);
        // Next photo + voice note
        let imgUrl: string | undefined;
        try {
          imgUrl = await contentPipeline.fetchImage({ word: nextWord, seed });
        } catch { /* stub */ }
        addMessage({
          id: `img-${Date.now()}`,
          sender: "abuela",
          type: "image",
          imageUrl: imgUrl,
          targetWord: nextWord,
        });
        addMessage({
          id: `vn-${Date.now()}`,
          sender: "abuela",
          type: "voice-note",
          text: VOICE_NOTE_TEXT,
        });
        addMessage({
          id: `cap-${Date.now()}`,
          sender: "abuela",
          type: "text",
          text: VOICE_NOTE_TEXT,
        });
        await playVoiceNote(VOICE_NOTE_TEXT);
        contentPipeline.prefetchNext({
          beat: "abuela",
          frontierTarget: graph.frontier()[0]?.id || "g_sh",
          independenceBand: independence,
          seed,
        });
      } else {
        const newMissCount = missCount + 1;
        setMissCount(newMissCount);
        graph.update([nodeIds[0] || "g_sh"], 0);

        if (newMissCount >= 2) {
          const graceText = `Ahh — dice "${currentWord}", mija. ¡Muy bien!`;
          addMessage({ id: Date.now().toString(), sender: "abuela", type: "text", text: graceText });
          await playVoiceNote(graceText);
          setItemCompleted(true);
          setIsExitDimmed(false);
          setMissCount(0);
          graph.recordItemBoundary();
          setLoopState("arrival");
          const nextWord = getFirstFrontierWord(graph);
          setCurrentWord(nextWord);
          let imgUrl: string | undefined;
          try {
            imgUrl = await contentPipeline.fetchImage({ word: nextWord, seed });
          } catch { /* stub */ }
          addMessage({
            id: `img-${Date.now()}`,
            sender: "abuela",
            type: "image",
            imageUrl: imgUrl,
            targetWord: nextWord,
          });
          addMessage({
            id: `vn-${Date.now()}`,
            sender: "abuela",
            type: "voice-note",
            text: VOICE_NOTE_TEXT,
          });
          await playVoiceNote(VOICE_NOTE_TEXT);
        } else {
          const missText = "¿Cómo, mija? No te escuché bien...";
          addMessage({ id: Date.now().toString(), sender: "abuela", type: "text", text: missText });
          await playVoiceNote(missText);
          setLoopState("arrival");
          setMicActive(false);
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
  }, [currentWord, missCount, graph, addMessage, playVoiceNote, independence, seed]);

  // First exchange on mount: photo + voice note + autoplay
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      let imgUrl: string | undefined;
      try {
        imgUrl = await contentPipeline.fetchImage({ word: currentWord, seed });
      } catch { /* living-scene: illustration fallback in ChatThread */ }
      addMessage({
        id: "init-image",
        sender: "abuela",
        type: "image",
        imageUrl: imgUrl,
        targetWord: currentWord,
      });
      addMessage({
        id: "init-voicenote",
        sender: "abuela",
        type: "voice-note",
        text: VOICE_NOTE_TEXT,
      });
      addMessage({
        id: "init-caption",
        sender: "abuela",
        type: "text",
        text: VOICE_NOTE_TEXT,
      });
      await playVoiceNote(VOICE_NOTE_TEXT);
    })();
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
    await playVoiceNote(goodbyeText);
    setTimeout(onAdvance, 600);
  }, [itemCompleted, isExitDimmed, addMessage, playVoiceNote, onAdvance]);

  const presence =
    loopState === "listening" || loopState === "thinking"
      ? "escuchando…"
      : loopState === "arrival"
        ? "nota de voz · 0:04"
        : "en línea";

  return (
    <div
      data-testid="living-room-screen"
      data-abuela-lang={ABUELA_LANG}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      {/* Background scene — includes white phone + Sofía's hands */}
      <div style={{ position: "absolute", inset: 0 }}>
        <LivingRoomScene />
      </div>

      {/* Chat overlay — design chrome */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 20,
          width: 368,
          height: "calc(100% - 220px)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          background: "#FFFAF0",
          border: "6px solid #6F4B35",
          borderRadius: 26,
          padding: "16px 16px 14px",
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingBottom: 8,
            borderBottom: "4px solid #F3C1AC",
          }}
        >
          <AbuelaAvatar size={52} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: "#6F4B35", lineHeight: 1 }}>Abuela</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#B3402F" }}>{presence}</div>
          </div>
        </div>

        <ChatThread
          messages={messages}
          onPlayVoiceNote={(msg) => playVoiceNote(msg.text || VOICE_NOTE_TEXT)}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 12,
            background: "#FBE2D3",
            border: "4px solid #6F4B35",
            borderRadius: 999,
            padding: "10px 18px",
          }}
        >
          <div style={{ flex: 1, height: 12, borderRadius: 6, background: "#FFFAF0", border: "3px solid #E4C9A8" }} />
          <svg viewBox="0 0 20 20" width="24" height="24" style={{ flex: "none" }}>
            <rect x="7" y="2" width="6" height="10" rx="3" fill="#B3402F" />
            <path d="M 4 9 q 0 7 6 7 q 6 0 6 -7 M 10 16 v 3" fill="none" stroke="#6F4B35" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Transparent mic hit-target over the SVG phone screen — no dark layover */}
      <button
        data-testid="mic-button"
        onClick={handleMicClick}
        aria-label="Micrófono"
        style={{
          position: "absolute",
          left: "50%",
          bottom: "9%",
          transform: "translateX(-50%)",
          width: 160,
          height: 160,
          borderRadius: "50%",
          border: "none",
          background: micActive ? "rgba(176,64,47,0.35)" : "transparent",
          cursor: "pointer",
          zIndex: 6,
          animation: !micActive && loopState === "arrival" ? "mic-pulse 1.4s ease-in-out infinite" : "none",
        }}
      />

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
            zIndex: 7,
          }}
        >
          Adiós, Abuela
        </button>
      )}

      <style>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224,103,74,0.45); }
          50% { box-shadow: 0 0 0 18px rgba(224,103,74,0); }
        }
      `}</style>
    </div>
  );
}
