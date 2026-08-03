// TICKET 025 — Aug 3 design refresh.
//
// A. The living room's chat panel can be MINIMIZED. While minimized the phone
//    screen carries nothing but Abuela's notification banner; tapping the
//    banner brings the panel back with its history intact. Minimize/restore is
//    presentation only — it must never touch the network, the audio in flight,
//    or grading.
//
// B/C/D. Art ports (family photos, guitar, chanclas, crayon drawing, utensil
//    rail, lamp base) are verified visually by QA; the assertions here are a
//    thin tripwire on the load-bearing marks so a silent revert is caught.
//
// jsdom hazards this file works around (all previously bitten in this repo):
//  * `playAudio`/`speakAbuela` await `audio.onended`, which jsdom never fires —
//    a SUCCESSFUL tts stub deadlocks the exchange. Reject instead.
//  * `URL.createObjectURL` does not exist in jsdom.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup, within } from "@testing-library/react";
import React from "react";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { LivingRoomScreen } from "./LivingRoomScreen";
import { LivingRoomScene } from "../assets/scenes/LivingRoomScene";
import { FridgeScene } from "../assets/scenes/FridgeScene";
import { BedroomScene } from "../assets/scenes/BedroomScene";
import { contentPipeline } from "../pipeline/ContentPipeline";
import { getFirstFrontierWord } from "../pipeline/sessionPrefetch";
import { SkillGraph } from "../graph/SkillGraph";
import demoState from "../../../content/demo-state.json";
import type { GraphNode } from "../graph/types";

/* ------------------------------------------------------------------ *
 * harness
 * ------------------------------------------------------------------ */

const mockStart = vi.fn();
const mockStop = vi.fn();
let srInstance: any = null;
const MockSR = vi.fn(() => {
  srInstance = {
    start: mockStart,
    stop: mockStop,
    continuous: false,
    interimResults: false,
    onresult: null,
    onerror: null,
    onend: null,
  };
  return srInstance;
});
(globalThis as any).SpeechRecognition = MockSR;
(globalThis as any).webkitSpeechRecognition = MockSR;

Object.defineProperty(HTMLMediaElement.prototype, "play", {
  writable: true,
  configurable: true,
  value: vi.fn().mockRejectedValue(new Error("no audio in jsdom")),
});
Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  writable: true,
  configurable: true,
  value: vi.fn(),
});
(URL as any).createObjectURL = (URL as any).createObjectURL ?? vi.fn(() => "blob:stub");

/** demo-state's nodes carry a pre-baked attempt log; `[]` starts the ITEM
 *  history empty so only the items driven here are in play. */
const cleanGraph = (band = 5) =>
  new SkillGraph(demoState.nodes as unknown as GraphNode[], band, []);

let tts: ReturnType<typeof vi.spyOn>;
let image: ReturnType<typeof vi.spyOn>;

/** A rejected TTS falls straight through speakAbuela's catch (jsdom has no
 *  speechSynthesis), so exchanges complete instead of hanging on `onended`. */
function silenceContent() {
  tts = vi.spyOn(contentPipeline, "fetchTTS").mockRejectedValue(new Error("no tts in jsdom"));
  image = vi.spyOn(contentPipeline, "fetchImage").mockResolvedValue("blob:stub");
}

function renderRoom(graph = cleanGraph()) {
  render(<LivingRoomScreen graph={graph} seed="test" onAdvance={() => {}} independence={3} />);
  return graph;
}

/** Read a scene's source. `import.meta.url` is an http URL under vite's
 *  transform, so resolve from the vitest cwd instead. */
