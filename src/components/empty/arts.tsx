// Ilustrações isométricas dos estados vazios. Linha 1.5px na cor da borda,
// faces #363636/#3E3E3E e acento lima. As animações vêm de classes .art-* do
// globals.css (e param sob "reduzir movimento").

const LINE = "#464646";
const FACE_TOP = "#3E3E3E";
const FACE_LEFT = "#363636";
const FACE_RIGHT = "#323232";
const LIME = "#96D737";
const CYAN = "#2396B4";
const WARN = "#FFC800";

const stroke = { stroke: LINE, strokeWidth: 1.5, strokeLinejoin: "round" as const };

/** Painel fechado: cubo lacrado com nó lima, feixe de luz e partículas. */
export function LockedArt() {
  return (
    <svg viewBox="0 0 240 210" className="art h-auto w-full" aria-hidden="true">
      <defs>
        <linearGradient id="beam-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={LIME} stopOpacity="0.9" />
          <stop offset="1" stopColor={LIME} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lock-glow">
          <stop offset="0" stopColor={LIME} stopOpacity="0.55" />
          <stop offset="1" stopColor={LIME} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="120" cy="190" rx="50" ry="10" fill="#262626" />
      <polygon className="art-beam" points="100,156 140,156 166,190 74,190" fill="url(#beam-grad)" />
      <circle className="art-particle" cx="110" cy="170" r="2" fill={LIME} />
      <circle className="art-particle-late" cx="131" cy="176" r="1.6" fill={LIME} />

      <g className="art-float">
        <polygon points="120,40 166,66 120,92 74,66" fill={FACE_TOP} {...stroke} />
        <polygon points="74,66 120,92 120,148 74,122" fill={FACE_LEFT} {...stroke} />
        <polygon points="166,66 120,92 120,148 166,122" fill={FACE_RIGHT} {...stroke} />
        {/* lacre: emendas horizontais + diagonais na tampa */}
        <polyline points="74,94 120,120 166,94" fill="none" stroke={LINE} strokeWidth="1.5" />
        <line x1="97" y1="53" x2="143" y2="79" stroke={LINE} strokeWidth="1.5" />
        <line x1="143" y1="53" x2="97" y2="79" stroke={LINE} strokeWidth="1.5" />
        <circle cx="120" cy="120" r="16" fill="url(#lock-glow)" />
        <circle cx="120" cy="120" r="7.5" fill="#2D2D2D" stroke={LIME} strokeWidth="1.5" />
        <circle cx="120" cy="120" r="3.6" fill={LIME} />
      </g>
    </svg>
  );
}

/** Nenhum painel: plataforma com encaixe vazio e um card chegando. */
export function EmptySlotArt() {
  return (
    <svg viewBox="0 0 240 210" className="art h-auto w-full" aria-hidden="true">
      <ellipse cx="120" cy="194" rx="70" ry="10" fill="#262626" />

      <polygon points="120,92 196,136 120,180 44,136" fill={FACE_TOP} {...stroke} />
      <polygon points="44,136 120,180 120,192 44,148" fill={FACE_LEFT} {...stroke} />
      <polygon points="196,136 120,180 120,192 196,148" fill={FACE_RIGHT} {...stroke} />
      <polygon
        points="120,108 168,136 120,164 72,136"
        fill="none"
        stroke={LIME}
        strokeOpacity="0.55"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />

      <g className="art-snap">
        <polygon points="120,104 164,129 120,154 76,129" fill={FACE_TOP} {...stroke} />
        <polygon points="76,129 120,154 120,160 76,135" fill={FACE_LEFT} {...stroke} />
        <polygon points="164,129 120,154 120,160 164,135" fill={FACE_RIGHT} {...stroke} />
        <line x1="98" y1="129" x2="122" y2="143" stroke={LIME} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="108" y1="122" x2="138" y2="139" stroke={LIME} strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      <g className="art-float">
        <line x1="58" y1="74" x2="58" y2="104" stroke={LINE} strokeWidth="1.5" strokeDasharray="2 4" />
        <circle cx="58" cy="70" r="5" fill="#2D2D2D" stroke={LIME} strokeWidth="1.5" />
        <circle cx="58" cy="70" r="2" fill={LIME} />
      </g>
      <g className="art-float-alt">
        <line x1="186" y1="66" x2="186" y2="100" stroke={LINE} strokeWidth="1.5" strokeDasharray="2 4" />
        <circle cx="186" cy="62" r="5" fill="#2D2D2D" stroke={CYAN} strokeWidth="1.5" />
        <circle cx="186" cy="62" r="2" fill={CYAN} />
      </g>
    </svg>
  );
}

/** Erro de carga: dois blocos separados, ligação rompida e faísca. */
export function BrokenLinkArt() {
  return (
    <svg viewBox="0 0 240 210" className="art h-auto w-full" aria-hidden="true">
      <ellipse cx="68" cy="176" rx="34" ry="7" fill="#262626" />
      <ellipse cx="172" cy="166" rx="34" ry="7" fill="#262626" />

      <g className="art-float">
        <polygon points="68,70 100,88 68,106 36,88" fill={FACE_TOP} {...stroke} />
        <polygon points="36,88 68,106 68,146 36,128" fill={FACE_LEFT} {...stroke} />
        <polygon points="100,88 68,106 68,146 100,128" fill={FACE_RIGHT} {...stroke} />
        <circle cx="68" cy="88" r="3" fill={LIME} />
      </g>
      <g className="art-float-alt">
        <polygon points="172,60 204,78 172,96 140,78" fill={FACE_TOP} {...stroke} />
        <polygon points="140,78 172,96 172,136 140,118" fill={FACE_LEFT} {...stroke} />
        <polygon points="204,78 172,96 172,136 204,118" fill={FACE_RIGHT} {...stroke} />
        <circle cx="172" cy="78" r="3" fill={CYAN} />
      </g>

      {/* ligação rompida entre os blocos */}
      <line x1="100" y1="112" x2="113" y2="105" stroke={LIME} strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />
      <line x1="127" y1="98" x2="140" y2="91" stroke={CYAN} strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />
      <path
        className="art-blink"
        d="M120 91 L122.4 98.6 L130 101 L122.4 103.4 L120 111 L117.6 103.4 L110 101 L117.6 98.6 Z"
        fill={WARN}
      />
    </svg>
  );
}
