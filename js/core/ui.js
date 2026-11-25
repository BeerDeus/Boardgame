// HUD commun : barre du haut, menu de test, toasts, FPS, barre de groupe, aide, chargement.
import { STATS } from './stats.js';
import { statBadge, statChip, STAT_COLORS } from './stat-icons.js';
import { figureSVG } from './art.js';
import { icon, ICON_NAMES } from './icons.js';
const ic = n => (ICON_NAMES.includes(n) ? icon(n) : (n ?? ''));
import { sfx } from './sfx.js';
import { itemCardSVG } from './cards.js';
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
    <a class="btn round" href="index.html" title="Accueil" aria-label="Accueil">${icon('back')}</a>
    <div class="title"><b>${title}</b><span>${subtitle || ''}</span></div>
    <div class="clock" hidden></div>
    <div class="spacer"></div>
    <div class="fps" hidden>-- fps</div>
    <button class="btn round" data-act="journal" title="Journal (J)" aria-label="Journal">${icon('journal')}</button>
    <button class="btn round" data-act="help" title="Aide" aria-label="Aide">${icon('help')}</button>
    <button class="btn round" data-act="fs" title="Plein écran" aria-label="Plein écran">${icon('fullscreen')}</button>
    <button class="btn round accent" data-act="menu" title="Menu" aria-label="Menu">${icon('menu')}</button>`;
  root.append(top);
  const fpsEl = top.querySelector('.fps');

  // Barre de groupe (héros)
  const party = h('div', 'party'); root.append(party);
  // Journal (objectifs), inventaire, actions, dés, textes flottants
  const journal = h('div', 'journal'); journal.hidden = true; root.append(journal); // panneau d'objectifs (plus utilisé : quêtes non affichées)
  journal.onclick = () => journal.classList.toggle('collapsed');
  const inv = h('div', 'inventory'); root.append(inv);
  const actions = h('div', 'actions'); root.append(actions);
  const dice = h('div', 'd100');
  dice.innerHTML = `<div class="d100-card">
      <div class="d100-head"><b class="d100-label"></b><small class="d100-detail"></small></div>
      <div class="d100-target"></div>
      <div class="d100-boost"><span>${icon('boost')} Boosts avant le jet</span><button data-bm>−</button><b class="bv">0</b><button data-bp>+</button><small class="bavail"></small></div>
      <div class="d100-main">
        <div class="d100-pads">
          <div class="pad-row"><span>Dizaines</span><div class="pad tens">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(t => `<button data-t="${t}">${t}0</button>`).join('')}</div></div>
          <div class="pad-row"><span>Unités</span><div class="pad units">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(u => `<button data-u="${u}">${u}</button>`).join('')}</div></div>
        </div>
        <div class="d100-show"><div class="d10 tens-die">?</div><div class="d10 units-die">?</div><div class="d100-total">—</div></div>
      </div>
      <div class="d100-foot"><button class="btn ghost" data-virtual>${icon('dice')} Lancer pour moi</button><button class="btn accent" data-ok disabled>Valider</button></div>
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
  let journalData = [], invData = [], events = [];
  // Une seule fenêtre à la fois : si une autre doit s'ouvrir par-dessus, la précédente est d'abord
  // fermée proprement (confirmation = « Annuler ») au lieu de rester à jamais sans réponse.
  let modalClose = null;
  const closePrev = () => { const prev = modalClose; modalClose = null; if (prev && modal.classList.contains('open')) prev(); };
  /** Fil des derniers événements (journal) */
  const logEvent = (msg, kind = '') => { const e = { t: String(msg), k: kind, r: ui.round ?? 0 }; events.push(e); if (events.length > 60) events.shift(); ui.onEvent?.(e); };

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
    if (act === 'journal') ui.openJournal();
  });
  help.addEventListener('click', e => { if (e.target === help || e.target.dataset.act === 'close-help') help.classList.remove('open'); });

  const ui = {
    root,
    progress(p, label) { loader.querySelector('.bar i').style.width = `${Math.round(p * 100)}%`; if (label) loader.querySelector('.loader-label').textContent = label; },
    loaded() { loader.classList.add('done'); setTimeout(() => loader.remove(), 600); },
    error(msg) { loader.querySelector('.loader-label').innerHTML = `<span class="err">${msg}</span>`; },
    toast(msg, ms = 5500) {
      ms = Math.max(5000, Math.min(6000, ms)); // les messages restent lisibles 5-6 s
      logEvent(msg);
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
        const boosts = f.boostMax ? `<div class="bst">${Array.from({ length: f.boostMax }, (_, i) => `<i class="${i < f.boost ? 'on' : ''}">${icon('boost')}</i>`).join('')}</div>` : '';
        const conds = `${f.poison ? `<u class="cd poison" title="Empoisonné">${icon('drop')}</u>` : ''}${f.stun ? `<u class="cd stun" title="Étourdi">${icon('lock')}</u>` : ''}`;
        const b = h('button', 'portrait' + (f.ko ? ' ko' : '') + (f.turn ? ' turn' : ''), `<div class="pimg" style="--c:${f.color}">${figureSVG(f.kind, f.color, { portrait: true })}${f.mounted ? `<em>${icon('horse')}</em>` : ''}${conds}</div><span>${f.name}</span>${pips}${boosts}`);
        b.dataset.id = f.id; b.onclick = () => onPick(f.id); party.append(b);
        b.style.setProperty('--hc', f.color);
      }
    },
    setClock(t, night) { const c = top.querySelector('.clock'); c.hidden = false; c.innerHTML = `${night ? '☾' : '☀'} ${t}`; c.classList.toggle('night', night); },
    setJournal(list, goal) {
      journalData = list;
      const act = list.filter(q => !q.done);
      journal.innerHTML = `<b>Objectifs</b>${goal ? `<div class="q goal"><span>${icon('flag')} ${goal}</span></div>` : ''}${act.map(q => `<div class="q"><span>${q.title}</span><small>${q.hint}</small></div>`).join('') || '<div class="q"><span>—</span></div>'}`;
      journal.hidden = !list.length;
    },
    setInventory(items, onUse) {
      invData = items;
      inv.innerHTML = '';
      for (const it of items) {
        const b = h('button', 'item' + (it.usable ? ' usable' : ''), `<span>${ic(it.icon)}</span>${it.n > 1 ? `<i>${it.n}</i>` : ''}`);
        b.title = `${it.name} — ${it.desc}`; b.onclick = () => onUse(it.id); inv.append(b);
      }
    },
    /** Restaure le fil des événements (partie reprise) */
    setEvents(list) { events = [...(list || [])]; },
    openJournal() {
      let lastR = null;
      const evHtml = events.slice().reverse().slice(0, 40).map(e => { const head = e.r !== lastR ? `<div class="ev-r">Manche ${e.r || 0}</div>` : ''; lastR = e.r; return `${head}<div class="ev ${(e.k || '').split(' ').filter(Boolean).map(x => 'k-' + x).join(' ')}">${e.t}</div>`; }).join('');
      journalFull.innerHTML = `<div class="help-card"><h2>Besace commune</h2>${invData.length ? invData.map(i => `<div class="jq"><b>${ic(i.icon)} ${i.name}${i.n > 1 ? ' ×' + i.n : ''}</b>${i.code ? `<em class="jcode">${i.code}</em>` : ''}<span>${i.effect || i.desc}</span></div>`).join('') : '<p class="muted">Vide.</p>'}
        <h2>Derniers événements</h2><div class="ev-list">${evHtml || '<p class="muted">Rien pour l\'instant.</p>'}</div>
        <button class="btn wide" data-close>Fermer</button></div>`;
      journalFull.classList.add('open');
    },
    setActions(list) {
      actions.innerHTML = '';
      for (const a of list) { const b = h('button', 'act' + (a.disabled ? ' disabled' : '') + (a.primary ? ' primary' : '') + (a.pulse ? ' pulse' : ''), `<span>${ic(a.icon)}</span><small>${a.label}</small>`); if (!a.disabled) b.onclick = a.action; actions.append(b); }
    },
    setBusy(v) { root.classList.toggle('busy', v); },
    /**
     * Jet D100 = dé des dizaines (00-90) + dé des unités (0-9) ; 00 + 0 = 100. Réussite si résultat ≤ chance.
     * Critique : ≤ chance / 5 · Maladresse : ≥ 96. Mode physique : le joueur saisit ses dés ; virtuel : tirage animé.
     */
    rollD100({ chance: base, label, detail = '', color = '#c9a45c', enemy = false, boosts = 0, stat = null }) {
      return new Promise(res => {
        const $ = q => dice.querySelector(q);
        let t = null, u = null, done = false, spent = 0, chance = base, crit = 1;
        $('.d100-label').innerHTML = (STAT_COLORS[stat] ? statBadge(stat, 30) + ' ' : '') + `<span>${label}</span>`; $('.d100-detail').textContent = detail;
        dice.classList.toggle('noboost', !boosts);
        const setTarget = () => {
          chance = Math.min(95, base + spent * 10); crit = Math.max(1, Math.floor(chance / 5));
          $('.d100-target').innerHTML = `Réussite si <b>≤ ${chance}</b>${spent ? ` <em>(+${spent * 10})</em>` : ''} <small>· critique ≤ ${crit} · maladresse ≥ 96</small>`;
          $('.bv').textContent = spent; $('.bavail').textContent = `${boosts - spent} dispo`;
          $('[data-bp]').disabled = spent >= boosts || t != null || chance >= 95; $('[data-bm]').disabled = spent <= 0 || t != null;
        };
        setTarget();
        $('[data-bp]').onclick = e => { e.stopPropagation(); if (spent < boosts && t == null) { spent++; sfx.magic(); setTarget(); render(); } };
        $('[data-bm]').onclick = e => { e.stopPropagation(); if (spent > 0 && t == null) { spent--; setTarget(); render(); } };
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
          const r = { roll: v, chance, ok: v <= chance && v < 96, crit: v <= crit, fumble: v >= 96, spent };
          if (r.crit) r.ok = true;
          $('.d100-res').innerHTML = `<em class="${r.ok ? 'ok' : 'ko'}">${r.crit ? 'Réussite critique !' : r.fumble ? 'Maladresse !' : r.ok ? 'Réussite' : 'Échec'}</em>`;
          dice.classList.add('resolved'); sfx[r.ok ? 'success' : 'ui']();
          setTimeout(() => { dice.classList.remove('open'); res(r); }, 1300);
        };
        dice.onclick = e => {
          if (done) return;
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.t != null) { t = +b.dataset.t; sfx.ui(); setTarget(); }
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
        if (settings.dice === 'virtual' && !boosts) setTimeout(virtualRoll, 250);
      });
    },
    floatText(pos, text, color = '#fff') {
      if (!pos) return;
      const f = h('div', 'float', text); f.style.left = `${pos.x}px`; f.style.top = `${pos.y}px`; f.style.color = color;
      floats.append(f); setTimeout(() => f.remove(), 1400);
    },
    endScreen({ title, subtitle, stats, onReplay, xp = [] }) {
      end.innerHTML = `<div class="end-card"><h1>${title}</h1><h3>${subtitle}</h3>
        ${xp.length ? `<div class="xp-list">${xp.map(x => `<div class="xp ${x.xp ? '' : 'none'}" style="--c:${x.color}"><b>${x.name}</b><span>${x.xp ? `+${x.xp} XP` : 'Pas d\'XP'}</span><small>${x.why === 'defeat' ? 'défaite' : x.why === 'already' ? 'étape déjà gagnée' : x.why === 'test' ? 'test (non enregistré)' : ''}${x.why ? ' · ' : ''}niv. ${x.level}${x.up ? ` <em>${icon('boost')} niveau supérieur !</em>` : ''}</small></div>`).join('')}</div>` : ''}
        <table>${stats.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
        <div class="end-btns"><button class="btn accent" data-r>Rejouer</button><a class="btn" href="index.html">Accueil</a></div></div>`;
      end.querySelector('[data-r]').onclick = onReplay; end.classList.add('open');
    },
    reloadPrompt() { reload.classList.add('open'); },
    /** HUD du tour : manche, héros actif, déplacement/action utilisés, piste du glas */
    setTurnHUD({ round, hero, used, glas, glasMax, night, boost = 0, boostMax = 5, order = [] }) {
      if (!hero) return;
      turnHud.hidden = false;
      turnHud.style.setProperty('--hc', hero.color);
      const pip = (k, ic2, t) => `<i class="${used[k] ? 'used' : ''}" title="${t}">${icon(ic2)}</i>`;
      turnHud.innerHTML = `<div class="th-who"><div class="pimg" style="--c:${hero.color}">${figureSVG(hero.kind, hero.color, { portrait: true })}</div>
        <div><b>${hero.name}</b><small>Manche ${round} ${icon(night ? 'moon' : 'sun')}</small></div></div>
        <div class="th-pips">${pip('move', 'move', 'Déplacement')}${pip('action', 'action', 'Action (lieu, PNJ, talent)')}${pip('attack', 'attack', 'Attaque')}</div>
        <div class="th-boost" title="Boosts : +10 % par boost dépensé avant un jet">${icon('boost')}<b>${boost}</b><small>/${boostMax}</small></div>
        <div class="th-glas" title="Glas">${icon('bell')}<span>${glas}/${glasMax}</span><div class="th-track">${Array.from({ length: glasMax }, (_, i) => `<em class="${i < glas ? 'on' : ''}"></em>`).join('')}</div></div>
        ${order.length > 1 ? `<div class="th-order" title="Ordre de la manche">${order.map(o => o.dark ? `<span class="o dark ${o.done ? 'done' : ''}">${icon('skull')}</span>` : `<span class="o ${o.active ? 'act' : ''} ${o.done ? 'done' : ''}" style="--c:${o.color}">${o.name[0]}</span>`).join('')}</div>` : ''}`;
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
    /** Consigne de mise en place pour la table physique (façon Destinies) */
    setupPrompt({ title, items, note = '', mapView = null }) {
      return new Promise(res => {
        closePrev();
        modal.onclick = null; modal.innerHTML = `<div class="sp-card ${mapView ? 'with-map' : ''}"><div class="sp-head">${icon('map')}<h3>${title}</h3></div>
          ${mapView ? `<div class="sp-map">${mapSVG(mapView)}<div class="sp-legend"><span class="lg new"></span> à poser <span class="lg old"></span> déjà sur la table <span class="lg here"></span> héros ${icon('flag')} N en haut</div></div>` : ''}
          <div class="sp-list">${items.map(it => `<div class="sp-it">${it.portrait ? `<div class="pimg" style="--c:${it.portrait.color}">${figureSVG(it.portrait.kind, it.portrait.color, { portrait: true })}</div>` : `<span class="sp-ic">${ic(it.icon || 'map')}</span>`}
            <div><b>${it.title}</b><small>${it.sub || ''}</small></div>${it.code ? `<em class="sp-code">${it.code}</em>` : ''}</div>`).join('')}</div>
          ${note ? `<p class="muted">${note}</p>` : ''}<div class="cm-btns"><button class="btn accent" data-yes>${icon('check')} C'est fait</button></div></div>`;
        modal.classList.add('open', 'setup'); sfx.ui();
        const close = () => { if (modalClose === close) modalClose = null; modal.classList.remove('open', 'setup'); keyHandler = null; res(); };
        modalClose = close;
        modal.querySelector('[data-yes]').onclick = close;
        keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } };
      });
    },
    /** Carte d'objet physique : « Prenez la carte » (take) ou « Défaussez la carte » (discard) */
    cardPrompt({ item, mode = 'take', n = 1, note = '' }) {
      return new Promise(res => {
        closePrev();
        const take = mode === 'take', code = item.code || '';
        const title = take ? (n > 1 ? `Prenez ${n} cartes` : 'Prenez la carte') : 'Défaussez la carte';
        const text = take ? `Prenez la carte <b>${code ? code + ' · ' : ''}${item.name}</b>${n > 1 ? ` (×${n})` : ''} dans la pioche d'objets et posez-la dans la besace commune.`
          : `Remettez la carte <b>${code ? code + ' · ' : ''}${item.name}</b> dans la boîte.`;
        logEvent(`${take ? 'Objet obtenu' : 'Objet défaussé'} : <b>${item.name}</b>${n > 1 ? ' ×' + n : ''}`, take ? 'item' : 'item lost');
        modal.onclick = null; modal.innerHTML = `<div class="cp-card ${take ? 'take' : 'discard'}"><div class="cp-img">${itemCardSVG(item, { width: '100%', height: '100%', cls: 'item-card' })}</div>
          <div class="cp-body"><small>${take ? 'Nouvel objet' : 'Objet utilisé ou perdu'}</small><h3>${icon(take ? 'check' : 'close')} ${title}</h3><p>${text}</p>
          <p class="cp-eff">${item.effect || item.desc || ''}</p>${note ? `<p class="muted">${note}</p>` : ''}
          <div class="cm-btns"><button class="btn accent" data-yes>${icon('check')} C'est fait</button></div></div></div>`;
        modal.classList.add('open', 'cardm'); take ? sfx.success() : sfx.ui();
        const close = () => { if (modalClose === close) modalClose = null; modal.classList.remove('open', 'cardm'); keyHandler = null; res(); };
        modalClose = close;
        modal.querySelector('[data-yes]').onclick = close;
        keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } };
      });
    },
    /** Notification à valider (quête nouvelle / terminée…) */
    notice({ kind = 'quest', title, text = '', sub = '' }) {
      return new Promise(res => {
        closePrev();
        const done = kind === 'quest-done';
        logEvent(`${done ? 'Quête terminée' : 'Nouvelle quête'} : <b>${title}</b>`, done ? 'quest done' : 'quest');
        modal.onclick = null; modal.innerHTML = `<div class="nt-card ${done ? 'done' : ''}"><div class="nt-ic">${icon(done ? 'check' : 'flag')}</div><div><small>${sub || (done ? 'Quête terminée' : 'Nouvelle quête')}</small><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}
          <div class="cm-btns"><button class="btn accent" data-yes>OK</button></div></div></div>`;
        modal.classList.add('open', 'tipm'); done ? sfx.success() : sfx.ui();
        const close = () => { if (modalClose === close) modalClose = null; modal.classList.remove('open', 'tipm'); keyHandler = null; res(); };
        modalClose = close;
        modal.querySelector('[data-yes]').onclick = close;
        keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } };
      });
    },
    /** Conseil du tutoriel (une seule fois) */
    tip({ title, text, icon: ic3 = 'help' }) {
      return new Promise(res => {
        closePrev();
        modal.onclick = null; modal.innerHTML = `<div class="tip-card"><div class="tip-ic">${icon(ic3)}</div><div><small>Tutoriel</small><h3>${title}</h3><p>${text}</p>
          <div class="cm-btns"><button class="btn ghost" data-off>Ne plus afficher les conseils</button><button class="btn accent" data-yes>Compris</button></div></div></div>`;
        modal.classList.add('open', 'tipm');
        const close = off => { if (modalClose === close) modalClose = null; modal.classList.remove('open', 'tipm'); keyHandler = null; res(off); };
        modalClose = close;
        modal.querySelector('[data-yes]').onclick = () => close(false);
        modal.querySelector('[data-off]').onclick = () => close(true);
        keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(false); } };
      });
    },
    /** Ténèbres : cartes tirées par type de monstre, triées par initiative (bouton OK pour lancer) */
    monsterCards(list) {
      return new Promise(res => {
        closePrev();
        modal.onclick = null; modal.innerHTML = `<div class="mk-wrap"><h3>${icon('skull')} Les Ténèbres agissent</h3><small class="muted">Ordre d'initiative (plus petit = plus tôt)</small>
          <div class="mk-row">${list.map(m => `<div class="mk-card"><div class="mk-top"><div class="pimg" style="--c:${m.color}">${figureSVG(m.kind, m.color, { portrait: true })}</div><em>${m.card.init}</em></div>
            <small>${m.title}</small><b>${m.card.name}</b><ul>${m.lines.map(([ic2, t]) => `<li>${icon(ic2)} ${t}</li>`).join('')}</ul></div>`).join('')}</div>
          <div class="cm-btns"><button class="btn accent" data-yes>${icon('check')} OK</button></div></div>`;
        modal.classList.add('open', 'wide'); sfx.ui();
        const close = () => { if (modalClose === close) modalClose = null; modal.classList.remove('open', 'wide'); keyHandler = null; res(); };
        modalClose = close;
        modal.querySelector('[data-yes]').onclick = close;
        keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } };
      });
    },
    /** Carte d'action de monstre tirée (affichage bref) */
    monsterCard({ title, card, desc, color = '#8a1c1c' }) {
      return new Promise(res => {
        const el = h('div', 'mcard', `<small>${title}</small><b>${card}</b><span>${desc}</span>`);
        el.style.setProperty('--mc', color); root.append(el); sfx.ui();
        requestAnimationFrame(() => el.classList.add('in'));
        setTimeout(() => { el.classList.remove('in'); setTimeout(() => { el.remove(); res(); }, 300); }, 1700);
      });
    },
    /** Fenêtre de confirmation (parler, attaquer…) */
    confirm({ title, text = '', portrait = null, ok = 'Oui', cancel = 'Annuler', danger = false }) {
      return new Promise(res => {
        closePrev();
        modal.onclick = null; modal.innerHTML = `<div class="cm-card ${danger ? 'danger' : ''}">${portrait ? `<div class="pimg big cm-p" style="--c:${portrait.color}">${figureSVG(portrait.kind, portrait.color, { portrait: true })}</div>` : ''}
          <div class="cm-body"><h3>${title}</h3><p>${text}</p><div class="cm-btns"><button class="btn" data-no>${cancel}</button><button class="btn accent" data-yes>${ok}</button></div></div></div>`;
        modal.classList.add('open');
        const close = v => { if (modalClose === close) modalClose = null; modal.onclick = null; modal.classList.remove('open'); keyHandler = null; res(v); };
        modalClose = close;
        modal.querySelector('[data-yes]').onclick = () => close(true);
        modal.querySelector('[data-no]').onclick = () => close(false);
        modal.onclick = e => { if (e.target === modal) close(false); };
        keyHandler = e => { if (e.key === 'Enter') close(true); if (e.key === 'Escape') close(false); };
      });
    },
    /** Choix des joueurs (effet « Choix ») : renvoie l'indice de l'option choisie */
    choose({ title = '', text = '', options = [] }) {
      return new Promise(res => {
        closePrev();
        modal.onclick = null; modal.innerHTML = `<div class="lp-card ch-card"><div class="lp-head"><h3>${title}</h3></div>${text ? `<p class="lp-desc">${text}</p>` : ''}
          <div class="lp-list">${options.map((o, i) => `<button class="lp-act" data-i="${i}" ${o.disabled ? 'disabled' : ''}><span class="lp-ic">${o.disabled ? icon('lock') : `<b>${i + 1}</b>`}</span><span><b>${o.label}</b>${o.disabled && o.need ? `<small>${o.need}</small>` : ''}</span></button>`).join('')}</div></div>`;
        modal.classList.add('open'); sfx.ui();
        modal.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { modal.classList.remove('open'); keyHandler = null; res(+b.dataset.i); });
        keyHandler = e => { const i = +e.key - 1; if (options[i] && !options[i].disabled) { modal.classList.remove('open'); keyHandler = null; res(i); } };
      });
    },
    /** Panneau de lieu : toutes les activités disponibles, faisables dans la même interaction */
    locationPanel({ title, desc, hero, list, run }) {
      return new Promise(res => {
        closePrev();
        let count = 0, busy = false; const doneHere = new Set();
        const render = () => {
          const acts = list().map(a => (doneHere.has(a.id) && !a.disabled ? { ...a, disabled: 'Déjà fait pendant cette interaction' } : a));
          modal.onclick = null; modal.innerHTML = `<div class="lp-card"><div class="lp-head"><h3>${title}</h3><small>Interaction de ${hero.name} · faites tout ce qui est possible ici</small></div><p class="lp-desc">${desc || ''}</p>
            <div class="lp-list">${acts.map((a, i) => `<button class="lp-act" data-i="${i}" ${a.disabled ? 'disabled' : ''}><span class="lp-ic">${ic(a.icon)}</span><span><b>${a.label}</b><small>${a.disabled || a.desc || ''}</small></span></button>`).join('') || '<p class="muted">Plus rien à faire ici.</p>'}</div>
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
    /** Montée de niveau : +5 % à une compétence ou un avantage de classe */
    levelUp({ hero, skills, perks }) {
      return new Promise(res => {
        closePrev();
        modal.onclick = null; modal.innerHTML = `<div class="lp-card lu-card" style="--c:${hero.color}"><div class="lu-head"><div class="pimg" style="--c:${hero.color}">${figureSVG(hero.kind, hero.color, { portrait: true })}</div>
          <div><h3>${hero.name} — niveau supérieur !</h3><small>Choisissez 1 amélioration (définitive pour la campagne).</small></div></div>
          <h4>+5 % à une compétence</h4><div class="lu-row">${skills.map(k => `<button class="lp-act" data-k="${k.id}"><b>${STAT_COLORS[k.id] ? statBadge(k.id, 22) + ' ' : ''}${k.name}</b><small>${k.value} % → ${k.value + 5} %</small></button>`).join('')}</div>
          <h4>ou un avantage</h4><div class="lp-list">${perks.map(p2 => `<button class="lp-act" data-p="${p2.id}"><span class="lp-ic">${icon('boost')}</span><span><b>${p2.name}</b><small>${p2.desc}</small></span></button>`).join('')}</div></div>`;
        modal.classList.add('open', 'wide');
        modal.querySelectorAll('[data-k]').forEach(b2 => b2.onclick = () => { modal.classList.remove('open', 'wide'); sfx.success(); res({ skill: b2.dataset.k }); });
        modal.querySelectorAll('[data-p]').forEach(b2 => b2.onclick = () => { modal.classList.remove('open', 'wide'); sfx.success(); res({ perk: b2.dataset.p }); });
      });
    },
    /** Une partie est sauvegardée : reprendre, reprendre + mise en place, ou recommencer */
    resumePrompt({ title, round, glas, glasMax, party, when }) {
      return new Promise(res => {
        closePrev();
        const d = when ? new Date(when).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';
        modal.onclick = null; modal.innerHTML = `<div class="cm-card"><div class="cm-body"><h3>${icon('journal')} Partie en cours</h3>
          <p>${title}<br><small>Manche ${round} · glas ${glas}/${glasMax} · ${party.length} héros${d ? ` · ${d}` : ''}</small></p>
          <div class="rs-btns"><button class="btn accent" data-r="resume">${icon('end')} Reprendre</button>
          <button class="btn" data-r="setup">${icon('map')} Reprendre et remettre la table en place</button>
          <button class="btn ghost" data-r="new">${icon('close')} Nouvelle partie</button></div></div></div>`;
        modal.classList.add('open');
        modal.querySelectorAll('[data-r]').forEach(b2 => b2.onclick = () => {
          const r = b2.dataset.r;
          if (r === 'new' && !confirm('Abandonner la partie en cours ?')) return;
          modal.classList.remove('open'); res(r);
        });
      });
    },
    /** Écran de campagne : étape, compagnie (1-4 héros), difficulté, ordre des tours */
    partySelect({ step: stepDef, completed = [], heroes, glasBase, partyBonus, progress = {}, tips = true }) {
      return new Promise(res => {
        const sel = new Set(heroes.slice(0, 2).map(x => x.id)); let diff = 'normal', mode = 'fixed', withTips = tips;
        const step = stepDef.id;
        const render = () => {
          const n = sel.size, gmax = glasBase[diff] + (partyBonus[n] ?? 0);
          modal.onclick = null; modal.innerHTML = `<div class="ps-card ${heroes.length > 4 ? 'many' : ''}" style="--ncol:${Math.min(heroes.length, 6)}">
            <div class="ps-head"><a class="btn round small" href="index.html" title="Accueil" aria-label="Accueil">${icon('back')}</a><small>${stepDef.num || ''}${stepDef.tag ? ` · ${stepDef.tag}` : ''}${completed.includes(step) ? ` · ${icon('check')} déjà gagnée` : ''}</small><h2>${stepDef.title || ''}</h2><span class="ps-sub">Composez votre compagnie</span></div>
            <div class="ps-list">${heroes.map(hh => { const pr = progress[hh.id]; return `<button class="ps-hero ${sel.has(hh.id) ? 'on' : ''}" data-h="${hh.id}" style="--c:${hh.color}">
              <div class="pimg" style="--c:${hh.color}">${figureSVG(hh.kind, hh.color, { portrait: true })}</div>
              <b>${hh.name}${pr?.level > 1 ? ` <span class="lvl">niv. ${pr.level}</span>` : ''}</b><small>${hh.role}</small>
              <span class="ps-stats">${icon('heart')} ${hh.hp} PV · ${statBadge('combat', 15)} ${hh.skills.combat} % · ${icon('move')} ${hh.move}</span>
              <span class="ps-attrs">${Object.keys(STATS).map(k => statChip(k, hh.skills[k] ?? '—', 16)).join('')}</span>
              <span class="ps-talent">${hh.talent}</span>${pr?.won?.includes(step) ? '<em class="ps-xpnote">Étape déjà gagnée : plus d\'XP</em>' : ''}</button>`; }).join('')}</div>
            <div class="ps-foot">
              <div class="segs">${Object.keys(glasBase).map(k => `<button data-d="${k}" class="${k === diff ? 'on' : ''}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
              <div class="segs">${[['fixed', 'Ordre fixe'], ['deck', 'Ordre aléatoire']].map(([k, l]) => `<button data-m="${k}" class="${k === mode ? 'on' : ''}">${l}</button>`).join('')}</div>
              <label class="ps-tips"><input type="checkbox" data-tips ${withTips ? 'checked' : ''}> Conseils du tutoriel</label>
              <span class="ps-sum">${icon('bell')} ${gmax} glas <small>(${n} héros : +${partyBonus[n] ?? 0})</small></span>
              <button class="btn accent" data-go ${n ? '' : 'disabled'}>Commencer (${n} héros)</button></div></div>`;
          modal.querySelectorAll('[data-h]').forEach(b2 => b2.onclick = () => { const id = b2.dataset.h; if (!sel.has(id) && sel.size >= 4) { b2.animate?.([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 200); return; } sel.has(id) ? sel.delete(id) : sel.add(id); sfx.ui(); render(); });
          modal.querySelectorAll('[data-d]').forEach(b2 => b2.onclick = () => { diff = b2.dataset.d; render(); });
          modal.querySelectorAll('[data-m]').forEach(b2 => b2.onclick = () => { mode = b2.dataset.m; render(); });
          modal.querySelector('[data-tips]').onchange = e => { withTips = e.target.checked; };
          modal.querySelector('[data-go]').onclick = () => { if (!sel.size) return; modal.classList.remove('open', 'wide', 'live'); res({ step, party: heroes.map(x => x.id).filter(id => sel.has(id)), difficulty: diff, turnMode: mode, tips: withTips }); };
        };
        render(); modal.classList.add('open', 'wide');
        requestAnimationFrame(() => modal.classList.add('live')); // les rendus suivants ne rejouent pas l'animation d'ouverture
      });
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
      const foot = h('div', 'menu-foot', `<a class="btn wide ghost" href="index.html">‹ Accueil</a><small class="ver"></small>`);
      drawer.append(foot);
      import('../version.js').then(m => { foot.querySelector('.ver').textContent = 'Version ' + m.VERSION; }).catch(() => {});
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

/** Plan de la table : tuiles déjà posées (terrain + code), nouvelles tuiles en surbrillance, position des héros */
function mapSVG({ cells, type }) {
  const xs = cells.flatMap(c => [c.x - c.w / 2, c.x + c.w / 2]), zs = cells.flatMap(c => [c.z - c.h / 2, c.z + c.h / 2]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), pad = 0.15;
  const shape = c => {
    if (type === 'hex') { const r = c.h / 2; return `<polygon points="${Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 3; return `${(c.x + Math.cos(a) * r * 0.97).toFixed(3)},${(c.z + Math.sin(a) * r * 0.97).toFixed(3)}`; }).join(' ')}"/>`; }
    return `<rect x="${c.x - c.w * 0.48}" y="${c.z - c.h * 0.48}" width="${c.w * 0.96}" height="${c.h * 0.96}" rx="${c.w * 0.05}"/>`;
  };
  const fs = Math.min(cells[0].w, cells[0].h) * 0.26;
  return `<svg viewBox="${x0 - pad} ${z0 - pad} ${x1 - x0 + pad * 2} ${z1 - z0 + pad * 2}" preserveAspectRatio="xMidYMid meet">
    ${cells.map(c => `<g class="mc ${c.isNew ? 'new' : 'old'}" style="--t:${c.color}">${shape(c)}
      <text x="${c.x}" y="${c.z + fs * 0.35}" font-size="${fs}">${c.code}</text>
      ${c.place ? `<text class="pl" x="${c.x}" y="${c.z - c.h * 0.28}" font-size="${fs * 0.55}">${c.place}</text>` : ''}
      ${c.hero ? `<circle cx="${c.x + c.w * 0.32}" cy="${c.z + c.h * 0.3}" r="${fs * 0.32}" class="hero"/>` : ''}</g>`).join('')}
  </svg>`;
}

export function toggleFullscreen() {
  const d = document, el = d.documentElement;
  if (!d.fullscreenElement && !d.webkitFullscreenElement) {
    const p = (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    Promise.resolve(p).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  } else (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
}
