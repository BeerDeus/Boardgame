// Point d'entrée de play.html : charge le moteur choisi + scénario commun.
import { ENGINES } from './core/engines-meta.js';
import { VERSION } from './version.js';
window.__APP_V = VERSION;
import { createUI } from './core/ui.js';
import { createDialogue } from './core/dialogue.js';
import { runScenario } from './core/scenario.js';

const LOADERS = { hex: () => import('./engines/hex.js') }; // seul moteur conservé (les prototypes sont dans l'historique Git)

const id = new URLSearchParams(location.search).get('e') || 'hex';
const meta = ENGINES.find(e => e.id === id) || ENGINES[0];
document.title = `${meta.letter} · ${meta.title}`;
const ui = createUI({ title: `${meta.letter} · ${meta.title}`, subtitle: meta.subtitle });

(async () => {
  try {
    ui.progress(0.05, 'Moteur…');
    const mod = await LOADERS[meta.id]();
    const { CAMPAIGN, draftStep } = await import('./core/campaign.js');
    const draft = new URLSearchParams(location.search).get('level') === 'draft' ? draftStep() : null;
    const story0 = (await (draft || CAMPAIGN.steps[0]).load()).STORY;
    const engine = await mod.createEngine(document.getElementById('viewport'), { onProgress: (p, l) => ui.progress(p, l), story: story0 });
    ui.progress(0.85, 'Portraits…');
    try {
      const [{ createBaker }, { setPortrait }] = await Promise.all([import('./three/impostor.js'), import('./core/portraits.js')]);
      const STORY = story0;
      const baker = await createBaker(128);
      const seen = new Set();
      for (const c of [...STORY.heroes, ...STORY.cast]) { if (seen.has(c.kind)) continue; seen.add(c.kind); setPortrait(c.kind, await baker.portrait(c)); }
      baker.dispose();
    } catch (e) { console.warn('Portraits 3D indisponibles', e); }
    ui.progress(0.9, 'Scénario…');
    const dialogue = createDialogue(ui.root);
    ui.engine = engine; window.__engine = engine;
    await runScenario({ engine, ui, dialogue, engineId: meta.id, draft, ready: () => { ui.progress(1, 'Prêt'); ui.loaded(); } });
    window.__engine = engine;
  } catch (e) {
    console.error(e); ui.error(`Erreur : ${e.message}`);
  }
})();

import('./core/pwa.js').then(({ registerPWA, consumeUpdatedFlag }) => {
  registerPWA({ swUrl: 'sw.js?v=' + (new URL(import.meta.url).searchParams.get('v') || '') });
  if (consumeUpdatedFlag()) setTimeout(() => ui.toast('✓ Nouvelle version installée', 2600), 1500);
});
