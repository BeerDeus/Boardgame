// Emblèmes colorés des caractéristiques : médaillon métallique + pictogramme détaillé, une couleur par stat.
// statBadge('force', 28) → chaîne SVG autonome (dégradés à identifiants uniques).
export const STAT_COLORS = {
  combat:       { main: '#d23b2a', light: '#ff7a5e', dark: '#4a0b06', label: 'Combat' },
  force:        { main: '#e8781e', light: '#ffb25a', dark: '#5a2204', label: 'Force' },
  agilite:      { main: '#2fae5e', light: '#7be8a0', dark: '#08401f', label: 'Agilité' },
  intelligence: { main: '#2f86e0', light: '#86c6ff', dark: '#0a2850', label: 'Intelligence' },
  volonte:      { main: '#9a4fd0', light: '#d7a2ff', dark: '#2e0a48', label: 'Volonté' },
};
let uid = 0;

/** Pictogrammes (viewBox 64×64, centre 32,32). u = préfixe unique des dégradés. */
const ART = {
  combat: u => `
    <g stroke="#2a0a06" stroke-width="1.4" stroke-linejoin="round">
      <path d="M15 13 L40 38 L37.5 40.5 L12.5 15.5 L11.5 11.5 Z" fill="url(#${u}steel)"/>
      <path d="M49 13 L24 38 L26.5 40.5 L51.5 15.5 L52.5 11.5 Z" fill="url(#${u}steel)"/>
      <path d="M33 41 L43 31 L46 34 L36 44 Z" fill="url(#${u}gold)"/>
      <path d="M31 41 L21 31 L18 34 L28 44 Z" fill="url(#${u}gold)"/>
      <path d="M40.5 41.5 L47 48 L44.5 50.5 L38 44 Z" fill="#6b3a1c"/>
      <path d="M23.5 41.5 L17 48 L19.5 50.5 L26 44 Z" fill="#6b3a1c"/>
      <circle cx="47.6" cy="51" r="3" fill="url(#${u}gold)"/><circle cx="16.4" cy="51" r="3" fill="url(#${u}gold)"/>
    </g>
    <path d="M15.5 14 L38.5 37" stroke="#fff" stroke-opacity=".7" stroke-width="1"/><path d="M48.5 14 L25.5 37" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>`,
  force: u => `
    <path d="M10 46 C10 38 14 33 20 31 C23 25 29 22 34 24 C37 25 39 28 39.5 31 L43 26 C43.5 22 41 19 41.5 15.5 C42 12 46 10 50 11.5 C54 13 55.5 17 54 21 L50 30 C48 35 45 40 41 44 C37 48 31 50 24 50 L14 50 C11.8 50 10 48.4 10 46 Z"
      fill="url(#${u}skin)" stroke="#3a1504" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M22 31.5 C25 27 30 26 34 28" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M44.5 16 C46 15 48 15 49.5 16 M44 19.5 C45.8 18.6 48 18.7 49.8 19.6" fill="none" stroke="#3a1504" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M20 41 C26 43 33 42 38 38" fill="none" stroke="#7a3208" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M12 50 h16" stroke="#3a1504" stroke-width="1.6"/>
    <g fill="#fff4c8"><path d="M15 21 l1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2 2.6-1.2z"/><path d="M55 33 l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z"/></g>`,
  agilite: u => `
    <g stroke-linecap="round" fill="none" stroke="#e8fff0" stroke-opacity=".8" stroke-width="2"><path d="M6 40 h8"/><path d="M8 46 h9"/><path d="M5 52 h10"/></g>
    <path d="M27 12 h11 c1.5 0 2.5 1 2.5 2.5 V34 c3 1 9 2.5 12 4.5 c2.5 1.6 3 4.5 3 7 V48 H22 c-1.5 0-2.5-1-2.5-2.5 V36 c2-1 4-3 5-6 L25 14.5 C25 13 25.8 12 27 12 Z"
      fill="url(#${u}leather)" stroke="#2a1408" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M19.5 48 h36 v3 c0 1.2-1 2-2 2 h-32 c-1.2 0-2-.8-2-2 z" fill="#3a2010" stroke="#1a0a04" stroke-width="1.2"/>
    <path d="M25.5 16 h14 M25.5 20 h14" stroke="#d9a35a" stroke-width="1.6"/>
    <path d="M41 36 c3.5 1 7 2 9.5 3.5" fill="none" stroke="#ffd9a0" stroke-opacity=".6" stroke-width="1.2"/>
    <g stroke="#1d5a34" stroke-width="1.2" stroke-linejoin="round">
      <path d="M25 26 C17 22 10 22 5 25 C11 26 16 28 21 31 Z" fill="url(#${u}wing)"/>
      <path d="M24.5 21 C17 15 10 14 5 16.5 C11 18 16 21 21.5 25.5 Z" fill="url(#${u}wing)"/>
      <path d="M25 16 C19 9.5 13 7.5 8 9 C13 11.5 17.5 15 22 20 Z" fill="url(#${u}wing)"/>
    </g>`,
  intelligence: u => `
    <circle cx="32" cy="17" r="9" fill="url(#${u}glow)"/>
    <path d="M32 9.5 l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fffbe6"/>
    <path d="M8 26 C15 23.5 24 24 32 28.5 C40 24 49 23.5 56 26 V50 C49 47.5 40 48 32 52.5 C24 48 15 47.5 8 50 Z" fill="#5b2f14" stroke="#2a1206" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M10 25 C17 22.5 25 23 32 27 V49.5 C25 45.5 17 45 10 47.5 Z" fill="url(#${u}page)" stroke="#6b4a24" stroke-width="1"/>
    <path d="M54 25 C47 22.5 39 23 32 27 V49.5 C39 45.5 47 45 54 47.5 Z" fill="url(#${u}page)" stroke="#6b4a24" stroke-width="1"/>
    <g stroke="#8a6a44" stroke-width="1.1" stroke-linecap="round" fill="none">
      <path d="M14 30 c5-1.5 10-1.2 14 .8 M14 34 c5-1.5 10-1.2 14 .8 M14 38 c5-1.5 10-1.2 14 .8 M14 42 c4-1.2 8-1 11 .4"/>
    </g>
    <g stroke="#8a6a44" stroke-width="1.1" stroke-linecap="round" fill="none"><path d="M36 30.8 c4-2 9-2.3 14-.8 M36 34.8 c4-2 9-2.3 14-.8 M36 38.8 c4-2 9-2.3 14-.8 M36 42.8 c3-1.4 7-1.6 10-.6"/></g>
    <path d="M45 24.5 v12 l2.2-2 2.2 2 v-12.8" fill="#d23b2a" stroke="#6a1208" stroke-width=".8"/>
    <path d="M32 27 V52.5" stroke="#2a1206" stroke-width="1.4"/>`,
  volonte: u => `
    <path d="M32 7 C35 13 41 15 41 23 C43.5 21 44 18.5 43.5 16 C49 21 50 28 47 33 L17 33 C14 28 15 21 20.5 16 C20 19 21 21.5 23 23 C23 15 29 13 32 7 Z" fill="url(#${u}fire)" stroke="#4a0f2a" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M32 15 C33.5 19 37 20.5 36.5 25 C35 28 29 28 27.5 25 C27 21 30.5 19 32 15 Z" fill="#fff3c0" opacity=".9"/>
    <path d="M32 56 C24 50 13 43 13 33.5 C13 28 17 24.5 22 24.5 C26 24.5 29.5 27 32 30.5 C34.5 27 38 24.5 42 24.5 C47 24.5 51 28 51 33.5 C51 43 40 50 32 56 Z" fill="url(#${u}heart)" stroke="#2a0838" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M18 32 C18.5 29 21 27.5 24 28" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>
    <path d="M40 36 C41.5 38.5 41 41.5 39 43.5" fill="none" stroke="#ffe6ff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>`,
};

