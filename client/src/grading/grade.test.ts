import { describe, it, expect } from "vitest";
import { grade, gradeSpelling } from "./grade";

describe("grade() — spoken fuzzy match", () => {
  // AC2: normalized Levenshtein threshold 0.65
  it("AC2a: 'beens' matches 'beans' (close enough)", () => {
    expect(grade("beens", "beans").pass).toBe(true);
  });
  it("AC2b: 'cat' does not match 'beans'", () => {
    expect(grade("cat", "beans").pass).toBe(false);
  });

  // AC3: case and punctuation insensitive
  it("AC3: 'Beans!' matches 'beans'", () => {
    expect(grade("Beans!", "beans").pass).toBe(true);
  });
  it("AC3: 'MILK' matches 'milk'", () => {
    expect(grade("MILK", "milk").pass).toBe(true);
  });

  // AC4: multi-word targets
  it("AC4a: exact multi-word match passes", () => {
    expect(grade("the beans are hot", "the beans are hot").pass).toBe(true);
  });
  it("AC4b: filler words before target still pass", () => {
    expect(grade("uh the beans are hot", "the beans are hot").pass).toBe(true);
  });

  // AC5: executes quickly
  it("AC5: grade runs in < 5ms", () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) grade("beans", "beans");
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50); // 100 calls under 50ms = well under 5ms each
  });

  // returns matchedWord
  it("returns the matched word string", () => {
    const result = grade("beans", "beans");
    expect(result.matchedWord).toBeTruthy();
  });
});

describe("gradeSpelling() — exact string match", () => {
  // AC8: exact match
  it("AC8a: 'beans' matches 'beans'", () => {
    expect(gradeSpelling("beans", "beans")).toBe(true);
  });
  it("AC8b: 'bens' does not match 'beans'", () => {
    expect(gradeSpelling("bens", "beans")).toBe(false);
  });
  it("AC8c: case insensitive", () => {
    expect(gradeSpelling("BEANS", "beans")).toBe(true);
  });
  it("AC8d: trimmed", () => {
    expect(gradeSpelling("  beans  ", "beans")).toBe(true);
  });
});
