import React, { useState, useCallback, useEffect, useRef } from "react";
import { BedroomScene } from "../assets/AssetStore";
import { BookInstrument } from "../components/BookInstrument";
import { grade } from "../grading/grade";
import { getNodesForWord } from "../grading/wordNodes";
import type { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { voices } from "../../../content/voices.json";

const BABY_VOICE_ID = (voices as any)["voice.baby"].elevenLabsVoiceID;
const MOM_VOICE_ID = (voices as any)["voice.mama"].elevenLabsVoiceID;

// Pre-baked baby babble clips (bundled, not generated — R4.3.0)
const BABY_GIGGLES = ["hehe...", "ba ba!", "goo!", "yay!"];
const BABY_CONFUSED = ["...?", "ba?", "huh?"];

// Default sentences when LLM not available
const DEFAULT_SENTENCES = [
  "The milk is for the baby.",
  "We got the beans at the shop.",
  "The fish was in the soup.",
];

function getSentences(sessionPassedWords: string[]): string[] {
  const words = sessionPassedWords.filter(Boolean);
  if (words.length === 0) return DEFAULT_SENTENCES;
  // Build sentences from passed words
  const sentences = [];
  if (words.includes("beans")) sentences.push("The beans are in the soup.");
  if (words.includes("milk")) sentences.push("The milk was for the baby.");
  if (words.includes("fish")) sentences.push("We got the fish at the shop.");
  if (words.includes("shop")) sentences.push("Dad was at the shop.");
  if (words.includes("the")) sentences.push("The family was at home.");
  return sentences.length > 0 ? sentences : DEFAULT_SENTENCES;
}

type LoopState = "wait" | "arrival" | "reading" | "listening" | "pass" | "miss" | "grace" | "goodnight";

interface BedroomScreenProps {
  graph: SkillGraph;
  seed: string;
  onAdvance: () => void;
  independence: number;
  sessionPassedWords: string[];
}

export function BedroomScreen({ graph, seed, onAdvance, independence, sessionPassedWords }: BedroomScreenProps) {
  const [sentences] = useState(() => getSentences(sessionPassedWords));
  const [pageIndex, setPageIndex] = useState(0);
  const [loopState, setLoopState] = useState<LoopState>("arrival");
  const [missCount, setMissCount] = useState(0);
  const [pageCompleted, setPageCompleted] = useState(false);
  const [babyMood, setBabyMood] = useState<"happy" | "listening" | "confused">("listening");
  const [statusText, setStatusText] = useState("");
  const [momVisible, setMomVisible] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  const currentSentence = sentences[pageIndex] || sentences[0];

  const playAudio = useCallback(async (text: string, voiceId: string, lang = "en-US") => {
    try {
      const buffer = await contentPipeline.fetchTTS({ text, voiceId, lang });
      const blob = new Blob([buffer], { type: "audio/mpeg" });
      const audio = new Audio(URL.createObjectURL(blob));
      await audio.play();
      return new Promise<void>((res) => { audio.onended = () => res(); });
    } catch {
      // Living-scene wait (R8.4.3)
    }
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
      setLoopState("pass"); // optimistic, grading is < 100ms

      const result = grade(transcript, currentSentence);
      const words = currentSentence.toLowerCase().split(" ");
      const nodeIds = words.flatMap((w) => getNodesForWord(w));
      const uniqueNodeIds = [...new Set(nodeIds)];

      if (result.pass) {
        graph.update(uniqueNodeIds, 1);
        graph.recordItemBoundary();
        setPageCompleted(true);
        setMissCount(0);
        setMomVisible(false);
        setBabyMood("happy");
        setStatusText(BABY_GIGGLES[Math.floor(Math.random() * BABY_GIGGLES.length)]);
        // Baby echoes the TARGET sentence (prefetched, not kid's voice — R4.3.0)
        await playAudio(currentSentence, BABY_VOICE_ID);
        setLoopState("reading");
        // Advance to next page
        if (pageIndex < sentences.length - 1) {
          setPageIndex((i) => i + 1);
          setBabyMood("listening");
          setStatusText("");
        }
        // Prefetch next
        contentPipeline.prefetchNext({ beat: "bedroom", frontierTarget: graph.frontier()[0]?.id || "g_ee", independenceBand: independence, seed });
      } else {
        // Miss (R4.3.1: fiction absorption — baby confusion)
        const newMissCount = missCount + 1;
        setMissCount(newMissCount);
        graph.update([uniqueNodeIds[0] || "g_ee"], 0);

        if (newMissCount >= 2) {
          // Grace pattern
          setMomVisible(true);
          setBabyMood("confused");
          const graceText = `Léelo conmigo: ${currentSentence}`;
          setStatusText(graceText);
          await playAudio(graceText, MOM_VOICE_ID);
          // Auto-pass after grace
          graph.update(uniqueNodeIds, 1);
          graph.recordItemBoundary();
          setPageCompleted(true);
          setBabyMood("happy");
          setStatusText(BABY_GIGGLES[0]);
          await playAudio(currentSentence, BABY_VOICE_ID);
          setMomVisible(false);
          setMissCount(0);
          if (pageIndex < sentences.length - 1) {
            setPageIndex((i) => i + 1);
            setBabyMood("listening");
            setStatusText("");
          }
          setLoopState("reading");
        } else {
          setBabyMood("confused");
          setMomVisible(true);
          setStatusText(BABY_CONFUSED[Math.floor(Math.random() * BABY_CONFUSED.length)]);
          // Mom models
          const modelText = currentSentence.split(" ").join("... ");
          await playAudio(modelText, MOM_VOICE_ID);
          setLoopState("reading");
          setMomVisible(false);
          setBabyMood("listening");
        }
      }
    };

    rec.onerror = () => {
      setLoopState("reading");
      setBabyMood("listening");
    };
    rec.start();
    recRef.current = rec;
    setLoopState("listening");
    setBabyMood("listening");
  }, [currentSentence, missCount, graph, playAudio, pageIndex, sentences, independence, seed]);

  const handleMicClick = useCallback(() => {
    if (loopState === "reading" || loopState === "arrival") {
      startListening();
    }
  }, [loopState, startListening]);

  const handleExit = useCallback(async () => {
    if (!pageCompleted) return;
    setLoopState("goodnight");
    await playAudio("Buenas noches, hermanito", MOM_VOICE_ID);
    setTimeout(onAdvance, 2000);
  }, [pageCompleted, playAudio, onAdvance]);

  // Mom entrance on arrival
  useEffect(() => {
    if (loopState === "arrival") {
      setMomVisible(true);
      const arrivalText = independence >= 7
        ? "Can you read a bedtime story to your baby brother?"
        : "Mija, ¿puedes leerle un cuento al hermanito? Can you read to him?";
      playAudio(arrivalText, MOM_VOICE_ID).then(() => {
        setMomVisible(false);
        setLoopState("reading");
      });
    }
  }, []);

  return (
    <div
      data-testid="bedroom-screen"
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", fontFamily: "'Baloo 2', sans-serif" }}
    >
      {/* Background scene */}
      <div style={{ position: "absolute", inset: 0 }}>
        <BedroomScene />
      </div>

      {/* Baby mood indicator */}
      <div style={{ position: "absolute", top: 120, right: 60, fontSize: 48, transition: "all 0.3s" }}>
        {babyMood === "happy" && "😄"}
        {babyMood === "listening" && "🐣"}
        {babyMood === "confused" && "😕"}
      </div>

      {/* Baby status text */}
      {statusText && (
        <div style={{ position: "absolute", top: 180, right: 40, background: "#FFFAF0", border: "3px solid #C98A54", borderRadius: 16, padding: "8px 16px", fontFamily: "'Baloo 2', sans-serif", fontSize: 20, color: "#6F4B35", maxWidth: 240 }}>
          {statusText}
        </div>
      )}

      {/* Mom character — enters from left on miss/arrival */}
      {momVisible && (
        <div style={{ position: "absolute", bottom: 200, left: -20, animation: "mom-enter 0.5s ease-out forwards" }}>
          <svg width="80" height="160" viewBox="0 0 80 160">
            {/* Mom simplified */}
            <circle cx="40" cy="30" r="22" fill="#D7AB87" />
            {/* Wavy hair */}
            <path d="M20 20 Q25 8 40 10 Q55 8 60 20" fill="#5A4436" />
            {/* Blush */}
            <circle cx="28" cy="34" r="4" fill="#F2A9A0" opacity={0.7} />
            <circle cx="52" cy="34" r="4" fill="#F2A9A0" opacity={0.7} />
            {/* Eyes */}
            <circle cx="33" cy="28" r="3" fill="#5A4436" />
            <circle cx="47" cy="28" r="3" fill="#5A4436" />
            {/* Smile */}
            <path d="M34 38 Q40 43 46 38" fill="none" stroke="#6F4B35" strokeWidth="2" strokeLinecap="round" />
            {/* Orange cardigan */}
            <path d="M18 52 L10 120 L70 120 L62 52 Q40 60 18 52" fill="#E0674A" />
            {/* Yellow dress peek */}
            <path d="M15 105 L10 130 L70 130 L65 105" fill="#F6E3B8" />
            {/* Legs */}
            <rect x="25" y="130" width="12" height="25" fill="#D7AB87" rx="4" />
            <rect x="43" y="130" width="12" height="25" fill="#D7AB87" rx="4" />
          </svg>
        </div>
      )}

      {/* Book instrument — Sofía's hands + book */}
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "90%", maxWidth: 960 }}>
        <BookInstrument
          sentence={currentSentence}
          onAttempt={handleMicClick}
          isListening={loopState === "listening"}
          independence={independence}
        />
        {/* Sofía's hands holding the book */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 60px", marginTop: -8 }}>
          <div style={{ width: 90, height: 36, background: "#D7AB87", borderRadius: "0 0 28px 28px", border: "4px solid #6F4B35", boxShadow: "0 4px 0 #6F4B35" }} />
          <div style={{ width: 90, height: 36, background: "#D7AB87", borderRadius: "0 0 28px 28px", border: "4px solid #6F4B35", boxShadow: "0 4px 0 #6F4B35" }} />
        </div>
        {/* Red sleeve cuffs */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 20px", background: "#B3402F", height: 32 }}>
          <div />
          <div />
        </div>
      </div>

      {/* "Buenas noches" exit button */}
      {pageCompleted && (
        <button
          data-testid="exit-button"
          onClick={handleExit}
          disabled={loopState === "listening" || loopState === "goodnight"}
          style={{
            position: "absolute",
            bottom: 140,
            right: 24,
            background: "#F6E3B8",
            color: "#6F4B35",
            border: "4px solid #6F4B35",
            borderRadius: 20,
            padding: "10px 24px",
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "'Baloo 2', sans-serif",
            cursor: "pointer",
            boxShadow: "0 4px 0 #6F4B35",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          📖 Buenas noches
        </button>
      )}

      {/* Goodnight overlay */}
      {loopState === "goodnight" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(46,42,74,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "lights-dim 1s ease-in forwards" }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🌙</p>
          <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 36, color: "#FFFAF0" }}>Buenas noches, hermanito</p>
          <div style={{ fontSize: 32, marginTop: 16, animation: "float-z 2s ease-in-out infinite" }}>💤</div>
        </div>
      )}

      <style>{`
        @keyframes mom-enter {
          from { transform: translateX(-100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes lights-dim {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float-z {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
