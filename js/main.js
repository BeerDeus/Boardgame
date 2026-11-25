// Point d'entrée de play.html : charge le moteur choisi + scénario commun.
import { ENGINES } from './core/engines-meta.js';
import { VERSION } from './version.js';
window.__APP_V = VERSION;
import { createUI } from './core/ui.js';
import { createDialogue } from './core/dialogue.js';
import { runScenario, savedStepId } from './core/scenario.js';

const LOADERS = { hex: () => import('./engines/hex.js') }; // seul moteur conservé (les prototypes sont dans l'historique Git)

const id = new URLSearchParams(location.search).get('e') || 'hex';
const meta = ENGINES.find(e => e.id === id) || ENGINES[0];
document.title = 'Grimoire';
const ui = createUI({ title: 'Grimoire', subtitle: 'Les Chroniques de Brumeval' });

(async () => {
  try {
    ui.progress(0.05, 'Moteur…');
    const mod = await LOADERS[meta.id]();
    const { loadCampaignDef, draftStep } = await import('./core/campaign.js');
    const params = new URLSearchParams(location.search);
    const draft = params.get('level') === 'draft' ? draftStep() : null;
    // étape demandée (accueil → ?step=…) ; une partie sauvegardée impose son plateau jusqu'à la reprise ou l'abandon
    const steps = draft ? [draft] : (await loadCampaignDef()).steps;
    const stepId = params.get('step'), saved = draft ? null : savedStepId(meta.id);
    const first = draft || steps.find(s => s.id === saved && !s.soon) || steps.find(s => s.id === stepId && !s.soon) || steps.find(s => !s.soon);
    const story0 = (await first.load()).STORY;
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
    ui.engine = engine; window.__engine = engine; window.__ui = ui;
    await runScenario({ engine, ui, dialogue, engineId: meta.id, draft, stepId: stepId || first.id, ready: () => { ui.progress(1, 'Prêt'); ui.loaded(); } });
    window.__engine = engine;
  } catch (e) {
    console.error(e); ui.error(`Erreur : ${e.message}`);
  }
})();

import('./core/pwa.js').then(({ registerPWA, consumeUpdatedFlag }) => {
  registerPWA({ swUrl: 'sw.js?v=' + (new URL(import.meta.url).searchParams.get('v') || '') });
  if (consumeUpdatedFlag()) setTimeout(() => ui.toast('✓ Nouvelle version installée', 2600), 1500);
});
