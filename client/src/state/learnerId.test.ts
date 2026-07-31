// TICKET 012 — PRD v2 E2: anonymous device UUID in localStorage, sent as
// `X-Learner-Id` on every API call. No login, no PII, no graph mirror.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { LEARNER_ID_KEY } from "./learnerId";
import { ContentPipeline } from "../pipeline/ContentPipeline";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/** Every key currently in localStorage, via the Storage API (not Object.keys). */
function storedKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)!);
  return keys;
}

/** Re-import learnerId with a clean module registry — simulates a page reload. */
async function reloadModule() {
  vi.resetModules();
  return import("./learnerId");
}

/** Case-insensitive header lookup on a fetch init object. */
function headerOf(init: RequestInit | undefined, name: string): string | undefined {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const hit = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return hit ? headers[hit] : undefined;
}

describe("E2: learner id", () => {
  beforeEach(async () => {
    localStorage.clear();
    mockFetch.mockReset();
    vi.resetModules();
  });

  it("E2: first getLearnerId() generates a uuid and persists it to localStorage", async () => {
    const { getLearnerId } = await reloadModule();

    expect(localStorage.getItem(LEARNER_ID_KEY)).toBeNull();

    const id = getLearnerId();

    expect(id).toMatch(UUID_RE);
    expect(localStorage.getItem(LEARNER_ID_KEY)).toBe(id);
  });

  it("E2: a second call returns the same id — it does not regenerate", async () => {
    const { getLearnerId } = await reloadModule();

    const first = getLearnerId();
    const second = getLearnerId();
    const third = getLearnerId();

    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(localStorage.getItem(LEARNER_ID_KEY)).toBe(first);
  });

  it("E2: an id already in localStorage is reused across a simulated reload", async () => {
    const first = (await reloadModule()).getLearnerId();

    // New module instance, same localStorage — as after a page refresh.
    const afterReload = (await reloadModule()).getLearnerId();

    expect(afterReload).toBe(first);
    expect(localStorage.getItem(LEARNER_ID_KEY)).toBe(first);
  });

  it("E2: the stored value is the bare uuid — not a JSON blob, and the learner key is the only key", async () => {
    const { getLearnerId } = await reloadModule();
    const id = getLearnerId();

    const raw = localStorage.getItem(LEARNER_ID_KEY)!;
    expect(raw).toBe(id);
    expect(raw).toMatch(UUID_RE);
    // A bare uuid is not valid JSON — proves nothing was wrapped/serialized.
    expect(() => JSON.parse(raw)).toThrow();

    // D2: localStorage holds ONLY the uuid. No graph, no state mirror.
    expect(storedKeys()).toEqual([LEARNER_ID_KEY]);
  });

  it("E2: /generate, /tts and /image all carry an X-Learner-Id header (and keep Content-Type)", async () => {
    const { getLearnerId } = await reloadModule();
    const id = getLearnerId();

    mockFetch.mockImplementation(async (url: string) => {
      if (url === "/tts") return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
      if (url === "/image") return { ok: true, json: async () => ({ url: "https://x/y.jpg" }) };
      return { ok: true, json: async () => ({ content: "hi", nodeIds: [] }) };
    });

    const pipeline = new ContentPipeline();
    await pipeline.generate({ beat: "abuela", frontierTarget: "g_ee", independenceBand: 3, seed: "s" });
    await pipeline.fetchTTS({ text: "hola", voiceId: "v1", lang: "es-MX" });
    await pipeline.fetchImage({ word: "beans" });

    const byUrl = new Map<string, RequestInit>();
    for (const [url, init] of mockFetch.mock.calls) byUrl.set(url as string, init as RequestInit);

    for (const route of ["/generate", "/tts", "/image"]) {
      const init = byUrl.get(route);
      expect(init, `${route} was not requested`).toBeDefined();
      expect(headerOf(init, "X-Learner-Id"), `${route} is missing X-Learner-Id`).toBe(id);
      // Regression: adding the identity header must not drop the content type.
      expect(headerOf(init, "Content-Type")).toBe("application/json");
    }
  });
});
