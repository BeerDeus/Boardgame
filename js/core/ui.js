// HUD commun : barre du haut, menu de test, toasts, FPS, barre de groupe, aide, chargement.
import { figureSVG } from './art.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function createUI({ title, subtitle }) {
  const root = document.getElementById('hud');
  root.innerHTML = '';

  // Chargement
  const loader = h('div', 'loader', `<div class="loader-box"><div class="loader-title">${title}</div><div class="loader-sub">${subtitle || ''}</div><div class="bar"><i></i></div><div class="loader-label">Chargement…</div></div>`);
  root.append(loader);

  // Barre du haut
  const top = h('div', 'topbar');
  top.innerHTML = `
    <a class="btn round" href="index.html" title="Retour au hub" aria-label="Retour au hub">‹</a>
    <div class="title"><b>${title}</b><span>${subtitle || ''}</span></div>
    <div class="spacer"></div>
    <div class="fps" hidden>-- fps</div>
    <button class="btn round" data-act="help" title="Aide" aria-label="Aide">?</button>
    <button class="btn round" data-act="fs" title="Plein écran" aria-label="Plein écran">⛶</button>
    <button class="btn round accent" data-act="menu" title="Menu de test" aria-label="Menu de test">☰</button>`;
  root.append(top);
  const fpsEl = top.querySelector('.fps');

  // Barre de groupe (héros)
  const party = h('div', 'party'); root.append(party);
  // Toasts
  const toasts = h('div', 'toasts'); root.append(toasts);
  // Vignette cinématique
  const vignette = h('div', 'vignette'); root.append(vignette);
  // Menu
  const scrim = h('div', 'scrim'); const drawer = h('aside', 'drawer'); root.append(scrim, drawer);
  // Aide
  const help = h('div', 'help-overlay', `
    <div class="help-card">
      <h2>Contrôles</h2>
      <div class="help-grid">
        <div><b>1 doigt</b><span>Glisser : déplacer la vue (avec inertie)</span></div>
        <div><b>2 doigts</b><span>Pincer : zoom · Tourner : rotation</span></div>
        <div><b>Tap</b><span>Héros : sélection · Tuile : déplacement / exploration</span></div>
        <div><b>Double-tap</b><span>Zoom sur le point touché</span></div>
        <div><b>Appui long</b><span>Infos de la tuile</span></div>
        <div><b>Souris</b><span>Gauche : pan · Droit/Shift : orbite · Molette : zoom</span></div>
      </div>
      <p class="muted">Le zoom règle aussi l'inclinaison : de loin vue « carte », de près vue « figurine ».</p>
      <button class="btn wide" data-act="close-help">Compris</button>
    </div>`);
  root.append(help);
  // Orientation
  root.append(h('div', 'rotate-overlay', `<div><div class="rot-icon">⟲</div>Tournez l'appareil en mode paysage</div>`));

  const openMenu = v => { drawer.classList.toggle('open', v); scrim.classList.toggle('open', v); };
  scrim.onclick = () => openMenu(false);
  top.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'menu') openMenu(!drawer.classList.contains('open'));
    if (act === 'help') help.classList.add('open');
    if (act === 'fs') toggleFullscreen();
  });
  help.addEventListener('click', e => { if (e.target === help || e.target.dataset.act === 'close-help') help.classList.remove('open'); });

  const ui = {
    root,
    progress(p, label) { loader.querySelector('.bar i').style.width = `${Math.round(p * 100)}%`; if (label) loader.querySelector('.loader-label').textContent = label; },
    loaded() { loader.classList.add('done'); setTimeout(() => loader.remove(), 600); },
    error(msg) { loader.querySelector('.loader-label').innerHTML = `<span class="err">${msg}</span>`; },
    toast(msg, ms = 2200) {
      const t = h('div', 'toast', msg); toasts.append(t);
      requestAnimationFrame(() => t.classList.add('in'));
      setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, ms);
      while (toasts.children.length > 3) toasts.firstChild.remove();
    },
    setFps(n) { fpsEl.textContent = `${n} fps`; },
    showFps(v) { fpsEl.hidden = !v; },
    vignette(v) { vignette.classList.toggle('on', v); root.classList.toggle('cinematic', v); },
    closeMenu: () => openMenu(false),
    showHelp: () => help.classList.add('open'),
    setParty(list, onPick) {
      party.innerHTML = '';
      for (const f of list) {
        const b = h('button', 'portrait', `<div class="pimg" style="--c:${f.color}">${figureSVG(f.kind, f.color, { portrait: true })}</div><span>${f.name}</span>`);
        b.dataset.id = f.id; b.onclick = () => onPick(f.id); party.append(b);
      }
    },
    setActive(id) { for (const b of party.children) b.classList.toggle('active', b.dataset.id === id); },
    buildMenu(sections) {
      drawer.innerHTML = '<div class="drawer-head"><b>Menu de test</b><button class="btn round small" data-close>✕</button></div>';
      drawer.querySelector('[data-close]').onclick = () => openMenu(false);
      for (const s of sections) {
        const sec = h('section', 'menu-sec', `<h3>${s.title}</h3>`);
        for (const it of s.items) {
          if (it.type === 'toggle') {
            const row = h('label', 'row toggle', `<span>${it.label}</span><input type="checkbox" ${it.value ? 'checked' : ''}><i></i>`);
            row.querySelector('input').onchange = e => it.onChange(e.target.checked);
            sec.append(row);
          } else if (it.type === 'seg') {
            const row = h('div', 'row seg', `<span>${it.label}</span><div class="segs"></div>`);
            const segs = row.querySelector('.segs');
            for (const o of it.options) {
              const b = h('button', o.value === it.value ? 'on' : '', o.label);
              b.onclick = () => { segs.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); it.onChange(o.value); };
              segs.append(b);
            }
            sec.append(row);
          } else {
            const b = h('button', 'btn wide' + (it.primary ? ' accent' : ''), it.label);
            b.onclick = () => { if (it.close !== false) openMenu(false); it.action(); };
            sec.append(b);
          }
        }
        drawer.append(sec);
      }
      const foot = h('div', 'menu-foot', `<a class="btn wide ghost" href="index.html">‹ Retour au hub</a>`);
      drawer.append(foot);
    },
  };
  return ui;
}

export function toggleFullscreen() {
  const d = document, el = d.documentElement;
  if (!d.fullscreenElement && !d.webkitFullscreenElement) {
    const p = (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    Promise.resolve(p).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  } else (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
}
