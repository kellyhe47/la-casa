/** Story bible constants — authored, never generated (§8.1) */
export const STORY_BIBLE = {
  family: {
    lastName: "García",
    characters: {
      abuela: {
        name: "Abuela",
        voiceId: "hpp4J3VqNfWAUOO0d1Us",
        lang: "es-MX",
        personality: "warm, loving grandmother; always speaks Spanish; uses 'mija' as endearment",
        neverEnglish: true,
      },
      dad: {
        name: "Papá",
        voiceId: "iP95p4xoKVk53GoZ742B",
        lang: "en-US",
        personality: "playful, punny, warm; hosts the fridge scene; dad jokes are gentle and silly",
      },
      baby: {
        name: "hermanito",
        voiceId: "pFZP5JQG7iQjIQuC4Bku",
        lang: "en-US",
        personality: "baby brother; echoes sentences in baby voice; giggles on success; confused babble on miss",
      },
      mom: {
        name: "Mamá",
        voiceId: "EXAVITQu4vr4xnSDxMaL",
        lang: "en-US",
        personality: "gentle, warm; models sentences on miss; bilingual per independence band",
      },
    },
  },
  register: "warm cozy family home; multigenerational Mexican family; literacy as love",
  artStyle: "cozy coloring book, richly lit, hand-inked warm-brown outlines",
};

/** Independence band rule sets injected into LLM prompts (§5) */
export const INDEPENDENCE_RULES: Record<string, string> = {
  "1-2": "Full parallel bilingual: every line Spanish then English. Instructions Spanish-first. Glosses auto-shown.",
  "3-4": "Bilingual Spanish-first compressed: Spanish carries meaning, English is the target phrase.",
  "5-6": "English-first, Spanish echo on the key new word only. Instructions English + Spanish subtitle.",
  "7-8": "English only. Gloss on tap.",
  "9-10": "English only. Gloss on tap, never auto.",
};

export function getIndependenceRule(band: number): string {
  if (band <= 2) return INDEPENDENCE_RULES["1-2"];
  if (band <= 4) return INDEPENDENCE_RULES["3-4"];
  if (band <= 6) return INDEPENDENCE_RULES["5-6"];
  if (band <= 8) return INDEPENDENCE_RULES["7-8"];
  return INDEPENDENCE_RULES["9-10"];
}
