import React from "react";

/**
 * Cozy house corridor / doorway push-through.
 * Animations use transform + opacity only (parallax pan / scale through doorway).
 */
export function TransitionScene() {
  return (
    <div
      data-testid="transition-scene"
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    >
      <svg
        viewBox="0 0 1280 800"
        width="100%"
        height="100%"
        style={{ display: "block" }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="ts-warmLight" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="#FFF6D8" stopOpacity="0.95" />
            <stop offset="1" stopColor="#F2C066" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="ts-doorGlow" cx="0.5" cy="0.45" r="0.55">
            <stop offset="0" stopColor="#FFFAF0" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#FFDF9E" stopOpacity="0.45" />
            <stop offset="1" stopColor="#E8917A" stopOpacity="0" />
          </radialGradient>
        </defs>

        <style>{`
          @keyframes ts-bg-pan {
            from { transform: translateX(0) scale(1); opacity: 0.85; }
            to { transform: translateX(-24px) scale(1.06); opacity: 1; }
          }
          @keyframes ts-mid-push {
            from { transform: translateY(0) scale(1); opacity: 0.9; }
            to { transform: translateY(-12px) scale(1.18); opacity: 1; }
          }
          @keyframes ts-fore-push {
            from { transform: scale(1); opacity: 1; }
            to { transform: scale(1.45); opacity: 0.35; }
          }
          #layer-bg {
            transform-origin: 640px 400px;
            animation: ts-bg-pan 2.2s ease-out forwards;
          }
          #layer-mid {
            transform-origin: 640px 400px;
            animation: ts-mid-push 2.2s ease-out forwards;
          }
          #layer-fore {
            transform-origin: 640px 420px;
            animation: ts-fore-push 2.2s ease-in forwards;
          }
        `}</style>

        {/* LAYER: BACKGROUND — far wall + warm light */}
        <g id="layer-bg">
          <rect x="0" y="0" width="1280" height="800" fill="#FBE2D3" />
          <rect x="0" y="560" width="1280" height="240" fill="#E2AE81" />
          <path d="M0 560 H1280" stroke="#6F4B35" strokeWidth="8" fill="none" />
          {/* far door opening with warm light */}
          <rect x="520" y="180" width="240" height="380" rx="8" fill="url(#ts-warmLight)" />
          <ellipse cx="640" cy="360" rx="200" ry="220" fill="url(#ts-doorGlow)" />
          {/* ceiling beams */}
          <path d="M80 80 H1200 M200 40 H1080" stroke="#C98A54" strokeWidth="10" opacity="0.5" fill="none" />
        </g>

        {/* LAYER: MID — corridor walls + doorway frame */}
        <g id="layer-mid" stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round">
          {/* left wall perspective */}
          <path d="M0 0 L420 160 L420 620 L0 800 Z" fill="#F5D0B5" strokeWidth="6" />
          {/* right wall perspective */}
          <path d="M1280 0 L860 160 L860 620 L1280 800 Z" fill="#F0C4A8" strokeWidth="6" />
          {/* floor runner */}
          <path d="M420 620 L860 620 L1100 800 L180 800 Z" fill="#C98A54" strokeWidth="6" opacity="0.85" />
          <path d="M520 620 L760 620 L900 800 L380 800 Z" fill="#E8917A" strokeWidth="4" opacity="0.7" />
          {/* doorway frame */}
          <rect x="500" y="160" width="280" height="420" rx="10" fill="none" strokeWidth="18" />
          <rect x="530" y="190" width="220" height="370" rx="6" fill="#FFFAF0" strokeWidth="8" opacity="0.55" />
          {/* door jamb details */}
          <path d="M500 160 V580 M780 160 V580" strokeWidth="12" />
          <path d="M500 160 H780" strokeWidth="14" />
          {/* hanging light */}
          <line x1="640" y1="40" x2="640" y2="120" strokeWidth="4" />
          <ellipse cx="640" cy="150" rx="36" ry="28" fill="#FFDF9E" strokeWidth="6" />
        </g>

        {/* LAYER: FORE — near doorway / arch pushing past viewer */}
        <g id="layer-fore" stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round">
          {/* near arch sides */}
          <path d="M0 0 H280 L360 200 L360 700 L0 800 Z" fill="#AC7552" strokeWidth="8" opacity="0.95" />
          <path d="M1280 0 H1000 L920 200 L920 700 L1280 800 Z" fill="#9A6848" strokeWidth="8" opacity="0.95" />
          {/* near arch top */}
          <path d="M280 0 H1000 L920 200 H360 Z" fill="#8A5B36" strokeWidth="8" />
          {/* soft vignette edges */}
          <rect x="0" y="0" width="120" height="800" fill="#6F4B35" opacity="0.25" stroke="none" />
          <rect x="1160" y="0" width="120" height="800" fill="#6F4B35" opacity="0.25" stroke="none" />
        </g>
      </svg>
    </div>
  );
}
