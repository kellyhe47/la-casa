import React from "react";
import type { SkillGraph } from "../graph/SkillGraph";

interface LastGrade {
  word: string;
  result: 0 | 1;
  nodeId: string;
  delta: number;
}

interface DebugOverlayProps {
  open: boolean;
  graph: SkillGraph;
  seed: string;
  lastGrade: LastGrade | null;
}

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  g_a: { x: 30, y: 20 }, g_i: { x: 80, y: 20 }, g_eou: { x: 130, y: 20 },
  g_cvc: { x: 80, y: 65 },
  g_sh: { x: 20, y: 110 }, g_ch: { x: 20, y: 155 },
  g_th: { x: 60, y: 110 },
  g_vb: { x: 100, y: 110 },
  g_z: { x: 130, y: 110 },
  g_scl: { x: 155, y: 110 },
  g_ae: { x: 175, y: 65 },
  g_ee: { x: 80, y: 110 },
  s_the: { x: 30, y: 210 }, s_said: { x: 65, y: 210 }, s_was: { x: 100, y: 210 },
  s_come: { x: 130, y: 210 }, s_of: { x: 155, y: 210 }, s_to: { x: 175, y: 210 },
  v_family: { x: 20, y: 255 }, v_restaurant: { x: 65, y: 255 }, v_fruit: { x: 105, y: 255 },
  v_chocolate: { x: 140, y: 255 }, v_soup: { x: 175, y: 255 },
  v_groc1: { x: 60, y: 155 }, v_groc2: { x: 105, y: 155 },
};

export function DebugOverlay({ open, graph, seed, lastGrade }: DebugOverlayProps) {
  if (!open) return null;

  const frontier = graph.frontier();
  const frontierIds = new Set(frontier.map((n) => n.id));

  return (
    <div
      data-testid="debug-overlay"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <div
        data-testid="debug-panel"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "33%",
          height: "100%",
          background: "rgba(20, 15, 35, 0.88)",
          backdropFilter: "blur(4px)",
          borderLeft: "2px solid rgba(255,250,240,0.15)",
          color: "#FFFAF0",
          fontFamily: "monospace",
          fontSize: 11,
          padding: 12,
          overflowY: "auto",
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: 13, color: "#F2C066" }}>🎮 La Casa Debug</div>

        <div>
          <span style={{ color: "#9DBBA4" }}>seed:</span> {seed}
        </div>
        <div>
          <span style={{ color: "#9DBBA4" }}>band:</span>{" "}
          <span style={{ color: "#E0674A", fontWeight: "bold" }}>
            {graph.independence()}
          </span>
          {" "}/ 10
        </div>

        {lastGrade && (
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 8px" }}>
            <span style={{ color: "#F2C066" }}>last grade:</span>{" "}
            <span style={{ color: lastGrade.result === 1 ? "#9DBBA4" : "#E8917A" }}>
              "{lastGrade.word}" → {lastGrade.result === 1 ? "pass" : "miss"}
            </span>{" "}
            → <span style={{ color: "#B39ECF" }}>{lastGrade.nodeId}</span>{" "}
            <span style={{ color: "#F2C066" }}>
              {lastGrade.result === 1 ? "+" : "-"}{Math.abs(lastGrade.delta).toFixed(2)}
            </span>
          </div>
        )}

        {/* Skill graph visualization */}
        <div style={{ marginTop: 4 }}>
          <div style={{ color: "#9DBBA4", marginBottom: 4 }}>skill graph</div>
          <svg
            width="200"
            height="290"
            style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8 }}
          >
            {graph.nodes.map((node) => {
              const pos = NODE_POSITIONS[node.id] || { x: 90, y: 130 };
              const isInFrontier = frontierIds.has(node.id);
              const isLocked = node.prereqs.some((p) => {
                const pNode = graph.getNode(p);
                return !pNode || pNode.mastery < 0.8;
              });
              const isMastered = node.mastery >= 0.8;
              const r = 9;
              const fill = isMastered
                ? "#9DBBA4"
                : isLocked
                ? "rgba(100,80,60,0.3)"
                : `rgba(224,103,74,${0.2 + node.mastery * 0.8})`;
              const stroke = isInFrontier ? "#F2C066" : isMastered ? "#7FA05C" : "#6F4B35";
              const strokeWidth = isInFrontier ? 2 : 1;

              return (
                <g key={node.id}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    style={{ transition: "fill 0.3s, stroke 0.3s" }}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fontSize="6"
                    fill={isLocked ? "#6F4B35" : "#FFFAF0"}
                    style={{ userSelect: "none" }}
                  >
                    {node.id.replace("g_", "").replace("s_", "").replace("v_", "").slice(0, 4)}
                  </text>
                </g>
              );
            })}
          </svg>
          <div style={{ fontSize: 9, color: "#9A7B5A", marginTop: 4 }}>
            🟢 mastered · 🟠 frontier · ⬛ locked
          </div>
        </div>

        {/* Node list */}
        <div style={{ fontSize: 10, overflowY: "auto", maxHeight: 200 }}>
          {graph.nodes.map((n) => (
            <div key={n.id} style={{ display: "flex", gap: 4, padding: "1px 0" }}>
              <span style={{ width: 60, color: "#B39ECF", flexShrink: 0 }} title={n.id}>{n.label.slice(0, 12)}</span>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 2, height: 8, alignSelf: "center" }}>
                <div style={{ width: `${n.mastery * 100}%`, height: "100%", background: n.mastery >= 0.8 ? "#9DBBA4" : "#E0674A", borderRadius: 2, transition: "width 0.3s" }} />
              </div>
              <span style={{ color: n.mastery >= 0.8 ? "#9DBBA4" : "#E8917A", width: 32, textAlign: "right", flexShrink: 0 }}>
                {n.mastery.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
