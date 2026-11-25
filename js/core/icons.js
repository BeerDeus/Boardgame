// Jeu d'icônes SVG maison (trait, couleur = currentColor). Utilisé par toute l'interface + jetons 3D.
const P = {
  back: '<path d="M15 5 8 12l7 7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6"/><circle class="f" cx="12" cy="17" r=".9"/>',
  fullscreen: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  move: '<path d="M8 3h4.5v8.5l5.2 2.2c1.4.6 2.3 1.6 2.3 3V19H6.2L5 14.8 8 11z"/><path d="M5.5 16h14.5"/>',
  action: '<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4.2-2.6 8-6.6 8-2.8 0-4.4-1.6-5.6-3.8L3.3 13A1.5 1.5 0 0 1 5.8 11.4L8 14"/>',
  attack: '<path d="M20 4 9.5 14.5M20 4h-4.5M20 4v4.5M6.5 12.5l5 5M8 16l-4 4M5 15l4 4"/>',
  boost: '<path class="f" d="M12 2.5l2.1 7.4 7.4 2.1-7.4 2.1-2.1 7.4-2.1-7.4L2.5 12l7.4-2.1z"/><circle class="f" cx="19" cy="5" r="1.1"/><circle class="f" cx="5" cy="19" r=".9"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  heart: '<path class="f" d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.5 2.8c0 5.4-7.5 10-7.5 10z"/>',
  place: '<path d="M5.5 21V10.5a6.5 6.5 0 0 1 13 0V21z"/><path d="M3.5 21h17M14 14.5h.01"/>',
  glow: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  horse: '<path d="M7 21h10.5M8.5 21c0-3.5 1.2-5.8 3.3-7.5-2.4.3-4.3-.2-5.5-1.8l3.2-5.2C10.6 5 12.5 4 14.6 4.6c3.4 1.4 4.1 6 2.6 10.4L16.3 21"/><circle class="f" cx="12.6" cy="7.6" r=".8"/>',
  end: '<path class="f" d="M6 5.5 14.5 12 6 18.5z"/><path d="M18 5v14"/>',
  journal: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19M9 7h6M9 10.5h4"/>',
  notes: '<path d="M20 3.5C13.5 4.5 8.6 9.6 6.6 16.6L5 20l3.3-1.4C15.4 16.6 19.6 11 20 3.5z"/><path d="M5 20l6.5-6.5"/>',
  dice: '<path d="M12 2.5 21 9.5 12 21.5 3 9.5z"/><path d="M3 9.5 12 13.5 21 9.5M12 13.5v8"/>',
  herb: '<path d="M5 19.5C5 10.5 11 4.5 20 4.5c0 9-6 15-15 15z"/><path d="M5 19.5l8.5-8.5"/>',
  bag: '<path d="M9 6.5 7.5 3.5h9L15 6.5"/><path d="M9 6.5h6c3.5 2.6 5.5 6.2 5.5 9.6 0 2.9-2.4 4.4-8.5 4.4s-8.5-1.5-8.5-4.4c0-3.4 2-7 5.5-9.6z"/><path d="M8.5 9.5h7"/><circle class="f" cx="12" cy="14.5" r="1.3"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><path d="M12 9.5v5"/>',
  moon: '<path d="M18.5 15.5A8 8 0 0 1 8.5 5.5a8 8 0 1 0 10 10z"/>',
  flask: '<path d="M9 3h6M10 3v5.5L5.2 17.6A2.2 2.2 0 0 0 7.1 21h9.8a2.2 2.2 0 0 0 1.9-3.4L14 8.5V3"/><path d="M7.5 15h9"/>',
  scroll: '<path d="M8 4h10.5A1.5 1.5 0 0 1 20 5.5V18H10"/><path d="M8 4a2 2 0 0 0-2 2v12a2 2 0 0 0 4 0V6a2 2 0 0 0-2-2zM13 8h4M13 11.5h4"/>',
  drop: '<path d="M12 3c3.2 4.2 6 7.8 6 11a6 6 0 0 1-12 0c0-3.2 2.8-6.8 6-11z"/>',
  key: '<circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21M17 12v3.5M20 12v2.5"/>',
  skull: '<path d="M12 3a7.5 7.5 0 0 0-5 13v3h10v-3a7.5 7.5 0 0 0-5-13z"/><circle class="f" cx="9.2" cy="11.5" r="1.6"/><circle class="f" cx="14.8" cy="11.5" r="1.6"/><path d="M10.5 19v2M13.5 19v2"/>',
  cross: '<path d="M12 3v18M7 8h10"/>',
  rune: '<path d="M8 3v18M8 4l7 4-7 4 8 9"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle class="f" cx="12" cy="12" r="2.8"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  map: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
  shuffle: '<path d="M3 7h3.5c4 0 6 10 10 10H21M3 17h3.5c1.6 0 2.8-1.6 3.9-3.6M14 10c1-1.7 1.9-3 3.5-3H21M18.5 4.5 21 7l-2.5 2.5M18.5 14.5 21 17l-2.5 2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/>',
  camp: '<path d="M3 20 12 4l9 16zM9.5 20 12 15l2.5 5"/>',
  person: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5c.8-4 3.5-6.5 7-6.5s6.2 2.5 7 6.5"/>',
  // Statistiques (même trait que le reste de l'interface)
  force: '<path d="M6.5 11.5V9a1.6 1.6 0 0 1 3.2 0v2"/><path d="M9.7 10.5V8a1.6 1.6 0 0 1 3.2 0v2.5"/><path d="M12.9 10.5V8.5a1.6 1.6 0 0 1 3.2 0V11"/><path d="M16.1 11V9.8a1.6 1.6 0 0 1 3.2 0v3.7c0 4-2.6 7-6.6 7h-1c-3.4 0-6.2-2.6-6.2-6v-2.4a1.6 1.6 0 0 1 1-1.5"/><path d="M6.5 13.6h5a1.7 1.7 0 0 0 0-3.4H8.3"/>',
  agilite: '<path d="M20 4c-5.5.5-10 4.6-11 10.5L8 20"/><path d="M20 4c0 5.5-4 9.8-10.7 10.4"/><path d="M11.5 12.4l4-1.2M13.6 9.4l3.4-1"/><path d="M2.8 9.5h3.4M2.2 13h3.2M3.2 16.5h2.6"/>',
  intelligence: '<path d="M12 8C10.2 6.5 7.3 6 4 6.5v12c3.3-.5 6.2 0 8 1.5 1.8-1.5 4.7-2 8-1.5v-12C16.7 6 13.8 6.5 12 8z"/><path d="M12 8v12"/><path class="f" d="M12 1.6l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/>',
  volonte: '<path d="M12 21.5c-3.7 0-6.3-2.6-6.3-6.1 0-3.7 2.8-5.6 3.7-9.4 1.7 1.3 2.6 3 2.6 5 1.3-.9 2.1-2.5 2.1-5 2.8 2.2 4.2 5.4 4.2 9.3 0 3.6-2.6 6.2-6.3 6.2z"/><path d="M12 21.5c-1.6 0-2.7-1.1-2.7-2.7 0-1.7 1.6-2.7 2.7-4.4 1.1 1.7 2.7 2.7 2.7 4.4 0 1.6-1.1 2.7-2.7 2.7z"/>',
  combat: '<path d="M4 4l11 11M13 17l4-4M15 15l3.4 3.4M20 4 9 15M11 17l-4-4M9 15l-3.4 3.4"/><circle class="f" cx="19.2" cy="19.2" r="1.2"/><circle class="f" cx="4.8" cy="19.2" r="1.2"/>',
  quill: '<path d="M20 3.5C13.5 4.5 8.6 9.6 6.6 16.6L5 20l3.3-1.4C15.4 16.6 19.6 11 20 3.5z"/>',
};
export const ICON_NAMES = Object.keys(P);
export function icon(name, cls = '') {
  const body = P[name] || P.help;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}
/** Version autonome (couleur figée) pour Image/Canvas (jetons 3D) */
export function iconSVGString(name, color = '#e8c165', stroke = 1.8) {
  const body = (P[name] || P.help).replace(/class="f"/g, `fill="${color}" stroke="none"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
export const iconDataUrl = (name, color, stroke) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSVGString(name, color, stroke))}`;
