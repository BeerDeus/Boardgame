// Illustrations SVG "bateau" : portraits, standees (moteur papier), icônes de carte.
const skin = '#d9b38c', steel = '#a9afb9', steelD = '#5b616b', dark = '#1b1714';

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

const BODIES = {
  knight: c => `
    <rect x="38" y="112" width="10" height="36" fill="${steelD}"/><rect x="52" y="112" width="10" height="36" fill="${steelD}"/>
    <rect x="35" y="144" width="14" height="10" rx="2" fill="${dark}"/><rect x="51" y="144" width="14" height="10" rx="2" fill="${dark}"/>
    <path d="M30 70 Q50 60 70 70 L67 116 L33 116 Z" fill="${steel}" stroke="${steelD}" stroke-width="1.5"/>
    <path d="M41 72 L59 72 L58 122 L50 130 L42 122Z" fill="${c}"/>
    <path d="M47 84h6v6h6v6h-6v12h-6v-12h-6v-6h6z" fill="#e8d9a8"/>
    <rect x="66" y="72" width="9" height="34" rx="4" fill="${steel}"/>
    <rect x="72.5" y="14" width="5" height="70" fill="#e2e6ec" stroke="${steelD}" stroke-width="0.8"/>
    <rect x="66" y="82" width="17" height="4" rx="1" fill="#8a6d3b"/><rect x="73" y="86" width="4" height="12" fill="#5a3f22"/>
    <path d="M12 72 L38 72 L38 98 Q25 116 12 98Z" fill="${c}" stroke="#d6c48a" stroke-width="2.2"/>
    <path d="M25 76v30M15 86h20" stroke="#d6c48a" stroke-width="3"/>
    <path d="M36 32 Q50 14 64 32 L64 58 Q50 66 36 58Z" fill="${steel}" stroke="${steelD}" stroke-width="1.5"/>
    <rect x="39" y="40" width="22" height="4" rx="1" fill="${dark}"/><path d="M50 44v14" stroke="${dark}" stroke-width="2"/>
    <path d="M50 18 Q62 2 78 12 Q64 12 55 24Z" fill="${c}"/>`,
  mage: c => `
    <path d="M50 60 L80 156 L20 156 Z" fill="${c}"/><path d="M50 60 L58 156 L42 156Z" fill="${shade(c, 0.7)}"/>
    <path d="M33 78 L18 112 L28 116 L40 88Z" fill="${shade(c, 0.85)}"/><path d="M67 78 L80 104 L72 110 L60 88Z" fill="${shade(c, 0.85)}"/>
    <circle cx="50" cy="52" r="11" fill="${skin}"/>
    <path d="M40 54 Q50 98 60 54 Q50 62 40 54Z" fill="#e9e6df"/>
    <circle cx="46" cy="50" r="1.5" fill="${dark}"/><circle cx="54" cy="50" r="1.5" fill="${dark}"/>
    <ellipse cx="50" cy="41" rx="25" ry="5.5" fill="${shade(c, 0.6)}"/>
    <path d="M35 41 Q46 22 52 0 Q56 18 66 41Z" fill="${shade(c, 0.6)}"/><path d="M38 38h25" stroke="#d6c48a" stroke-width="3"/>
    <rect x="78" y="22" width="4" height="134" rx="2" fill="#6b4a2b"/>
    <circle cx="80" cy="18" r="9" fill="#7ff3ff" opacity="0.35"/><circle cx="80" cy="18" r="6" fill="#bdfbff"/>`,
  rogue: c => `
    <rect x="40" y="112" width="8" height="38" fill="#2c2a26"/><rect x="52" y="112" width="8" height="38" fill="#2c2a26"/>
    <path d="M50 46 Q76 60 74 150 L26 150 Q24 60 50 46Z" fill="${shade(c, 0.75)}"/>
    <path d="M40 74 L60 74 L58 118 L42 118Z" fill="#4a3b2c"/><rect x="40" y="96" width="20" height="4" fill="#2a1f16"/>
    <path d="M32 54 Q50 10 68 54 Q66 70 50 72 Q34 70 32 54Z" fill="${c}"/>
    <path d="M40 54 Q50 40 60 54 Q58 64 50 66 Q42 64 40 54Z" fill="#141210"/>
    <circle cx="46" cy="55" r="1.8" fill="#e9d27a"/><circle cx="54" cy="55" r="1.8" fill="#e9d27a"/>
    <path d="M78 86 L84 116 L80 117Z" fill="#e2e6ec"/><rect x="74" y="80" width="10" height="4" fill="#6b4a2b"/>`,
  cleric: c => `
    <path d="M50 60 L76 156 L24 156 Z" fill="#e8e2d0"/><path d="M50 60 L56 156 L44 156Z" fill="${c}"/>
    <path d="M24 156h52" stroke="#c9a45c" stroke-width="5"/>
    <circle cx="50" cy="50" r="11" fill="${skin}"/><path d="M38 46 Q50 30 62 46" fill="#7a5a3a"/>
    <circle cx="50" cy="50" r="18" fill="none" stroke="#f3d98a" stroke-width="2" opacity="0.8"/>
    <rect x="74" y="40" width="4" height="70" fill="#6b4a2b"/><rect x="66" y="32" width="20" height="14" rx="2" fill="${steel}" stroke="${steelD}"/>`,
  npc: c => `
    <path d="M48 58 Q74 66 72 154 L26 154 Q26 92 48 58Z" fill="${c}"/>
    <path d="M34 70 Q52 58 68 74 L64 100 Q48 92 32 100Z" fill="${shade(c, 0.7)}"/>
    <circle cx="44" cy="54" r="11" fill="${skin}"/><path d="M33 52 Q44 34 56 50 Q50 44 33 56Z" fill="#cfcac0"/>
    <circle cx="40" cy="54" r="1.4" fill="${dark}"/><path d="M38 60 q3 2 6 0" stroke="${dark}" fill="none"/>
    <path d="M20 80 L14 156" stroke="#5a3f22" stroke-width="4" stroke-linecap="round"/>
    <path d="M58 110 h20 l-3 16 h-14z" fill="#8a6d3b"/><path d="M60 110 q8 -10 16 0" stroke="#5a3f22" fill="none" stroke-width="2"/>
    <path d="M62 108 l4 -8 l3 8 M68 108 l3 -10 l3 10" stroke="#5c7a3a" stroke-width="2" fill="none"/>`,
  ghoul: c => `
    <path d="M30 150 L36 112 L44 114 L40 150Z" fill="${shade(c, 0.6)}"/><path d="M58 150 L56 112 L64 112 L70 150Z" fill="${shade(c, 0.6)}"/>
    <path d="M24 74 Q46 50 74 72 L70 118 L32 118Z" fill="${c}"/>
    <path d="M26 76 L10 128 L16 132 L34 90Z" fill="${shade(c, 0.85)}"/><path d="M72 76 L88 126 L82 130 L66 90Z" fill="${shade(c, 0.85)}"/>
    <path d="M10 128l-4 8M13 130l-1 9M16 132l3 7M82 130l-3 8M85 128l1 9M88 126l5 6" stroke="#e8e0c8" stroke-width="2"/>
    <ellipse cx="30" cy="66" rx="15" ry="13" fill="${c}"/>
    <circle cx="25" cy="64" r="2.8" fill="#ff3a2a"/><circle cx="35" cy="64" r="2.8" fill="#ff3a2a"/>
    <path d="M22 73 l3 4 l3 -4 l3 4 l3 -4 l3 4" stroke="#e8e0c8" fill="none" stroke-width="1.6"/>
    <path d="M40 70 q10 -6 22 -2 M44 80 q10 -4 20 0 M44 90 q10 -4 20 0" stroke="${shade(c, 0.6)}" fill="none" stroke-width="2"/>`,
  child: c => `
    <rect x="42" y="118" width="7" height="32" fill="#4a3b2c"/><rect x="52" y="118" width="7" height="32" fill="#4a3b2c"/>
    <path d="M36 84 Q50 76 64 84 L62 122 L38 122Z" fill="${c}"/>
    <circle cx="50" cy="70" r="13" fill="${skin}"/><path d="M37 66 Q50 48 63 66 Q56 58 37 68Z" fill="#7a4a22"/>
    <circle cx="45" cy="71" r="1.6" fill="${dark}"/><circle cx="55" cy="71" r="1.6" fill="${dark}"/>
    <path d="M66 96 L80 80" stroke="#6b4a2b" stroke-width="4" stroke-linecap="round"/><path d="M76 76 l8 2 l-3 8z" fill="#9aa0a8"/>`,
  ferryman: c => `
    <path d="M50 50 Q80 66 76 154 L24 154 Q20 66 50 50Z" fill="${c}"/>
    <path d="M30 58 Q50 14 70 58 Q66 74 50 76 Q34 74 30 58Z" fill="${shade(c, 0.7)}"/>
    <path d="M38 58 Q50 44 62 58 Q58 68 50 70 Q42 68 38 58Z" fill="#0d0b0a"/>
    <circle cx="45" cy="60" r="1.6" fill="#9fe0d0"/><circle cx="55" cy="60" r="1.6" fill="#9fe0d0"/>
    <rect x="80" y="8" width="3.5" height="148" fill="#4a3324"/>
    <path d="M14 96 l-4 0 l0 -8 l12 0 l0 8z" fill="#2a2420"/><rect x="11" y="96" width="10" height="14" fill="#ffcf6a" stroke="#2a2420"/><path d="M16 88 L30 80" stroke="#2a2420" stroke-width="2"/>`,
  monk: c => `
    <path d="M50 46 Q84 60 82 156 L18 156 Q16 60 50 46Z" fill="${c}"/>
    <path d="M28 56 Q50 6 72 56 Q68 76 50 78 Q32 76 28 56Z" fill="${shade(c, 0.8)}"/>
    <path d="M37 56 Q50 38 63 56 Q60 68 50 70 Q40 68 37 56Z" fill="#a8b49a"/>
    <circle cx="44" cy="58" r="2.6" fill="#ff3a2a"/><circle cx="56" cy="58" r="2.6" fill="#ff3a2a"/>
    <path d="M42 66 q8 5 16 0" stroke="#3a2a22" fill="none" stroke-width="1.6"/>
    <path d="M50 78 v60" stroke="#8a6d3b" stroke-width="2"/><path d="M62 92 l10 0 l4 18 l-18 0z" fill="#8a6d3b" stroke="#c9a45c"/>
    <path d="M20 96 L6 128 M80 96 L94 128" stroke="#a8b49a" stroke-width="5" stroke-linecap="round"/>`,
  fox: c => `
    <path d="M14 104 Q30 84 60 88 L76 74 L80 60 L86 72 L94 76 L88 86 L78 90 L72 108 L74 150 L66 150 L62 116 L40 116 L36 150 L28 150 L28 116 Q16 116 14 104Z" fill="#b5652e"/>
    <path d="M14 104 Q-2 108 4 128 Q10 116 22 110Z" fill="#b5652e"/><path d="M4 128 Q2 120 8 118" stroke="#f2ead8" stroke-width="5"/>
    <circle cx="84" cy="74" r="2" fill="#ffb02a"/><path d="M78 62 L80 50 L84 64Z" fill="#7a3f1a"/>`,
  wolf: c => `
    <path d="M14 96 Q30 74 62 78 L78 66 L84 56 L90 70 L96 76 L90 84 L80 86 L74 104 L76 150 L68 150 L64 112 L40 112 L36 150 L28 150 L28 112 Q16 112 14 96Z" fill="${c}"/>
    <path d="M14 96 Q4 104 2 120 Q10 108 20 104Z" fill="${c}"/>
    <circle cx="86" cy="70" r="2" fill="#ffd54a"/><path d="M82 56 L84 44 L88 58Z" fill="${shade(c, 0.7)}"/>`,
  horse: c => `
    <path d="M18 84 Q40 70 66 78 L80 52 L92 56 L94 70 L84 74 L76 96 L76 150 L68 150 L66 112 L36 112 L32 150 L24 150 L24 108 Q14 100 18 84Z" fill="${c}"/>
    <path d="M70 70 Q74 54 84 48 L78 76Z" fill="#2a1f16"/><path d="M18 84 Q6 96 8 126 Q14 104 22 96Z" fill="#2a1f16"/>
    <circle cx="86" cy="60" r="1.8" fill="${dark}"/>`,
};