/** Emblème complet : médaillon doré, fond coloré, pictogramme, reflet. */
export function statBadge(stat, size = 24, { title = true } = {}) {
  const c = STAT_COLORS[stat]; if (!c) return '';
  const u = `sb${++uid}_`;
  return `<svg class="stat-badge sb-${stat}" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${c.label}" xmlns="http://www.w3.org/2000/svg">${title ? `<title>${c.label}</title>` : ''}
  <defs>
    <radialGradient id="${u}bg" cx="42%" cy="35%" r="70%"><stop offset="0" stop-color="${c.light}"/><stop offset=".55" stop-color="${c.main}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>
    <linearGradient id="${u}rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c2"/><stop offset=".35" stop-color="#d9a64e"/><stop offset=".7" stop-color="#7a4f16"/><stop offset="1" stop-color="#e8c06a"/></linearGradient>
    <linearGradient id="${u}steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b9c4cf"/><stop offset="1" stop-color="#5d6b78"/></linearGradient>
    <linearGradient id="${u}gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#e0a83c"/><stop offset="1" stop-color="#7a4a10"/></linearGradient>
    <linearGradient id="${u}skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd2a0"/><stop offset=".6" stop-color="#e89a5a"/><stop offset="1" stop-color="#b4602a"/></linearGradient>
    <linearGradient id="${u}leather" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c88a4a"/><stop offset=".6" stop-color="#8a5226"/><stop offset="1" stop-color="#4a2810"/></linearGradient>
    <linearGradient id="${u}wing" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b8f0cc"/></linearGradient>
    <linearGradient id="${u}page" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e8d6b0"/></linearGradient>
    <radialGradient id="${u}glow"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".5" stop-color="#9fd4ff" stop-opacity=".6"/><stop offset="1" stop-color="#9fd4ff" stop-opacity="0"/></radialGradient>
    <linearGradient id="${u}fire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff7a2a"/><stop offset=".5" stop-color="#ffb347"/><stop offset="1" stop-color="#fff0a0"/></linearGradient>
    <linearGradient id="${u}heart" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2b2ff"/><stop offset=".5" stop-color="#a24fe0"/><stop offset="1" stop-color="#4a1470"/></linearGradient>
    <linearGradient id="${u}gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <circle cx="32" cy="32" r="31" fill="url(#${u}rim)"/>
  <circle cx="32" cy="32" r="27.5" fill="#1a0e06"/>
  <circle cx="32" cy="32" r="26.5" fill="url(#${u}bg)"/>
  <circle cx="32" cy="32" r="23.5" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1"/>
  <g transform="translate(32 32) scale(.82) translate(-32 -32)">${ART[stat](u)}</g>
  <path d="M10 26 A23 23 0 0 1 54 26 A30 18 0 0 0 10 26 Z" fill="url(#${u}gloss)"/>
</svg>`;
}
/** Emblème + nom (« comprendre direct ») */
export const statChip = (stat, value = null, size = 20) => `<span class="stat-chip sc-${stat}" title="${STAT_COLORS[stat]?.label || stat}">${statBadge(stat, size, { title: false })}<b>${STAT_COLORS[stat]?.label || stat}</b>${value != null ? `<em>${value}</em>` : ''}</span>`;
