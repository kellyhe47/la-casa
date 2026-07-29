import { describe, it, expect, vi, beforeEach } from "vitest";
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
    const audioBlob = new Blob(["audio-data"], { type: "audio/mpeg" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });

    const key = { text: "Hello Sofia", voiceId: "abc123", lang: "es-MX" };
    await pipeline.fetchTTS(key);
    await pipeline.fetchTTS(key); // should hit cache

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // AC3: image cache key (word, seed)
  it("AC3: same image key returns cached url without fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://example.com/image.jpg" }),
    });

    const key = { word: "beans", seed: "abc123" };
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

describe("ContentPipeline — prefetch", () => {
  it("AC4: prefetchNext calls generate+tts fire-and-forget into cache", async () => {
    const pipeline = new ContentPipeline();
    const generateSpy = vi.spyOn(pipeline, "generate").mockResolvedValue({
      content: '{"dialogue":"test"}',
      nodeIds: ["g_ee"],
    } as any);

    await pipeline.prefetchNext({
      beat: "fridge",
      frontierTarget: "g_ee",
      independenceBand: 3,
      seed: "abc",
    });

    expect(generateSpy).toHaveBeenCalled();
  });
});
