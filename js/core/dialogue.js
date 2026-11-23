// Système de dialogue PNJ + narration plein écran (style livre dont vous êtes le héros).
import { figureSVG } from './art.js';

export function createDialogue(root) {
  const box = document.createElement('div');
  box.className = 'dialogue';
  box.innerHTML = `<div class="d-portrait"></div><div class="d-main"><div class="d-name"></div><div class="d-text"></div><div class="d-hint">Touchez pour continuer ▸</div></div><div class="d-choices"></div>`;
  root.append(box);
  const nar = document.createElement('div');
  nar.className = 'narration';
  root.append(nar);

  const $ = s => box.querySelector(s);
  let typing = null;

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
  const waitTap = () => new Promise(res => { const f = e => { e.stopPropagation(); box.removeEventListener('pointerup', f); res(); }; box.addEventListener('pointerup', f); });

  /**
   * play(script, hooks) : script = { start, speakers:{id:{name,kind,color}}, nodes:{ id:{ speaker, text, next?, choices?:[{text,next,event}] , event? } } }
   * hooks.onSpeaker(id) pour piloter la caméra ; hooks.onEvent(name) pour déclencher des effets plateau.
   */
  async function play(script, hooks = {}) {
    box.classList.add('open');
    let id = script.start, lastSpeaker = null;
    while (id && script.nodes[id]) {
      const n = script.nodes[id];
      const sp = script.speakers[n.speaker] || { name: '', kind: 'npc', color: '#777' };
      if (n.speaker !== lastSpeaker) {
        lastSpeaker = n.speaker; hooks.onSpeaker?.(n.speaker);
        $('.d-portrait').innerHTML = `<div class="pimg big" style="--c:${sp.color}">${figureSVG(sp.kind, sp.color, { portrait: true })}</div>`;
        $('.d-name').textContent = sp.name; $('.d-name').style.color = sp.color;
        box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
      }
      if (n.event) hooks.onEvent?.(n.event);
      $('.d-choices').innerHTML = ''; box.classList.remove('has-choices'); $('.d-hint').style.opacity = 0;
      const typed = typeText($('.d-text'), n.text);
      // tap pendant la frappe = affichage immédiat
      const skip = () => typing?.finish();
      box.addEventListener('pointerup', skip);
      await typed; box.removeEventListener('pointerup', skip);
      if (n.choices) {
        box.classList.add('has-choices');
        id = await new Promise(res => {
          n.choices.forEach((c, i) => {
            const b = document.createElement('button'); b.className = 'choice';
            b.innerHTML = `<i>${i + 1}</i>${c.text}`;
            b.onclick = e => { e.stopPropagation(); if (c.event) hooks.onEvent?.(c.event); res(c.next); };
            $('.d-choices').append(b);
          });
        });
      } else { $('.d-hint').style.opacity = 1; await waitTap(); id = n.next; }
    }
    box.classList.remove('open', 'has-choices');
    hooks.onEnd?.();
  }

  /** Paragraphe de narration plein écran avec illustration */
  function narrate({ title, text, image }) {
    return new Promise(res => {
      nar.innerHTML = `<div class="n-bg" style="background-image:url('${image}')"></div><div class="n-card"><h2>${title}</h2><p></p><button class="btn accent">Continuer</button></div>`;
      nar.classList.add('open');
      const p = nar.querySelector('p');
      typeText(p, text, 90);
      nar.querySelector('.n-card').addEventListener('pointerup', () => typing?.finish());
      nar.querySelector('button').onclick = e => { e.stopPropagation(); typing?.finish(); nar.classList.remove('open'); setTimeout(res, 350); };
    });
  }
  return { play, narrate, get open() { return box.classList.contains('open') || nar.classList.contains('open'); } };
}
