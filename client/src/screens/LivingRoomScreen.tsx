import React, { useState, useEffect, useCallback, useRef } from "react";
import { LivingRoomScene } from "../assets/AssetStore";
import { ChatThread, type ChatMessage } from "../components/ChatThread";
import { AbuelaAvatar } from "../components/AbuelaArt";
import { EXIT_BUTTON_ANCHOR } from "../components/exitButtonAnchor";
import { grade } from "../grading/grade";
import { getNodesForWord } from "../grading/wordNodes";
import type { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { stopIntroSound } from "../audio/introSound";
import { appStore } from "../state/appStore";
import {
  ABUELA_VOICE_ID,
  ABUELA_LANG,
  VOICE_NOTE_TEXT,
  getFirstFrontierWord,
  getFrontierWord,
} from "../pipeline/sessionPrefetch";

// Entrance choreography: the living room is on screen alone for ~two beats,
// then the phone chat panel fades in and rises
const PANEL_ENTER_DELAY_MS = 1800;
const PANEL_ENTER_DURATION_MS = 600;

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
  /** Session seed + independence band — part of every screen's props contract
   *  (App passes them to all rooms); this room's content is graph-derived. */
  seed: string;
  onAdvance: () => void;
  independence: number;
}

/** Cancellation handle for Abuela's speech — flipped when the screen unmounts
 *  so an API response that lands late never speaks over the next scene. */
interface SpeakHandle {
  cancelled: boolean;
  audio: HTMLAudioElement | null;
}

/** Prefer ElevenLabs; fall back to browser speech when proxy stubs (no key).
 *  onFetchSettled fires once the TTS API call resolves or fails — before
 *  playback — so the typing indicator covers loading, not speaking. */
