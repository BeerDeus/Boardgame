// Dialogues PNJ (frappe, portraits, choix conditionnels / uniques, effets) + narration plein écran.
import { figureSVG } from './art.js';
import { sfx } from './sfx.js';

export function createDialogue(root) {
  const box = document.createElement('div');
  box.className = 'dialogue';
  box.innerHTML = `<div class="d-portrait"></div><div class="d-main"><div class="d-name"></div><div class="d-text"></div><div class="d-hint">Touchez pour continuer ▸</div></div><div class="d-choices"></div>`;
  root.append(box);
  const nar = document.createElement('div'); nar.className = 'narration'; root.append(nar);
  const $ = s => box.querySelector(s);
  let typing = null, keyHandler = null;

  window.addEventListener('keydown', e => keyHandler?.(e));

  function typeText(el, text, cps = 55) {
    return new Promise(resolve => {
      el.textContent = ''; let i = 0, last = performance.now(), acc = 0;
      typing = { finish() { i = text.length; el.textContent = text; } };
      const step = now => {
        acc += (now - last) / 1000 * cps; last = now;
        const n = Math.floor(acc);
        if (n > 0) { i = Math.min(text.length, i + n); acc -= n; el.textContent = text.slice(0, i); }
        if (i >= text.length) { typing = null; resolve(); } else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  const val = (v, g) => (typeof v === 'function' ? v(g) : v);
  const waitAdvance = () => new Promise(res => {
    const done = () => { box.removeEventListener('pointerup', f); keyHandler = null; res(); };
    const f = e => { e.stopPropagation(); done(); };
    box.addEventListener('pointerup', f);
    keyHandler = e => { if (['Enter', ' ', 'ArrowRight'].includes(e.key)) { e.preventDefault(); done(); } };
  });

  /**
   * script = { start, nodes: { id: { s, t, next?, do?, choices?: [{ t, next, cond, need, once, do }] } } }
   * hooks = { g, dlgId, speaker(id) -> {name,kind,color}, onSpeaker(id), isSeen(k), markSeen(k) }
   */
  async function play(script, hooks) {
    const g = hooks.g;
    box.classList.add('open');
    let id = script.start, last = null;
    while (id && script.nodes[id]) {
      const n = script.nodes[id];
      const sp = hooks.speaker(n.s);
      if (n.s !== last) {
        last = n.s; hooks.onSpeaker?.(n.s);
        $('.d-portrait').innerHTML = `<div class="pimg big" style="--c:${sp.color}">${figureSVG(sp.kind, sp.color, { portrait: true })}</div>`;
        $('.d-name').textContent = sp.name; $('.d-name').style.color = sp.color;
        box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
      }
      $('.d-choices').innerHTML = ''; box.classList.remove('has-choices'); $('.d-hint').style.opacity = 0;
      const typed = typeText($('.d-text'), val(n.t, g));
      const skip = () => typing?.finish();
      box.addEventListener('pointerup', skip);
      keyHandler = e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); skip(); } };
      await typed; box.removeEventListener('pointerup', skip); keyHandler = null;
      const choices = (n.choices || []).map((c, i) => ({ ...c, k: `${hooks.dlgId}.${id}.${i}` })).filter(c => !(c.once && hooks.isSeen(c.k)));
      if (choices.length) {
        box.classList.add('has-choices');
        const pick = await new Promise(res => {
          const btns = [];
          choices.forEach((c, i) => {
            const ok = !c.cond || c.cond(g);
            const b = document.createElement('button'); b.className = 'choice' + (ok ? '' : ' locked');
            b.innerHTML = `<i>${ok ? i + 1 : '🔒'}</i><span>${c.t}${ok ? '' : `<small>Requiert : ${c.need || '?'}</small>`}</span>`;
            if (ok) { b.onclick = e => { e.stopPropagation(); res(c); }; btns[i] = c; }
            $('.d-choices').append(b);
          });
          keyHandler = e => { const c = btns[+e.key - 1]; if (c) { e.preventDefault(); res(c); } };
        });
        keyHandler = null; sfx.ui();
        if (pick.once) hooks.markSeen(pick.k);
        if (pick.do) await pick.do(g);
        if (n.do) await n.do(g);
        id = val(pick.next, g);
      } else {
        $('.d-hint').style.opacity = 1; await waitAdvance();
        if (n.do) await n.do(g);
        id = val(n.next, g);
      }
    }
    box.classList.remove('open', 'has-choices');
  }

  function narrate({ title, text, image }) {
    return new Promise(res => {
      nar.innerHTML = `<div class="n-bg" style="background-image:url('${image}')"></div><div class="n-card"><h2>${title}</h2><p></p><button class="btn accent">Continuer</button></div>`;
      nar.classList.add('open'); document.body.classList.add('narrating');
      typeText(nar.querySelector('p'), text, 90);
      const close = () => { typing?.finish(); keyHandler = null; nar.classList.remove('open'); document.body.classList.remove('narrating'); setTimeout(res, 350); };
      nar.querySelector('.n-card').addEventListener('pointerup', () => typing?.finish());
      nar.querySelector('button').onclick = e => { e.stopPropagation(); close(); };
      keyHandler = e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); if (typing) typing.finish(); else close(); } };
    });
  }
  return { play, narrate, get open() { return box.classList.contains('open') || nar.classList.contains('open'); } };
}
