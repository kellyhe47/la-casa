import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// AC2: Server /health returns {ok:true}
describe("AC2: GET /health", () => {
  it("returns 200 and {ok:true}", async () => {
    const { createApp } = await import("../../../../server/app.js");
    // @ts-ignore - supertest may not be installed yet
    const supertest = (await import("supertest")).default;
    const app = createApp();
    const res = await supertest(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

// AC3: POST /generate with missing ANTHROPIC_API_KEY → 503
describe("AC3: POST /generate stub when no API key", () => {
  let savedKey: string | undefined;
  beforeEach(() => {
    savedKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });
  it("returns 503 {error:stub}", async () => {
    const { generateHandler } = await import("../../../../server/routes/generate.js");
    const { createApp } = await import("../../../../server/app.js");
    const supertest = (await import("supertest")).default;
    const app = createApp();
    const res = await supertest(app).post("/generate").send({ beat: "test" });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: "stub" });
    if (savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
  });
});

// AC4: POST /tts with missing ELEVENLABS_API_KEY → 503
describe("AC4: POST /tts stub when no API key", () => {
  let savedKey: string | undefined;
  beforeEach(() => {
    savedKey = process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
  });
  it("returns 503 {error:stub}", async () => {
    const { createApp } = await import("../../../../server/app.js");
    const supertest = (await import("supertest")).default;
    const app = createApp();
    const res = await supertest(app).post("/tts").send({ text: "hello", voiceId: "x" });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: "stub" });
    if (savedKey) process.env.ELEVENLABS_API_KEY = savedKey;
  });
});

// AC5: POST /image with missing OPENAI_API_KEY → 503
describe("AC5: POST /image stub when no API key", () => {
  let savedKey: string | undefined;
  beforeEach(() => {
    savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });
  it("returns 503 {error:stub}", async () => {
    const { createApp } = await import("../../../../server/app.js");
    const supertest = (await import("supertest")).default;
    const app = createApp();
    const res = await supertest(app).post("/image").send({ word: "beans", seed: "abc" });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: "stub" });
    if (savedKey) process.env.OPENAI_API_KEY = savedKey;
  });
});

// AC8: Baloo 2 font loaded in client/index.html
describe("AC8: Baloo 2 font in index.html", () => {
  it("index.html references Baloo font", () => {
    const htmlPath = path.resolve(__dirname, "../../../index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");
    expect(content).toMatch(/[Bb]aloo/);
  });
});
