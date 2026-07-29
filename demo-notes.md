# La Casa — demo notes (the scaling narrative)

Pitch material, not build spec: what to SAY in the demo's last two minutes, answering "how does this scale?" Nothing here is built.

1. **Content is data** — stories are JSON beats generated into authored templates, gated by the validator; show a beat JSON (schema examples: content/reference-pack/beats.json — reference only, never read at runtime).
2. **Themes are data** — grocery → school supplies → beach day: new JSON + art, no code. Run the demo twice, get two different stories.
3. **Learner** — 40K kids = 40K independent JSON state blobs; hosted sync later; embarrassingly shardable.
4. **Speech** — the recognizer is the browser's own (Web Speech API) — zero infrastructure of ours per utterance.
5. **Language** — the Spanish layer (cognate table, confusion set, glosses) is a swappable data pack: Vietnamese/Tagalog/Haitian Creole = new JSON, no new code.

Closer: *"What you just saw is one warm story. What I built is the machine that makes five hundred."*

Roadmap-only ASR line: v-next collects consented utterances → child-speech encoder with phonetic decoder → capture *which* grapheme-phoneme mappings a kid misses, not just pass/fail.
