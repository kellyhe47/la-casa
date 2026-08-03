
export function FridgeScene() {
  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox="0 0 1280 800" width="100%" height="auto" style={{ display: 'block' }}>
        <style>{`
          @keyframes fr-steamRise { 0%{ transform:translateY(0); opacity:0;} 25%{ opacity:.85;} 100%{ transform:translateY(-26px); opacity:0;} }
        `}</style>
        <g stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* butter-yellow kitchen wall + tile band */}
          <rect x="-10" y="-10" width="1300" height="620" fill="#F6D992" stroke="none" />
          <rect x="-10" y="470" width="1300" height="140" fill="#FBE7A8" stroke="none" />
          <path d="M -10 472 H 1290" strokeWidth="7" />
          <path d="M 120 472 v 136 M 250 472 v 136 M 380 472 v 136 M 510 472 v 136 M 1030 472 v 136 M 1160 472 v 136" strokeWidth="4" opacity="0.35" />
          <path d="M -10 540 H 560 M 990 540 H 1290" strokeWidth="4" opacity="0.35" />
          {/* floor */}
          <rect x="-10" y="600" width="1300" height="210" fill="#C98A54" stroke="none" />
          <path d="M -10 602 H 1290" strokeWidth="9" />
          <path d="M 80 680 H 300 M 480 720 H 700 M 950 680 H 1180" strokeWidth="5" opacity="0.3" />
          {/* stove, right of the fridge */}
          <g id="stove">
            <ellipse cx="1005" cy="738" rx="105" ry="16" fill="#6F4B35" opacity="0.15" stroke="none" />
            <rect x="916" y="440" width="180" height="60" rx="10" fill="#E8B96A" strokeWidth="8" />
            <circle cx="948" cy="470" r="10" fill="#6F4B35" stroke="none" />
            <circle cx="984" cy="470" r="10" fill="#6F4B35" stroke="none" />
            <circle cx="1028" cy="470" r="10" fill="#6F4B35" stroke="none" />
            <circle cx="1064" cy="470" r="10" fill="#6F4B35" stroke="none" />
            <rect x="910" y="500" width="192" height="230" rx="14" fill="#FDF3E3" strokeWidth="9" />
            <path d="M 914 526 h 184" strokeWidth="6" />
            <ellipse cx="962" cy="514" rx="30" ry="7" fill="#6F4B35" stroke="none" />
            <ellipse cx="1050" cy="514" rx="30" ry="7" fill="#6F4B35" stroke="none" />
            {/* pot on the burner */}
            <path d="M 938 470 h 48 q 6 24 -2 38 h -44 q -8 -14 -2 -38" fill="#E0674A" strokeWidth="7" />
            <path d="M 930 470 h 64" strokeWidth="6" />
            <g fill="none">
              <path d="M 948 452 q 4 -10 -2 -18" strokeWidth="6" style={{ animation: 'fr-steamRise 2.4s ease-out infinite' }} />
              <path d="M 976 452 q 4 -10 -2 -18" strokeWidth="6" style={{ animation: 'fr-steamRise 2.4s 1.2s ease-out infinite' }} />
            </g>
            <rect x="930" y="548" width="152" height="140" rx="12" fill="#FBE7A8" strokeWidth="7" />
            <rect x="950" y="572" width="112" height="80" rx="10" fill="#8A5B36" strokeWidth="6" />
            <path d="M 938 556 h 136" strokeWidth="6" />
            <path d="M 1022 556 q -4 40 8 74 l -34 0 q 10 -36 6 -74 Z" fill="#9DBBA4" strokeWidth="6" />
          </g>
          {/* kitchen doorway, right */}
          <rect x="1140" y="112" width="150" height="490" fill="#E8B96A" stroke="none" />
          <path d="M 1140 112 h 44 v 490 h -44 Z" fill="#6F4B35" opacity="0.22" stroke="none" />
          <path d="M 1184 112 h 30 v 490 h -30 Z" fill="#6F4B35" opacity="0.1" stroke="none" />
          <path d="M 1140 602 V 112 M 1140 112 H 1290" strokeWidth="10" />
          {/* hanging wooden utensils on a rail, wall right of fridge */}
          <g transform="translate(-25 62)">
            <path d="M 975 128 h 130" strokeWidth="7" />
            <circle cx="975" cy="128" r="5" fill="#C98A54" strokeWidth="4.5" />
            <circle cx="1105" cy="128" r="5" fill="#C98A54" strokeWidth="4.5" />
            {/* wooden spoon */}
            <path d="M 1000 128 v 14" strokeWidth="4" />
            <path d="M 1000 142 q -2 8 2 44 q 2 10 -2 12" fill="#C98A54" strokeWidth="5" />
            <ellipse cx="1000" cy="212" rx="11" ry="16" fill="#C98A54" strokeWidth="5.5" />
            <ellipse cx="1000" cy="212" rx="5" ry="9" fill="none" strokeWidth="3" opacity="0.5" />
            {/* molinillo (hot-chocolate whisk) */}
            <path d="M 1040 128 v 14" strokeWidth="4" />
            <path d="M 1038 142 h 4 l 2 40 h -8 Z" fill="#C98A54" strokeWidth="5" />
            <ellipse cx="1040" cy="196" rx="10" ry="13" fill="#8A5B36" strokeWidth="5.5" />
            <path d="M 1032 190 h 16 M 1032 200 h 16" strokeWidth="2.5" opacity="0.6" />
            {/* flat spatula */}
            <path d="M 1080 128 v 14" strokeWidth="4" />
            <path d="M 1078 142 h 4 l 2 34 h -8 Z" fill="#C98A54" strokeWidth="5" />
            <path d="M 1068 176 h 24 q 3 0 3 8 l -3 22 q -12 5 -24 0 l -3 -22 q 0 -8 3 -8" fill="#C98A54" strokeWidth="5.5" />
          </g>
          {/* window with papel-picado edge, left */}
          <rect x="60" y="110" width="210" height="170" rx="12" fill="#3E4270" strokeWidth="9" />
          <path d="M 165 110 v 170 M 60 195 h 210" strokeWidth="7" />
          <circle cx="120" cy="150" r="16" fill="#FDF3E3" strokeWidth="6" />
          <circle cx="230" cy="240" r="3" fill="#FDF3E3" stroke="none" />
          <circle cx="90" cy="250" r="3" fill="#FDF3E3" stroke="none" />
          <rect x="50" y="284" width="230" height="14" rx="6" fill="#C98A54" strokeWidth="7" />
          {/* molcajete plant on the sill */}
          <path d="M 130 278 q 18 -6 36 0 l -4 -16 q -14 -6 -28 0 Z" fill="#9A8B7E" strokeWidth="6" />
          <path d="M 148 262 q -4 -14 4 -22 q 8 8 4 22 M 146 262 q -12 -6 -14 -16 q 10 0 14 16" fill="#7FA05C" strokeWidth="4.5" />
          {/* THE FRIDGE, center stage */}
          <g id="fridge">
            <ellipse cx="640" cy="742" rx="300" ry="26" fill="#6F4B35" opacity="0.18" stroke="none" />
            <rect x="390" y="60" width="500" height="680" rx="26" fill="#FDF3E3" strokeWidth="11" />
            <path d="M 400 250 h 480" strokeWidth="8" />
            <rect x="404" y="120" width="22" height="100" rx="10" fill="#C98A54" strokeWidth="7" />
            <rect x="404" y="290" width="22" height="150" rx="10" fill="#C98A54" strokeWidth="7" />
            {/* freezer-door clutter */}
            <g transform="rotate(-4 585 155)">
              {/* Sofía's crayon drawing: wobbly house, sun, scribble grass */}
              <rect x="540" y="110" width="90" height="74" rx="3" fill="#FBEDD2" strokeWidth="6" />
              <path d="M 544 120 q 20 -6 40 0 t 42 0" stroke="#F6D992" strokeWidth="8" opacity="0.5" />
              <path d="M 556 148 l 15 -13 l 16 12 l -1 24 l -29 1 Z" fill="none" stroke="#E0674A" strokeWidth="3.5" />
              <path d="M 553 149 l 18 -17 l 19 16" fill="none" stroke="#B3402F" strokeWidth="3.5" />
              <rect x="566" y="158" width="8" height="13" fill="none" stroke="#F2C066" strokeWidth="3" />
              <circle cx="610" cy="130" r="7" fill="none" stroke="#F2C066" strokeWidth="3.5" />
              <path d="M 610 120 v -3 M 610 140 v 3 M 600 130 h -3 M 620 130 h 3 M 603 123 l -2 -2 M 617 137 l 2 2 M 617 123 l 2 -2 M 603 137 l -2 2" stroke="#F2C066" strokeWidth="2.5" />
              <path d="M 548 176 q 4 -7 7 0 q 4 -7 7 0 q 4 -7 7 0 M 600 176 q 4 -7 7 0 q 4 -7 7 0 q 4 -7 7 0" fill="none" stroke="#7FA05C" strokeWidth="3" />
              <circle cx="585" cy="112" r="7" fill="#E0674A" strokeWidth="4.5" />
            </g>
            <g transform="rotate(5 730 150)">
              <rect x="700" y="116" width="60" height="70" rx="8" fill="#9DBBA4" strokeWidth="6" />
              <path d="M 730 132 q 10 14 0 26 q -10 -12 0 -26" fill="#F2C066" strokeWidth="4" />
              <circle cx="730" cy="112" r="7" fill="#F2C066" strokeWidth="4.5" />
            </g>
          </g>
          {/* DAD, beside the fridge */}
          <g id="dad">
            <ellipse cx="245" cy="748" rx="110" ry="16" fill="#6F4B35" opacity="0.18" stroke="none" />
            {/* brown pants with cuffs + shoes */}
            <path d="M 190 620 h 110 l 6 100 h -42 l -12 -62 l -12 62 h -44 Z" fill="#9A7B5A" strokeWidth="8" />
            <path d="M 194 700 h 40 M 258 700 h 40" strokeWidth="5" opacity="0.5" />
            <path d="M 186 720 q 24 -8 48 0 l 2 16 q -26 6 -52 0 Z" fill="#5A4436" strokeWidth="7" />
            <path d="M 256 720 q 24 -8 48 0 l 2 16 q -26 6 -52 0 Z" fill="#5A4436" strokeWidth="7" />
            {/* green polo */}
            <path d="M 172 636 q -12 -160 73 -166 q 85 6 73 166 q -73 14 -146 0" fill="#7FA05C" strokeWidth="9" />
            <path d="M 176 616 q 69 12 138 0" strokeWidth="5" opacity="0.5" />
            {/* collar + placket + buttons */}
            <path d="M 218 474 l 27 34 l 27 -34 l 12 12 l -39 40 l -39 -40 Z" fill="#6B8A4E" strokeWidth="6" />
            <path d="M 245 512 v 52" strokeWidth="5" />
            <circle cx="252" cy="530" r="3.5" fill="#6F4B35" stroke="none" />
            <circle cx="252" cy="550" r="3.5" fill="#6F4B35" stroke="none" />
            {/* chest pocket */}
            <path d="M 196 540 h 30 v 24 h -30 Z" fill="#6B8A4E" strokeWidth="5" />
            {/* short sleeves + forearms */}
            <path d="M 200 480 q -48 12 -52 78 q 16 14 34 8 q 0 -48 18 -86 Z M 290 480 q 48 12 52 78 q -16 14 -34 8 q 0 -48 -18 -86 Z" fill="#7FA05C" strokeWidth="8" />
            <path d="M 152 566 q -10 40 4 74" fill="none" stroke="#D7AB87" strokeWidth="13" />
            <circle cx="158" cy="648" r="14" fill="#D7AB87" strokeWidth="7" />
            <path d="M 338 566 q 10 40 -4 74" fill="none" stroke="#D7AB87" strokeWidth="13" />
            <circle cx="332" cy="648" r="14" fill="#D7AB87" strokeWidth="7" />
            {/* head */}
            <circle cx="245" cy="420" r="62" fill="#D7AB87" strokeWidth="9" />
            {/* tousled dark hair */}
            <path d="M 184 412 q -6 -56 44 -64 q 8 -12 26 -8 q 34 -12 52 16 q 16 14 8 42 q -6 -12 -18 -14 q 2 -12 -10 -18 q -4 10 -16 10 q 4 -12 -6 -18 q -10 14 -30 12 q -22 -2 -30 14 q -12 8 -20 28" fill="#5A4436" strokeWidth="7" />
            {/* ears */}
            <circle cx="182" cy="424" r="11" fill="#D7AB87" strokeWidth="6" />
            <circle cx="308" cy="424" r="11" fill="#D7AB87" strokeWidth="6" />
            {/* happy face */}
            <path d="M 208 388 q 10 -7 20 -3 M 262 385 q 10 -4 20 3" strokeWidth="4.5" />
            <path d="M 212 408 q 8 -10 16 0 M 262 408 q 8 -10 16 0" strokeWidth="5" />
            <path d="M 220 440 q 11 -10 25 -4 q 14 -6 25 4 q -11 9 -25 6 q -14 3 -25 -6" fill="#5A4436" strokeWidth="4.5" />
            <path d="M 228 452 q 17 4 34 0 q -4 17 -17 17 q -13 0 -17 -17" fill="#8A3B2A" strokeWidth="4.5" />
            <path d="M 236 462 q 9 5 18 0 q -3 6 -9 6 q -6 0 -9 -6" fill="#F2A9A0" stroke="none" />
            <circle cx="194" cy="436" r="8" fill="#F2A9A0" stroke="none" />
            <circle cx="296" cy="436" r="8" fill="#F2A9A0" stroke="none" />
          </g>
        </g>
      </svg>
    </div>
  )
}