export const KIND_LABEL = { knight: 'Chevalier', mage: 'Mage', rogue: 'Voleuse', cleric: 'Prêtre', npc: 'PNJ', ghoul: 'Goule', wolf: 'Loup', fox: 'Renard', horse: 'Destrier', child: 'Enfant', ferryman: 'Passeur', monk: 'Moine' };
const PORTRAIT_BOX = { knight: '24 8 52 52', mage: '22 4 56 56', rogue: '24 24 52 52', cleric: '24 24 52 52', npc: '18 28 52 52', ghoul: '6 42 50 50', wolf: '56 38 44 44', fox: '56 46 44 44', horse: '56 36 44 44', child: '28 44 44 44', ferryman: '24 26 52 52', monk: '22 24 56 56' };

export function figureSVG(kind, color, { portrait = false } = {}) {
  const body = (BODIES[kind] || BODIES.npc)(color);
  const vb = portrait ? PORTRAIT_BOX[kind] || PORTRAIT_BOX.npc : '0 0 100 160';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid ${portrait ? 'slice' : 'meet'}">${body}</svg>`;
}
export const svgDataUrl = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// ---------- Icônes de carte (style carte ancienne) pour le moteur papier ----------
const ICON = {
  pine: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-1" y="0" width="2" height="4" fill="#3a2a1a"/><path d="M0 -14 L6 -4 L3 -4 L8 2 L-8 2 L-3 -4 L-6 -4Z" fill="#26402e" stroke="#0f1a12" stroke-width="0.8"/></g>`,
  snowpine: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-1" y="0" width="2" height="4" fill="#3a2a1a"/><path d="M0 -14 L6 -4 L3 -4 L8 2 L-8 2 L-3 -4 L-6 -4Z" fill="#3c5a50" stroke="#16231f" stroke-width="0.8"/><path d="M0 -14 L3 -9 L-3 -9Z M-5 -3 L5 -3 L3 -5 L-3 -5Z" fill="#fff"/></g>`,
  dead: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="#2a201a" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M0 4 L0 -10 M0 -4 L-6 -10 M0 -7 L5 -13 M-3 -7 L-5 -14"/></g>`,
  rock: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-8 3 L-5 -5 L1 -8 L7 -2 L8 3Z" fill="#6e6a66" stroke="#2a2826" stroke-width="0.9"/><path d="M1 -8 L0 3" stroke="#2a2826" stroke-width="0.6"/></g>`,
  house: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-7" y="-5" width="14" height="9" fill="#b9a27c" stroke="#3a2a1a" stroke-width="0.8"/><path d="M-9 -5 L0 -13 L9 -5Z" fill="#6e2a20" stroke="#3a1a12" stroke-width="0.8"/><rect x="-2" y="-1" width="4" height="5" fill="#3a2a1a"/><rect x="3" y="-3" width="2.5" height="2.5" fill="#ffcc66"/></g>`,
  pillar: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-3 4 L-3 -10 L-1 -12 L1 -9 L3 -11 L3 4Z" fill="#a49d90" stroke="#3a3632" stroke-width="0.8"/><rect x="-4.5" y="3" width="9" height="2" fill="#7f786c"/></g>`,
  tomb: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-4 4 L-4 -4 Q0 -9 4 -4 L4 4Z" fill="#8c877d" stroke="#2f2c28" stroke-width="0.8"/><path d="M0 -4v5M-2 -2h4" stroke="#2f2c28" stroke-width="0.8"/></g>`,
  reed: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="#4d5a2a" stroke-width="1" fill="none"><path d="M0 3 Q-1 -6 -3 -10 M2 3 Q2 -6 4 -11 M-2 3 Q-4 -3 -7 -6"/><ellipse cx="4" cy="-11" rx="1" ry="2.4" fill="#5a3a1a" stroke="none"/></g>`,
  bush: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-7 3 Q-8 -4 -3 -5 Q0 -10 4 -5 Q9 -4 7 3Z" fill="#4a5a2e" stroke="#1d2512" stroke-width="0.8"/></g>`,
  mush: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-1" y="-3" width="2" height="6" fill="#d9d0b8"/><path d="M-5 -3 Q0 -10 5 -3Z" fill="#9b7fc7"/></g>`,
};
const TERRAIN_ICONS = {
  village: [['house', 2], ['house', 1], ['bush', 1]], forest: [['pine', 7], ['bush', 1]], plains: [['bush', 3], ['rock', 1]],
  rock: [['rock', 5], ['dead', 1]], swamp: [['dead', 2], ['reed', 4], ['mush', 2]], ruins: [['pillar', 3], ['tomb', 3]],
  burned: [['dead', 4], ['rock', 2]], snow: [['snowpine', 5], ['rock', 1]], crypt: [['tomb', 4], ['pillar', 2]],
};
/** SVG d'icônes réparties en bordure de tuile (le centre reste libre pour les figurines) */
export function tileIconsSVG(terrain, rand, w = 100, h = 100) {
  const items = [];
  for (const [name, n] of TERRAIN_ICONS[terrain] || []) for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do { x = 8 + rand() * (w - 16); y = 12 + rand() * (h - 18); tries++; }
    while (tries < 30 && Math.abs(x - w / 2) < w * 0.28 && Math.abs(y - h / 2) < h * 0.28);
    items.push({ name, x, y, s: 0.9 + rand() * 0.6 });
  }
  items.sort((a, b) => a.y - b.y);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${items.map(i => ICON[i.name](i.x.toFixed(1), i.y.toFixed(1), i.s.toFixed(2))).join('')}</svg>`;
}
