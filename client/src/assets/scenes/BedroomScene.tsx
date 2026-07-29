
export function BedroomScene() {
  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox="0 0 1280 800" width="100%" height="auto" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="bd-lampGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFD873" stopOpacity="0.75" />
            <stop offset="0.55" stopColor="#F2C066" stopOpacity="0.35" />
            <stop offset="1" stopColor="#F2C066" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bd-wallDim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4A4468" stopOpacity="0.35" />
            <stop offset="1" stopColor="#4A4468" stopOpacity="0" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes bd-mobileSway { 0%,100%{ transform:rotate(-6deg);} 50%{ transform:rotate(6deg);} }
          @keyframes bd-starTwinkle { 0%,100%{ opacity:1;} 50%{ opacity:0.3;} }
          @keyframes bd-babyChew { 0%,100%{ transform:rotate(0deg);} 50%{ transform:rotate(4deg);} }
        `}</style>
        <g stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* BG: lavender wall, dim */}
          <rect x="-10" y="-10" width="1300" height="580" fill="#B9AECF" stroke="none" />
          <rect x="-10" y="-10" width="1300" height="580" fill="url(#bd-wallDim)" stroke="none" />
          {/* wainscoting */}
          <rect x="-10" y="440" width="1300" height="130" fill="#C6BCDC" stroke="none" />
          <path d="M -10 442 H 1290" strokeWidth="7" />
          <path d="M -10 462 H 1290" strokeWidth="4" opacity="0.35" />
          <g strokeWidth="5" opacity="0.55">
            <rect x="40" y="480" width="150" height="66" rx="8" />
            <rect x="240" y="480" width="150" height="66" rx="8" />
            <rect x="440" y="480" width="150" height="66" rx="8" />
            <rect x="640" y="480" width="150" height="66" rx="8" />
            <rect x="840" y="480" width="150" height="66" rx="8" />
            <rect x="1040" y="480" width="150" height="66" rx="8" />
          </g>
          {/* wooden floor */}
          <rect x="-10" y="570" width="1300" height="240" fill="#C98A54" stroke="none" />
          <path d="M -10 572 H 1290" strokeWidth="9" />
          <path d="M 40 640 H 260 M 420 610 H 620 M 900 640 H 1140 M 200 760 H 420 M 700 720 H 920 M 1040 770 H 1240" strokeWidth="5" opacity="0.3" />
          {/* night window */}
          <rect x="80" y="90" width="230" height="200" rx="14" fill="#3E4270" strokeWidth="9" />
          <path d="M 195 90 v 200 M 80 190 h 230" strokeWidth="7" />
          <circle cx="150" cy="140" r="22" fill="#FDF3E3" strokeWidth="7" />
          <circle cx="142" cy="134" r="4" fill="#E4D9C3" stroke="none" />
          <g fill="#FDF3E3" stroke="none">
            <circle cx="250" cy="120" r="3.5" style={{ animation: 'bd-starTwinkle 2.6s infinite' }} />
            <circle cx="270" cy="230" r="3" style={{ animation: 'bd-starTwinkle 3.2s .6s infinite' }} />
            <circle cx="115" cy="240" r="3.5" style={{ animation: 'bd-starTwinkle 2.8s .3s infinite' }} />
            <circle cx="225" cy="160" r="2.6" style={{ animation: 'bd-starTwinkle 3s .9s infinite' }} />
          </g>
          {/* curtains */}
          <path d="M 78 96 q 16 66 -3 208 q 32 -6 45 4 q 4 -116 -7 -212 Z" fill="#8E86AC" strokeWidth="9" />
          <path d="M 312 96 q -16 66 3 208 q -32 -6 -45 4 q -4 -116 7 -212 Z" fill="#8E86AC" strokeWidth="9" />
          <path d="M 64 92 H 326" strokeWidth="10" />
          <path d="M 97 148 q 6 44 0 108 M 293 148 q -6 44 0 108" strokeWidth="6" opacity="0.6" />
          {/* wall art: crescent + clouds */}
          <path d="M 478 116 a 48 48 0 1 0 24 90 a 52 52 0 1 1 -24 -90 Z" fill="#F2C066" strokeWidth="7" transform="rotate(24 478 160)" />
          <path d="M 560 214 q -2 -16 16 -18 q 4 -14 22 -12 q 16 2 18 16 q 16 0 14 16 q -2 12 -16 12 l -40 0 q -14 -2 -14 -14" fill="#FDF3E3" strokeWidth="6" />
          {/* string of stars over the crib */}
          <circle cx="760" cy="108" r="6" fill="#8A5B36" strokeWidth="5" />
          <circle cx="1020" cy="108" r="6" fill="#8A5B36" strokeWidth="5" />
          <path d="M 760 110 Q 890 150 1020 110" strokeWidth="5" />
          <path d="M 772 116 q 6 -6 10 2 M 838 130 q 6 -6 10 2 M 906 136 q 6 -6 10 2 M 972 126 q 6 -6 10 2" strokeWidth="3.5" opacity="0.5" />
          <path d="M 800 122 v 8 M 860 134 v 8 M 920 138 v 8 M 980 128 v 8" strokeWidth="4" />
          <circle cx="800" cy="122" r="3.5" fill="#8A5B36" stroke="none" />
          <circle cx="860" cy="134" r="3.5" fill="#8A5B36" stroke="none" />
          <circle cx="920" cy="138" r="3.5" fill="#8A5B36" stroke="none" />
          <circle cx="980" cy="128" r="3.5" fill="#8A5B36" stroke="none" />
          <g strokeWidth="4.5">
            <path d="M 796 124 l 6 12 l 13 2 l -9 9 l 2 13 l -12 -6 l -12 6 l 2 -13 l -9 -9 l 13 -2 Z" fill="#F2C066" />
            <path d="M 856 138 l 6 12 l 13 2 l -9 9 l 2 13 l -12 -6 l -12 6 l 2 -13 l -9 -9 l 13 -2 Z" fill="#E8917A" />
            <path d="M 916 142 l 6 12 l 13 2 l -9 9 l 2 13 l -12 -6 l -12 6 l 2 -13 l -9 -9 l 13 -2 Z" fill="#F2C066" />
            <path d="M 976 132 l 6 12 l 13 2 l -9 9 l 2 13 l -12 -6 l -12 6 l 2 -13 l -9 -9 l 13 -2 Z" fill="#9DBBA4" />
          </g>
          {/* shelf with family clutter */}
          <rect x="440" y="300" width="300" height="14" rx="6" fill="#8A5B36" strokeWidth="7" />
          <rect x="466" y="252" width="34" height="48" rx="8" fill="#FDF3E3" strokeWidth="6" />
          <path d="M 483 252 v -8 M 483 240 q 6 8 0 12 q -6 -4 0 -12" fill="#F2C066" strokeWidth="4" />
          <path d="M 474 268 q 9 -8 18 0 q -9 10 -18 0" fill="#9DBBA4" strokeWidth="3.5" />
          {/* stacked bedtime books */}
          <rect x="530" y="284" width="80" height="16" rx="5" fill="#E8917A" strokeWidth="6" />
          <rect x="538" y="268" width="70" height="16" rx="5" fill="#9DBBA4" strokeWidth="6" />
          <rect x="546" y="252" width="58" height="16" rx="5" fill="#F2C066" strokeWidth="6" />
          {/* lotería-card frame: El Sol */}
          <rect x="646" y="234" width="58" height="66" rx="8" fill="#FDF3E3" strokeWidth="6" />
          <circle cx="675" cy="260" r="13" fill="#F2C066" strokeWidth="5" />
          <path d="M 675 242 v -6 M 675 278 v 6 M 659 260 h -6 M 691 260 h 6 M 664 249 l -5 -5 M 686 271 l 5 5 M 686 249 l 5 -5 M 664 271 l -5 5" strokeWidth="4" />
          {/* nightstand + lamp */}
          <ellipse cx="220" cy="404" rx="135" ry="110" fill="url(#bd-lampGlow)" stroke="none" />
          <rect x="150" y="470" width="140" height="110" rx="12" fill="#8A5B36" strokeWidth="8" />
          <rect x="166" y="492" width="108" height="30" rx="8" fill="#C98A54" strokeWidth="6" />
          <circle cx="220" cy="507" r="6" fill="#F2C066" strokeWidth="4" />
          <path d="M 192 368 h 56 l 14 44 h -84 Z" fill="#F6E3B8" strokeWidth="7" />
          <path d="M 220 412 v 44" strokeWidth="6" />
          <path d="M 220 456 l -26 14 h 52 Z" fill="#8A5B36" strokeWidth="7" />
          {/* baby bottle on nightstand */}
          <rect x="264" y="438" width="22" height="34" rx="8" fill="#FDF3E3" strokeWidth="5" />
          <path d="M 268 438 q 7 -10 14 0" fill="#E8917A" strokeWidth="5" />
          {/* CRIB + BABY, center stage */}
          <g id="crib">
            <ellipse cx="880" cy="640" rx="270" ry="30" fill="#6F4B35" opacity="0.18" stroke="none" />
            {/* back corner posts */}
            <rect x="654" y="316" width="20" height="180" rx="9" fill="#8A5B36" strokeWidth="7" />
            <rect x="1086" y="316" width="20" height="180" rx="9" fill="#8A5B36" strokeWidth="7" />
            <circle cx="664" cy="310" r="11" fill="#8A5B36" strokeWidth="6" />
            <circle cx="1096" cy="310" r="11" fill="#8A5B36" strokeWidth="6" />
            {/* back rail + slats */}
            <rect x="668" y="330" width="424" height="18" rx="9" fill="#C98A54" strokeWidth="8" />
            <path d="M 720 348 v 128 M 774 348 v 128 M 828 348 v 128 M 880 348 v 128 M 932 348 v 128 M 986 348 v 128 M 1040 348 v 128" strokeWidth="7" />
            {/* mattress */}
            <rect x="640" y="462" width="480" height="76" rx="18" fill="#FDF3E3" strokeWidth="8" />
            <path d="M 680 500 q 20 -10 40 0 M 760 502 q 20 -10 40 0 M 1000 500 q 20 -10 40 0" strokeWidth="4" opacity="0.4" />
          </g>
          {/* mobile above crib */}
          <g style={{ animation: 'bd-mobileSway 4s ease-in-out infinite', transformOrigin: '880px 150px' }}>
            <circle cx="880" cy="144" r="5" fill="#8A5B36" strokeWidth="4" />
            <path d="M 880 150 v 28" strokeWidth="6" />
            <path d="M 818 200 q 62 -34 124 0 M 818 200 q -6 -2 -8 -8 M 942 200 q 6 -2 8 -8" strokeWidth="6" />
            <path d="M 838 178 q 42 -16 84 0" strokeWidth="5" opacity="0.6" />
            <path d="M 828 200 v 24 M 856 186 v 34 M 880 182 v 42 M 904 186 v 34 M 932 200 v 24" strokeWidth="4" />
            <circle cx="828" cy="214" r="3" fill="#F2C066" stroke="none" />
            <circle cx="880" cy="204" r="3" fill="#E8917A" stroke="none" />
            <circle cx="932" cy="214" r="3" fill="#9DBBA4" stroke="none" />
            {/* hanging charms */}
            <path d="M 828 226 q -10 8 -6 16 q 8 6 14 -2 q 6 8 14 2 q 4 -8 -6 -16 l -8 -6 Z" fill="#F2C066" strokeWidth="4.5" />
            <path d="M 854 220 a 12 12 0 1 0 8 21 a 9 9 0 1 1 -8 -21 Z" fill="#FDF3E3" strokeWidth="4.5" />
            <circle cx="880" cy="236" r="11" fill="#E8917A" strokeWidth="4.5" />
            <path d="M 880 222 v -4 M 880 250 v 4 M 866 236 h -4 M 894 236 h 4 M 871 227 l -3 -3 M 889 245 l 3 3 M 889 227 l 3 -3 M 871 245 l -3 3" strokeWidth="3" />
            <path d="M 904 222 l 4 8 l 9 1 l -6 6 l 1 9 l -8 -4 l -8 4 l 1 -9 l -6 -6 l 9 -1 Z" fill="#B39ECF" strokeWidth="4" />
            <path d="M 924 226 q -8 6 -6 14 q 7 5 12 -2 q 5 7 12 2 q 2 -8 -6 -14 l -6 -5 Z" fill="#9DBBA4" strokeWidth="4.5" />
          </g>
          {/* BABY (Nina) */}
          <g id="baby" style={{ animation: 'bd-babyChew 2.6s ease-in-out infinite', transformOrigin: '880px 470px' }}>
            <path d="M 830 470 q 0 -40 50 -40 q 50 0 50 40 l -6 40 h -88 Z" fill="#FDF3E3" strokeWidth="8" />
            <g fill="#F2C066" stroke="none">
              <circle cx="856" cy="460" r="6" /><circle cx="892" cy="452" r="6" /><circle cx="912" cy="482" r="6" /><circle cx="870" cy="492" r="6" /><circle cx="842" cy="490" r="5" />
            </g>
            <path d="M 846 448 q -18 4 -22 22 M 914 448 q 18 4 22 22" fill="none" strokeWidth="7" />
            {/* hands gripping the rail */}
            <circle cx="826" cy="474" r="12" fill="#E4C29F" strokeWidth="6" />
            <circle cx="934" cy="474" r="12" fill="#E4C29F" strokeWidth="6" />
            {/* head */}
            <circle cx="880" cy="368" r="66" fill="#E4C29F" strokeWidth="9" />
            {/* curly hair tuft */}
            <path d="M 876 304 q -4 -16 8 -22 q 12 -6 18 6 q -10 -2 -14 6 q 8 2 8 10" fill="#5A4436" strokeWidth="5" />
            {/* ears */}
            <circle cx="815" cy="372" r="11" fill="#E4C29F" strokeWidth="6" />
            <circle cx="945" cy="372" r="11" fill="#E4C29F" strokeWidth="6" />
            {/* happy face */}
            <path d="M 844 366 q 10 -12 20 0 M 896 366 q 10 -12 20 0" strokeWidth="5.5" />
            <path d="M 860 392 q 20 4 40 0 q -4 22 -20 22 q -16 0 -20 -22" fill="#8A3B2A" strokeWidth="5" />
            <path d="M 870 406 q 10 6 20 0 q -3 7 -10 7 q -7 0 -10 -7" fill="#F2A9A0" stroke="none" />
            {/* blush always */}
            <circle cx="832" cy="386" r="8" fill="#F2A9A0" stroke="none" />
            <circle cx="928" cy="386" r="8" fill="#F2A9A0" stroke="none" />
          </g>
          {/* teddy bear beside crib */}
          <g transform="translate(90 -140) scale(0.8) rotate(6 1150 720)">
            <ellipse cx="1150" cy="782" rx="46" ry="9" fill="#6F4B35" opacity="0.15" stroke="none" />
            <ellipse cx="1122" cy="768" rx="13" ry="16" fill="#C98A54" strokeWidth="6" transform="rotate(-24 1122 768)" />
            <ellipse cx="1178" cy="768" rx="13" ry="16" fill="#C98A54" strokeWidth="6" transform="rotate(24 1178 768)" />
            <ellipse cx="1118" cy="774" rx="6" ry="7" fill="#E4C9A8" stroke="none" transform="rotate(-24 1118 774)" />
            <ellipse cx="1182" cy="774" rx="6" ry="7" fill="#E4C9A8" stroke="none" transform="rotate(24 1182 774)" />
            <ellipse cx="1150" cy="742" rx="32" ry="30" fill="#C98A54" strokeWidth="7" />
            <ellipse cx="1150" cy="748" rx="16" ry="15" fill="#E4C9A8" stroke="none" />
            <ellipse cx="1118" cy="738" rx="10" ry="16" fill="#C98A54" strokeWidth="6" transform="rotate(18 1118 738)" />
            <ellipse cx="1182" cy="738" rx="10" ry="16" fill="#C98A54" strokeWidth="6" transform="rotate(-18 1182 738)" />
            <circle cx="1132" cy="672" r="10" fill="#C98A54" strokeWidth="5.5" />
            <circle cx="1168" cy="672" r="10" fill="#C98A54" strokeWidth="5.5" />
            <circle cx="1132" cy="672" r="4" fill="#E4C9A8" stroke="none" />
            <circle cx="1168" cy="672" r="4" fill="#E4C9A8" stroke="none" />
            <circle cx="1150" cy="696" r="28" fill="#C98A54" strokeWidth="7" />
            <ellipse cx="1150" cy="706" rx="11" ry="8" fill="#E4C9A8" stroke="none" />
            <ellipse cx="1150" cy="702" rx="3.5" ry="2.8" fill="#6F4B35" stroke="none" />
            <path d="M 1150 705 v 4 M 1146 710 h 8" strokeWidth="2.5" />
            <circle cx="1140" cy="691" r="2.8" fill="#6F4B35" stroke="none" />
            <circle cx="1160" cy="691" r="2.8" fill="#6F4B35" stroke="none" />
            <circle cx="1132" cy="700" r="3.5" fill="#F2A9A0" stroke="none" />
            <circle cx="1168" cy="700" r="3.5" fill="#F2A9A0" stroke="none" />
          </g>
          <g stroke="#6F4B35" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* front corner posts (with finials) */}
            <rect x="630" y="486" width="22" height="158" rx="10" fill="#8A5B36" strokeWidth="8" />
            <rect x="1108" y="486" width="22" height="158" rx="10" fill="#8A5B36" strokeWidth="8" />
            <circle cx="641" cy="478" r="12" fill="#8A5B36" strokeWidth="6" />
            <circle cx="1119" cy="478" r="12" fill="#8A5B36" strokeWidth="6" />
            {/* front top rail */}
            <rect x="646" y="500" width="468" height="18" rx="9" fill="#C98A54" strokeWidth="8" />
            <path d="M 692 518 v 96 M 748 518 v 96 M 804 518 v 96 M 860 518 v 96 M 916 518 v 96 M 972 518 v 96 M 1028 518 v 96 M 1074 518 v 96" strokeWidth="7" />
            {/* front bottom rail */}
            <rect x="646" y="610" width="468" height="16" rx="8" fill="#C98A54" strokeWidth="8" />
            {/* crocheted blanket over the rail */}
            <path d="M 1000 494 q 50 -8 96 6 l -4 70 q -46 -12 -92 -6 Z" fill="#E8917A" strokeWidth="7" />
            <path d="M 1010 516 q 40 -8 76 4 M 1008 540 q 40 -8 78 4" stroke="#B3402F" strokeWidth="4" opacity="0.6" />
            <path d="M 1004 566 l 6 12 M 1024 568 l 6 12 M 1044 572 l 6 12 M 1064 574 l 6 12" strokeWidth="4" />
          </g>
          {/* rug */}
          <ellipse cx="640" cy="730" rx="420" ry="56" fill="#E0674A" strokeWidth="8" />
          <ellipse cx="640" cy="730" rx="300" ry="38" fill="none" stroke="#FDF3E3" strokeWidth="5" opacity="0.8" />
          <ellipse cx="640" cy="730" rx="170" ry="21" fill="none" strokeWidth="4" opacity="0.4" />
          {/* floor blocks */}
          <rect x="380" y="700" width="34" height="34" rx="7" fill="#E8917A" strokeWidth="6" transform="rotate(-10 397 717)" />
          <text x="390" y="726" fontFamily="'Baloo 2'" fontWeight="800" fontSize="22" fill="#6F4B35" stroke="none" transform="rotate(-10 397 717)">A</text>
          <rect x="424" y="706" width="34" height="34" rx="7" fill="#F2C066" strokeWidth="6" transform="rotate(6 441 723)" />
          <text x="434" y="732" fontFamily="'Baloo 2'" fontWeight="800" fontSize="22" fill="#6F4B35" stroke="none" transform="rotate(6 441 723)">B</text>
        </g>
      </svg>
    </div>
  )
}
