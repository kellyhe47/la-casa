/** Beat JSON schema for LLM structured output (§8.1) */
export interface AbuelaBeat {
  type: "abuela";
  targetWord: string;
  targetNodeIds: string[];
  imagePrompt: string;
  abualaVoiceNote: string; // Spanish
  abualaDelightedReply: string; // Spanish
  abuelaGracePhrase: string; // English: "Ahh — dice {word}, mija"
  abualaGoodbyePhrase: string; // Spanish: "¡Te quiero, mija!"
}

export interface FridgeBeat {
  type: "fridge";
  targetWord: string;
  targetNodeIds: string[];
  dadPrompt: string; // English spoken only — no displayed text (R4.4.1)
  dadNextPrompt: string;
  dadGoodnightLine: string; // "Uy... ¡a dormir, mija!"
  distractorLetters: string[]; // including the confusable
}

export interface BedroomBeat {
  type: "bedroom";
  sentences: BedroomSentence[];
}

export interface BedroomSentence {
  text: string;
  targetNodeIds: string[];
  momModelPhrase: string; // bilingual per independence
  momGracePhrase: string; // "Léelo conmigo: ..."
}

export type Beat = AbuelaBeat | FridgeBeat | BedroomBeat;

/** Template prompts for LLM (slots filled from graph + independence) */
export const BEAT_TEMPLATES = {
  abuela: (targetWord: string, independenceRule: string, sessionWords: string[]) => `
You are generating content for La Casa, a reading game for Spanish-speaking 7-year-olds.
Family: García family. Character: Abuela — warm grandmother who ONLY speaks Spanish.
Independence rule: ${independenceRule}
Target word (English): "${targetWord}"
Session vocabulary so far: ${sessionWords.join(", ")}

Generate a JSON beat for Abuela's picture message loop:
{
  "type": "abuela",
  "targetWord": "${targetWord}",
  "targetNodeIds": [], // fill with the relevant skill node IDs for "${targetWord}"
  "imagePrompt": "hyper-realistic cartoon of ${targetWord}, warm, on a kitchen table",
  "abualaVoiceNote": "Mija, ¿qué dice aquí?", // Spanish voice note Abuela sends
  "abualaDelightedReply": "...", // Spanish delighted reply after Sofia answers
  "abuelaGracePhrase": "Ahh — dice '${targetWord}', mija. ¡Muy bien!", // After 2 misses, give it warmly
  "abualaGoodbyePhrase": "¡Te quiero mucho, mija! ¡Hasta luego!" // Goodbye exchange
}
Respond with ONLY the JSON object. No markdown fences. Warmth and humor are welcome.`,

  fridge: (targetWord: string, independenceRule: string, sessionMissWords: string[]) => `
You are generating content for La Casa, a reading game for Spanish-speaking 7-year-olds.
Character: Papá (Dad) — warm, playful, dad jokes OK. He hosts the fridge spelling loop.
The child HEARS the target word and spells it with letter magnets. NEVER show the target word in Dad's text.
Independence rule: ${independenceRule}
Target word: "${targetWord}"
Words missed earlier this session: ${sessionMissWords.join(", ")}

Generate a JSON beat for the fridge magnet loop:
{
  "type": "fridge",
  "targetWord": "${targetWord}",
  "targetNodeIds": [],
  "dadPrompt": "...", // Dad's spoken prompt (English); creative, warm, does NOT say the letters
  "dadNextPrompt": "...", // Dad's prompt for the NEXT word after this one sticks
  "dadGoodnightLine": "Uy... ¡a dormir, mija! One more note for the road... just kidding. Buenas noches!",
  "distractorLetters": [] // Array of single letters including needed letters + 4 distractors + the confusable
}
Respond with ONLY the JSON object.`,

  bedroom: (frontierWord: string, sessionWords: string[], independenceRule: string) => `
You are generating content for La Casa bedtime story loop.
Independence rule: ${independenceRule}
This session the child practiced: ${sessionWords.join(", ")}
Frontier target word: "${frontierWord}"
Generate 3 short English sentences for the bedtime book (3-7 words each).
Every sentence must use ONLY: mastered words from this session (${sessionWords.join(", ")}) 
plus "${frontierWord}" as the new target word.
Make the story feel like a sweet summary of today's adventures ("The beans were in the soup!").

{
  "type": "bedroom",
  "sentences": [
    {
      "text": "...", // 3-7 English words
      "targetNodeIds": [],
      "momModelPhrase": "The... beans... are... in... the... soup.", // slow, clear modeling
      "momGracePhrase": "Léelo conmigo: The beans are in the soup."
    }
  ]
}
Respond with ONLY the JSON object.`,
};
