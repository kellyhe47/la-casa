
interface LivingRoomSceneProps {
  /** Chat minimized (Aug-3 design): the phone screen carries the Abuela
   *  notification banner alone — the mic ring and glyph stand down. */
  micHidden?: boolean;
}

export function LivingRoomScene({ micHidden = false }: LivingRoomSceneProps = {}) {
  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox="0 0 1280 800" width="100%" height="auto" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="lr-wallLight" cx="0.5" cy="0.5" r="0.85">
            <stop offset="0" stopColor="#8A4A2E" stopOpacity="0" />
            <stop offset="1" stopColor="#8A4A2E" stopOpacity="0.26" />
          </radialGradient>
          <radialGradient id="lr-tvGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF0C9" stopOpacity="0.5" />
            <stop offset="1" stopColor="#FFF0C9" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lr-lampGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFDF9E" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FFDF9E" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lr-floorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8A4A2E" stopOpacity="0.16" />
            <stop offset="0.4" stopColor="#8A4A2E" stopOpacity="0.06" />
            <stop offset="1" stopColor="#8A4A2E" stopOpacity="0.2" />
          </linearGradient>
          <filter id="lr-objShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#6F4B35" floodOpacity="0.32" />
          </filter>
          <filter id="lr-blur10" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        <style>{`
          @keyframes lr-browRaise { 0%,40%,100%{ transform:translateY(0);} 50%,60%{ transform:translateY(-2.5px);} }
          @keyframes lr-talkA { 0%,20%,100%{ transform:scaleY(1);} 5%{ transform:scaleY(2.4);} 10%{ transform:scaleY(0.6);} 15%{ transform:scaleY(1.8);} }
          @keyframes lr-talkB { 0%,45%,100%{ transform:scaleY(1);} 55%{ transform:scaleY(2.2);} 65%{ transform:scaleY(0.5);} 75%{ transform:scaleY(1.9);} 85%{ transform:scaleY(0.8);} }
          @keyframes lr-plantSway { 0%,100%{ transform:rotate(-1.6deg);} 50%{ transform:rotate(1.6deg);} }
        `}</style>

        {/* LAYER 1: BACKGROUND WALL */}
        <g id="layer-bg" stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <rect x="-10" y="-10" width="1300" height="640" fill="#FBE2D3" stroke="none" />
          <rect x="-10" y="618" width="1300" height="200" fill="#E2AE81" stroke="none" />
          <path d="M -10 620 H 1290" strokeWidth="9" />
          <path d="M 120 660 H 420 M 560 690 H 900 M 1000 655 H 1250 M 60 760 H 300 M 980 755 H 1220" strokeWidth="6" opacity="0.45" />
          {/* window */}
          <rect x="82" y="88" width="240" height="270" rx="14" fill="#5B5E8C" strokeWidth="10" />
          <circle cx="150" cy="150" r="26" fill="#FDF3E3" strokeWidth="6" />
          <path d="M 82 260 q 60 -26 120 0 q 60 26 120 0 L 322 358 H 82 Z" fill="#454A6E" strokeWidth="6" />
          <path d="M 202 88 V 358 M 82 223 H 322" strokeWidth="7" />
          {/* curtains */}
          <path d="M 70 78 q 20 90 -4 290 q 44 -8 62 6 q 6 -160 -10 -296 Z" fill="#9DBBA4" strokeWidth="9" />
          <path d="M 334 78 q -20 90 4 290 q -44 -8 -62 6 q -6 -160 10 -296 Z" fill="#9DBBA4" strokeWidth="9" />
          <path d="M 52 74 H 352" strokeWidth="10" />
          <path d="M 96 150 q 8 60 0 150 M 310 150 q -8 60 0 150" strokeWidth="6" opacity="0.6" />
          {/* papel picado string */}
          <path d="M 872 0 Q 874 28 880 46 Q 1080 120 1284 78" strokeWidth="6" />
          <g strokeWidth="6">
            <path d="M 916 62 h 52 v 30 l -9 8 -8 -8 -9 8 -8 -8 -9 8 -9 -8 Z" fill="#F2C066" />
            <path d="M 1006 84 h 52 v 30 l -9 8 -8 -8 -9 8 -8 -8 -9 8 -9 -8 Z" fill="#9DBBA4" />
            <path d="M 1096 94 h 52 v 30 l -9 8 -8 -8 -9 8 -8 -8 -9 8 -9 -8 Z" fill="#E8917A" />
            <path d="M 1186 90 h 52 v 30 l -9 8 -8 -8 -9 8 -8 -8 -9 8 -9 -8 Z" fill="#B9AECF" />
            <circle cx="942" cy="74" r="4" fill="#FBE2D3" stroke="none" /><circle cx="1032" cy="96" r="4" fill="#FBE2D3" stroke="none" /><circle cx="1122" cy="106" r="4" fill="#FBE2D3" stroke="none" /><circle cx="1212" cy="102" r="4" fill="#FBE2D3" stroke="none" />
          </g>
          {/* family photos */}
          <g strokeWidth="8">
            <rect x="470" y="104" width="104" height="128" rx="8" fill="#B07C4A" />
            <rect x="486" y="120" width="72" height="96" rx="4" fill="#EFDDC3" strokeWidth="6" />
            {/* Mom & Dad */}
            <path d="M 488 216 v -6 q 0 -22 19 -22 q 19 0 19 22 v 6 Z" fill="#E8917A" strokeWidth="5" />
            <path d="M 518 216 v -4 q 0 -22 19 -22 q 19 0 19 22 v 4 Z" fill="#7FA07C" strokeWidth="5" />
            <circle cx="507" cy="172" r="13" fill="#D7AB87" strokeWidth="5" />
            <path d="M 494 170 q 0 -16 13 -16 q 13 0 13 16 q -5 3 -8 -7 q -9 9 -18 7" fill="#3E2A20" strokeWidth="4.5" />
            <circle cx="502.5" cy="174" r="2" fill="#6F4B35" stroke="none" /><circle cx="512" cy="174" r="2" fill="#6F4B35" stroke="none" />
            <circle cx="499" cy="179" r="2.4" fill="#E8917A" stroke="none" opacity="0.7" /><circle cx="515" cy="179" r="2.4" fill="#E8917A" stroke="none" opacity="0.7" />
            <path d="M 504 181 q 3.5 3.5 7 0" strokeWidth="3" />
            <circle cx="537" cy="176" r="13" fill="#AC7552" strokeWidth="5" />
            <path d="M 525 173 q 1 -13 12 -13 q 11 0 12 13" fill="#2E211A" strokeWidth="4.5" />
            <circle cx="532.5" cy="177" r="2" fill="#3E2A20" stroke="none" /><circle cx="542" cy="177" r="2" fill="#3E2A20" stroke="none" />
            <path d="M 531 185 q 6 4 12 0 q -6 -3 -12 0 Z" fill="#2E211A" strokeWidth="3" />
            <rect x="614" y="128" width="92" height="112" rx="8" fill="#B07C4A" />
            <rect x="628" y="142" width="64" height="84" rx="4" fill="#FFFAF0" strokeWidth="6" />
            {/* Desert landscape */}
            <rect x="628" y="142" width="64" height="84" fill="#F9D9A8" stroke="none" />
            <circle cx="676" cy="158" r="8" fill="#F2A48B" strokeWidth="5" />
            <path d="M 628 204 h 64 v 22 h -64 Z" fill="#D98E5F" stroke="none" />
            <path d="M 628 204 q 14 -22 30 -4 q 6 8 12 2 q 10 -12 22 2 v 24 h -64 Z" fill="#E0A96D" strokeWidth="5" />
            <path d="M 646 226 v -14 m 0 4 q -7 0 -7 -8 m 7 11 q 7 -1 7 -9" fill="none" strokeWidth="4.5" />
            <rect x="744" y="110" width="100" height="120" rx="8" fill="#B07C4A" />
            <rect x="760" y="126" width="68" height="88" rx="4" fill="#EFDDC3" strokeWidth="6" />
            {/* Baby */}
            <path d="M 776 214 v -4 q 0 -20 18 -20 q 18 0 18 20 v 4 Z" fill="#F4C95D" strokeWidth="5" />
            <circle cx="794" cy="180" r="13" fill="#E4C29F" strokeWidth="5" />
            <path d="M 794 167 q 1 -7 6 -8 q -5 -2 -9 3" fill="#3E2A20" strokeWidth="3.5" />
            <circle cx="789.5" cy="178" r="2" fill="#6F4B35" stroke="none" /><circle cx="799" cy="178" r="2" fill="#6F4B35" stroke="none" />
            <circle cx="785.5" cy="184" r="2.6" fill="#E8917A" stroke="none" /><circle cx="803" cy="184" r="2.6" fill="#E8917A" stroke="none" />
            <path d="M 790 187 q 4 4 8 0" strokeWidth="3" />
          </g>
          {/* shelf */}
          <g strokeWidth="8">
            <rect x="880" y="238" width="230" height="16" rx="6" fill="#B07C4A" />
            <rect x="906" y="164" width="42" height="74" rx="8" fill="#FDF3E3" />
            <path d="M 927 176 q 12 12 0 30 q -12 -18 0 -30" fill="#F2C066" strokeWidth="5" />
            <ellipse cx="927" cy="216" rx="12" ry="16" fill="#7FA05C" strokeWidth="5" />
            <circle cx="927" cy="212" r="6" fill="#D7AB87" strokeWidth="4" />
            <path d="M 920 224 q 7 6 14 0" strokeWidth="4" />
            <rect x="968" y="182" width="16" height="56" rx="4" fill="#9DBBA4" strokeWidth="6" />
            <rect x="986" y="172" width="16" height="66" rx="4" fill="#E8917A" strokeWidth="6" />
            <rect x="1004" y="190" width="14" height="48" rx="4" fill="#F2C066" strokeWidth="6" />
            <rect x="1034" y="186" width="52" height="52" rx="6" fill="#B07C4A" strokeWidth="6" />
            <circle cx="1060" cy="210" r="12" fill="#FFFAF0" strokeWidth="5" />
            <circle cx="1060" cy="208" r="6" fill="#D7AB87" strokeWidth="4" />
          </g>
          {/* kitchen doorway exit */}
          <path d="M 1246 620 V 210 q 0 -14 14 -14 h 30 V 620 Z" fill="#F6E3B8" strokeWidth="10" />
          <path d="M 1262 620 V 226 h 28" strokeWidth="5" opacity="0.4" />
        </g>

        {/* LAYER 2: MID FURNITURE */}
        <g id="layer-mid" filter="url(#lr-objShadow)" stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <ellipse cx="640" cy="712" rx="430" ry="86" fill="#F3C1AC" strokeWidth="9" />
          <ellipse cx="640" cy="712" rx="330" ry="60" fill="none" strokeWidth="6" opacity="0.5" strokeDasharray="2 26" />
          {/* TV stand */}
          <g transform="translate(0 32)">
            <ellipse cx="1075" cy="608" rx="150" ry="20" fill="#6F4B35" opacity="0.12" stroke="none" />
            <rect x="962" y="486" width="226" height="96" rx="12" fill="#B07C4A" strokeWidth="9" />
            <path d="M 1008 486 v 96 M 1142 486 v 96" strokeWidth="6" opacity="0.6" />
            <rect x="972" y="500" width="26" height="68" rx="6" fill="#C98A54" strokeWidth="5" />
            <circle cx="992" cy="534" r="5" fill="#F2C066" strokeWidth="4" />
            <rect x="1152" y="500" width="26" height="68" rx="6" fill="#C98A54" strokeWidth="5" />
            <circle cx="1158" cy="534" r="5" fill="#F2C066" strokeWidth="4" />
            <path d="M 1008 534 H 1142" strokeWidth="6" />
            <rect x="1018" y="500" width="9" height="30" rx="3" fill="#E8917A" strokeWidth="4" />
            <rect x="1030" y="504" width="9" height="26" rx="3" fill="#9DBBA4" strokeWidth="4" />
            <rect x="1042" y="498" width="9" height="32" rx="3" fill="#F2C066" strokeWidth="4" />
            <rect x="1054" y="506" width="9" height="24" rx="3" fill="#B9AECF" strokeWidth="4" />
            <ellipse cx="1104" cy="520" rx="24" ry="10" fill="#9DBBA4" strokeWidth="5" />
            <path d="M 1088 514 q 16 -6 32 0" strokeWidth="4" opacity="0.6" />
            <rect x="1018" y="544" width="52" height="12" rx="5" fill="#E8917A" strokeWidth="4.5" />
            <rect x="1022" y="556" width="52" height="12" rx="5" fill="#F2C066" strokeWidth="4.5" />
            <rect x="1094" y="550" width="40" height="18" rx="6" fill="#FDF3E3" strokeWidth="4.5" />
            <path d="M 1094 559 h 40" strokeWidth="3.5" opacity="0.5" />
            <rect x="974" y="582" width="20" height="14" rx="5" fill="#8A5B36" strokeWidth="6" />
            <rect x="1156" y="582" width="20" height="14" rx="5" fill="#8A5B36" strokeWidth="6" />
          </g>
          {/* TV screen */}
          <rect x="988" y="330" width="174" height="126" rx="14" fill="#5A4436" strokeWidth="10" />
          <rect x="1002" y="344" width="146" height="98" rx="8" fill="#F7E6C9" strokeWidth="6" />
          {/* telenovela leads */}
          <circle cx="1044" cy="392" r="17" fill="#D7AB87" strokeWidth="5" />
          <path d="M 1028 388 q 3 -18 16 -18 q 14 0 17 16 q -10 10 -17 -4 q -8 12 -16 6" fill="#3E2A20" strokeWidth="4" />
          <g style={{ animation: 'lr-browRaise 3.2s ease-in-out infinite' }}>
            <path d="M 1035 386 q 4 -3 8 -1 M 1049 385 q 4 -2 8 1" strokeWidth="3" />
          </g>
          <circle cx="1039" cy="392" r="1.8" fill="#6F4B35" stroke="none" />
          <circle cx="1051" cy="392" r="1.8" fill="#6F4B35" stroke="none" />
          <path d="M 1036 390 l -2 -2 M 1054 390 l 2 -2" strokeWidth="2.5" />
          <circle cx="1034" cy="398" r="2.6" fill="#E8917A" stroke="none" />
          <circle cx="1054" cy="398" r="2.6" fill="#E8917A" stroke="none" />
          <circle cx="1030" cy="396" r="1.6" fill="#F2C066" stroke="none" />
          <g style={{ animation: 'lr-talkA 2.4s linear infinite', transformOrigin: '1045px 403px' }}>
            <ellipse cx="1045" cy="403" rx="4.5" ry="3" fill="#8A3B2A" strokeWidth="3" />
          </g>
          <circle cx="1106" cy="394" r="16" fill="#AC7552" strokeWidth="5" />
          <path d="M 1092 390 q 4 -14 14 -14 q 11 0 14 12" fill="#2E211A" strokeWidth="4" />
          <path d="M 1094 384 q 6 -6 14 -5" strokeWidth="3" opacity="0.6" />
          <path d="M 1098 388 q 4 -3 7 -1 M 1110 387 q 4 -2 7 2" strokeWidth="3" />
          <circle cx="1101" cy="394" r="1.8" fill="#6F4B35" stroke="none" />
          <circle cx="1112" cy="394" r="1.8" fill="#6F4B35" stroke="none" />
          <circle cx="1097" cy="400" r="2.4" fill="#E8917A" stroke="none" />
          <circle cx="1116" cy="400" r="2.4" fill="#E8917A" stroke="none" />
          <path d="M 1120 390 q 3 2 2 5" strokeWidth="2.5" />
          <g style={{ animation: 'lr-talkB 2.4s linear infinite', transformOrigin: '1107px 404px' }}>
            <ellipse cx="1107" cy="404" rx="4" ry="2.6" fill="#8A3B2A" strokeWidth="3" />
          </g>
          <path d="M 1064 416 q 12 -10 22 0" strokeWidth="4" opacity="0.7" />
          <path d="M 1010 432 H 1140" strokeWidth="5" opacity="0.5" />
          <circle cx="1052" cy="432" r="5" fill="#E0674A" strokeWidth="4" />
          {/* COUCH */}
          <ellipse cx="612" cy="656" rx="270" ry="26" fill="#6F4B35" opacity="0.12" stroke="none" />
          <path d="M 396 620 V 420 q 0 -60 56 -60 h 320 q 56 0 56 60 v 200 Z" fill="#EF8E70" strokeWidth="10" />
          <path d="M 356 618 v -140 q 0 -40 40 -40 q 40 0 40 40 v 60 M 868 618 v -140 q 0 -40 -40 -40 q -40 0 -40 40 v 60" fill="#EF8E70" strokeWidth="10" />
          <path d="M 416 498 q 98 -30 196 0 q 98 30 196 0" strokeWidth="6" opacity="0.55" />
          <rect x="418" y="500" width="190" height="72" rx="24" fill="#F4A588" strokeWidth="8" />
          <rect x="616" y="500" width="190" height="72" rx="24" fill="#F4A588" strokeWidth="8" />
          <path d="M 380 620 H 848" strokeWidth="9" />
          <rect x="404" y="620" width="34" height="34" rx="8" fill="#B07C4A" strokeWidth="8" />
          <rect x="792" y="620" width="34" height="34" rx="8" fill="#B07C4A" strokeWidth="8" />
          {/* Abuela's crocheted blanket */}
          <path d="M 372 452 q 30 -50 96 -54 q 60 -4 74 30 q 8 44 -28 66 q 10 34 -12 62 q -30 12 -58 -4 l -60 22 q -26 -60 -12 -122 Z" fill="#F6C989" strokeWidth="9" />
          <path d="M 396 470 q 40 -28 120 -26 M 388 512 q 44 -26 116 -22 M 386 556 q 40 -22 96 -20" strokeWidth="5" strokeDasharray="1 13" opacity="0.85" />
          {/* cushions */}
          <g transform="rotate(-8 700 470)">
            <rect x="646" y="416" width="108" height="104" rx="22" fill="#9DBBA4" strokeWidth="8" />
            <circle cx="700" cy="468" r="22" fill="none" strokeWidth="5" />
            <path d="M 700 434 v 8 M 700 494 v 8 M 666 468 h 8 M 726 468 h 8 M 677 445 l 6 6 M 717 485 l 6 6 M 723 445 l -6 6 M 683 485 l -6 6" strokeWidth="5" />
          </g>
          <g transform="rotate(7 560 470)">
            <rect x="508" y="420" width="104" height="100" rx="22" fill="#F2C066" strokeWidth="8" />
            <path d="M 524 448 h 72 M 524 470 h 72 M 524 492 h 72" strokeWidth="5" />
          </g>
          {/* floor lamp */}
          <g transform="translate(-40 -28)">
            <ellipse cx="96" cy="470" rx="140" ry="120" fill="url(#lr-lampGlow)" stroke="none" />
            <ellipse cx="96" cy="666" rx="48" ry="10" fill="#6F4B35" opacity="0.12" stroke="none" />
            <path d="M 62 484 l 12 -60 h 44 l 12 60 Z" fill="#F2C066" strokeWidth="8" />
            <path d="M 76 434 l -6 44 M 96 430 v 50 M 116 434 l 6 44" strokeWidth="4" opacity="0.5" />
            <path d="M 96 488 V 650" strokeWidth="9" />
            <path d="M 62 660 q 34 -14 68 0 q -34 12 -68 0" fill="#8A5B36" strokeWidth="8" />
            <circle cx="96" cy="496" r="7" fill="#FFDF9E" strokeWidth="5" />
          </g>
          {/* plant in molcajete */}
          <ellipse cx="188" cy="652" rx="92" ry="16" fill="#6F4B35" opacity="0.12" stroke="none" />
          <g style={{ animation: 'lr-plantSway 5s ease-in-out infinite', transformOrigin: '188px 596px' }}>
            <path d="M 186 600 q -44 -36 -40 -96 q 36 24 44 84 M 190 598 q 4 -70 44 -100 q 8 56 -36 102 M 188 602 q -2 -50 2 -92" fill="#7FA05C" strokeWidth="7" />
            <path d="M 148 516 q 22 24 34 66 M 232 510 q -20 30 -38 78" strokeWidth="4.5" opacity="0.6" />
          </g>
          <path d="M 128 596 q 60 -20 120 0 l -12 44 q -48 14 -96 0 Z" fill="#9A8B7E" strokeWidth="9" />
          <path d="M 138 640 l -6 16 M 188 646 v 16 M 238 640 l 6 16" strokeWidth="8" />
          <path d="M 146 610 q 42 -12 84 0" strokeWidth="5" opacity="0.5" />
          {/* Dad's guitar */}
          <ellipse cx="318" cy="668" rx="56" ry="12" fill="#6F4B35" opacity="0.12" stroke="none" />
          <g transform="rotate(9 318 560)">
            <path d="M 318 640 q -46 0 -46 -46 q 0 -30 24 -38 q -12 -20 4 -34 q 16 -8 32 2 q 18 12 6 32 q 24 8 24 38 q 0 46 -44 46 Z" fill="#C98A54" strokeWidth="9" />
            {/* rosette around the sound hole */}
            <circle cx="318" cy="580" r="14" fill="#5A4436" strokeWidth="6" />
            <circle cx="318" cy="580" r="19" fill="none" stroke="#F2C066" strokeWidth="3" />
            <circle cx="318" cy="580" r="23" fill="none" strokeWidth="2.5" opacity="0.6" />
            {/* bridge with string pins */}
            <rect x="300" y="612" width="36" height="10" rx="4" fill="#5A4436" strokeWidth="5" />
            <circle cx="309" cy="617" r="1.6" fill="#F2C066" stroke="none" />
            <circle cx="318" cy="617" r="1.6" fill="#F2C066" stroke="none" />
            <circle cx="327" cy="617" r="1.6" fill="#F2C066" stroke="none" />
            {/* waist highlight */}
            <path d="M 284 560 q -6 24 4 44" fill="none" strokeWidth="3" opacity="0.35" />
            <path d="M 352 560 q 6 24 -4 44" fill="none" strokeWidth="3" opacity="0.35" />
            <rect x="311" y="430" width="14" height="94" rx="6" fill="#8A5B36" strokeWidth="7" />
            <rect x="304" y="414" width="28" height="22" rx="6" fill="#5A4436" strokeWidth="7" />
            {/* tuning pegs */}
            <circle cx="300" cy="420" r="3.5" fill="#F2C066" strokeWidth="3" />
            <circle cx="300" cy="430" r="3.5" fill="#F2C066" strokeWidth="3" />
            <circle cx="336" cy="420" r="3.5" fill="#F2C066" strokeWidth="3" />
            <circle cx="336" cy="430" r="3.5" fill="#F2C066" strokeWidth="3" />
            {/* strings down to the bridge */}
            <path d="M 314 452 v 160 M 318 452 v 160 M 322 452 v 160" strokeWidth="2" opacity="0.8" />
            {/* frets */}
            <path d="M 311 466 h 14 M 311 482 h 14 M 311 500 h 14" strokeWidth="2.5" opacity="0.6" />
          </g>
        </g>

        {/* LAYER 3: FOREGROUND PROPS */}
        <g id="layer-fore" filter="url(#lr-objShadow)" stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <g transform="rotate(-14 452 664)">
            <circle cx="452" cy="656" r="18" fill="#E8917A" strokeWidth="7" />
            <path d="M 452 674 l -6 22 h 12 Z" fill="#F2C066" strokeWidth="6" />
            <path d="M 440 650 a 12 12 0 0 1 24 0" fill="#FDF3E3" strokeWidth="5" />
          </g>
          <rect x="486" y="646" width="34" height="34" rx="7" fill="#9DBBA4" strokeWidth="7" transform="rotate(9 503 663)" />
          <text x="503" y="672" textAnchor="middle" fontFamily="'Baloo 2'" fontWeight="800" fontSize="22" fill="#6F4B35" stroke="none" transform="rotate(9 503 663)">a</text>
          {/* Abuela's chanclas */}
          <g transform="rotate(-6 940 742)">
            {/* left chancla: flat foam sole + Y-thong strap */}
            <ellipse cx="922" cy="740" rx="20" ry="34" fill="#C98A54" strokeWidth="7" />
            <ellipse cx="922" cy="740" rx="14" ry="27" fill="none" strokeWidth="3.5" opacity="0.4" />
            <path d="M 908 734 q 14 -12 28 0" fill="none" stroke="#B3402F" strokeWidth="6" />
            <path d="M 922 712 v 20" stroke="#B3402F" strokeWidth="6" />
            <circle cx="922" cy="712" r="3" fill="#B3402F" strokeWidth="3" />
            {/* right chancla */}
            <g transform="rotate(14 964 746)">
              <ellipse cx="964" cy="746" rx="20" ry="34" fill="#C98A54" strokeWidth="7" />
              <ellipse cx="964" cy="746" rx="14" ry="27" fill="none" strokeWidth="3.5" opacity="0.4" />
              <path d="M 950 740 q 14 -12 28 0" fill="none" stroke="#B3402F" strokeWidth="6" />
              <path d="M 964 718 v 20" stroke="#B3402F" strokeWidth="6" />
              <circle cx="964" cy="718" r="3" fill="#B3402F" strokeWidth="3" />
            </g>
          </g>
          {/* coffee table */}
          <ellipse cx="326" cy="768" rx="130" ry="18" fill="#6F4B35" opacity="0.12" stroke="none" />
          <g strokeWidth="7">
            <path d="M 250 714 q -12 16 -8 28 q 3 8 -4 14 l -6 14 h 22 l -2 -14 q -6 -6 -2 -14 q 4 -14 0 -28 Z" fill="#8A5B36" />
            <path d="M 402 714 q 12 16 8 28 q -3 8 4 14 l 6 14 h -22 l 2 -14 q 6 -6 2 -14 q -4 -14 0 -28 Z" fill="#8A5B36" />
            <path d="M 316 738 q -4 14 0 24 q 3 8 -3 14 l -4 10 h 22 l -4 -10 q -6 -6 -3 -14 q 4 -10 0 -24 Z" fill="#8A5B36" />
          </g>
          <ellipse cx="326" cy="710" rx="120" ry="34" fill="#B07C4A" strokeWidth="9" />
          <ellipse cx="326" cy="710" rx="92" ry="22" fill="none" strokeWidth="5" opacity="0.4" />
          {/* cafecito */}
          <g>
            <ellipse cx="272" cy="694" rx="20" ry="8" fill="#FDF3E3" strokeWidth="6" />
            <path d="M 252 694 q 0 22 20 22 q 20 0 20 -22" fill="#FDF3E3" strokeWidth="6" />
            <path d="M 292 696 q 12 2 6 12 q -4 6 -10 2" strokeWidth="5" />
            <ellipse cx="272" cy="695" rx="12" ry="4" fill="#8A5B36" strokeWidth="4" />
          </g>
          {/* loteria cards */}
          <g transform="rotate(-8 352 700)">
            <rect x="330" y="682" width="42" height="34" rx="5" fill="#FFFAF0" strokeWidth="6" />
            <circle cx="351" cy="696" r="9" fill="#F2C066" strokeWidth="4" />
            <path d="M 351 683 v 4 M 351 705 v 4 M 340 696 h -4 M 366 696 h -4" strokeWidth="3.5" />
          </g>
          <g transform="rotate(6 392 706)">
            <rect x="372" y="690" width="42" height="34" rx="5" fill="#FFFAF0" strokeWidth="6" />
            <path d="M 384 712 q 8 -18 12 -6 q 4 -12 10 6" fill="#9DBBA4" strokeWidth="4" />
            <circle cx="404" cy="700" r="4" fill="#FDF3E3" strokeWidth="3.5" />
          </g>
        </g>

        {/* LAYER 4: SOFÍA'S HANDS + PHONE — screen stays flat cream (no vignette); mic is React overlay */}
        <g id="layer-hands" stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <g transform="rotate(-4 640 700)">
            <path d="M 468 812 q -4 -52 34 -74 l 70 34 q -18 44 -12 52 Z" fill="#B3402F" strokeWidth="10" />
            {/* sweater cuff knit lines */}
            <path d="M 497 760 q 26 -18 58 -5 M 487 776 q 28 -20 64 -4" strokeWidth="4" opacity="0.45" />
            <rect x="512" y="486" width="258" height="330" rx="30" fill="#5A4436" strokeWidth="10" />
            {/* Flat white screen — no shading overlays */}
            <rect x="526" y="500" width="230" height="302" rx="20" fill="#FFFAF0" strokeWidth="7" />
            {/* Mic ring drawn under React button for visual continuity */}
            {!micHidden && (
              <g data-testid="scene-mic-art">
                <circle cx="641" cy="680" r="78" fill="#E0674A" strokeWidth="10" />
                <rect x="623" y="632" width="36" height="60" rx="18" fill="#FFFAF0" strokeWidth="3" />
                <path d="M 605 676 q 0 40 36 40 q 36 0 36 -40 M 641 716 v 22 M 618 738 h 46" strokeWidth="14" stroke="#6F4B35" />
                <path d="M 605 676 q 0 40 36 40 q 36 0 36 -40 M 641 716 v 22 M 618 738 h 46" strokeWidth="8" stroke="#FFFAF0" />
              </g>
            )}
            <path d="M 774 812 q 10 -60 -18 -84 q -30 -12 -42 16 q -8 34 14 68 Z" fill="#D7AB87" strokeWidth="10" />
            <path d="M 742 742 q -18 -4 -20 18 q 0 20 22 26" fill="#D7AB87" strokeWidth="8" />
            <path d="M 512 640 q -26 -4 -26 20 q 2 20 28 18 M 512 692 q -30 -4 -28 20 q 2 20 30 16 M 514 742 q -28 -2 -26 20 q 4 18 28 14" fill="#D7AB87" strokeWidth="9" />
            <path d="M 500 812 q -6 -46 14 -60 l 40 20 q -10 24 -8 40 Z" fill="#D7AB87" strokeWidth="9" />
          </g>
        </g>
      </svg>
    </div>
  )
}
