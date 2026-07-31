// TICKET 012 — PRD v2 C3 + E4.
//
// C3: the client posts `grade` / `client_error` batches to POST /events.
// E4: state is written at every item boundary (D13), fire-and-forget. A failed
//     save `.catch()`es into a `client_error` and NEVER interrupts gameplay.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { emitEvent } from "./telemetry";
import { createAppStore, type AppStore } from "../state/appStore";
import { getLearnerId, LEARNER_ID_KEY } from "../state/learnerId";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

interface Call {
  url: string;
  init: RequestInit;
}

function callsTo(predicate: (url: string) => boolean): Call[] {
  return mockFetch.mock.calls
    .map(([url, init]) => ({ url: url as string, init: (init ?? {}) as RequestInit }))
    .filter((c) => predicate(c.url));
}

function bodyOf(call: Call): any {
  return JSON.parse(call.init.body as string);
}

function headerOf(init: RequestInit | undefined, name: string): string | undefined {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const hit = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return hit ? headers[hit] : undefined;
}

/** Every event posted to /events across all batches, flattened. */
function postedEvents(): Array<{ type: string; payload: any }> {
  return callsTo((u) => u === "/events").flatMap((c) => bodyOf(c).events ?? []);
}

function storedKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)!);
  return keys;
}

const okJson = (json: unknown = {}) => ({ ok: true, status: 200, json: async () => json });

describe("C3: client telemetry emitter", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  it("C3: emitEvent posts a batch to POST /events carrying the learner header", async () => {
    mockFetch.mockResolvedValue(okJson({ accepted: 1 }));
    const id = getLearnerId();

    emitEvent("grade", { word: "beans", node_ids: ["g_ee"], result: 1, screen: "living-room" });

    await vi.waitFor(() => expect(callsTo((u) => u === "/events").length).toBeGreaterThan(0));

    const call = callsTo((u) => u === "/events")[0];
    expect(call.init.method).toBe("POST");
    expect(headerOf(call.init, "X-Learner-Id")).toBe(id);

    const body = bodyOf(call);
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events).toContainEqual({
      type: "grade",
      payload: { word: "beans", node_ids: ["g_ee"], result: 1, screen: "living-room" },
    });
  });

  it("C3: a failing /events post is swallowed — emitEvent does not throw and leaks no rejection", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    expect(() => emitEvent("client_error", { kind: "js", message: "boom", screen: "fridge" })).not.toThrow();

    await vi.waitFor(() => expect(callsTo((u) => u === "/events").length).toBeGreaterThan(0));
    // Give any unhandled rejection a tick to surface — vitest fails the run on one.
    await new Promise((r) => setTimeout(r, 10));
  });
});

describe("E4: fire-and-forget state writes at every item boundary", () => {
  let store: AppStore;

  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(okJson({}));
    store = createAppStore();
    store.getState().startSession();
  });

  it("E4: a state save is issued on each item boundary", async () => {
    const id = getLearnerId();

    store.getState().recordGrade(["g_ee"], 1, "beans");
    await vi.waitFor(() => expect(callsTo((u) => u.startsWith("/state/")).length).toBe(1));

    store.getState().recordGrade(["g_sh"], 0, "shell");
    await vi.waitFor(() => expect(callsTo((u) => u.startsWith("/state/")).length).toBe(2));

    for (const call of callsTo((u) => u.startsWith("/state/"))) {
      expect(call.url).toBe(`/state/${id}`);
      expect(call.init.method).toBe("PUT");
      expect(headerOf(call.init, "X-Learner-Id")).toBe(id);

      const body = bodyOf(call);
      expect(Array.isArray(body.graph?.nodes)).toBe(true);
      expect(typeof body.independence).toBe("number");
    }

    // The band written must be the live band, not a hardcoded default.
    const last = callsTo((u) => u.startsWith("/state/")).at(-1)!;
    expect(bodyOf(last).independence).toBe(store.getState().graph!.independence());
  });

  it("E4: a save that rejects does not throw into the caller — gameplay continues", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (String(url).startsWith("/state/")) throw new Error("save failed");
      return okJson({ accepted: 1 });
    });

    expect(() => store.getState().recordGrade(["g_ee"], 1, "beans")).not.toThrow();

    // The save was genuinely attempted...
    await vi.waitFor(() => expect(callsTo((u) => u.startsWith("/state/")).length).toBe(1));
    // ...and gameplay state advanced regardless.
    expect(store.getState().sessionPassedWords).toContain("beans");
    expect(store.getState().graph!.getNode("g_ee")!.attempts.length).toBeGreaterThan(0);

    // A second boundary still saves — one failure does not disable the writer.
    expect(() => store.getState().recordGrade(["g_sh"], 0, "shell")).not.toThrow();
    await vi.waitFor(() => expect(callsTo((u) => u.startsWith("/state/")).length).toBe(2));
    await new Promise((r) => setTimeout(r, 10)); // let any unhandled rejection surface
  });

  it("E4: a rejected save emits a client_error event with kind:'fetch'", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (String(url).startsWith("/state/")) throw new Error("save failed");
      return okJson({ accepted: 1 });
    });

    store.getState().recordGrade(["g_ee"], 1, "beans");

    await vi.waitFor(() => {
      const errors = postedEvents().filter((e) => e.type === "client_error");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].payload.kind).toBe("fetch");
    });
  });

  // REGRESSION GUARD — passes today. D2: localStorage is the uuid and nothing
  // else; gameplay must never mirror the graph into it.
  it("E4 GUARD: gameplay writes no graph/state blob to localStorage", async () => {
    store.getState().recordGrade(["g_ee"], 1, "beans");
    store.getState().recordGrade(["g_sh"], 0, "shell");
    await new Promise((r) => setTimeout(r, 10));

    // The learner uuid is the ONLY key this app may ever write (D2).
    expect(storedKeys().filter((k) => k !== LEARNER_ID_KEY)).toEqual([]);
  });
});
