// Point d'intérêt : dessin SVG du médaillon (face) + profil du marqueur 3D.
// Le même profil (POI_PROFILE) sert au plan SVG d'élévation et au tour (LatheGeometry) du pied en 3D.
import { ICON_NAMES } from './icons.js';
import { iconSVGString } from './icons.js';

/** Profil du pied en bronze tourné : [rayon, hauteur] en unités monde, du bas vers le haut. */
export const POI_PROFILE = [
  [0.000, 0.000], [0.046, 0.000], [0.048, 0.006], [0.040, 0.011], [0.030, 0.014], [0.026, 0.020],
  [0.014, 0.028], [0.010, 0.040], [0.009, 0.072], [0.014, 0.078], [0.018, 0.083], [0.012, 0.088], [0.000, 0.090],
];
/** Dimensions du marqueur (unités monde) */
export const POI_DIM = { plinthR: 0.085, plinthH: 0.026, medalR: 0.064, medalT: 0.014, medalY: 0.19 };

const iconBody = name => {
  // corps du pictogramme (sans la balise <svg>), traits arrondis
  const s = iconSVGString(ICON_NAMES.includes(name) ? name : 'help', '#000', 1.8);
  return s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
};

/** Face du médaillon (512×512) : anneau de bronze riveté, émail sombre gravé, pictogramme doré. */
export function poiFaceSVG(icon = 'place', { enamel = ['#8a2a1e', '#3e0d0a', '#170605'] } = {}) {
  const body = iconBody(icon);
  const rivets = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<circle cx="${(256 + Math.cos(a) * 214).toFixed(1)}" cy="${(256 + Math.sin(a) * 214).toFixed(1)}" r="7" fill="url(#rivet)" stroke="#4a2e10" stroke-width="1.5"/>`; }).join('');
  const ticks = Array.from({ length: 36 }, (_, i) => { const a = i * Math.PI / 18, r0 = i % 3 ? 184 : 179, r1 = 192; return `<line x1="${(256 + Math.cos(a) * r0).toFixed(1)}" y1="${(256 + Math.sin(a) * r0).toFixed(1)}" x2="${(256 + Math.cos(a) * r1).toFixed(1)}" y2="${(256 + Math.sin(a) * r1).toFixed(1)}"/>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff3c2"/><stop offset=".28" stop-color="#e9bf66"/><stop offset=".55" stop-color="#a8752b"/><stop offset=".8" stop-color="#e3b35a"/><stop offset="1" stop-color="#7a5019"/>
    </linearGradient>
    <linearGradient id="goldDark" x1="1" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#f0cd7c"/><stop offset=".5" stop-color="#8d5f22"/><stop offset="1" stop-color="#3f2709"/>
    </linearGradient>
    <radialGradient id="enamel" cx="46%" cy="38%" r="65%">
      <stop offset="0" stop-color="${enamel[0]}"/><stop offset=".62" stop-color="${enamel[1]}"/><stop offset="1" stop-color="${enamel[2]}"/>
    </radialGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#ffd98a" stop-opacity=".42"/><stop offset=".6" stop-color="#ffb84a" stop-opacity=".12"/><stop offset="1" stop-color="#ffb84a" stop-opacity="0"/></radialGradient>
    <radialGradient id="rivet" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff8dc"/><stop offset=".5" stop-color="#d9a64e"/><stop offset="1" stop-color="#5a3a12"/></radialGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <circle cx="256" cy="256" r="252" fill="url(#gold)"/>
  <circle cx="256" cy="256" r="236" fill="url(#goldDark)"/>
  <circle cx="256" cy="256" r="230" fill="url(#gold)"/>
  ${rivets}
  <circle cx="256" cy="256" r="201" fill="#1c0b05"/>
  <circle cx="256" cy="256" r="196" fill="url(#enamel)"/>
  <g stroke="#e2b45c" stroke-opacity=".75" stroke-width="3" stroke-linecap="round">${ticks}</g>
  <circle cx="256" cy="256" r="172" fill="none" stroke="#e2b45c" stroke-opacity=".55" stroke-width="2.5"/>
  <circle cx="256" cy="256" r="150" fill="url(#glow)"/>
  <g transform="translate(256 262) scale(8.6) translate(-12 -12)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="#0d0402" stroke-width="3.1" transform="translate(.25 .35)">${body.replace(/fill="#000"/g, 'fill="#0d0402"')}</g>
    <g stroke="#f6d88f" stroke-width="1.9">${body.replace(/stroke="#000"/g, 'stroke="#f6d88f"').replace(/fill="#000"/g, 'fill="#f6d88f"')}</g>
  </g>
  <path d="M 90 205 A 172 172 0 0 1 422 205 A 190 120 0 0 0 90 205 Z" fill="url(#gloss)"/>
</svg>`;
}

/** Plan d'élévation (face) du marqueur complet : socle hexagonal, pied tourné (POI_PROFILE), médaillon, halo. */
export function poiMarkerSVG(icon = 'place') {
  const K = 1800, W = 400, H = 520, cx = W / 2, base = 470; // 1 unité monde = 1800 px
  const P = POI_PROFILE, d = POI_DIM, plH = d.plinthH * K, top = base - plH;
  const prof = [...P.map(([r, y]) => `${(cx + r * K).toFixed(1)},${(top - y * K).toFixed(1)}`), ...P.slice().reverse().map(([r, y]) => `${(cx - r * K).toFixed(1)},${(top - y * K).toFixed(1)}`)].join(' ');
  const mR = d.medalR * K, mY = base - d.medalY * K, hw = d.plinthR * K;
  const face = poiFaceSVG(icon).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/id="/g, 'id="f-').replace(/url\(#/g, 'url(#f-');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="stone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b352f"/><stop offset=".5" stop-color="#6b625a"/><stop offset="1" stop-color="#2a2622"/></linearGradient>
    <linearGradient id="bronze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3a12"/><stop offset=".35" stop-color="#e9c06b"/><stop offset=".6" stop-color="#a7742a"/><stop offset="1" stop-color="#4a2e0c"/></linearGradient>
    <radialGradient id="halo"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#14100d"/>
  <ellipse cx="${cx}" cy="${base + 6}" rx="${hw * 1.25}" ry="12" fill="#000" opacity=".5"/>
  <polygon points="${cx - hw},${base} ${cx - hw / 2},${base + 8} ${cx + hw / 2},${base + 8} ${cx + hw},${base} ${cx + hw},${top} ${cx + hw / 2},${top + 8} ${cx - hw / 2},${top + 8} ${cx - hw},${top}" fill="url(#stone)" stroke="#120e0b" stroke-width="2"/>
  <polygon points="${cx - hw},${top} ${cx - hw / 2},${top - 10} ${cx + hw / 2},${top - 10} ${cx + hw},${top} ${cx + hw / 2},${top + 8} ${cx - hw / 2},${top + 8}" fill="#7d736a" stroke="#120e0b" stroke-width="2"/>
  <polygon points="${prof}" fill="url(#bronze)" stroke="#2a1a08" stroke-width="2"/>
  <circle cx="${cx}" cy="${mY}" r="${mR * 1.9}" fill="url(#halo)"/>
  <rect x="${cx - 3}" y="${mY + mR}" width="6" height="${top - P[P.length - 1][1] * K - (mY + mR)}" fill="#ffd27a" opacity=".35"/>
  <svg x="${cx - mR}" y="${mY - mR}" width="${mR * 2}" height="${mR * 2}" viewBox="0 0 512 512">${face}</svg>
  <text x="${cx}" y="30" fill="#c9a45c" font-family="Georgia,serif" font-size="18" text-anchor="middle">Marqueur de point d'intérêt — élévation</text>
</svg>`;
}
