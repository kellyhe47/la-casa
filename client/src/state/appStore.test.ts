import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAppStore, type AppStore } from "./appStore";

describe("AppStore", () => {
  let store: AppStore;

  beforeEach(() => {
    store = createAppStore();
  });

  // AC1: starts in title screen
  it("AC1: starts in title screen", () => {
    expect(store.getState().screen).toBe("title");
  });

  // AC2: startSession rolls seed, seeds graph, sets independence to 3
  it("AC2: startSession sets seed and independence 3", () => {
    store.getState().startSession();
    const state = store.getState();
    expect(state.sessionSeed).toBeTruthy();
    expect(typeof state.sessionSeed).toBe("string");
    expect(state.graph).toBeDefined();
    expect(state.graph?.independence()).toBe(3);
  });

  // AC3: screen sequence enforced
  it("AC3: advanceBeat follows title→living-room→fridge→bedroom→off-ramp", () => {
    store.getState().startSession();
    // After mic granted, advance from title
    store.getState().setMicState("granted");
    store.getState().advanceBeat();
    expect(store.getState().screen).toBe("living-room");

    store.getState().advanceBeat();
    expect(store.getState().screen).toBe("fridge");

    store.getState().advanceBeat();
    expect(store.getState().screen).toBe("bedroom");

    store.getState().advanceBeat();
    expect(store.getState().screen).toBe("off-ramp");
  });

  // AC4: off-ramp is terminal
  it("AC4: advanceBeat from bedroom goes to off-ramp", () => {
    const state = store.getState();
    state.startSession();
    state.setMicState("granted");
    state.advanceBeat(); // living-room
    state.advanceBeat(); // fridge
    state.advanceBeat(); // bedroom
    state.advanceBeat(); // off-ramp
    expect(store.getState().screen).toBe("off-ramp");
    // Calling again stays on off-ramp
    state.advanceBeat();
    expect(store.getState().screen).toBe("off-ramp");
  });

  // AC5: session seed accessible from state
  it("AC5: sessionSeed accessible from state", () => {
    store.getState().startSession();
    expect(store.getState().sessionSeed).toBeTruthy();
  });

  // AC6: micState tracks valid states
  it("AC6: micState tracks idle|requesting|granted|denied|listening|thinking", () => {
    const states = ["idle", "requesting", "granted", "denied", "listening", "thinking"] as const;
    for (const s of states) {
      store.getState().setMicState(s);
      expect(store.getState().micState).toBe(s);
    }
  });

  // AC7: denied state — game does not advance
  it("AC7: mic denied prevents advance past title", () => {
    store.getState().startSession();
    store.getState().setMicState("denied");
    store.getState().advanceBeat(); // should NOT advance since denied
    // Screen should stay title (or handle gracefully)
    expect(store.getState().screen).toBe("title");
  });

  // AC8: no localStorage/sessionStorage
  it("AC8: no persistence — localStorage not touched", () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem");
    store.getState().startSession();
    store.getState().advanceBeat();
    expect(setSpy).not.toHaveBeenCalled();
  });
});
