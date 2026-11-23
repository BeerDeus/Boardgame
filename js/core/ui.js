// HUD commun : barre du haut, menu de test, toasts, FPS, barre de groupe, aide, chargement.
import { figureSVG } from './art.js';
import { sfx } from './sfx.js';
import { settings } from './settings.js';

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
    <div class="clock" hidden></div>
    <div class="spacer"></div>
    <div class="fps" hidden>-- fps</div>
    <button class="btn round" data-act="help" title="Aide" aria-label="Aide">?</button>
    <button class="btn round" data-act="fs" title="Plein écran" aria-label="Plein écran">⛶</button>
    <button class="btn round accent" data-act="menu" title="Menu de test" aria-label="Menu de test">☰</button>`;
  root.append(top);
  const fpsEl = top.querySelector('.fps');

  // Barre de groupe (héros)
  const party = h('div', 'party'); root.append(party);
  // Journal (objectifs), inventaire, actions, dés, textes flottants
  const journal = h('div', 'journal'); root.append(journal);
  journal.onclick = () => journal.classList.toggle('collapsed');
  const inv = h('div', 'inventory'); root.append(inv);
  const actions = h('div', 'actions'); root.append(actions);
  const dice = h('div', 'd100');
  dice.innerHTML = `<div class="d100-card">
      <div class="d100-head"><b class="d100-label"></b><small class="d100-detail"></small></div>
      <div class="d100-target"></div>
      <div class="d100-main">
        <div class="d100-pads">
          <div class="pad-row"><span>Dizaines</span><div class="pad tens">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(t => `<button data-t="${t}">${t}0</button>`).join('')}</div></div>
          <div class="pad-row"><span>Unités</span><div class="pad units">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(u => `<button data-u="${u}">${u}</button>`).join('')}</div></div>
        </div>
        <div class="d100-show"><div class="d10 tens-die">?</div><div class="d10 units-die">?</div><div class="d100-total">—</div></div>
      </div>
      <div class="d100-foot"><button class="btn ghost" data-virtual>🎲 Lancer pour moi</button><button class="btn accent" data-ok disabled>Valider</button></div>
      <div class="d100-res"></div>
    </div>`;
  root.append(dice);
  const floats = h('div', 'floats'); root.append(floats);
  const end = h('div', 'endscreen'); root.append(end);
  const reload = h('div', 'reload-bar', `<span>Ce réglage s'applique au rechargement.</span><button class="btn small">Recharger</button>`);
  reload.querySelector('button').onclick = () => location.reload(); root.append(reload);
  const journalFull = h('div', 'help-overlay journal-full'); root.append(journalFull);
  const turnHud = h('div', 'turnhud'); turnHud.hidden = true; root.append(turnHud);
  const banner = h('div', 'turn-banner'); root.append(banner);
  const modal = h('div', 'cmodal'); root.append(modal);
  journalFull.addEventListener('click', e => { if (e.target === journalFull || e.target.dataset.close != null) journalFull.classList.remove('open'); });
  let journalData = [], invData = [];

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
        <div><b>Clavier</b><span>ZQSD/flèches : vue · E/R : rotation · +/- : zoom · 1-4 : voir un héros · Espace : héros actif · T : fin du tour · J : journal · M : menu · Entrée : dialogue</span></div>
        <div><b>Jeu</b><span>Ennemi : tap pour attaquer · PNJ : tap pour parler · ✦ : fouiller</span></div>
        <div><b>Dés D100</b><span>Lancez vos 2 d10 (dizaines + unités) et saisissez-les · 00 + 0 = 100 · clavier : 2 chiffres puis Entrée · V = virtuel</span></div>
      </div>
      <p class="muted">Le zoom règle aussi l'inclinaison : de loin vue « carte », de près vue « figurine ».</p>
      <button class="btn wide" data-act="close-help">Compris</button>
    </div>`);
  root.append(help);
  // Orientation
  const rot = h('div', 'rotate-overlay', `<div><div class="rot-icon">⟲</div>Tournez l'appareil en mode paysage<br><small>Rotation verrouillée ? Désactivez le verrou d'orientation.</small><br><button class="btn" data-anyway>Continuer quand même</button></div>`);
  rot.querySelector('[data-anyway]').onclick = () => rot.classList.add('dismissed');
  root.append(rot);
  // App installée : on tente de verrouiller le paysage (Android/Chrome) sans jamais bloquer le lancement
  const lockLandscape = () => screen.orientation?.lock?.('landscape').catch(() => {});
  if (matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) { lockLandscape(); window.addEventListener('pointerdown', lockLandscape, { once: true }); }

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
        const pips = f.max ? `<div class="hp">${Array.from({ length: f.max }, (_, i) => `<i class="${i < f.hp ? 'on' : ''}"></i>`).join('')}</div>` : '';
        const b = h('button', 'portrait' + (f.ko ? ' ko' : '') + (f.turn ? ' turn' : ''), `<div class="pimg" style="--c:${f.color}">${figureSVG(f.kind, f.color, { portrait: true })}${f.mounted ? '<em>♞</em>' : ''}</div><span>${f.name}</span>${pips}`);
        b.dataset.id = f.id; b.onclick = () => onPick(f.id); party.append(b);
        b.style.setProperty('--hc', f.color);
      }
    },
    setClock(t, night) { const c = top.querySelector('.clock'); c.hidden = false; c.innerHTML = `${night ? '☾' : '☀'} ${t}`; c.classList.toggle('night', night); },
    setJournal(list, goal) {
      journalData = list;
      const act = list.filter(q => !q.done);
      journal.innerHTML = `<b>Objectifs</b>${goal ? `<div class="q goal"><span>⚑ ${goal}</span></div>` : ''}${act.map(q => `<div class="q"><span>${q.title}</span><small>${q.hint}</small></div>`).join('') || '<div class="q"><span>—</span></div>'}`;
      journal.hidden = !list.length;
    },
    setInventory(items, onUse) {
      invData = items;
      inv.innerHTML = '';
      for (const it of items) {
        const b = h('button', 'item' + (it.usable ? ' usable' : ''), `<span>${it.icon}</span>${it.n > 1 ? `<i>${it.n}</i>` : ''}`);
        b.title = `${it.name} — ${it.desc}`; b.onclick = () => onUse(it.id); inv.append(b);
      }
    },
    openJournal() {
      journalFull.innerHTML = `<div class="help-card"><h2>Journal</h2>${journalData.map(q => `<div class="jq ${q.done ? 'done' : ''}"><b>${q.done ? '✓' : '◆'} ${q.title}</b><span>${q.hint}</span></div>`).join('')}
        <h2>Inventaire</h2>${invData.length ? invData.map(i => `<div class="jq"><b>${i.icon} ${i.name}${i.n > 1 ? ' ×' + i.n : ''}</b><span>${i.desc}</span></div>`).join('') : '<p class="muted">Vide.</p>'}
        <button class="btn wide" data-close>Fermer</button></div>`;
      journalFull.classList.add('open');
    },
    setActions(list) {
      actions.innerHTML = '';
      for (const a of list) { const b = h('button', 'act' + (a.disabled ? ' disabled' : '') + (a.primary ? ' primary' : '') + (a.pulse ? ' pulse' : ''), `<span>${a.icon}</span><small>${a.label}</small>`); if (!a.disabled) b.onclick = a.action; actions.append(b); }
    },
    setBusy(v) { root.classList.toggle('busy', v); },
    /**
     * Jet D100 = dé des dizaines (00-90) + dé des unités (0-9) ; 00 + 0 = 100. Réussite si résultat ≤ chance.
     * Critique : ≤ chance / 5 · Maladresse : ≥ 96. Mode physique : le joueur saisit ses dés ; virtuel : tirage animé.
     */
    rollD100({ chance, label, detail = '', color = '#c9a45c', enemy = false }) {
      return new Promise(res => {
        const $ = q => dice.querySelector(q);
        let t = null, u = null, done = false;
        const crit = Math.max(1, Math.floor(chance / 5));
        $('.d100-label').textContent = label; $('.d100-detail').textContent = detail;
        $('.d100-target').innerHTML = `Réussite si <b>≤ ${chance}</b> <small>· critique ≤ ${crit} · maladresse ≥ 96</small>`;
        dice.classList.toggle('enemy', enemy); dice.style.setProperty('--dc', color);
        dice.classList.toggle('virtual', settings.dice === 'virtual');
        $('.d100-res').innerHTML = ''; dice.classList.remove('resolved');
        const value = () => (t == null || u == null ? null : (t * 10 + u) || 100);
        const render = () => {
          $('.tens-die').textContent = t == null ? '?' : `${t}0`; $('.units-die').textContent = u == null ? '?' : u;
          const v = value(); $('.d100-total').textContent = v ?? '—';
          $('.d100-total').className = 'd100-total' + (v == null ? '' : v <= chance ? ' ok' : ' ko');
          dice.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', +b.dataset.t === t));
          dice.querySelectorAll('[data-u]').forEach(b => b.classList.toggle('on', +b.dataset.u === u));
          $('[data-ok]').disabled = v == null;
        };
        const finish = () => {
          if (done) return; const v = value(); if (v == null) return; done = true; keyHandler = null;
          const r = { roll: v, ok: v <= chance && v < 96, crit: v <= crit, fumble: v >= 96 };
          if (r.crit) r.ok = true;
          $('.d100-res').innerHTML = `<em class="${r.ok ? 'ok' : 'ko'}">${r.crit ? 'Réussite critique !' : r.fumble ? 'Maladresse !' : r.ok ? 'Réussite' : 'Échec'}</em>`;
          dice.classList.add('resolved'); sfx[r.ok ? 'success' : 'ui']();
          setTimeout(() => { dice.classList.remove('open'); res(r); }, 1300);
        };
        dice.onclick = e => {
          if (done) return;
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.t != null) { t = +b.dataset.t; sfx.ui(); }
          else if (b.dataset.u != null) { u = +b.dataset.u; sfx.ui(); }
          else if (b.dataset.ok != null) return finish();
          else if (b.dataset.virtual != null) return virtualRoll();
          render();
        };
        const virtualRoll = () => {
          sfx.dice(); let n = 0;
          const iv = setInterval(() => {
            t = Math.floor(Math.random() * 10); u = Math.floor(Math.random() * 10); render();
            if (++n > 12) { clearInterval(iv); setTimeout(finish, 350); }
          }, 55);
        };
        // clavier : 2 chiffres (dizaine puis unité), Entrée pour valider
        let buf = '';
        keyHandler = e => {
          if (/^[0-9]$/.test(e.key)) { buf += e.key; if (buf.length === 1) { t = +e.key; u = null; } else { u = +e.key; buf = ''; } render(); e.preventDefault(); }
          else if (e.key === 'Enter') { e.preventDefault(); finish(); }
          else if (e.key.toLowerCase() === 'v') virtualRoll();
        };
        render(); dice.classList.add('open');
        if (settings.dice === 'virtual') setTimeout(virtualRoll, 250);
      });
    },
    floatText(pos, text, color = '#fff') {
      if (!pos) return;
      const f = h('div', 'float', text); f.style.left = `${pos.x}px`; f.style.top = `${pos.y}px`; f.style.color = color;
      floats.append(f); setTimeout(() => f.remove(), 1400);
    },
    endScreen({ title, subtitle, stats, onReplay }) {
      end.innerHTML = `<div class="end-card"><h1>${title}</h1><h3>${subtitle}</h3><table>${stats.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
        <div class="end-btns"><button class="btn accent" data-r>Rejouer</button><a class="btn" href="index.html">Autres moteurs</a></div></div>`;
      end.querySelector('[data-r]').onclick = onReplay; end.classList.add('open');
    },
    reloadPrompt() { reload.classList.add('open'); },
    /** HUD du tour : manche, héros actif, déplacement/action utilisés, piste du glas */
    setTurnHUD({ round, hero, used, glas, glasMax, night }) {
      if (!hero) return;
      turnHud.hidden = false;
      turnHud.style.setProperty('--hc', hero.color);
      turnHud.innerHTML = `<div class="th-who"><div class="pimg" style="--c:${hero.color}">${figureSVG(hero.kind, hero.color, { portrait: true })}</div>
        <div><b>${hero.name}</b><small>Manche ${round}${night ? ' · ☾' : ''}</small></div></div>
        <div class="th-pips"><i class="${used.move ? 'used' : ''}" title="Déplacement">👣</i><i class="${used.action ? 'used' : ''}" title="Action">✋</i></div>
        <div class="th-glas" title="Glas">${Array.from({ length: glasMax }, (_, i) => `<em class="${i < glas ? 'on' : ''}${i === glasMax - 1 ? ' last' : ''}"></em>`).join('')}<span>${glas}/${glasMax}</span></div>`;
    },
    setGlas(glas, max, delta) { if (delta > 0) { turnHud.classList.remove('toll'); void turnHud.offsetWidth; turnHud.classList.add('toll'); } },
    /** Grand bandeau animé (nouvelle manche, tour d'un héros, phase des ténèbres) */
    turnBanner({ title, subtitle = '', color = '#c9a45c', kind = null, dark = false }) {
      return new Promise(res => {
        banner.className = 'turn-banner' + (dark ? ' dark' : '');
        banner.style.setProperty('--bc', color);
        banner.innerHTML = `<div class="tb-band">${kind ? `<div class="pimg tb-p" style="--c:${color}">${figureSVG(kind, color, { portrait: true })}</div>` : ''}<div><h2>${title}</h2><small>${subtitle}</small></div></div>`;
        void banner.offsetWidth; banner.classList.add('show'); sfx.ui();
        const done = () => { banner.classList.remove('show'); banner.classList.add('hide'); setTimeout(res, 350); };
        const t = setTimeout(done, 1500); banner.onclick = () => { clearTimeout(t); done(); };
      });
    },
    /** Fenêtre de confirmation (parler, attaquer…) */
    confirm({ title, text = '', portrait = null, ok = 'Oui', cancel = 'Annuler', danger = false }) {
      return new Promise(res => {
        modal.innerHTML = `<div class="cm-card ${danger ? 'danger' : ''}">${portrait ? `<div class="pimg big cm-p" style="--c:${portrait.color}">${figureSVG(portrait.kind, portrait.color, { portrait: true })}</div>` : ''}
          <div class="cm-body"><h3>${title}</h3><p>${text}</p><div class="cm-btns"><button class="btn" data-no>${cancel}</button><button class="btn accent" data-yes>${ok}</button></div></div></div>`;
        modal.classList.add('open');
        const close = v => { modal.classList.remove('open'); keyHandler = null; res(v); };
        modal.querySelector('[data-yes]').onclick = () => close(true);
        modal.querySelector('[data-no]').onclick = () => close(false);
        modal.onclick = e => { if (e.target === modal) close(false); };
        keyHandler = e => { if (e.key === 'Enter') close(true); if (e.key === 'Escape') close(false); };
      });
    },
    /** Panneau de lieu : toutes les activités disponibles, faisables dans la même interaction */
    locationPanel({ title, desc, hero, list, run }) {
      return new Promise(res => {
        let count = 0, busy = false; const doneHere = new Set();
        const render = () => {
          const acts = list().map(a => (doneHere.has(a.id) && !a.disabled ? { ...a, disabled: 'Déjà fait pendant cette interaction' } : a));
          modal.innerHTML = `<div class="lp-card"><div class="lp-head"><h3>${title}</h3><small>Interaction de ${hero.name} · faites tout ce qui est possible ici</small></div><p class="lp-desc">${desc || ''}</p>
            <div class="lp-list">${acts.map((a, i) => `<button class="lp-act" data-i="${i}" ${a.disabled ? 'disabled' : ''}><span class="lp-ic">${a.icon}</span><span><b>${a.label}</b><small>${a.disabled || a.desc || ''}</small></span></button>`).join('') || '<p class="muted">Plus rien à faire ici.</p>'}</div>
            <div class="cm-btns"><button class="btn ${count ? 'accent' : ''}" data-close>${count ? 'Terminer l\'interaction' : 'Annuler'}</button></div></div>`;
          modal.querySelectorAll('[data-i]').forEach(b => b.onclick = async () => {
            if (busy) return; busy = true; modal.classList.add('running');
            modal.classList.remove('open');
            const a = acts[+b.dataset.i]; await run(a); count++; doneHere.add(a.id);
            busy = false; modal.classList.remove('running'); render(); modal.classList.add('open');
          });
          modal.querySelector('[data-close]').onclick = () => { modal.classList.remove('open'); res(count); };
        };
        render(); modal.classList.add('open');
      });
    },
    /** Choix de la compagnie (1 à 4 héros) et de la difficulté */
    partySelect({ heroes, difficulties }) {
      return new Promise(res => {
        const sel = new Set(['aldric', 'ysolde']); let diff = 'normal';
        const render = () => {
          modal.innerHTML = `<div class="ps-card"><h2>Composez votre compagnie</h2><p class="muted">Jeu coopératif : chaque joueur incarne un ou plusieurs héros. 1 à 4 héros.</p>
            <div class="ps-list">${heroes.map(hh => `<button class="ps-hero ${sel.has(hh.id) ? 'on' : ''}" data-h="${hh.id}" style="--c:${hh.color}">
              <div class="pimg" style="--c:${hh.color}">${figureSVG(hh.kind, hh.color, { portrait: true })}</div>
              <b>${hh.name}</b><small>${hh.role}</small>
              <span class="ps-stats">PV ${hh.hp} · ${hh.combatName} ${hh.skills.combat} · Dépl. ${hh.move}</span>
              <span class="ps-talent">${hh.talent}</span></button>`).join('')}</div>
            <div class="ps-foot"><div class="segs">${Object.entries(difficulties).map(([k, v]) => `<button data-d="${k}" class="${k === diff ? 'on' : ''}">${k[0].toUpperCase() + k.slice(1)} · ${v} glas</button>`).join('')}</div>
            <button class="btn accent" data-go ${sel.size ? '' : 'disabled'}>Commencer (${sel.size} héros)</button></div></div>`;
          modal.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const id = b.dataset.h; sel.has(id) ? sel.delete(id) : sel.add(id); sfx.ui(); render(); });
          modal.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { diff = b.dataset.d; render(); });
          modal.querySelector('[data-go]').onclick = () => { if (!sel.size) return; modal.classList.remove('open'); res({ party: heroes.map(x => x.id).filter(id => sel.has(id)), difficulty: diff }); };
        };
        render(); modal.classList.add('open', 'wide');
      }).finally?.(() => modal.classList.remove('wide')) ?? null;
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
  let keyHandler = null;
  // ---- Clavier (PC) : flèches/ZQSD pan, A/E rotation, +/- zoom, 1-2 héros, Espace centrer, Échap menu
  const held = new Set();
  window.addEventListener('keydown', e => {
    if (e.target.closest?.('input, textarea')) return;
    if (keyHandler) return keyHandler(e);
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'z', 'q', 's', 'd', 'w', 'a', 'e', 'r', '+', '-', '=', 'pageup', 'pagedown'].includes(k)) { held.add(k); e.preventDefault(); }
    if (document.querySelector('.dialogue.open, .narration.open')) return;
    if (k === 'escape') { if (drawer.classList.contains('open')) openMenu(false); else if (help.classList.contains('open')) help.classList.remove('open'); else ui.onKey?.deselect(); }
    if (k === 'm') openMenu(!drawer.classList.contains('open'));
    if (k === 'h' || k === '?') help.classList.toggle('open');
    if (k === 'j') ui.openJournal();
    if (k === 'f') toggleFullscreen();
    if (k === ' ') { e.preventDefault(); ui.onKey?.focus(); }
    if (k === 't') ui.onKey?.endTurn?.();
    if (/^[1-4]$/.test(k)) ui.onKey?.select(+k - 1);
  });
  window.addEventListener('keyup', e => held.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => held.clear());
  let lastT = performance.now();
  const keyLoop = now => {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (held.size && ui.engine?.nudge) {
      const has = (...ks) => ks.some(x => held.has(x)), sp = 700 * dt;
      const dx = (has('arrowleft', 'q', 'a') ? 1 : 0) - (has('arrowright', 'd') ? 1 : 0);
      const dy = (has('arrowup', 'z', 'w') ? 1 : 0) - (has('arrowdown', 's') ? 1 : 0);
      const rot = (has('e') ? 1 : 0) - (has('r') ? 1 : 0);
      const zoom = (has('-', 'pagedown') ? 1 : 0) - (has('+', '=', 'pageup') ? 1 : 0);
      ui.engine.nudge({ dx: dx * sp, dy: dy * sp, zoom: zoom * 900 * dt, rot: rot * 1.6 * dt });
    }
    requestAnimationFrame(keyLoop);
  };
  requestAnimationFrame(keyLoop);
  return ui;
}

export function toggleFullscreen() {
  const d = document, el = d.documentElement;
  if (!d.fullscreenElement && !d.webkitFullscreenElement) {
    const p = (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    Promise.resolve(p).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  } else (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
}
