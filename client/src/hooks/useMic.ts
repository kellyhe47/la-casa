import { useState, useCallback, useRef } from "react";

export type MicState = "idle" | "requesting" | "granted" | "denied" | "listening" | "thinking";

export interface UseMicResult {
  state: MicState;
  transcript: string;
  requestPermission: () => Promise<boolean>;
  startListening: () => void;
  stopListening: () => void;
  stream: MediaStream | null;
}

export function useMic(): UseMicResult {
  const [state, setState] = useState<MicState>("idle");
  const [transcript, setTranscript] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const recognizerRef = useRef<SpeechRecognition | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(s);
      setState("granted");
      return true;
    } catch {
      setState("denied");
      return false;
    }
  }, []);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch {}
    }
    const rec = new SR() as SpeechRecognition;
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0]?.[0]?.transcript || "";
      setTranscript(t);
      setState("thinking");
    };
    rec.onerror = () => {
      setState("granted");
    };
    rec.onend = () => {
      if (state === "listening") setState("thinking");
    };

    rec.start();
    recognizerRef.current = rec;
    setState("listening");
    setTranscript("");
  }, [state]);

  const stopListening = useCallback(() => {
    try { recognizerRef.current?.stop(); } catch {}
    setState("granted");
  }, []);

  return { state, transcript, requestPermission, startListening, stopListening, stream };
}
