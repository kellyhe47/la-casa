export interface TextCacheKey {
  beat: string;
  frontierTarget: string;
  independenceBand: number;
  seed: string;
}

export interface AudioCacheKey {
  text: string;
  voiceId: string;
  lang: string;
}

export interface ImageCacheKey {
  word: string;
  seed: string;
}

export interface BeatContent {
  content: string;
  nodeIds: string[];
}

function textKey(k: TextCacheKey): string {
  return `text:${k.beat}:${k.frontierTarget}:${k.independenceBand}:${k.seed}`;
}

function audioKey(k: AudioCacheKey): string {
  return `audio:${k.text}:${k.voiceId}:${k.lang}`;
}

function imageKey(k: ImageCacheKey): string {
  return `image:${k.word}:${k.seed}`;
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
  private _textCache = new Map<string, BeatContent>();
  private _audioCache = new Map<string, ArrayBuffer>();
  private _imageCache = new Map<string, string>();

  async generate(key: TextCacheKey): Promise<BeatContent> {
    const k = textKey(key);
    if (this._textCache.has(k)) return this._textCache.get(k)!;

    const res = await fetchWithRetry("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(key),
    });

    if (!res.ok) {
      throw new Error(`generate failed: ${res.status}`);
    }

    const data = await res.json();
    const result: BeatContent = { content: data.content, nodeIds: data.nodeIds ?? [] };
    this._textCache.set(k, result);
    return result;
  }

  async fetchTTS(key: AudioCacheKey): Promise<ArrayBuffer> {
    const k = audioKey(key);
    if (this._audioCache.has(k)) return this._audioCache.get(k)!;

    const res = await fetchWithRetry("/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: key.text, voiceId: key.voiceId, lang: key.lang }),
    });

    if (!res.ok) {
      throw new Error(`tts failed: ${res.status}`);
    }

    const buffer = await res.arrayBuffer();
    this._audioCache.set(k, buffer);
    return buffer;
  }

  async fetchImage(key: ImageCacheKey): Promise<string> {
    const k = imageKey(key);
    if (this._imageCache.has(k)) return this._imageCache.get(k)!;

    const res = await fetchWithRetry("/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: key.word, seed: key.seed }),
    });

    if (!res.ok) {
      throw new Error(`image failed: ${res.status}`);
    }

    const data = await res.json();
    const url: string = data.url;
    this._imageCache.set(k, url);
    return url;
  }

  /** Fire-and-forget prefetch for next beat (AC4) */
  async prefetchNext(key: TextCacheKey): Promise<void> {
    // Run generate in background; errors are swallowed — the living-scene wait handles late content
    this.generate(key).catch(() => {});
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
