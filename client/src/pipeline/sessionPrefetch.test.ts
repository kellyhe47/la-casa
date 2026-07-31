import { describe, it, expect, vi, beforeEach } from "vitest";
import { contentPipeline } from "./ContentPipeline";
import { prefetchSessionStart, getFirstFrontierWord } from "./sessionPrefetch";
import { SkillGraph } from "../graph/SkillGraph";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeGraph() {
  return new SkillGraph(demoState.nodes as unknown as GraphNode[]);
}

const imageCalls = () => mockFetch.mock.calls.filter((c) => c[0] === "/image");

describe("prefetchSessionStart", () => {
  let graph: SkillGraph;

  beforeEach(() => {
    graph = makeGraph();
    contentPipeline.clearCache();
    mockFetch.mockReset();
    mockFetch.mockImplementation(async (url: string) =>
      url === "/image"
        ? { ok: true, json: async () => ({ url: "https://example.com/x.jpg" }) }
        : { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }
    );
  });

  // Regression guard — prefetch must keep warming both caches.
  it("guard: warms both the image and the TTS cache", async () => {
    prefetchSessionStart(graph, "session-seed");
    await vi.waitFor(() => {
      const urls = mockFetch.mock.calls.map((c) => c[0]);
      expect(urls).toContain("/image");
      expect(urls).toContain("/tts");
    });
  });

  // B2: sessionSeed is randomized per session, so a seed-free image key is the
  // only way the warmed entry can be reused by the living room / server cache.
  it("B2: the warmed image entry is hit by a seedless fetchImage for the same word", async () => {
    prefetchSessionStart(graph, "session-seed");
    await vi.waitFor(() => expect(imageCalls()).toHaveLength(1));

    await contentPipeline.fetchImage({ word: getFirstFrontierWord(graph) });

    expect(imageCalls()).toHaveLength(1);
  });
});
