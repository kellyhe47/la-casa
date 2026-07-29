import React from "react";

export function OffRampScreen() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#2E2A4A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Baloo 2', sans-serif",
        color: "#FFFAF0",
      }}
    >
      {/* Warm illustration: dark house with lit window */}
      <svg width="280" height="200" viewBox="0 0 280 200" style={{ marginBottom: 32 }}>
        {/* Night sky */}
        <rect width="280" height="200" fill="#1a1830" rx="16" />
        {/* Stars */}
        {[[40, 30], [80, 15], [180, 25], [240, 40], [200, 10], [120, 35]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.5} fill="#FFF6D8" opacity={0.8} />
        ))}
        {/* Full moon */}
        <circle cx={230} cy={35} r={18} fill="#F2C066" opacity={0.9} />
        {/* House silhouette */}
        <rect x="60" y="110" width="160" height="80" fill="#3E4270" />
        {/* Roof */}
        <polygon points="50,110 140,55 230,110" fill="#4a3d70" />
        {/* Chimney */}
        <rect x="170" y="65" width="18" height="30" fill="#4a3d70" />
        {/* Lit window (warm glow) */}
        <rect x="100" y="125" width="50" height="40" fill="#FBE7A8" rx="4" />
        <rect x="100" y="125" width="50" height="40" fill="url(#windowGlow)" rx="4" opacity={0.6} />
        {/* Window glow radial */}
        <defs>
          <radialGradient id="windowGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFDF9E" />
            <stop offset="100%" stopColor="#FBE7A8" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Window cross */}
        <line x1="125" y1="125" x2="125" y2="165" stroke="#C98A54" strokeWidth="2" />
        <line x1="100" y1="145" x2="150" y2="145" stroke="#C98A54" strokeWidth="2" />
        {/* Door */}
        <rect x="118" y="155" width="24" height="35" fill="#B3402F" rx="2" />
        {/* Ground */}
        <ellipse cx="140" cy="195" rx="70" ry="8" fill="#1a1830" opacity={0.7} />
      </svg>

      <p style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
        La familia está durmiendo...
      </p>
      <p style={{ fontSize: 18, color: "#B39ECF", textAlign: "center" }}>
        come back soon 🌙
      </p>
    </div>
  );
}
