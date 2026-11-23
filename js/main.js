// Point d'entrée de play.html : charge le moteur choisi + scénario commun.
import { ENGINES } from './core/engines-meta.js';
import { createUI } from './core/ui.js';
import { createDialogue } from './core/dialogue.js';
import { runScenario } from './core/scenario.js';

const LOADERS = {
  tabletop: () => import('./engines/tabletop.js'),
  cards: () => import('./engines/cards.js'),
  hex: () => import('./engines/hex.js'),
  paper: () => import('./engines/paper.js'),
};

const id = new URLSearchParams(location.search).get('e') || 'tabletop';
const meta = ENGINES.find(e => e.id === id) || ENGINES[0];
document.title = `${meta.letter} · ${meta.title}`;
const ui = createUI({ title: `${meta.letter} · ${meta.title}`, subtitle: meta.subtitle });

(async () => {
  try {
    ui.progress(0.05, 'Moteur…');
    const mod = await LOADERS[meta.id]();
    const engine = await mod.createEngine(document.getElementById('viewport'), { onProgress: (p, l) => ui.progress(p, l) });
    ui.progress(0.9, 'Scénario…');
    const dialogue = createDialogue(ui.root);
    await runScenario({ engine, ui, dialogue });
    ui.progress(1, 'Prêt');
    ui.loaded();
    window.__engine = engine;
  } catch (e) {
    console.error(e); ui.error(`Erreur : ${e.message}`);
  }
})();
