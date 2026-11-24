// Publication sur GitHub depuis l'éditeur (API « contents »).
// Le jeton (fine-grained, ce dépôt seulement, Contents: write) est saisi dans l'éditeur et stocké
// UNIQUEMENT dans le localStorage de cet appareil ; il n'est envoyé qu'à api.github.com.
const KEY = 'grimoire.gh';
export const GH_DEFAULT = { repo: 'BeerDeus/Boardgame', branch: 'claude/board-game-display-engine-mg98tg' };

export function ghConfig() {
  let c = {}; try { c = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  return { ...GH_DEFAULT, token: '', ...c };
}
export function ghSave(patch) {
  const c = { ...ghConfig(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
  return c;
}
export const ghForget = () => { try { localStorage.removeItem(KEY); } catch {} };

/** Texte UTF-8 → base64 */
const b64 = text => { const bytes = new TextEncoder().encode(text); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

async function api(cfg, path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${cfg.repo}/${path}`, {
    ...opts,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${cfg.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  let data = null; try { data = await r.json(); } catch {}
  if (!r.ok && r.status !== 404) {
    const why = r.status === 401 ? 'jeton invalide ou expiré' : r.status === 403 ? 'accès refusé (le jeton doit avoir « Contents : Read and write » sur ce dépôt)' : r.status === 409 ? 'conflit (fichier modifié entre-temps, réessayez)' : r.status === 422 ? 'requête refusée (branche introuvable ?)' : `erreur ${r.status}`;
    throw new Error(`${why}${data?.message ? ` — ${data.message}` : ''}`);
  }
  return { status: r.status, data };
}

/** Vérifie le jeton et l'accès en écriture au dépôt */
export async function ghCheck(cfg = ghConfig()) {
  const { status, data } = await api(cfg, '');
  if (status === 404) throw new Error(`dépôt ${cfg.repo} introuvable pour ce jeton`);
  if (data?.permissions && !data.permissions.push) throw new Error('le jeton ne permet pas d\'écrire dans ce dépôt');
  const br = await api(cfg, `branches/${encodeURIComponent(cfg.branch)}`);
  if (br.status === 404) throw new Error(`branche ${cfg.branch} introuvable`);
  return true;
}

/** Crée ou met à jour un fichier ; renvoie l'URL du commit */
export async function ghPut(path, text, message, cfg = ghConfig()) {
  const enc = path.split('/').map(encodeURIComponent).join('/');
  const cur = await api(cfg, `contents/${enc}?ref=${encodeURIComponent(cfg.branch)}`);
  const sha = cur.status === 200 ? cur.data?.sha : undefined;
  // fichier identique : rien à envoyer
  if (cur.status === 200 && cur.data?.content && cur.data.content.replace(/\n/g, '') === b64(text)) return { unchanged: true };
  const { data } = await api(cfg, `contents/${enc}`, { method: 'PUT', body: JSON.stringify({ message, content: b64(text), branch: cfg.branch, ...(sha ? { sha } : {}) }) });
  return { url: data?.commit?.html_url, sha: data?.content?.sha };
}
