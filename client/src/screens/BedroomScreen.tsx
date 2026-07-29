import React, { useState, useCallback, useEffect, useRef } from "react";
import { BedroomScene } from "../assets/AssetStore";
import { BookInstrument } from "../components/BookInstrument";
import { EXIT_BUTTON_ANCHOR } from "../components/exitButtonAnchor";
import { grade } from "../grading/grade";
import { getNodesForWord } from "../grading/wordNodes";
import type { SkillGraph } from "../graph/SkillGraph";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { generateBedtimeSentence } from "../pipeline/sentenceGen";
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
  const [sentences, setSentences] = useState(() => getSentences(sessionPassedWords));
  const [pageIndex, setPageIndex] = useState(0);
  // Endless pages (§4.3): next sentence is LLM-generated + validator-gated,
  // prefetched while the current page plays; templates are the fallback.
  const sentencesRef = useRef<string[]>([]);
  const nextGenRef = useRef<Promise<string | null> | null>(null);
  useEffect(() => { sentencesRef.current = sentences; }, [sentences]);

  const prefetchNextSentence = useCallback(() => {
    nextGenRef.current = generateBedtimeSentence(graph, seed, independence, sentencesRef.current)
      .catch(() => null);
  }, [graph, seed, independence]);

  useEffect(() => { prefetchNextSentence(); }, []);

  /** Advance to the next page: generated sentence when available, otherwise
   *  cycle the template pages so the book never dead-ends. */
  const advancePage = useCallback(async () => {
    const gen = nextGenRef.current ? await nextGenRef.current : null;
    nextGenRef.current = null;
    if (gen) {
      setSentences((prev) => [...prev, gen]);
      setPageIndex((i) => i + 1);
    } else {
      setPageIndex((i) => (i + 1) % sentencesRef.current.length);
    }
    prefetchNextSentence();
  }, [prefetchNextSentence]);
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
      // Resolve on error too — a decode failure must not deadlock the loop
      return new Promise<void>((res) => { audio.onended = () => res(); audio.onerror = () => res(); });
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

    let gotResult = false;
    rec.onresult = async (e: SpeechRecognitionEvent) => {
      gotResult = true;
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
        const giggle = BABY_GIGGLES[Math.floor(Math.random() * BABY_GIGGLES.length)];
        setStatusText(giggle);
        // Giggle + echo of the TARGET sentence — both in the baby's voice (R4.3.0)
        await playAudio(giggle, BABY_VOICE_ID);
        await playAudio(currentSentence, BABY_VOICE_ID);
        setLoopState("reading");
        // Next page — generated (validator-gated) or template fallback
        await advancePage();
        setBabyMood("listening");
        setStatusText("");
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
          await playAudio(BABY_GIGGLES[0], BABY_VOICE_ID);
          await playAudio(currentSentence, BABY_VOICE_ID);
          setMomVisible(false);
          setMissCount(0);
          await advancePage();
          setBabyMood("listening");
          setStatusText("");
          setLoopState("reading");
        } else {
          setBabyMood("confused");
          // Baby's confused babble — in the baby's voice
          await playAudio(BABY_CONFUSED[Math.floor(Math.random() * BABY_CONFUSED.length)], BABY_VOICE_ID);
          setMomVisible(true);
          // Mom models — same "Léelo conmigo" formula as the grace path so
          // her invitation reads consistently on every miss
          const modelText = `Léelo conmigo: ${currentSentence}`;
          setStatusText(modelText);
          await playAudio(modelText, MOM_VOICE_ID);
          setLoopState("reading");
          setMomVisible(false);
          setBabyMood("listening");
          setStatusText("");
        }
      }
    };

    rec.onerror = () => {
      setLoopState("reading");
      setBabyMood("listening");
    };
    // Recognition can end with neither result nor error (e.g. silence) —
    // without this the loop sticks in "listening" and the mic goes dead
    rec.onend = () => {
      if (!gotResult) {
        setLoopState("reading");
        setBabyMood("listening");
      }
    };
    rec.start();
    recRef.current = rec;
    setLoopState("listening");
    setBabyMood("listening");
  }, [currentSentence, missCount, graph, playAudio, pageIndex, sentences, independence, seed, advancePage]);

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
        <div style={{ position: "absolute", bottom: "22%", left: "23%", width: "17.5%", animation: "mom-enter 0.5s ease-out forwards" }}>
          {/* Mom — art from design/handoff/Bedroom.dc.html (mom group, scene coords);
              size/position match the mockup's translate(-262 -206) scale(1.18) placement beside the crib */}
          <svg width="100%" viewBox="470 415 190 280" style={{ display: "block" }}>
            <g stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <ellipse cx="565" cy="686" rx="90" ry="14" fill="#6F4B35" opacity="0.18" stroke="none" />
              {/* legs + shoes */}
              <g style={{ animation: "mom-leg-a 0.5s ease-in-out 2", transformOrigin: "542px 640px" }}>
                <path d="M 542 640 v 34" stroke="#D7AB87" strokeWidth="13" />
                <ellipse cx="540" cy="680" rx="14" ry="8" fill="#E0674A" strokeWidth="5" />
              </g>
              <g style={{ animation: "mom-leg-b 0.5s ease-in-out 2", transformOrigin: "588px 640px" }}>
                <path d="M 588 640 v 34" stroke="#D7AB87" strokeWidth="13" />
                <ellipse cx="590" cy="680" rx="14" ry="8" fill="#E0674A" strokeWidth="5" />
              </g>
              {/* yellow dress */}
              <path d="M 505 645 q -6 -120 60 -120 q 66 0 60 120 Z" fill="#F6E3B8" strokeWidth="8" />
              <path d="M 512 632 q 9 8 18 0 q 9 8 18 0 q 9 8 17 0 q 9 8 18 0 q 9 8 18 0 q 9 8 17 0" fill="none" strokeWidth="4" opacity="0.5" />
              {/* orange cardigan over it */}
              <path d="M 508 610 q -4 -80 34 -84 l 6 100 Z M 622 610 q 4 -80 -34 -84 l -6 100 Z" fill="#E0674A" strokeWidth="7" />
              <circle cx="565" cy="480" r="52" fill="#D7AB87" strokeWidth="8" />
              {/* wavy voluminous hair with side-swept half bangs */}
              <path d="M 518 466 q -6 -44 47 -44 q 53 0 47 44 q -10 -22 -47 -22 q -37 0 -47 22" fill="#5A4436" strokeWidth="7" />
              <path d="M 516 456 q 0 -32 40 -32 q -26 18 -20 50 q -8 8 -16 2 q -6 -8 -4 -20" fill="#5A4436" strokeWidth="6" />
              <path d="M 514 470 q -4 22 6 36 q 8 -4 6 -16" fill="#5A4436" strokeWidth="5.5" />
              <path d="M 614 456 q 0 -32 -40 -32 q 26 18 20 50 q 8 8 16 2 q 6 -8 4 -20" fill="#5A4436" strokeWidth="6" />
              <path d="M 616 470 q 4 22 -6 36 q -8 -4 -6 -16" fill="#5A4436" strokeWidth="5.5" />
              <path d="M 513 468 q -16 24 -8 46 q -12 8 -4 24 q 10 14 24 4 q 6 -18 -2 -30 q 6 -24 -10 -44 M 617 468 q 16 24 8 46 q 12 8 4 24 q -10 14 -24 4 q -6 -18 2 -30 q -6 -24 10 -44" fill="#5A4436" strokeWidth="6.5" />
              {/* open eyes + gentle closed-lip smile */}
              <circle cx="547" cy="480" r="4.5" fill="#6F4B35" stroke="none" />
              <circle cx="583" cy="480" r="4.5" fill="#6F4B35" stroke="none" />
              <path d="M 540 470 q 7 -5 14 -1 M 576 469 q 7 -4 14 1" strokeWidth="3.5" />
              <path d="M 553 502 q 12 9 24 0" fill="none" strokeWidth="4.5" />
              <circle cx="528" cy="492" r="7" fill="#F2A9A0" stroke="none" />
              <circle cx="602" cy="492" r="7" fill="#F2A9A0" stroke="none" />
              {/* arms */}
              <path d="M 512 560 q -18 24 -8 44 M 618 560 q 18 24 8 44" fill="none" stroke="#E0674A" strokeWidth="9" />
              <circle cx="524" cy="612" r="11" fill="#D7AB87" strokeWidth="6" />
              <circle cx="606" cy="612" r="11" fill="#D7AB87" strokeWidth="6" />
            </g>
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
            ...EXIT_BUTTON_ANCHOR,
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
        @keyframes mom-leg-a {
          0%, 100% { transform: rotate(14deg); }
          50% { transform: rotate(-14deg); }
        }
        @keyframes mom-leg-b {
          0%, 100% { transform: rotate(-14deg); }
          50% { transform: rotate(14deg); }
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
