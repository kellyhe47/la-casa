#!/bin/bash
# Generate fallback-pack line audio via ElevenLabs TTS (best-effort, offline pack build step).
#
# Reads ELEVENLABS_API_KEY from .env at the repo root, walks the audio manifest
# (LaCasa/Resources/FallbackPack/audio-manifest.json), pulls each line's text from
# beats.json (Spanish text for es-MX entries, English for en-US), and writes one mp3
# per line to LaCasa/Resources/FallbackPack/audio/.
#
# Model: eleven_flash_v2_5 (fast, multilingual — handles es-MX and en-US).
#
# Voice slots -> ElevenLabs premade voice ids (chosen for family register;
# all are default premades usable on the free tier — library voices like
# Gigi/Charlotte 402 with "paid_plan_required"):
#   voice.sofia  -> cgSgspJ2msm6clMCkdW9  (Jessica — young, playful female)
#   voice.mama   -> EXAVITQu4vr4xnSDxMaL  (user-picked)
#   voice.papa   -> iP95p4xoKVk53GoZ742B  (user-picked)
#   voice.abuela -> hpp4J3VqNfWAUOO0d1Us  (user-picked)
#   voice.baby   -> pFZP5JQG7iQjIQuC4Bku  (Lily — light, small voice)
#
# Exit code 0 only if every line rendered. On any failure the manifest should stay
# status:"missing" for the failed lines (this script does not edit the manifest).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACK_DIR="$REPO_ROOT/LaCasa/Resources/FallbackPack"
AUDIO_DIR="$PACK_DIR/audio"
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found" >&2
  exit 1
fi
ELEVENLABS_API_KEY="$(grep -E '^ELEVENLABS_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [[ -z "$ELEVENLABS_API_KEY" ]]; then
  echo "error: ELEVENLABS_API_KEY not set in .env" >&2
  exit 1
fi

mkdir -p "$AUDIO_DIR"

voice_id_for_slot() {
  case "$1" in
    voice.sofia)  echo "cgSgspJ2msm6clMCkdW9" ;;
    voice.mama)   echo "EXAVITQu4vr4xnSDxMaL" ;;
    voice.papa)   echo "iP95p4xoKVk53GoZ742B" ;;
    voice.abuela) echo "hpp4J3VqNfWAUOO0d1Us" ;;
    voice.baby)   echo "pFZP5JQG7iQjIQuC4Bku" ;;
    *) echo "" ;;
  esac
}

# Emit "lineID|file|voiceSlot|lang|text" rows: text from beats.json per manifest lang.
rows="$(python3 - "$PACK_DIR" <<'PY'
import json, sys
pack = sys.argv[1]
manifest = json.load(open(f"{pack}/audio-manifest.json"))["entries"]
beats = json.load(open(f"{pack}/beats.json"))
lines = {l["id"]: l for b in beats for l in b["lines"]}
for line_id, entry in sorted(manifest.items()):
    line = lines[line_id]
    text = line["english"] if entry["lang"] == "en-US" else line["spanish"]
    print("|".join([line_id, entry["file"], entry["voiceSlotID"], entry["lang"], text]))
PY
)"

failures=0
while IFS='|' read -r line_id file slot lang text; do
  voice_id="$(voice_id_for_slot "$slot")"
  if [[ -z "$voice_id" ]]; then
    echo "FAIL $line_id: unknown voice slot $slot" >&2
    failures=$((failures + 1))
    continue
  fi
  out="$AUDIO_DIR/$file"
  body="$(python3 -c 'import json,sys; print(json.dumps({"text": sys.argv[1], "model_id": "eleven_flash_v2_5"}))' "$text")"
  http_code="$(curl -sS -o "$out" -w "%{http_code}" \
    -X POST "https://api.elevenlabs.io/v1/text-to-speech/$voice_id?output_format=mp3_44100_128" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body")" || http_code="000"
  if [[ "$http_code" == "200" ]]; then
    echo "OK   $line_id -> $out ($(wc -c < "$out" | tr -d ' ') bytes)"
  else
    echo "FAIL $line_id: HTTP $http_code $(head -c 300 "$out" 2>/dev/null)" >&2
    rm -f "$out"
    failures=$((failures + 1))
  fi
done <<< "$rows"

if [[ "$failures" -gt 0 ]]; then
  echo "$failures line(s) failed — leave those manifest entries status:\"missing\"" >&2
  exit 1
fi
echo "all lines rendered — set manifest statuses to \"available\""
