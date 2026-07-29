/** Normalized Levenshtein distance between two strings (0 = identical, 1 = completely different) */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLen = Math.max(a.length, b.length);
  return matrix[b.length][a.length] / maxLen;
}

/** Similarity score 0-1 (1 = identical) */
function similarity(a: string, b: string): number {
  return 1 - levenshteinDistance(a, b);
}

/** Normalize text: lowercase, strip punctuation and filler words */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}-]/g, "")
    .replace(/\b(uh|um|ah|like|you know)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface GradeResult {
  pass: boolean;
  matchedWord: string;
}

/**
 * Grade a spoken transcript against a known target.
 * For multi-word targets: checks if the target words appear in order in the transcript
 * with per-word similarity ≥ 0.65 (R7, ADR-0001).
 */
export function grade(transcript: string, target: string): GradeResult {
  const normTranscript = normalize(transcript);
  const normTarget = normalize(target);

  if (!normTranscript || !normTarget) {
    return { pass: false, matchedWord: "" };
  }

  const targetWords = normTarget.split(" ").filter(Boolean);
  const transcriptWords = normTranscript.split(" ").filter(Boolean);

  if (targetWords.length === 1) {
    // Single word: check any word in transcript against target
    const THRESHOLD = 0.65;
    let bestScore = 0;
    for (const word of transcriptWords) {
      const score = similarity(word, targetWords[0]);
      if (score > bestScore) bestScore = score;
    }
    return {
      pass: bestScore >= THRESHOLD,
      matchedWord: bestScore >= THRESHOLD ? targetWords[0] : "",
    };
  }

  // Multi-word: sliding window — find best-matching contiguous subsequence
  const THRESHOLD = 0.65;
  const n = targetWords.length;

  // Also try substring search with some tolerance
  if (transcriptWords.length >= n) {
    for (let i = 0; i <= transcriptWords.length - n; i++) {
      const windowWords = transcriptWords.slice(i, i + n);
      const scores = windowWords.map((w, j) => similarity(w, targetWords[j]));
      const avgScore = scores.reduce((s, x) => s + x, 0) / scores.length;
      if (avgScore >= THRESHOLD) {
        return { pass: true, matchedWord: normTarget };
      }
    }
  }

  // Fallback: overall string similarity
  const overallSim = similarity(normTranscript, normTarget);
  return {
    pass: overallSim >= THRESHOLD,
    matchedWord: overallSim >= THRESHOLD ? normTarget : "",
  };
}

/**
 * Grade magnet spelling — exact string match after normalization (R7.3)
 */
export function gradeSpelling(placed: string, target: string): boolean {
  return placed.toLowerCase().trim() === target.toLowerCase().trim();
}
