import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ContentPipeline } from "./ContentPipeline";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("ContentPipeline — caching", () => {
  let pipeline: ContentPipeline;

  beforeEach(() => {
    pipeline = new ContentPipeline();
    mockFetch.mockReset();
  });

  // AC1: text cache key (beat, frontierTarget, independenceBand, seed)
  it("AC1: same text cache key returns cached result without fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: '{"dialogue":"Hello"}', nodeIds: ["g_ee"] }),
    });

    const key = { beat: "abuela", frontierTarget: "g_ee", independenceBand: 3, seed: "abc123" };
    const result1 = await pipeline.generate(key);
    const result2 = await pipeline.generate(key); // should hit cache

    expect(mockFetch).toHaveBeenCalledTimes(1); // only one network call
    expect(result1).toEqual(result2);
  });

  // AC2: audio cache key (text, voice, lang)
  it("AC2: same audio key returns cached audio without fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });

    const key = { text: "Hello Sofia", voiceId: "abc123", lang: "es-MX" };
    await pipeline.fetchTTS(key);
    await pipeline.fetchTTS(key); // should hit cache

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // AC3: image cache key (word) — seed dropped in B2, see the B2 block below
  it("AC3: same image key returns cached url without fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://example.com/image.jpg" }),
    });

    const key = { word: "beans" };
    await pipeline.fetchImage(key);
    await pipeline.fetchImage(key); // should hit cache

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // AC5: 503 → rejects (not a visible error)
  it("AC5: 503 from server causes generate() to reject", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "stub" }),
    });

    await expect(
      pipeline.generate({ beat: "test", frontierTarget: "g_sh", independenceBand: 3, seed: "x" })
    ).rejects.toBeDefined();
  });

  // AC8: parse tolerantly (strips markdown fences)
  it("AC8: parseBeaContent strips markdown fences from JSON", () => {
    const raw = '```json\n{"dialogue": "Hello"}\n```';
    const result = pipeline.parseBeatContent(raw);
    expect(result).toMatchObject({ dialogue: "Hello" });
  });

  it("AC8: parseBeaContent handles clean JSON", () => {
    const raw = '{"dialogue": "Hello"}';
    expect(pipeline.parseBeatContent(raw)).toMatchObject({ dialogue: "Hello" });
  });
});

/* ------------------------------------------------------------------ *
 * TICKET 004 / B1 — the dead prefetchNext must be gone
 * ------------------------------------------------------------------ */

/** client/src — resolved from cwd (vitest may run from the repo or client root). */
function resolveSrcRoot(): string {
  const candidates = [join(process.cwd(), "src"), join(process.cwd(), "client", "src")];
  for (const c of candidates) {
    if (existsSync(join(c, "pipeline", "ContentPipeline.ts"))) return c + "/";
  }
  throw new Error(`could not locate client/src from ${process.cwd()}`);
}
const SRC_ROOT = resolveSrcRoot();

/** Every non-test .ts/.tsx file under client/src. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(name)) return [];
    if (/\.test\.tsx?$/.test(name)) return [];
    return [full];
  });
}

describe("B1: dead prefetchNext removal", () => {
  it("B1: ContentPipeline instances expose no prefetchNext member", () => {
    const pipeline = new ContentPipeline() as any;
    expect(pipeline.prefetchNext).toBeUndefined();
    expect("prefetchNext" in pipeline).toBe(false);
  });

  it("B1: no prefetchNext call sites remain in client source", () => {
    // \b...\b deliberately does NOT match prefetchNextSentence (the live one).
    const offenders = sourceFiles(SRC_ROOT)
      .filter((f) => /\bprefetchNext\b/.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(SRC_ROOT.length));
    expect(offenders).toEqual([]);
  });

  // Regression guard — the *other* prefetch must survive the deletion.
  it("B1 guard: BedroomScreen still defines and calls prefetchNextSentence", () => {
    const src = readFileSync(join(SRC_ROOT, "screens", "BedroomScreen.tsx"), "utf8");
    expect(src).toContain("const prefetchNextSentence");
    expect(src).toContain("prefetchNextSentence();");
  });
});

/* ------------------------------------------------------------------ *
 * TICKET 005 — B2 (drop seed from image key) / B3 (add prompt to text key)
 * ------------------------------------------------------------------ */

describe("B2: image cache key ignores seed", () => {
  let pipeline: ContentPipeline;

  beforeEach(() => {
    pipeline = new ContentPipeline();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://example.com/beans.jpg" }),
    });
  });

  it("B2: same word + different seeds → one request, same url", async () => {
    const a = await pipeline.fetchImage({ word: "beans", seed: "session-1" } as any);
    const b = await pipeline.fetchImage({ word: "beans", seed: "session-2" } as any);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("B2: the /image POST body is {word} only — seed is never forwarded", async () => {
    await pipeline.fetchImage({ word: "beans", seed: "session-1" } as any);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/image");
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body).toEqual({ word: "beans" });
    expect(body.seed).toBeUndefined();
  });

  it("B2: different words still miss the cache", async () => {
    await pipeline.fetchImage({ word: "beans" });
    await pipeline.fetchImage({ word: "rice" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("B3: text cache key includes prompt", () => {
  let pipeline: ContentPipeline;
  const base = { beat: "bedroom-page-0", frontierTarget: "g_ee", independenceBand: 3, seed: "s" };

  beforeEach(() => {
    pipeline = new ContentPipeline();
    mockFetch.mockReset();
  });

  it("B3: different prompts on an otherwise identical key do not collide", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: "FIRST", nodeIds: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: "SECOND", nodeIds: [] }) });

    const first = await pipeline.generate({ ...base, prompt: "write about beans" });
    const second = await pipeline.generate({ ...base, prompt: "write about fish" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(first.content).toBe("FIRST");
    expect(second.content).toBe("SECOND");
  });

  // Regression guard — dedupe must still work when the whole key matches.
  it("B3 guard: fully identical keys including prompt are still deduped", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ content: "ONLY", nodeIds: [] }) });

    const first = await pipeline.generate({ ...base, prompt: "same prompt" });
    const second = await pipeline.generate({ ...base, prompt: "same prompt" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });
});