function readSource(relative: string): string {
  for (const base of [process.cwd(), resolve(process.cwd(), "client")]) {
    const p = resolve(base, relative);
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  throw new Error(`could not locate ${relative} from ${process.cwd()}`);
}

const minimize = () => fireEvent.click(screen.getByTestId("chat-minimize"));
const tapBanner = () => fireEvent.click(screen.getByTestId("phone-notification"));

/** Put the screen into a non-`arrival` loop state so the banner is driven by
 *  `panelHidden` alone (in `arrival` the design shows it either way). */
function startListening() {
  fireEvent.click(screen.getByTestId("mic-button"));
}

beforeEach(() => {
  mockStart.mockClear();
  mockStop.mockClear();
  contentPipeline.clearCache();
  silenceContent();
});

afterEach(() => {
  cleanup();
  tts?.mockRestore();
  image?.mockRestore();
  vi.unstubAllGlobals();
});

/* ------------------------------------------------------------------ *
 * AC-A1 — the minimize control
 * ------------------------------------------------------------------ */

describe("025 AC-A1: minimize control in the chat panel header", () => {
  it("a round – button sits in the header, right of the presence line", () => {
    renderRoom();
    const btn = screen.getByTestId("chat-minimize");
    const presence = screen.getByText("nota de voz · 0:04");
    const header = btn.parentElement!;
    // same header row as the presence line, and after it in document order
    expect(header.contains(presence)).toBe(true);
    expect(presence.compareDocumentPosition(btn)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(header).getByText("Abuela")).toBeTruthy();
  });

  it("is a 38px #FBE2D3 circle with a 4px ink border and a Spanish label", () => {
    renderRoom();
    const btn = screen.getByLabelText("Ocultar chat") as HTMLButtonElement;
    expect(btn.getAttribute("data-testid")).toBe("chat-minimize");
    expect(btn.style.width).toBe("38px");
    expect(btn.style.height).toBe("38px");
    expect(btn.style.borderRadius).toBe("50%");
    expect(btn.style.background).toBe("rgb(251, 226, 211)"); // #FBE2D3
    expect(btn.style.border).toContain("4px solid");
    expect(btn.style.border.toLowerCase()).toContain("rgb(111, 75, 53)"); // #6F4B35
    // the `–` glyph
    expect(btn.querySelector('path[d="M 4 10 h 12"]')).toBeTruthy();
  });

  it("clicking it hides the chat panel", () => {
    renderRoom();
    expect(screen.getByTestId("chat-thread")).toBeTruthy();
    minimize();
    expect(screen.queryByTestId("chat-thread")).toBeNull();
    expect(screen.queryByTestId("chat-panel")).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * AC-A2 — the minimized phone shows only the banner
 * ------------------------------------------------------------------ */

describe("025 AC-A2: minimized phone shows only the notification banner", () => {
  it("renders the banner and nothing else on the phone screen", () => {
    renderRoom();
    startListening(); // leave `arrival` so only panelHidden can raise the banner
    minimize();

    const banner = screen.getByTestId("phone-notification");
    expect(banner).toBeTruthy();
    // banner content: sender, timestamp, two ink message-lines
    expect(within(banner).getByText("Abuela")).toBeTruthy();
    expect(within(banner).getByText("ahora")).toBeTruthy();
    expect(banner.querySelector('path[d="M 614 588 h 100 M 614 600 h 64"]')).toBeTruthy();

    // ...and nothing else: no panel, no mic hit-target, no mic art on the glass
    expect(screen.queryByTestId("chat-panel")).toBeNull();
    expect(screen.queryByTestId("mic-button")).toBeNull();
    expect(screen.queryByTestId("scene-mic-art")).toBeNull();
  });

  it("is pinned to the design's phone-screen coordinates (544,546 194×70)", () => {
    renderRoom();
    minimize();
    const banner = screen.getByTestId("phone-notification") as HTMLElement;
    expect(banner.style.left).toBe("42.5%");
    expect(banner.style.top).toBe("68.25%");
    expect(banner.style.width).toBe("15.16%");
    expect(banner.style.height).toBe("8.75%");
    expect(banner.querySelector('rect[x="544"][y="546"][width="194"][height="70"]')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ *
 * AC-A3 — tapping the banner restores
 * ------------------------------------------------------------------ */

describe("025 AC-A3: tapping the banner restores the panel", () => {
  it("the banner is a real button with an accessible name", () => {
    renderRoom();
    minimize();
    const banner = screen.getByTestId("phone-notification");
    expect(banner.tagName).toBe("BUTTON");
    expect(banner.getAttribute("aria-label")).toMatch(/abuela/i);
  });

  it("clicking it re-renders the chat panel and clears the banner", () => {
    renderRoom();
    startListening(); // loopState = listening, so the banner is minimize-driven
    minimize();
    expect(screen.queryByTestId("chat-thread")).toBeNull();

    tapBanner();

    expect(screen.getByTestId("chat-thread")).toBeTruthy();
    expect(screen.queryByTestId("phone-notification")).toBeNull();
  });

  it("keeps the banner up after restoring while a note is arriving", () => {
    renderRoom(); // loopState starts at `arrival`
    minimize();
    tapBanner();
    expect(screen.getByTestId("chat-thread")).toBeTruthy();
    // design: showNotif = arrival || panelHidden
    expect(screen.getByTestId("phone-notification")).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ *
 * AC-A4 — suppressed affordances while minimized
 * ------------------------------------------------------------------ */

describe("025 AC-A4: affordances stand down while minimized", () => {
  it("the mic is neither visible nor interactive", () => {
    renderRoom();
    expect(screen.getByTestId("mic-button")).toBeTruthy();
    minimize();
    expect(screen.queryByTestId("mic-button")).toBeNull();
    expect(screen.queryByTestId("scene-mic-art")).toBeNull();
  });

  it("the listening tint and the typing indicator do not render", () => {
    renderRoom();
    startListening(); // mic active → listening tint, presence flips
    minimize();
    expect(screen.queryByTestId("mic-button")).toBeNull();
    expect(screen.queryByTestId("typing-indicator")).toBeNull();
  });

  it("the panel header — avatar and presence line — does not render", () => {
    renderRoom();
    expect(screen.getByText("nota de voz · 0:04")).toBeTruthy();
    minimize();
    expect(screen.queryByText("nota de voz · 0:04")).toBeNull();
    expect(screen.queryByTestId("chat-minimize")).toBeNull(); // no panel, no control
  });
});

/* ------------------------------------------------------------------ *
 * AC-A5 — scope guards
 * ------------------------------------------------------------------ */

describe("025 AC-A5: minimize is presentation only", () => {
  it("the panel defaults to OPEN", () => {
    renderRoom();
    expect(screen.getByTestId("chat-panel")).toBeTruthy();
    expect(screen.getByTestId("chat-thread")).toBeTruthy();
  });

  it("minimize and restore issue no /generate and no /tts request", async () => {
    const fetchMock = vi.fn(async (url: any) =>
      String(url) === "/image"
        ? ({ ok: true, status: 200, json: async () => ({ url: "https://example.com/x.jpg" }) } as any)
        : ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8), json: async () => ({}) } as any)
    );
    vi.stubGlobal("fetch", fetchMock);

    renderRoom();
    fetchMock.mockClear();

    await act(async () => {
      minimize();
      tapBanner();
      minimize();
      tapBanner();
    });

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls).not.toContain("/generate");
    expect(urls).not.toContain("/tts");
  });

  it("minimizing mid-exchange interrupts neither audio nor grading, and history survives", async () => {
    const pause = HTMLMediaElement.prototype.pause as ReturnType<typeof vi.fn>;
    pause.mockClear();

    const graph = cleanGraph();
    const boundary = vi.spyOn(graph, "recordItemBoundary");
    renderRoom(graph);
    const word = getFirstFrontierWord(graph);

    startListening();
    minimize(); // mid-exchange: the mic is live, the panel goes away

    await act(async () => {
      await srInstance.onresult({ results: [[{ transcript: word }]] } as any);
    });

    // grading ran to completion while minimized
    expect(boundary).toHaveBeenCalledTimes(1);
    // nothing paused Abuela's audio
    expect(pause).not.toHaveBeenCalled();

    // restoring shows the same thread, with the exchange that happened while
    // it was hidden — nothing was re-fetched to rebuild it
    tapBanner();
    const thread = screen.getByTestId("chat-thread");
    expect(within(thread).getByText(word)).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ *
 * B/C/D — art tripwires (fidelity itself is a visual QA pass)
 * ------------------------------------------------------------------ */

describe("025 B: living-room art port", () => {
  it("B1: warm mats, a desert landscape in the centre frame, and no Abuela portrait", () => {
    const { container } = render(<LivingRoomScene />);
    const svg = container.innerHTML;
    expect(container.querySelectorAll('rect[fill="#EFDDC3"]').length).toBe(3); // three mats
    expect(svg).toContain("#F9D9A8"); // desert sand
    expect(container.querySelector('circle[cx="676"][cy="158"][fill="#F2A48B"]')).toBeTruthy(); // sun
    expect(svg).toContain("#D98E5F");
    expect(svg).toContain("#E0A96D");
    expect(svg).toContain("#7FA07C"); // sage shoulder (Mom & Dad)
    expect(svg).toContain("#F4C95D"); // baby's yellow shoulders
    // the old Abuela portrait's grey bun is gone
    expect(container.querySelector('circle[cx="660"][cy="166"]')).toBeNull();
  });

  it("B2: the guitar gains a rosette, a bridge with pins, frets and tuning pegs", () => {
    const { container } = render(<LivingRoomScene />);
    expect(container.querySelector('circle[cx="318"][cy="580"][r="19"]')).toBeTruthy(); // rosette
    expect(container.querySelector('rect[x="300"][y="612"]')).toBeTruthy(); // bridge
    expect(container.querySelectorAll('circle[cy="617"][fill="#F2C066"]').length).toBe(3); // pins
    expect(container.querySelectorAll('circle[r="3.5"][fill="#F2C066"]').length).toBe(4); // pegs
    expect(
      container.querySelector('path[d="M 314 452 v 160 M 318 452 v 160 M 322 452 v 160"]')
    ).toBeTruthy(); // three strings to the bridge
    expect(
      container.querySelector('path[d="M 311 466 h 14 M 311 482 h 14 M 311 500 h 14"]')
    ).toBeTruthy(); // frets
  });

  it("B3/B4: Y-thong chanclas, no baby sock, cuff knit lines, no stray papel-picado dot", () => {
    const { container } = render(<LivingRoomScene />);
    // Y-thong: cross strap + toe post + stud on each chancla
    expect(container.querySelectorAll('path[stroke="#B3402F"]').length).toBeGreaterThanOrEqual(4);
    expect(container.querySelectorAll('circle[r="3"][fill="#B3402F"]').length).toBe(2);
    expect(container.querySelectorAll('ellipse[rx="14"][ry="27"]').length).toBe(2); // inner soles
    // the lavender baby sock is gone
    expect(
      container.querySelector(
        'path[d="M 872 700 q 18 -4 20 12 q 2 14 -14 16 q -20 2 -22 -12 q -2 -12 16 -16"]'
      )
    ).toBeNull();
    expect(
      container.querySelector('path[d="M 497 760 q 26 -18 58 -5 M 487 776 q 28 -20 64 -4"]')
    ).toBeTruthy();
    expect(container.querySelector('circle[cx="880"][cy="46"]')).toBeNull();
  });

  it("hides the mic art only when the chat is minimized", () => {
    const open = render(<LivingRoomScene />);
    expect(open.container.querySelector('[data-testid="scene-mic-art"]')).toBeTruthy();
    cleanup();
    const hidden = render(<LivingRoomScene micHidden />);
    expect(hidden.container.querySelector('[data-testid="scene-mic-art"]')).toBeNull();
  });
});

describe("025 C: fridge art port", () => {
  it("C1: the freezer photo is Sofía's crayon drawing on cream paper", () => {
    const { container } = render(<FridgeScene />);
    const svg = container.innerHTML;
    const paper = container.querySelector('rect[x="540"][y="110"]')!;
    expect(paper.getAttribute("fill")).toBe("#FBEDD2"); // cream, not stark white
    expect(paper.getAttribute("rx")).toBe("3");
    expect(svg).toContain("#E0674A"); // crayon house walls
    expect(svg).toContain("#B3402F"); // roof
    expect(container.querySelector('rect[x="566"][y="158"]')).toBeTruthy(); // door
    expect(container.querySelector('circle[cx="610"][cy="130"]')).toBeTruthy(); // sun
    expect(svg).toContain("#7FA05C"); // scribble grass
    // the old family-photo faces are gone
    expect(container.querySelector('circle[cx="570"][cy="140"]')).toBeNull();
    expect(container.querySelector('circle[cx="600"][cy="142"]')).toBeNull();
  });

  it("C2: a utensil rail hangs between the fridge and the doorway", () => {
    const { container } = render(<FridgeScene />);
    const rail = container.querySelector('g[transform="translate(-25 62)"]')!;
    expect(rail).toBeTruthy();
    expect(rail.querySelector('path[d="M 975 128 h 130"]')).toBeTruthy();
    expect(rail.querySelectorAll('circle[r="5"][fill="#C98A54"]').length).toBe(2); // end caps
    expect(rail.querySelector('ellipse[cx="1000"][cy="212"]')).toBeTruthy(); // spoon bowl
    expect(rail.querySelector('ellipse[cx="1040"][cy="196"]')!.getAttribute("fill")).toBe("#8A5B36"); // molinillo head
    expect(rail.querySelector('path[d="M 1032 190 h 16 M 1032 200 h 16"]')).toBeTruthy(); // rings
    expect(rail.innerHTML).toContain("M 1068 176 h 24"); // spatula blade
    // rail x-span 950..1080 after the translate: clear of the fridge (ends 890)
    // and of the doorway jamb (starts 1140)
    expect(rail.querySelectorAll("path,ellipse,circle").length).toBeGreaterThan(8);
  });
});

describe("025 D: bedroom art port", () => {
  it("D1: the lamp gains a collar and a turned-wood base, and still glows", () => {
    const { container } = render(<BedroomScene />);
    expect(container.querySelector('path[d="M 220 412 v 36"]')).toBeTruthy();
    expect(container.querySelector('path[d="M 220 412 v 44"]')).toBeNull();
    expect(container.querySelector('path[d="M 212 420 h 16"]')).toBeTruthy();
    expect(container.querySelector('path[d="M 206 448 q 14 -8 28 0 l 6 12 q -20 -7 -40 0 Z"]')!.getAttribute("fill"))
      .toBe("#C98A54");
    const plate = container.querySelector('rect[x="192"][y="460"]')!;
    expect(plate.getAttribute("width")).toBe("56");
    expect(plate.getAttribute("height")).toBe("10");
    expect(plate.getAttribute("fill")).toBe("#8A5B36");
    expect(container.querySelector('path[d="M 220 456 l -26 14 h 52 Z"]')).toBeNull(); // flat foot gone
    expect(container.innerHTML).toContain("bd-lampGlow"); // sanctioned light source
  });
});

/* ------------------------------------------------------------------ *
 * E — inline-SVG-only guard on the touched scenes
 * ------------------------------------------------------------------ */

describe("025 E: the refresh stays inline SVG", () => {
  it("no scene grows a raster asset or an import", () => {
    for (const file of [
      "src/assets/scenes/LivingRoomScene.tsx",
      "src/assets/scenes/FridgeScene.tsx",
      "src/assets/scenes/BedroomScene.tsx",
    ]) {
      const src = readSource(file);
      expect(src).not.toMatch(/<image\b/);
      expect(src).not.toMatch(/\.(png|jpe?g|gif|webp|svg)['"]/i);
      expect(src).not.toMatch(/^import /m);
    }
  });
});
