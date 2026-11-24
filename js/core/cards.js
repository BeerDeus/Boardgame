// Cartes d'objets physiques (format poker 63 × 88 mm) : recto illustré + verso commun, en SVG.
// Utilisées par le jeu (« Prenez la carte », « Défaussez la carte ») et par la planche d'impression (cards.html).
import { iconSVGString } from './icons.js';

export const CARD_MM = { w: 63, h: 88 };
export const ITEM_TYPES = { conso: 'Consommable', quete: 'Objet de quête', equip: 'Équipement', relique: 'Relique' };
const TYPE_COLORS = { conso: '#3f8a4a', quete: '#a2782a', equip: '#3f6aa8', relique: '#7a3fa8' };

let uid = 0;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Texte HTML léger → texte brut */
export const plain = s => String(s ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
/** Découpe un texte en lignes d'environ `max` caractères */
function wrap(text, max) {
  const out = []; let line = '';
  for (const w of plain(text).split(' ')) {
    if (!w) continue;
    if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  return out;
}

// ------------------------------------------------------------------ illustrations (zone 500 × 400, origine 0,0)
export const ART = {
  herbes: u => `
    <ellipse cx="250" cy="360" rx="150" ry="22" fill="#000" opacity=".25"/>
    <g stroke="#1f3a14" stroke-width="5" stroke-linejoin="round">
      <path d="M250 340 C200 260 130 220 80 120 C170 140 230 200 250 340Z" fill="url(#${u}leaf)"/>
      <path d="M250 340 C300 250 370 210 420 110 C330 130 270 200 250 340Z" fill="url(#${u}leaf)"/>
      <path d="M250 340 C230 240 240 140 250 50 C275 140 275 240 250 340Z" fill="url(#${u}leaf2)"/>
      <path d="M250 340 C210 290 170 280 120 250 C180 240 220 270 250 340Z" fill="url(#${u}leaf2)"/>
      <path d="M250 340 C290 290 330 280 380 250 C320 240 280 270 250 340Z" fill="url(#${u}leaf2)"/>
    </g>
    <g fill="none" stroke="#d8f0a0" stroke-width="3" opacity=".7"><path d="M250 330 C240 230 245 150 250 70"/><path d="M245 330 C190 250 140 200 95 135"/><path d="M255 330 C310 250 360 200 405 125"/></g>
    <rect x="215" y="300" width="70" height="34" rx="8" fill="#8a5a2a" stroke="#3a2210" stroke-width="5"/>
    <path d="M222 317h56" stroke="#d9b070" stroke-width="4"/>
    <g fill="#f4e07a"><circle cx="175" cy="150" r="9"/><circle cx="330" cy="145" r="8"/><circle cx="250" cy="95" r="7"/></g>`,
  huile: u => `
    <ellipse cx="250" cy="365" rx="140" ry="20" fill="#000" opacity=".25"/>
    <path d="M190 120 h120 v30 c40 20 70 60 70 120 c0 60 -50 95 -130 95 s-130 -35 -130 -95 c0 -60 30 -100 70 -120z" fill="url(#${u}glass)" stroke="#2a1a08" stroke-width="7"/>
    <path d="M140 270 c0 50 45 80 110 80 s110 -30 110 -80 c-20 15 -60 25 -110 25 s-90 -10 -110 -25z" fill="url(#${u}oil)" opacity=".95"/>
    <rect x="195" y="70" width="110" height="55" rx="10" fill="#7a4a1a" stroke="#2a1a08" stroke-width="7"/>
    <path d="M205 85h90M205 100h90" stroke="#c9905a" stroke-width="5"/>
    <path d="M175 190 c-10 30 -10 60 0 90" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".45" fill="none"/>
    <path d="M240 240 c-25 -40 -10 -70 10 -95 c20 30 35 55 10 95z" fill="url(#${u}fire)" opacity=".9"/>`,
  eau: u => `
    <ellipse cx="250" cy="365" rx="120" ry="18" fill="#000" opacity=".25"/>
    <path d="M215 60h70v70c55 25 85 75 85 135c0 65-55 100-120 100s-120-35-120-100c0-60 30-110 85-135z" fill="url(#${u}glass)" stroke="#1a2a3a" stroke-width="7"/>
    <path d="M140 260c0 55 45 90 110 90s110-35 110-90c-25 14-65 22-110 22s-85-8-110-22z" fill="url(#${u}water)"/>
    <rect x="205" y="40" width="90" height="30" rx="8" fill="#c9a45c" stroke="#3a2a10" stroke-width="6"/>
    <path d="M250 175v120M215 215h70" stroke="#fff6d0" stroke-width="16" stroke-linecap="round"/>
    <path d="M250 175v120M215 215h70" stroke="#e8c56a" stroke-width="8" stroke-linecap="round"/>
    <circle cx="250" cy="230" r="120" fill="url(#${u}halo)"/>
    <path d="M175 180c-12 30-12 70 0 100" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".5" fill="none"/>`,
  poupee: u => `
    <ellipse cx="250" cy="370" rx="130" ry="18" fill="#000" opacity=".25"/>
    <path d="M200 175 L120 250 L150 270 L210 215Z M300 175 L380 250 L350 270 L290 215Z" fill="#c98a5a" stroke="#4a2a14" stroke-width="6" stroke-linejoin="round"/>
    <path d="M195 165 h110 l35 175 h-180z" fill="url(#${u}cloth)" stroke="#4a2a14" stroke-width="7" stroke-linejoin="round"/>
    <path d="M205 230 h90 M200 270 h100 M193 310 h115" stroke="#e8d0a0" stroke-width="5" stroke-dasharray="12 9"/>
    <path d="M215 340 l-10 30 h35 l5 -30z M285 340 l10 30 h-35 l-5 -30z" fill="#7a4a2a" stroke="#4a2a14" stroke-width="5"/>
    <circle cx="250" cy="115" r="62" fill="#f0d2a8" stroke="#4a2a14" stroke-width="7"/>
    <path d="M190 100 c10 -55 110 -60 120 0 c-15 -20 -30 -25 -60 -25 s-45 5 -60 25z" fill="#a8502a" stroke="#4a2a14" stroke-width="5"/>
    <path d="M190 105 c-25 30 -20 70 -5 95 M310 105 c25 30 20 70 5 95" stroke="#a8502a" stroke-width="14" stroke-linecap="round" fill="none"/>
    <g fill="#2a1a10"><circle cx="232" cy="117" r="9"/><circle cx="268" cy="117" r="9"/></g><g fill="#f0d2a8"><circle cx="229" cy="114" r="2.5"/><circle cx="265" cy="114" r="2.5"/></g>
    <path d="M232 145 q18 14 36 0" stroke="#8a2a2a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="215" cy="135" r="9" fill="#e89a8a" opacity=".7"/><circle cx="285" cy="135" r="9" fill="#e89a8a" opacity=".7"/>`,
  cle: u => `
    <ellipse cx="250" cy="360" rx="160" ry="18" fill="#000" opacity=".25"/>
    <g transform="rotate(-30 250 210)">
      <circle cx="150" cy="210" r="70" fill="none" stroke="url(#${u}metal)" stroke-width="30"/>
      <circle cx="150" cy="210" r="70" fill="none" stroke="#2a1a08" stroke-width="4"/><circle cx="150" cy="210" r="40" fill="none" stroke="#2a1a08" stroke-width="4"/>
      <rect x="215" y="195" width="215" height="30" rx="6" fill="url(#${u}metal)" stroke="#2a1a08" stroke-width="5"/>
      <path d="M360 222 v50 h25 v-25 h20 v40 h25 v-65z" fill="url(#${u}metal)" stroke="#2a1a08" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="150" cy="210" r="14" fill="#c93a2a" stroke="#2a1a08" stroke-width="4"/>
    </g>`,
  pierre: u => `
    <ellipse cx="250" cy="355" rx="160" ry="20" fill="#000" opacity=".25"/>
    <path d="M110 300 L150 170 L250 120 L360 160 L400 280 L320 345 L170 345Z" fill="url(#${u}stone)" stroke="#1a1a22" stroke-width="7" stroke-linejoin="round"/>
    <path d="M150 170 L230 220 L250 120 M230 220 L320 345 M230 220 L400 280 M230 220 L110 300" stroke="#0e0e14" stroke-width="3" opacity=".55" fill="none"/>
    <path d="M150 170 L250 120 L230 220Z" fill="#fff" opacity=".12"/>
    <g fill="#ffd36a"><path d="M380 120 l10 30 30 10 -30 10 -10 30 -10 -30 -30 -10 30 -10z"/><circle cx="430" cy="210" r="7"/><circle cx="345" cy="95" r="5"/><circle cx="415" cy="90" r="4"/></g>
    <path d="M300 200 l60 -55" stroke="#ffb347" stroke-width="5" stroke-linecap="round"/>`,
  lettre: u => `
    <ellipse cx="250" cy="360" rx="170" ry="18" fill="#000" opacity=".25"/>
    <path d="M95 110 h260 c25 0 40 15 40 40 v190 h-270 c-20 0 -30 -15 -30 -30z" fill="url(#${u}paper)" stroke="#5a3a1a" stroke-width="6"/>
    <path d="M355 110 c25 0 45 15 45 40 s-20 35 -40 35 h-5" fill="#e8d2a0" stroke="#5a3a1a" stroke-width="6"/>
    <g stroke="#6a4a2a" stroke-width="5" stroke-linecap="round" opacity=".7"><path d="M130 160h190M130 195h170M130 230h185M130 265h120"/></g>
    <circle cx="310" cy="295" r="34" fill="#a8222a" stroke="#4a0a0a" stroke-width="5"/>
    <path d="M296 282 l14 26 14 -26" stroke="#ffb0a0" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  lanterne: u => `
    <ellipse cx="250" cy="365" rx="110" ry="16" fill="#000" opacity=".25"/>
    <circle cx="250" cy="230" r="140" fill="url(#${u}halo)"/>
    <path d="M215 55 a35 35 0 0 1 70 0" stroke="#2a1a08" stroke-width="9" fill="none"/>
    <path d="M185 90 h130 l-20 -30 h-90z" fill="url(#${u}metal)" stroke="#2a1a08" stroke-width="6" stroke-linejoin="round"/>
    <rect x="180" y="90" width="140" height="210" rx="12" fill="#ffcf6a" opacity=".35" stroke="#2a1a08" stroke-width="7"/>
    <path d="M250 255 c-35 -45 -10 -85 0 -110 c15 30 40 60 0 110z" fill="url(#${u}fire)"/>
    <path d="M180 140h140M180 250h140M250 90v210" stroke="#2a1a08" stroke-width="6" opacity=".7"/>
    <path d="M170 300 h160 v40 h-160z" fill="url(#${u}metal)" stroke="#2a1a08" stroke-width="6"/>`,
  pain: u => `
    <ellipse cx="250" cy="350" rx="170" ry="20" fill="#000" opacity=".25"/>
    <path d="M90 270 c0 -90 70 -150 160 -150 s160 60 160 150 c0 40 -40 60 -160 60 s-160 -20 -160 -60z" fill="url(#${u}bread)" stroke="#4a2a10" stroke-width="7"/>
    <g stroke="#f4d49a" stroke-width="8" stroke-linecap="round" opacity=".85"><path d="M150 210 l40 -40M215 195 l45 -50M285 200 l40 -40"/></g>`,
  silex: u => `
    <ellipse cx="250" cy="355" rx="150" ry="20" fill="#000" opacity=".25"/>
    <path d="M130 300 C120 230 170 150 250 135 C330 120 390 180 385 250 C380 320 320 350 250 350 C190 350 140 340 130 300Z" fill="url(#${u}stone)" stroke="#0e0e14" stroke-width="7"/>
    <path d="M170 190 C210 160 260 150 300 160" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".25" fill="none"/>
    <path d="M200 260 l40 -25 35 30 45 -20" stroke="#0e0e14" stroke-width="4" opacity=".6" fill="none"/>
    <g fill="#ffd36a"><path d="M395 140 l7 22 22 7 -22 7 -7 22 -7 -22 -22 -7 22 -7z"/><circle cx="420" cy="210" r="5"/><circle cx="370" cy="110" r="4"/></g>`,
  briquet: u => `
    <ellipse cx="250" cy="360" rx="170" ry="20" fill="#000" opacity=".25"/>
    <path d="M90 250 C90 180 140 150 200 150 H300 C360 150 410 180 410 250" fill="none" stroke="url(#${u}metal)" stroke-width="34" stroke-linecap="round"/>
    <path d="M90 250 C90 180 140 150 200 150 H300 C360 150 410 180 410 250" fill="none" stroke="#2a1a08" stroke-width="4" stroke-linecap="round"/>
    <path d="M90 250 c-10 25 10 40 30 30 M410 250 c10 25 -10 40 -30 30" fill="none" stroke="url(#${u}metal)" stroke-width="22" stroke-linecap="round"/>
    <rect x="150" y="190" width="200" height="60" rx="10" fill="#c98a4a" stroke="#3a2208" stroke-width="5"/>
    <path d="M165 205h170M165 235h170" stroke="#8a5226" stroke-width="4"/>
    <path d="M235 300 C220 270 250 250 255 225 C275 255 290 280 265 305Z" fill="url(#${u}fire)"/>
    <g fill="#ffd36a"><circle cx="210" cy="275" r="6"/><circle cx="300" cy="270" r="5"/><circle cx="320" cy="300" r="4"/><circle cx="185" cy="305" r="4"/></g>`,
  medaillon: u => `
    <ellipse cx="250" cy="360" rx="130" ry="18" fill="#000" opacity=".25"/>
    <path d="M190 40 C210 90 230 110 250 120 C270 110 290 90 310 40" fill="none" stroke="url(#${u}gold)" stroke-width="7" stroke-dasharray="4 6"/>
    <circle cx="250" cy="235" r="115" fill="url(#${u}gold)" stroke="#3a2208" stroke-width="6"/>
    <circle cx="250" cy="235" r="90" fill="#7a4a10" stroke="#3a2208" stroke-width="4"/>
    <circle cx="250" cy="235" r="82" fill="url(#${u}gold)" opacity=".85"/>
    <path d="M250 175 L268 215 L312 220 L278 248 L288 292 L250 270 L212 292 L222 248 L188 220 L232 215Z" fill="#5a3a10" opacity=".75"/>
    <rect x="238" y="112" width="24" height="18" rx="5" fill="url(#${u}gold)" stroke="#3a2208" stroke-width="4"/>
    <path d="M190 175 C210 160 230 155 250 155" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".5" fill="none"/>`,
  anneau: u => `
    <ellipse cx="250" cy="350" rx="130" ry="18" fill="#000" opacity=".25"/>
    <ellipse cx="250" cy="250" rx="120" ry="85" fill="none" stroke="url(#${u}gold)" stroke-width="34"/>
    <ellipse cx="250" cy="250" rx="120" ry="85" fill="none" stroke="#3a2208" stroke-width="4"/>
    <ellipse cx="250" cy="250" rx="86" ry="52" fill="none" stroke="#3a2208" stroke-width="4"/>
    <path d="M215 160 l35 -55 35 55 -35 30z" fill="url(#${u}gem)" stroke="#1a0a2a" stroke-width="5" stroke-linejoin="round"/>
    <path d="M232 150 l18 -28" stroke="#fff" stroke-width="5" opacity=".7" stroke-linecap="round"/>`,
};
export const ART_NAMES = { herbes: 'Herbes', huile: 'Flacon d\'huile', eau: 'Fiole bénite', poupee: 'Poupée', cle: 'Clé', pierre: 'Pierre étincelante', silex: 'Silex noir', briquet: 'Briquet (pierre à feu forgée)', lettre: 'Lettre scellée', medaillon: 'Médaillon', lanterne: 'Lanterne', pain: 'Pain', anneau: 'Anneau' };
const ICON_ART = { herb: 'herbes', flask: 'huile', drop: 'eau', person: 'poupee', key: 'cle', scroll: 'lettre' };

const defs = u => `
  <linearGradient id="${u}parch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e4bf"/><stop offset=".6" stop-color="#e6d0a0"/><stop offset="1" stop-color="#cfb27a"/></linearGradient>
  <radialGradient id="${u}vig" cx="50%" cy="45%" r="70%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#4a2e10" stop-opacity=".45"/></radialGradient>
  <linearGradient id="${u}rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c2"/><stop offset=".35" stop-color="#c9963e"/><stop offset=".7" stop-color="#6a4212"/><stop offset="1" stop-color="#e8c06a"/></linearGradient>
  <radialGradient id="${u}scene" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#5a4a3a"/><stop offset=".7" stop-color="#2a1e16"/><stop offset="1" stop-color="#120c08"/></radialGradient>
  <linearGradient id="${u}leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8e06a"/><stop offset="1" stop-color="#3f7a2a"/></linearGradient>
  <linearGradient id="${u}leaf2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8f08a"/><stop offset="1" stop-color="#5a9a3a"/></linearGradient>
  <linearGradient id="${u}glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe6e0" stop-opacity=".55"/><stop offset=".5" stop-color="#8ab0a8" stop-opacity=".35"/><stop offset="1" stop-color="#3a5a5a" stop-opacity=".6"/></linearGradient>
  <linearGradient id="${u}oil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd36a"/><stop offset="1" stop-color="#b8701a"/></linearGradient>
  <linearGradient id="${u}water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ff"/><stop offset="1" stop-color="#3a7ab8"/></linearGradient>
  <linearGradient id="${u}fire" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff7a2a"/><stop offset=".5" stop-color="#ffb347"/><stop offset="1" stop-color="#fff0a0"/></linearGradient>
  <radialGradient id="${u}halo"><stop offset="0" stop-color="#fff6c0" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c0" stop-opacity="0"/></radialGradient>
  <linearGradient id="${u}cloth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8665a"/><stop offset="1" stop-color="#8a2a2a"/></linearGradient>
  <linearGradient id="${u}metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0d890"/><stop offset=".5" stop-color="#a87a2a"/><stop offset="1" stop-color="#5a3a10"/></linearGradient>
  <linearGradient id="${u}gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#e0a83c"/><stop offset="1" stop-color="#7a4a10"/></linearGradient>
  <linearGradient id="${u}stone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a8a9a"/><stop offset=".6" stop-color="#4a4a5a"/><stop offset="1" stop-color="#22222c"/></linearGradient>
  <linearGradient id="${u}paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf0d0"/><stop offset="1" stop-color="#d8bf88"/></linearGradient>
  <linearGradient id="${u}bread" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8a050"/><stop offset="1" stop-color="#8a4a1a"/></linearGradient>
  <linearGradient id="${u}gem" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d0a0ff"/><stop offset="1" stop-color="#4a1a8a"/></linearGradient>
  <linearGradient id="${u}leather" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a2a18"/><stop offset=".5" stop-color="#2a160c"/><stop offset="1" stop-color="#160a04"/></linearGradient>`;

/**
 * Recto d'une carte d'objet. item = { name, type, desc, effect, code, art, icon }
 * opts.width / opts.height : taille CSS (par défaut 63 mm × 88 mm pour l'impression)
 */
export function itemCardSVG(item, { width = `${CARD_MM.w}mm`, height = `${CARD_MM.h}mm`, cls = 'item-card' } = {}) {
  const u = `ic${++uid}_`;
  const type = item.type || (item.keep ? 'conso' : 'quete');
  const tc = TYPE_COLORS[type] || '#a2782a';
  const artKey = ART[item.art] ? item.art : ICON_ART[item.icon];
  const art = artKey ? ART[artKey](u) : `<svg x="110" y="60" width="280" height="280" viewBox="0 0 24 24">${iconSVGString(item.icon || 'coin', '#e8c56a', 1.4).replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/^/, '<g fill="none" stroke="#e8c56a" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">') + '</g>'}</svg>`;
  const name = item.name || '?';
  const nameSize = name.length > 22 ? 34 : name.length > 16 ? 40 : 46;
  let lines = wrap(item.effect || item.desc || '', 26), fs = 34;
  if (lines.length > 4) { lines = wrap(item.effect || item.desc || '', 31).slice(0, 6); fs = 28; }
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 880" width="${width}" height="${height}" role="img" aria-label="Carte ${esc(name)}">
  <defs>${defs(u)}<clipPath id="${u}clip"><rect x="62" y="150" width="506" height="400" rx="18"/></clipPath></defs>
  <rect width="630" height="880" rx="34" fill="#1a1008"/>
  <rect x="14" y="14" width="602" height="852" rx="26" fill="url(#${u}rim)"/>
  <rect x="26" y="26" width="578" height="828" rx="20" fill="url(#${u}parch)"/>
  <rect x="26" y="26" width="578" height="828" rx="20" fill="url(#${u}vig)"/>
  <rect x="40" y="40" width="550" height="800" rx="16" fill="none" stroke="#7a5a2a" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>
  <!-- titre -->
  <path d="M60 60 h510 l-14 36 l14 36 h-510 l14 -36z" fill="#2a1a0c" stroke="url(#${u}rim)" stroke-width="5"/>
  <text x="315" y="${96 + nameSize * 0.34}" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="${nameSize}" fill="#f6e2a8">${esc(name)}</text>
  <!-- illustration -->
  <rect x="58" y="146" width="514" height="408" rx="22" fill="url(#${u}rim)"/>
  <g clip-path="url(#${u}clip)"><rect x="62" y="150" width="506" height="400" fill="url(#${u}scene)"/>
    <circle cx="315" cy="330" r="190" fill="url(#${u}halo)" opacity=".5"/>
    <g transform="translate(65 150)">${art}</g></g>
  <!-- type -->
  <path d="M120 540 h390 l-20 26 20 26 h-390 l20 -26z" fill="${tc}" stroke="#1a1008" stroke-width="4"/>
  <text x="315" y="576" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="26" fill="#fff6dc" letter-spacing="3">${esc((ITEM_TYPES[type] || type).toUpperCase())}</text>
  <!-- effet -->
  <rect x="62" y="608" width="506" height="196" rx="14" fill="#fff8e4" fill-opacity=".55" stroke="#8a6a3a" stroke-width="3"/>
  <text font-family="'EB Garamond', Georgia, serif" font-size="${fs}" fill="#2a1a0c" text-anchor="middle">${lines.map((l, i) => `<tspan x="315" y="${706 - (lines.length - 1) * fs * 0.62 + i * fs * 1.24}">${esc(l)}</tspan>`).join('')}</text>
  <!-- pied -->
  <text x="70" y="836" font-family="Cinzel, Georgia, serif" font-size="20" fill="#6a4a1a" letter-spacing="2">GRIMOIRE · BRUMEVAL</text>
  <rect x="452" y="812" width="116" height="34" rx="8" fill="#2a1a0c"/>
  <text x="510" y="837" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="24" fill="#f6e2a8">${esc(item.code || 'O-??')}</text>
</svg>`;
}

/** Verso commun des cartes d'objets */
export function cardBackSVG({ width = `${CARD_MM.w}mm`, height = `${CARD_MM.h}mm`, cls = 'item-card back' } = {}) {
  const u = `cb${++uid}_`;
  const rays = Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8, r1 = i % 2 ? 70 : 60, r2 = i % 2 ? 150 : 185; return `<path d="M${315 + Math.cos(a) * r1} ${440 + Math.sin(a) * r1} L${315 + Math.cos(a) * r2} ${440 + Math.sin(a) * r2}"/>`; }).join('');
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 880" width="${width}" height="${height}" role="img" aria-label="Verso carte objet">
  <defs>${defs(u)}<pattern id="${u}pat" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M30 4 L56 30 L30 56 L4 30Z" fill="none" stroke="#c9963e" stroke-opacity=".18" stroke-width="3"/></pattern></defs>
  <rect width="630" height="880" rx="34" fill="#1a1008"/>
  <rect x="14" y="14" width="602" height="852" rx="26" fill="url(#${u}rim)"/>
  <rect x="26" y="26" width="578" height="828" rx="20" fill="url(#${u}leather)"/>
  <rect x="26" y="26" width="578" height="828" rx="20" fill="url(#${u}pat)"/>
  <rect x="52" y="52" width="526" height="776" rx="16" fill="none" stroke="url(#${u}rim)" stroke-width="5"/>
  <rect x="66" y="66" width="498" height="748" rx="12" fill="none" stroke="#c9963e" stroke-opacity=".5" stroke-width="2"/>
  <g stroke="url(#${u}rim)" stroke-width="7" stroke-linecap="round">${rays}</g>
  <circle cx="315" cy="440" r="118" fill="#1a0e06" stroke="url(#${u}rim)" stroke-width="10"/>
  <circle cx="315" cy="440" r="96" fill="none" stroke="#c9963e" stroke-opacity=".6" stroke-width="3"/>
  <g transform="translate(315 440)" fill="none" stroke="url(#${u}rim)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-40 -55 h80 v110 h-80z M-40 -55 c-25 0 -25 30 0 30 M-20 -30 h40 M-20 -5 h40 M-20 20 h30"/>
  </g>
  <text x="315" y="160" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="54" fill="#e8c06a" letter-spacing="8">OBJET</text>
  <text x="315" y="760" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="30" fill="#c9963e" letter-spacing="6">GRIMOIRE</text>
</svg>`;
}
