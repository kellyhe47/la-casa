export type NodeType = "grapheme" | "sight" | "vocab";

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  prereqs: string[];
  confusion: boolean;
  mastery: number;
  peakMastery: number;
  lastSeen: number | null;
  attempts: Array<{ timestamp: number; result: 0 | 1 }>;
}

export interface GraphState {
  nodes: GraphNode[];
  independence: number;
}
