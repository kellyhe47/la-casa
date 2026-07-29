import React from "react";

/** Hand-drawn SVG illustrations for Abuela photo messages when /image stubs (R4.2.5). */
export function WordIllustration({ word }: { word: string }) {
  const w = word.toLowerCase();
  return (
    <svg viewBox="0 0 220 150" width="220" height="150" style={{ display: "block" }} aria-hidden>
      <rect x="4" y="4" width="212" height="142" rx="10" fill="#FDF3E3" stroke="#6F4B35" strokeWidth="6" />
      <g stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {(w === "beans" || w === "bean") && (
          <>
            <path d="M 70 128 l 8 -74 q 32 -14 64 0 l 8 74 q -40 12 -80 0" fill="#D9C9A8" strokeWidth="7" />
            <path d="M 76 66 q 34 12 68 0" strokeWidth="5" />
            <path d="M 84 42 q 26 -16 52 0 l -4 14 q -22 -10 -44 0 Z" fill="#D9C9A8" strokeWidth="6" />
            <ellipse cx="110" cy="96" rx="34" ry="22" fill="#FFFAF0" strokeWidth="5" />
            <ellipse cx="98" cy="92" rx="7" ry="5" fill="#A9613C" strokeWidth="3.5" transform="rotate(-20 98 92)" />
            <ellipse cx="114" cy="99" rx="7" ry="5" fill="#A9613C" strokeWidth="3.5" transform="rotate(15 114 99)" />
            <ellipse cx="122" cy="88" rx="7" ry="5" fill="#A9613C" strokeWidth="3.5" transform="rotate(40 122 88)" />
          </>
        )}
        {w === "fish" && (
          <>
            <ellipse cx="110" cy="78" rx="52" ry="28" fill="#9DBBA4" strokeWidth="6" />
            <path d="M 162 78 l 28 -22 v 44 Z" fill="#7FA05C" strokeWidth="5" />
            <circle cx="88" cy="72" r="5" fill="#6F4B35" stroke="none" />
            <path d="M 70 78 q -18 8 -8 20" strokeWidth="4" />
          </>
        )}
        {w === "milk" && (
          <>
            <path d="M 88 40 h 44 l 10 20 v 70 h -64 v -70 Z" fill="#FFFAF0" strokeWidth="6" />
            <rect x="92" y="28" width="36" height="16" rx="4" fill="#E8917A" strokeWidth="4" />
            <path d="M 98 70 h 24 M 98 88 h 24" strokeWidth="4" opacity="0.5" />
          </>
        )}
        {w === "shop" && (
          <>
            <rect x="60" y="55" width="100" height="70" rx="6" fill="#FBE7A8" strokeWidth="6" />
            <path d="M 50 55 h 120 l -10 -20 h -100 Z" fill="#E0674A" strokeWidth="6" />
            <rect x="95" y="85" width="30" height="40" fill="#C98A54" strokeWidth="4" />
          </>
        )}
        {!["beans", "bean", "fish", "milk", "shop"].includes(w) && (
          <>
            {/* Generic grocery bag */}
            <path d="M 70 128 l 8 -74 q 32 -14 64 0 l 8 74 q -40 12 -80 0" fill="#D9C9A8" strokeWidth="7" />
            <path d="M 84 42 q 26 -16 52 0 l -4 14 q -22 -10 -44 0 Z" fill="#D9C9A8" strokeWidth="6" />
            <circle cx="110" cy="95" r="22" fill="#F2C066" strokeWidth="5" />
          </>
        )}
      </g>
    </svg>
  );
}

export function AbuelaAvatar({ size = 52 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <svg viewBox="0 0 60 60" width={size} height={size}>
        <g stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path
            d="M 30 4 q 8 -2 11 4 q 8 -2 10 6 q 8 2 6 10 q 6 6 0 12 q 3 8 -5 11 l -44 -1 q -7 -4 -4 -11 q -6 -6 -1 -12 q -1 -9 7 -10 q 2 -8 10 -6 q 3 -5 10 -3"
            fill="#CFC3B4"
            strokeWidth="4"
          />
          <path d="M 14 34 q 0 -14 16 -14 q 16 0 16 14 q 0 15 -16 15 q -16 0 -16 -15" fill="#D7AB87" strokeWidth="4" />
          <path d="M 16 24 q 6 -6 14 -6 q -14 4 -14 6 M 44 24 q -6 -6 -14 -6 q 14 4 14 6" fill="#CFC3B4" strokeWidth="3" />
          <circle cx="22" cy="34" r="6.5" strokeWidth="3" />
          <circle cx="38" cy="34" r="6.5" strokeWidth="3" />
          <path d="M 28.5 33.5 h 3" strokeWidth="3" />
          <path d="M 19 34.5 q 3 -4 6 0 M 35 34.5 q 3 -4 6 0" strokeWidth="2.8" />
          <circle cx="14.5" cy="40" r="3" fill="#F2A9A0" stroke="none" />
          <circle cx="45.5" cy="40" r="3" fill="#F2A9A0" stroke="none" />
          <path d="M 25 42 q 5 -2 10 0 q -1 7 -5 7 q -4 0 -5 -7" fill="#8A3B2A" strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
}
