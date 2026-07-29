/**
 * Warm intro loop — plays from the ¡Jugar! tap (user gesture, so autoplay is
 * allowed) until Abuela's first voice note, then fades out.
 * Asset: public/audio/intro.wav (generated pluck arpeggio, seamless loop).
 */
let audio: HTMLAudioElement | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;

// Soft background level — should sit well under Abuela's voice
const VOLUME = 0.14;

let stopped = false;

export function startIntroSound(): void {
  if (audio || stopped) return;
  try {
    audio = new Audio("/audio/intro.wav");
    audio.loop = true;
    audio.volume = VOLUME;
    // play() can throw synchronously (jsdom) or reject (autoplay refused) —
    // intro music is decorative either way
    const p = audio.play();
    p?.catch?.(() => {
      // Autoplay blocked before any user gesture — retry on the first
      // interaction anywhere in the app
      audio = null;
      const retry = () => {
        removeListeners();
        startIntroSound();
      };
      const removeListeners = () => {
        window.removeEventListener("pointerdown", retry);
        window.removeEventListener("keydown", retry);
      };
      window.addEventListener("pointerdown", retry, { once: true });
      window.addEventListener("keydown", retry, { once: true });
    });
  } catch {
    audio = null;
  }
}

export function stopIntroSound(fadeMs = 1000): void {
  stopped = true; // a pending first-interaction retry must not restart it
  const a = audio;
  if (!a) return;
  audio = null;
  if (fadeTimer) clearInterval(fadeTimer);
  const stepMs = 50;
  const step = a.volume / Math.max(1, fadeMs / stepMs);
  fadeTimer = setInterval(() => {
    if (a.volume > step) {
      a.volume = Math.max(0, a.volume - step);
    } else {
      if (fadeTimer) clearInterval(fadeTimer);
      fadeTimer = null;
      a.pause();
      a.src = "";
    }
  }, stepMs);
}
