
export function TitleScene() {
  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox="0 0 1280 800" width="100%" height="auto" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="doorwayGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF6D8" stopOpacity="0.95" />
            <stop offset="0.6" stopColor="#FFDF9E" stopOpacity="0.5" />
            <stop offset="1" stopColor="#FFDF9E" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lanternGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFDF9E" stopOpacity="0.6" />
            <stop offset="1" stopColor="#FFDF9E" stopOpacity="0" />
          </radialGradient>
        </defs>
        <style>{`
          @keyframes twinkle { 0%,100%{ opacity:1;} 50%{ opacity:0.25;} }
          @keyframes smokePuff { 0%{ transform:translateY(0) scale(1); opacity:.5;} 100%{ transform:translateY(-46px) scale(1.5); opacity:0;} }
        `}</style>
        <g stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* dusk sky */}
          <rect x="-10" y="-10" width="1300" height="680" fill="#3E4270" stroke="none" />
          <circle cx="1080" cy="130" r="46" fill="#FDF3E3" strokeWidth="8" />
          <circle cx="1062" cy="118" r="7" fill="#E4D9C3" stroke="none" />
          <circle cx="1096" cy="146" r="10" fill="#E4D9C3" stroke="none" />
          <g fill="#FDF3E3" stroke="none">
            <circle cx="140" cy="90" r="4" style={{ animation: 'twinkle 3s infinite' }} />
            <circle cx="300" cy="150" r="3" style={{ animation: 'twinkle 2.4s .6s infinite' }} />
            <circle cx="520" cy="70" r="4" style={{ animation: 'twinkle 2.8s .3s infinite' }} />
            <circle cx="820" cy="110" r="3" style={{ animation: 'twinkle 3.4s .9s infinite' }} />
            <circle cx="960" cy="60" r="4" style={{ animation: 'twinkle 2.6s 1.2s infinite' }} />
            <circle cx="1200" cy="240" r="3" style={{ animation: 'twinkle 3s .4s infinite' }} />
          </g>
          {/* distant hills */}
          <path d="M -10 560 q 200 -70 420 -20 q 240 50 500 -10 q 220 -46 380 20 v 140 h -1300 Z" fill="#343863" strokeWidth="7" />
          {/* street / yard */}
          <rect x="-10" y="620" width="1300" height="190" fill="#8A5B36" stroke="none" />
          <path d="M -10 622 H 1290" strokeWidth="9" />
          <path d="M 60 700 H 240 M 420 740 H 640 M 900 710 H 1120 M 700 770 H 860" strokeWidth="6" opacity="0.35" />
          {/* pebbles scattered on the yard */}
          <g strokeWidth="4.5" opacity="0.6">
            <ellipse cx="180" cy="726" rx="12" ry="7" fill="#9A8B7E" />
            <ellipse cx="212" cy="740" rx="8" ry="5" fill="#B8A896" />
            <ellipse cx="120" cy="768" rx="14" ry="8" fill="#9A8B7E" />
            <ellipse cx="316" cy="700" rx="9" ry="5.5" fill="#B8A896" />
            <ellipse cx="360" cy="764" rx="12" ry="7" fill="#9A8B7E" />
            <ellipse cx="480" cy="700" rx="8" ry="5" fill="#B8A896" />
            <ellipse cx="530" cy="766" rx="11" ry="6.5" fill="#9A8B7E" />
            <ellipse cx="736" cy="690" rx="8" ry="5" fill="#B8A896" />
            <ellipse cx="1150" cy="742" rx="13" ry="7.5" fill="#9A8B7E" />
            <ellipse cx="1190" cy="700" rx="9" ry="5.5" fill="#B8A896" />
            <ellipse cx="1104" cy="778" rx="10" ry="6" fill="#9A8B7E" />
            <ellipse cx="946" cy="676" rx="8" ry="5" fill="#B8A896" />
          </g>
          {/* night trees behind the house */}
          <g fill="#343863" strokeWidth="7">
            <path d="M 150 620 q -60 -30 -40 -90 q 14 -44 64 -40 q 10 -50 60 -44 q 44 6 44 54 q 40 16 24 62 q -14 40 -60 34 l -8 24 Z" />
            <path d="M 1130 620 q 60 -34 44 -94 q -12 -42 -60 -40 q -6 -48 -56 -44 q -46 4 -48 52 q -38 18 -22 62 q 14 38 58 32 l 8 32 Z" />
            <path d="M 96 620 v -40 M 1176 620 v -44" strokeWidth="8" fill="none" />
          </g>
          {/* birds */}
          <path d="M 360 90 q 8 -8 16 0 q 8 -8 16 0 M 430 64 q 6 -6 12 0 q 6 -6 12 0" strokeWidth="4" opacity="0.8" />
          {/* tree left of the house */}
          <g transform="translate(96 672) scale(1.45) translate(-110 -672)">
            <ellipse cx="122" cy="676" rx="78" ry="14" fill="#6F4B35" opacity="0.18" stroke="none" />
            <path d="M 96 672 q 60 18 150 26 q 60 6 96 2 q -60 16 -140 8 q -80 -8 -118 -30 Z" fill="#6F4B35" opacity="0.14" stroke="none" />
            <path d="M 96 672 q 10 -104 0 -214 q -2 -20 -14 -32 l 14 -12 q 12 10 16 26 q 4 -18 20 -28 l 12 14 q -14 10 -16 30 q -8 102 2 216 Z" fill="#8A5B36" strokeWidth="9" />
            <path d="M 108 640 q 8 -8 14 0 q -6 10 -14 0 M 104 570 q 10 -6 14 4 M 112 526 q -8 6 -14 0" strokeWidth="4" opacity="0.6" />
            <path d="M 118 660 q 6 -90 2 -184 l 10 -14 q -6 100 0 198 Z" fill="#6F4B35" opacity="0.25" stroke="none" />
            <g transform="translate(0 -104)">
              <path d="M 122 428 q 22 -4 34 12 q 12 -8 24 2 q 14 10 8 26 q 16 4 16 22 q 18 8 10 28 q 12 14 -2 28 q 4 18 -16 22 q -2 18 -22 16 q -8 16 -26 10 q -12 14 -28 6 q -16 10 -28 -4 q -18 6 -26 -10 q -20 0 -20 -20 q -16 -8 -8 -26 q -12 -14 2 -28 q -8 -18 10 -26 q 0 -18 18 -20 q 4 -16 20 -16 q 10 -14 26 -8 q 8 -12 8 -14" fill="#5E7A4E" strokeWidth="8" />
              <path d="M 84 492 q 10 -12 24 -8 q 6 -12 20 -8 M 130 540 q 12 -10 26 -4 q 8 -10 20 -8 M 88 552 q 12 -8 24 -2 M 148 480 q 10 -8 22 -4" strokeWidth="4.5" opacity="0.55" />
              <g fill="#46603A" stroke="none" opacity="0.8">
                <path d="M 112 470 q 8 -12 16 0 q -8 10 -16 0" />
                <path d="M 160 516 q 8 -12 16 0 q -8 10 -16 0" transform="rotate(40 168 516)" />
                <path d="M 96 528 q 8 -12 16 0 q -8 10 -16 0" transform="rotate(-30 104 528)" />
                <path d="M 138 566 q 8 -12 16 0 q -8 10 -16 0" transform="rotate(15 146 566)" />
                <path d="M 76 476 q 8 -12 16 0 q -8 10 -16 0" transform="rotate(-50 84 476)" />
                <path d="M 142 448 q 8 -12 16 0 q -8 10 -16 0" transform="rotate(25 150 448)" />
                <path d="M 178 486 q 8 -12 16 0 q -8 10 -16 0" transform="rotate(65 186 486)" />
                <path d="M 118 592 q 8 -12 16 0 q -8 10 -16 0" transform="rotate(-15 126 592)" />
                <path d="M 64 540 q 8 -12 16 0 q -8 10 -16 0" transform="rotate(-70 72 540)" />
                <path d="M 170 556 q 8 -12 16 0 q -8 10 -16 0" transform="rotate(50 178 556)" />
                <circle cx="98" cy="464" r="4" /><circle cx="134" cy="502" r="4.5" /><circle cx="70" cy="508" r="4" />
                <circle cx="156" cy="540" r="4" /><circle cx="108" cy="556" r="4.5" /><circle cx="182" cy="522" r="3.6" />
                <circle cx="126" cy="440" r="3.6" /><circle cx="88" cy="580" r="4" /><circle cx="152" cy="586" r="3.6" />
              </g>
            </g>
          </g>
          {/* THE HOUSE */}
          <ellipse cx="640" cy="656" rx="470" ry="26" fill="#6F4B35" opacity="0.18" stroke="none" />
          <rect x="250" y="280" width="780" height="360" rx="10" fill="#C98A54" strokeWidth="10" />
          {/* roof */}
          <path d="M 210 292 L 640 130 L 1070 292 q -430 -40 -860 0 Z" fill="#E0674A" strokeWidth="10" />
          {/* barrel tile rows */}
          <path d="M 300 262 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0" strokeWidth="5" opacity="0.55" />
          <path d="M 380 228 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0" strokeWidth="5" opacity="0.5" />
          <path d="M 470 194 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0" strokeWidth="5" opacity="0.45" />
          <path d="M 556 164 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0 q 20 -14 40 0" strokeWidth="5" opacity="0.4" />
          {/* gable vent */}
          <circle cx="640" cy="220" r="20" fill="#C98A54" strokeWidth="6" />
          <path d="M 628 212 h 24 M 626 220 h 28 M 628 228 h 24" strokeWidth="3.5" />
          {/* chimney + smoke */}
          <rect x="850" y="160" width="58" height="90" rx="8" fill="#C98A54" strokeWidth="9" />
          <path d="M 852 184 h 54 M 852 206 h 54 M 852 228 h 54" strokeWidth="4" opacity="0.5" />
          <path d="M 868 172 v 12 M 890 172 v 12 M 878 184 v 22 M 898 184 v 22 M 862 206 v 22 M 886 206 v 22 M 874 228 v 16" strokeWidth="4" opacity="0.5" />
          <rect x="840" y="146" width="78" height="18" rx="6" fill="#9A8B7E" strokeWidth="8" />
          <path d="M 856 146 v 16 M 902 146 v 16" strokeWidth="4" opacity="0.4" />
          <path d="M 866 146 v -12 q 0 -6 6 -6 h 14 q 6 0 6 6 v 12" fill="#B3402F" strokeWidth="7" />
          <g strokeWidth="5" opacity="0.7">
            <circle cx="880" cy="128" r="12" fill="#EDE3D2" style={{ animation: 'smokePuff 3.2s ease-out infinite' }} />
            <circle cx="894" cy="108" r="9" fill="#EDE3D2" style={{ animation: 'smokePuff 3.2s ease-out 1.4s infinite' }} />
          </g>
          {/* brick facade */}
          <g strokeWidth="4" opacity="0.4">
            <path d="M 255 316 H 1025 M 255 352 H 1025 M 255 388 H 1025 M 255 424 H 1025 M 255 460 H 1025 M 255 496 H 1025 M 255 532 H 1025 M 255 568 H 1025 M 255 604 H 1025" />
            <path d="M 300 285 v 31 M 620 285 v 31 M 700 285 v 31 M 1000 285 v 31" />
            <path d="M 340 316 v 36 M 420 316 v 36 M 500 316 v 36 M 580 316 v 36 M 660 316 v 36 M 740 316 v 36 M 820 316 v 36 M 900 316 v 36 M 960 316 v 36" />
            <path d="M 300 352 v 36 M 560 352 v 36 M 620 352 v 36 M 700 352 v 36 M 780 352 v 36 M 1000 352 v 36" />
            <path d="M 340 388 v 36 M 590 388 v 36 M 660 388 v 36 M 730 388 v 36 M 800 388 v 36 M 960 388 v 36" />
            <path d="M 300 424 v 36 M 560 424 v 36 M 630 424 v 36 M 700 424 v 36 M 770 424 v 36 M 1000 424 v 36" />
            <path d="M 340 460 v 36 M 420 460 v 36 M 660 460 v 36 M 900 460 v 36 M 980 460 v 36" />
            <path d="M 300 496 v 36 M 380 496 v 36 M 460 496 v 36 M 700 496 v 36 M 940 496 v 36 M 1000 496 v 36" />
            <path d="M 340 532 v 36 M 420 532 v 36 M 660 532 v 36 M 900 532 v 36 M 980 532 v 36" />
            <path d="M 300 568 v 36 M 380 568 v 36 M 460 568 v 36 M 700 568 v 36 M 940 568 v 36 M 1000 568 v 36" />
            <path d="M 340 604 v 36 M 420 604 v 36 M 660 604 v 36 M 900 604 v 36 M 980 604 v 36" />
          </g>
          {/* living room window (left, lit) */}
          <rect x="316" y="360" width="200" height="160" rx="12" fill="#FBE7A8" strokeWidth="9" />
          <g strokeWidth="5">
            <path d="M 322 366 h 44 q -16 34 -14 72 q 2 40 8 76 l -38 0 Z" fill="#9DBBA4" />
            <path d="M 510 366 h -44 q 16 34 14 72 q -2 40 -8 76 l 38 0 Z" fill="#9DBBA4" />
            <path d="M 338 382 q -6 60 2 118 M 494 382 q 6 60 -2 118" strokeWidth="3.5" opacity="0.5" />
          </g>
          <path d="M 416 360 v 160 M 316 440 h 200" strokeWidth="7" />
          <rect x="306" y="514" width="220" height="14" rx="6" fill="#C98A54" strokeWidth="8" />
          {/* potted succulent on the sill */}
          <path d="M 338 500 q 14 -5 28 0 l -4 14 q -10 4 -20 0 Z" fill="#E8917A" strokeWidth="5" />
          <path d="M 352 500 q -6 -14 0 -22 q 6 8 0 22 M 350 500 q -12 -8 -13 -18 q 11 2 13 18 M 354 500 q 12 -8 13 -18 q -11 2 -13 18" fill="#7FA05C" strokeWidth="4" />
          {/* bedroom window (right, lit) */}
          <rect x="838" y="360" width="140" height="160" rx="12" fill="#FBE7A8" strokeWidth="9" />
          <g strokeWidth="5">
            <path d="M 844 366 h 34 q -13 32 -11 68 q 2 36 6 80 l -29 0 Z" fill="#B39ECF" />
            <path d="M 972 366 h -34 q 13 32 11 68 q -2 36 -6 80 l 29 0 Z" fill="#B39ECF" />
            <path d="M 856 382 q -5 56 2 112 M 960 382 q 5 56 -2 112" strokeWidth="3.5" opacity="0.5" />
          </g>
          <path d="M 908 360 v 160 M 838 440 h 140" strokeWidth="7" />
          <rect x="828" y="514" width="160" height="14" rx="6" fill="#C98A54" strokeWidth="8" />
          {/* stone step */}
          <path d="M 576 640 h 170 q 8 0 8 10 v 10 q 0 8 -8 8 h -170 q -8 0 -8 -8 v -10 q 0 -10 8 -10" fill="#9A8B7E" strokeWidth="8" />
          {/* matching lantern, right of the door (mirrored) */}
          <g transform="matrix(-1,0,0,1,1322,0)">
            <ellipse cx="552" cy="462" rx="86" ry="80" fill="url(#lanternGlow)" stroke="none" />
            <path d="M 570 414 h -18 q -12 0 -12 12 q 0 8 8 8" strokeWidth="6" />
            <path d="M 570 414 q -6 10 -12 12" strokeWidth="4" opacity="0.6" />
            <circle cx="552" cy="430" r="3.5" fill="#6F4B35" stroke="none" />
            <path d="M 538 442 l 14 -10 l 14 10 Z" fill="#8A5B36" strokeWidth="6" />
            <path d="M 540 442 h 24 l 5 36 q -17 8 -34 0 Z" fill="#F6E3B8" strokeWidth="6.5" />
            <path d="M 546 442 l 2 40 M 558 442 l -2 40 M 539 462 h 26" strokeWidth="3.5" opacity="0.55" />
            <path d="M 552 452 q 7 8 0 16 q -7 -8 0 -16" fill="#F2C066" strokeWidth="4" />
            <path d="M 536 480 q 16 8 32 0" strokeWidth="5.5" />
            <path d="M 552 486 v 6" strokeWidth="4" />
            <circle cx="552" cy="495" r="3" fill="#6F4B35" stroke="none" />
          </g>
          {/* bougainvillea climbing the right corner */}
          <path d="M 1004 620 q 14 -120 -18 -220 q -20 -60 8 -104" stroke="#7FA05C" strokeWidth="6" fill="none" />
          <path d="M 1000 540 q -22 -10 -26 -30 M 998 430 q 20 -14 22 -36 M 990 340 q -18 -8 -22 -26" stroke="#7FA05C" strokeWidth="5" fill="none" />
          <g fill="#E8917A" strokeWidth="4">
            <circle cx="972" cy="504" r="8" /><circle cx="1022" cy="392" r="8" /><circle cx="966" cy="312" r="8" /><circle cx="996" cy="248" r="8" /><circle cx="1008" cy="452" r="7" />
          </g>
          {/* THE FRONT DOOR */}
          <g id="door-anchor">
            <path d="M 578 640 V 388 q 0 -16 16 -16 h 134 q 16 0 16 16 v 252" fill="#C98A54" strokeWidth="9" />
            <path d="M 594 640 V 398 q 0 -10 10 -10 h 114 q 10 0 10 10 v 242" fill="#5A4436" strokeWidth="6" />
            <path d="M 594 640 V 398 q 0 -10 10 -10 h 114 q 10 0 10 10 v 242" fill="#C0492F" strokeWidth="7" />
            <rect x="610" y="412" width="98" height="78" rx="8" fill="none" strokeWidth="6" />
            <rect x="610" y="508" width="98" height="102" rx="8" fill="none" strokeWidth="6" />
            <circle cx="702" cy="512" r="9" fill="#F2C066" strokeWidth="6" />
          </g>
          {/* awning: paneled canopy */}
          <path d="M 560 390 q 101 -14 202 0 l 6 12 q -107 16 -214 0 Z" fill="#6F4B35" opacity="0.18" stroke="none" />
          <g strokeWidth="0">
            <path d="M 570 344 L 606 344 L 599 376 L 556 376 Z" fill="#C0492F" stroke="none" />
            <path d="M 606 344 L 643 344 L 642 376 L 599 376 Z" fill="#E8917A" stroke="none" />
            <path d="M 643 344 L 679 344 L 684 376 L 642 376 Z" fill="#C0492F" stroke="none" />
            <path d="M 679 344 L 716 344 L 727 376 L 684 376 Z" fill="#E8917A" stroke="none" />
            <path d="M 716 344 L 752 344 L 770 376 L 727 376 Z" fill="#C0492F" stroke="none" />
          </g>
          <path d="M 556 368 h 214 l 4 8 h -222 Z" fill="#6F4B35" opacity="0.14" stroke="none" />
          <path d="M 556 376 h 36 q -1 18 -18 18 q -17 0 -18 -18" fill="#C0492F" strokeWidth="5" />
          <path d="M 592 376 h 36 q -1 18 -18 18 q -17 0 -18 -18" fill="#E8917A" strokeWidth="5" />
          <path d="M 628 376 h 36 q -1 18 -18 18 q -17 0 -18 -18" fill="#C0492F" strokeWidth="5" />
          <path d="M 664 376 h 36 q -1 18 -18 18 q -17 0 -18 -18" fill="#E8917A" strokeWidth="5" />
          <path d="M 700 376 h 36 q -1 18 -18 18 q -17 0 -18 -18" fill="#C0492F" strokeWidth="5" />
          <path d="M 736 376 h 34 q 0 18 -17 18 q -16 0 -17 -18" fill="#E8917A" strokeWidth="5" />
          <path d="M 570 344 h 182 l 18 32 h -218 Z" fill="none" strokeWidth="8" />
          {/* wall lantern beside the door */}
          <ellipse cx="552" cy="462" rx="86" ry="80" fill="url(#lanternGlow)" stroke="none" />
          <path d="M 570 414 h -18 q -12 0 -12 12 q 0 8 8 8" strokeWidth="6" />
          <path d="M 570 414 q -6 10 -12 12" strokeWidth="4" opacity="0.6" />
          <circle cx="552" cy="430" r="3.5" fill="#6F4B35" stroke="none" />
          <path d="M 538 442 l 14 -10 l 14 10 Z" fill="#8A5B36" strokeWidth="6" />
          <path d="M 540 442 h 24 l 5 36 q -17 8 -34 0 Z" fill="#F6E3B8" strokeWidth="6.5" />
          <path d="M 546 442 l 2 40 M 558 442 l -2 40 M 539 462 h 26" strokeWidth="3.5" opacity="0.55" />
          <path d="M 552 452 q 7 8 0 16 q -7 -8 0 -16" fill="#F2C066" strokeWidth="4" />
          <path d="M 536 480 q 16 8 32 0" strokeWidth="5.5" />
          <path d="M 552 486 v 6" strokeWidth="4" />
          <circle cx="552" cy="495" r="3" fill="#6F4B35" stroke="none" />
          {/* doormat */}
          <path d="M 596 668 q 66 -12 132 0 q -66 14 -132 0" fill="#F2C066" strokeWidth="7" />
          {/* flower pots by the door */}
          <path d="M 530 620 q 24 -8 48 0 l -6 34 q -18 6 -36 0 Z" fill="#C98A54" strokeWidth="8" />
          <ellipse cx="554" cy="619" rx="20" ry="6" fill="#8A5B36" strokeWidth="5" />
          <path d="M 554 618 q -14 -22 -4 -40 q 16 10 12 40 M 556 618 q 14 -18 26 -14 q -4 18 -22 18" fill="#E8917A" strokeWidth="5" />
          <path d="M 760 622 q 22 -8 44 0 l -5 30 q -17 6 -34 0 Z" fill="#9A8B7E" strokeWidth="8" />
          <ellipse cx="782" cy="621" rx="19" ry="6" fill="#8A5B36" strokeWidth="5" />
          <g strokeWidth="6">
            <path d="M 772 622 v -52 q 0 -12 10 -12 q 10 0 10 12 v 52 Z" fill="#7FA05C" />
            <path d="M 772 590 q -14 -2 -14 -16 q 0 -8 7 -8 q 7 0 7 8 Z" fill="#7FA05C" />
            <path d="M 792 598 q 14 -2 14 -20 q 0 -8 -7 -8 q -7 0 -7 8 Z" fill="#7FA05C" />
            <path d="M 782 570 v 40 M 776 586 h -8 M 788 592 h 10" strokeWidth="3" opacity="0.5" />
            <circle cx="782" cy="556" r="4.5" fill="#E8917A" strokeWidth="3.5" />
          </g>
          {/* baby's trike on the yard */}
          <g transform="rotate(-6 396 700)">
            <ellipse cx="398" cy="734" rx="66" ry="11" fill="#6F4B35" opacity="0.28" stroke="none" />
            <circle cx="368" cy="708" r="22" fill="#9DBBA4" strokeWidth="7" />
            <circle cx="368" cy="708" r="6" fill="#F2C066" strokeWidth="4.5" />
            <path d="M 368 702 v -14 M 368 714 v 14 M 362 708 h -14 M 374 708 h 14 M 364 703 l -9 -9 M 373 713 l 9 9" strokeWidth="3.5" opacity="0.7" />
            <circle cx="430" cy="714" r="14" fill="#9DBBA4" strokeWidth="7" />
            <circle cx="430" cy="714" r="4" fill="#F2C066" strokeWidth="3.5" />
            <path d="M 368 708 q 24 -26 50 -14 l 12 20" fill="none" stroke="#B3402F" strokeWidth="8" />
            <path d="M 404 690 v -12" stroke="#B3402F" strokeWidth="7" />
            <path d="M 394 676 q 10 -6 22 -2 q -2 8 -10 8 q -8 0 -12 -6" fill="#E0674A" strokeWidth="5.5" />
            <path d="M 368 708 q -4 -26 4 -38" fill="none" stroke="#B3402F" strokeWidth="7" />
            <path d="M 362 668 q 10 -6 20 2" fill="none" strokeWidth="6" />
            <circle cx="360" cy="669" r="4.5" fill="#F2C066" strokeWidth="4" />
            <path d="M 358 672 l -7 8 M 360 673 l -3 10" stroke="#E8917A" strokeWidth="3.5" />
            <path d="M 368 708 l 10 8 h 8" strokeWidth="5" />
          </g>
          {/* mailbox */}
          <g>
            <path d="M 1130 620 v -70" strokeWidth="8" />
            <path d="M 1096 550 h 68 q 18 0 18 18 v 14 h -104 v -14 q 0 -18 18 -18" fill="#E8917A" strokeWidth="8" />
            <path d="M 1104 538 v -16 l 14 8 Z" fill="#F2C066" strokeWidth="5" />
          </g>
          {/* flowering bushes hugging the facade */}
          <g strokeWidth="8">
            <path d="M 214 648 q -50 -12 -46 -58 q 4 -38 44 -42 q 6 -38 46 -36 q 38 2 44 38 q 38 8 30 50 q -8 42 -50 40 q -30 16 -68 8" fill="#5E7A4E" />
            <path d="M 1076 650 q 52 -10 48 -56 q -4 -38 -44 -42 q -6 -36 -44 -34 q -38 2 -44 36 q -36 10 -30 50 q 8 44 48 40 q 30 14 66 6" fill="#5E7A4E" />
            <g stroke="none" fill="#46603A">
              <path d="M 190 648 q -20 -8 -26 -28 q 30 22 62 24 q 44 4 74 -14 q -10 26 -42 26 q -40 8 -68 -8" opacity="0.75" />
              <path d="M 1098 650 q 22 -10 26 -30 q -30 24 -62 24 q -44 4 -72 -12 q 10 24 40 24 q 40 8 68 -6" opacity="0.75" />
            </g>
            <g strokeWidth="4.5" opacity="0.55">
              <path d="M 214 566 q 10 8 22 8 M 246 592 q 12 2 20 -6 M 190 596 q 8 8 18 8" />
              <path d="M 1052 562 q -10 8 -22 8 M 1040 596 q -12 2 -20 -6 M 1094 590 q -8 8 -18 8" />
            </g>
            <g fill="#E8917A" strokeWidth="4.5">
              <circle cx="204" cy="576" r="9" /><circle cx="252" cy="546" r="9" /><circle cx="290" cy="588" r="9" /><circle cx="232" cy="614" r="8" /><circle cx="182" cy="612" r="7" />
              <circle cx="1062" cy="580" r="9" /><circle cx="1024" cy="552" r="9" /><circle cx="1092" cy="546" r="8" /><circle cx="1046" cy="616" r="8" /><circle cx="1108" cy="608" r="7" />
            </g>
            <g fill="#F2C066" stroke="none">
              <circle cx="204" cy="576" r="3" /><circle cx="252" cy="546" r="3" /><circle cx="290" cy="588" r="3" /><circle cx="232" cy="614" r="2.6" /><circle cx="182" cy="612" r="2.4" />
              <circle cx="1062" cy="580" r="3" /><circle cx="1024" cy="552" r="3" /><circle cx="1092" cy="546" r="2.6" /><circle cx="1046" cy="616" r="2.6" /><circle cx="1108" cy="608" r="2.4" />
            </g>
          </g>
          {/* stepping stones to the door */}
          <g fill="#9A8B7E" strokeWidth="6">
            <ellipse cx="660" cy="706" rx="30" ry="12" />
            <ellipse cx="636" cy="742" rx="28" ry="11" />
            <ellipse cx="666" cy="778" rx="30" ry="12" />
          </g>
          {/* string lights */}
          <circle cx="290" cy="298" r="5" fill="#B07C4A" strokeWidth="5" />
          <circle cx="990" cy="298" r="5" fill="#B07C4A" strokeWidth="5" />
          <path d="M 290 298 Q 640 316 990 298" strokeWidth="5" />
          <g strokeWidth="4">
            <circle cx="360" cy="304" r="6" fill="#F6E3B8" style={{ animation: 'twinkle 2.2s infinite' }} />
            <circle cx="430" cy="307" r="6" fill="#F6E3B8" style={{ animation: 'twinkle 2.2s .5s infinite' }} />
            <circle cx="500" cy="309" r="6" fill="#F6E3B8" style={{ animation: 'twinkle 2.2s .9s infinite' }} />
            <circle cx="570" cy="310" r="6" fill="#F6E3B8" style={{ animation: 'twinkle 2.2s .3s infinite' }} />
            <circle cx="640" cy="311" r="6" fill="#F6E3B8" style={{ animation: 'twinkle 2.2s .7s infinite' }} />
            <circle cx="710" cy="310" r="6" fill="#F6E3B8" style={{ animation: 'twinkle 2.2s .1s infinite' }} />
            <circle cx="780" cy="309" r="6" fill="#F6E3B8" style={{ animation: 'twinkle 2.2s .6s infinite' }} />
            <circle cx="850" cy="307" r="6" fill="#F6E3B8" style={{ animation: 'twinkle 2.2s .4s infinite' }} />
            <circle cx="920" cy="304" r="6" fill="#F6E3B8" style={{ animation: 'twinkle 2.2s .8s infinite' }} />
          </g>
        </g>
      </svg>
    </div>
  )
}
