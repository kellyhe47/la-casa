/**
 * Per-word → node mappings (AC7).
 * Each word maps to the graph nodes it exercises.
 * A pass on a word credits ALL nodes; a miss debits only the frontier target.
 */
export const WORD_NODES: Record<string, string[]> = {
  // Grocery set I (v_groc1)
  milk: ["g_cvc", "v_groc1"],
  bread: ["g_cvc", "v_groc1"],
  eggs: ["g_cvc", "v_groc1"],

  // Grocery set II (v_groc2)
  beans: ["g_ee", "g_cvc", "v_groc2"],
  rice: ["g_ae", "g_cvc", "v_groc2"],
  apples: ["g_cvc", "v_groc2"],

  // sh- words
  fish: ["g_sh", "g_i", "g_cvc"],
  shop: ["g_sh", "g_cvc"],
  ship: ["g_sh", "g_i", "g_cvc"],
  she: ["g_sh"],
  wish: ["g_sh", "g_i", "g_cvc"],

  // ch- words
  cheese: ["g_ch", "g_ee"],
  chicken: ["g_ch", "g_cvc"],
  chips: ["g_ch", "g_cvc"],

  // th- words
  the: ["s_the"],
  this: ["g_th", "g_cvc"],
  that: ["g_th", "g_cvc"],
  think: ["g_th"],
  with: ["g_th", "g_cvc"],

  // v vs b confusion
  van: ["g_vb", "g_cvc"],
  bat: ["g_vb", "g_cvc"],
  vine: ["g_vb"],
  very: ["g_vb"],

  // z words
  zoo: ["g_z", "g_cvc"],
  zip: ["g_z", "g_cvc"],
  buzz: ["g_z", "g_cvc"],

  // s-clusters
  stop: ["g_scl", "g_cvc"],
  spin: ["g_scl", "g_cvc"],
  snack: ["g_scl", "g_cvc"],
  swim: ["g_scl", "g_cvc"],

  // sight words
  said: ["s_said"],
  was: ["s_was"],
  come: ["s_come"],
  of: ["s_of"],
  to: ["s_to"],

  // vocab cognates
  family: ["v_family"],
  soup: ["v_soup"],
  chocolate: ["v_chocolate"],
  restaurant: ["v_restaurant"],
  fruit: ["v_fruit"],
};

/**
 * Get node IDs for a word. Falls back to empty array if unknown.
 */
export function getNodesForWord(word: string): string[] {
  return WORD_NODES[word.toLowerCase().trim()] ?? [];
}
