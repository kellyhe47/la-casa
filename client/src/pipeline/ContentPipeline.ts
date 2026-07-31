import { apiHeaders } from "../state/learnerId";

export interface TextCacheKey {
  beat: string;
  frontierTarget: string;
  independenceBand: number;
  seed: string;
  /** Concrete LLM prompt forwarded to /generate (the server reads req.body.prompt) */
  prompt?: string;
}

export interface AudioCacheKey {
  text: string;
  voiceId: string;
  lang: string;
}

/** Image prompts are purely word-derived (the server ignores any seed), so the
 *  key is the word alone — a per-session seed would only force identical
 *  regenerations and defeat the server-side cache. */
export interface ImageCacheKey {
  word: string;
}

export interface BeatContent {
  content: string;
  nodeIds: string[];
}

function textKey(k: TextCacheKey): string {
  // prompt is part of the key — two beats can share beat/target/band/seed and
  // still ask for completely different content
  return `text:${k.beat}:${k.frontierTarget}:${k.independenceBand}:${k.seed}:${k.prompt ?? ""}`;
}

function audioKey(k: AudioCacheKey): string {
  return `audio:${k.text}:${k.voiceId}:${k.lang}`;
}

function imageKey(k: ImageCacheKey): string {
  return `image:${k.word}`;
}

const MAX_RETRIES = 2;

async function fetchWithRetry(url: string, opts: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) return res;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
    }
  }
  throw new Error("fetchWithRetry exhausted");
}

export class ContentPipeline {
  // Caches hold in-flight promises so concurrent requests for the same key
  // (e.g. app-load prefetch + living-room mount) share one API call.
  private _textCache = new Map<string, Promise<BeatContent>>();
  private _audioCache = new Map<string, Promise<ArrayBuffer>>();
  private _imageCache = new Map<string, Promise<string>>();

  private dedupe<T>(cache: Map<string, Promise<T>>, k: string, run: () => Promise<T>): Promise<T> {
    if (!cache.has(k)) {
      const p = run();
      cache.set(k, p);
      // Failed fetches shouldn't poison the cache — allow a later retry
      p.catch(() => cache.delete(k));
    }
    return cache.get(k)!;
  }

  generate(key: TextCacheKey): Promise<BeatContent> {
    return this.dedupe(this._textCache, textKey(key), async () => {
      const res = await fetchWithRetry("/generate", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(key),
      });
      if (!res.ok) {
        throw new Error(`generate failed: ${res.status}`);
      }
      const data = await res.json();
      return { content: data.content, nodeIds: data.nodeIds ?? [] };
    });
  }

  fetchTTS(key: AudioCacheKey): Promise<ArrayBuffer> {
    return this.dedupe(this._audioCache, audioKey(key), async () => {
      const res = await fetchWithRetry("/tts", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ text: key.text, voiceId: key.voiceId, lang: key.lang }),
      });
      if (!res.ok) {
        throw new Error(`tts failed: ${res.status}`);
      }
      return res.arrayBuffer();
    });
  }

  fetchImage(key: ImageCacheKey): Promise<string> {
    return this.dedupe(this._imageCache, imageKey(key), async () => {
      const res = await fetchWithRetry("/image", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ word: key.word }),
      });
      if (!res.ok) {
        throw new Error(`image failed: ${res.status}`);
      }
      const data = await res.json();
      return data.url as string;
    });
  }

  /** Parse LLM output tolerantly — strips markdown fences, slices first { to last } (AC8) */
  parseBeatContent(raw: string): unknown {
    let cleaned = raw;
    // Strip ```json ... ``` fences
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    // Find first { and last }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("No JSON object found in LLM response");
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  clearCache(): void {
    this._textCache.clear();
    this._audioCache.clear();
    this._imageCache.clear();
  }
}

/** Singleton pipeline instance */
export const contentPipeline = new ContentPipeline();