async function speakAbuela(text: string, handle: SpeakHandle, onFetchSettled?: () => void): Promise<void> {
  try {
    let buffer: ArrayBuffer;
    try {
      buffer = await contentPipeline.fetchTTS({
        text,
        voiceId: ABUELA_VOICE_ID,
        lang: ABUELA_LANG,
      });
    } finally {
      onFetchSettled?.();
    }
    if (handle.cancelled) return; // scene already left — drop the audio
    const blob = new Blob([buffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    handle.audio = audio;
    await audio.play();
    await new Promise<void>((res) => {
      audio.onended = () => res();
      audio.onerror = () => res();
    });
    return;
  } catch {
    // Proxy stub / missing key — browser TTS so the note is still audible in demo
  }
  if (handle.cancelled) return;
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

export function LivingRoomScreen({ graph, onAdvance }: LivingRoomScreenProps) {
  const [loopState, setLoopState] = useState<LoopState>("arrival");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentWord, setCurrentWord] = useState(() => getFirstFrontierWord(graph));
  const [missCount, setMissCount] = useState(0);
  const [itemCompleted, setItemCompleted] = useState(false);
  const [isExitDimmed, setIsExitDimmed] = useState(true);
  const [micActive, setMicActive] = useState(false);
  // Count of in-flight API calls (image + TTS) — typing dots show while > 0
  const [apiPending, setApiPending] = useState(0);
  const beginLoad = useCallback(() => setApiPending((c) => c + 1), []);
  const endLoad = useCallback(() => setApiPending((c) => Math.max(0, c - 1)), []);
  const recRef = useRef<SpeechRecognition | null>(null);
  const startedRef = useRef(false);
  // One handle for the screen's lifetime — unmount flips it to cancel any
  // in-flight speech so nothing talks over the next scene
  const speakHandleRef = useRef<SpeakHandle>({ cancelled: false, audio: null });

  useEffect(() => {
    const handle = speakHandleRef.current;
    // StrictMode remounts after running cleanup — un-cancel so the initial
    // voice-note flow (guarded by startedRef, so it doesn't restart) survives
    handle.cancelled = false;
    return () => {
      handle.cancelled = true;
      handle.audio?.pause();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      recRef.current?.stop?.();
    };
  }, []);
  // Words already served this visit — the loop never repeats a word/photo
  const usedWordsRef = useRef<Set<string>>(new Set([currentWord]));

  const nextFrontierWord = useCallback(() => {
    const word = getFrontierWord(graph, [...usedWordsRef.current]);
    usedWordsRef.current.add(word);
    return word;
  }, [graph]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const playVoiceNote = useCallback(async (text: string) => {
    beginLoad();
    await speakAbuela(text, speakHandleRef.current, endLoad);
  }, [beginLoad, endLoad]);

  const fetchImageWithTyping = useCallback(async (word: string): Promise<string | undefined> => {
    beginLoad();
    try {
      return await contentPipeline.fetchImage({ word });
    } catch {
      return undefined; // stub — illustration fallback in ChatThread
    } finally {
      endLoad();
    }
  }, [beginLoad, endLoad]);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    let gotResult = false;
    rec.onresult = async (e: SpeechRecognitionEvent) => {
      gotResult = true;
      const transcript = e.results[0]?.[0]?.transcript || "";
      setMicActive(false);
      setLoopState("thinking");
      const result = grade(transcript, currentWord);
      const nodeIds = getNodesForWord(currentWord);

      if (result.pass) {
        graph.update(nodeIds, 1);
        appStore.getState().commitItemBoundary(graph);
        appStore.getState().recordWordResult(currentWord, 1);
        setItemCompleted(true);
        setIsExitDimmed(false);
        setMissCount(0);
        addMessage({ id: Date.now().toString(), sender: "sofia", type: "text", text: currentWord });
        const replyText = `¡Sí! Dice "${currentWord}", ¡qué bien, mija!`;
        addMessage({ id: (Date.now() + 1).toString(), sender: "abuela", type: "text", text: replyText });
        await playVoiceNote(replyText);
        setLoopState("arrival");
        const nextWord = nextFrontierWord();
        setCurrentWord(nextWord);
        // Next photo + voice note
        const imgUrl = await fetchImageWithTyping(nextWord);
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
      } else {
        const newMissCount = missCount + 1;
        setMissCount(newMissCount);
        graph.update([nodeIds[0] || "g_sh"], 0);
        // 016/F3: a missed item is an item — the band must be allowed to tick
        // here, not only on pass/grace, or two consecutive misses can never
        // cost a band. Exactly one boundary per item: the grace branch below
        // no longer records its own.
        appStore.getState().commitItemBoundary(graph);

        // Show what was heard as Sofía's bubble so the correction has context
        const heardWord = transcript.trim().toLowerCase();
        if (heardWord) {
          addMessage({ id: `sofia-${Date.now()}`, sender: "sofia", type: "text", text: heardWord });
        }

        if (newMissCount >= 2) {
          appStore.getState().recordWordResult(currentWord, 0);
          const graceText = `Ahh — dice "${currentWord}", mija. ¡Muy bien!`;
          addMessage({ id: Date.now().toString(), sender: "abuela", type: "text", text: graceText });
          await playVoiceNote(graceText);
          setItemCompleted(true);
          setIsExitDimmed(false);
          setMissCount(0);
          setLoopState("arrival");
          const nextWord = nextFrontierWord();
          setCurrentWord(nextWord);
          const imgUrl = await fetchImageWithTyping(nextWord);
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
          const missText = heardWord
            ? `Mmm, escuché "${heardWord}"... pero aquí no dice eso. Mira otra vez, mija — ¿qué dice?`
            : "¿Cómo, mija? No te escuché bien...";
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
    // Recognition can end with neither result nor error (cold-start / silence)
    // — without this the screen sticks in "listening" with a dead mic, which
    // is why the first tap after landing often "never records"
    rec.onend = () => {
      if (!gotResult) {
        setMicActive(false);
        setLoopState("arrival");
      }
    };
    rec.start();
    recRef.current = rec;
    setMicActive(true);
    setLoopState("listening");
  }, [currentWord, missCount, graph, addMessage, playVoiceNote, fetchImageWithTyping, nextFrontierWord]);

  // First exchange on mount: photo + voice note + autoplay.
  // Waits out the panel entrance — the room is seen alone for ~two beats,
  // then the phone panel rises, then Abuela's exchange begins.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      await new Promise((r) => setTimeout(r, PANEL_ENTER_DELAY_MS + PANEL_ENTER_DURATION_MS));
      const imgUrl = await fetchImageWithTyping(currentWord);
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
      stopIntroSound(); // fade the intro music as Abuela starts speaking
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
      {/* Background scene — includes white phone + Sofía's hands.
          The mic hit-target lives inside this aspect-ratio box so it stays
          locked to the SVG's 1280×800 coordinate space (ring at 640,680 r78). */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "1280 / 800" }}>
          <LivingRoomScene />
          <button
            data-testid="mic-button"
            onClick={handleMicClick}
            aria-label="Micrófono"
            style={{
              position: "absolute",
              left: "50%",
              top: "85%",
              transform: "translate(-50%, -50%)",
              width: "12.2%",
              aspectRatio: "1 / 1",
              borderRadius: "50%",
              border: "none",
              background: micActive ? "rgba(176,64,47,0.35)" : "transparent",
              cursor: "pointer",
              zIndex: 6,
              animation: !micActive && loopState === "arrival" ? "mic-pulse 1.4s ease-in-out infinite" : "none",
            }}
          />
        </div>
      </div>

      {/* Chat overlay — design chrome */}
      <div
        style={{
          position: "absolute",
          top: 48,
          right: 20,
          width: 368,
          height: "calc(100% - 180px)",
          animation: `panel-enter ${PANEL_ENTER_DURATION_MS}ms ease-out ${PANEL_ENTER_DELAY_MS}ms both`,
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
          isTyping={apiPending > 0}
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

      {itemCompleted && (
        <button
          data-testid="exit-button"
          onClick={handleExit}
          disabled={isExitDimmed || loopState === "listening" || loopState === "thinking"}
          style={{
            ...EXIT_BUTTON_ANCHOR,
            background: isExitDimmed ? "rgba(201,138,84,0.3)" : "#C98A54",
            color: isExitDimmed ? "rgba(255,250,240,0.4)" : "#FFFAF0",
            border: "3px solid #6F4B35",
            borderRadius: 20,
            padding: "8px 20px",
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "'Baloo 2', sans-serif",
            cursor: isExitDimmed ? "default" : "pointer",
          }}
        >
          Adiós, Abuela
        </button>
      )}

      <style>{`
        @keyframes panel-enter {
          from { opacity: 0; transform: translateY(48px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224,103,74,0.45); }
          50% { box-shadow: 0 0 0 18px rgba(224,103,74,0); }
        }
      `}</style>
    </div>
  );
}
