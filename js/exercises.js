/*
 * Mon PCC — exercices de « Ma boussole bien-être » affichés dans Mon PCC.
 * Les exercices restent ceux de Ma boussole (projet distinct, licence GPL-3) :
 * Mon PCC n'en copie pas le code, il affiche leurs pages dans un cadre
 * (même site : rodtrip2.github.io). Descriptions rédigées pour Mon PCC.
 */

/** Adresse de Ma boussole bien-être, à côté de Mon PCC sur le même site */
export const BOUSSOLE_BASE = new URL('../ma-boussole-bien-etre/', location.origin + location.pathname.replace(/[^/]*$/, '')).href;
export const BOUSSOLE_SCOPE = new URL(BOUSSOLE_BASE).pathname;

export const EXERCISES = [
  { id: 'breathing', path: 'breathing/', icon: '💨', name: 'Respiration en 2 minutes', desc: 'Ralentir sa respiration pour se poser.', duration: '2-3 min' },
  { id: 'guided-breathing', path: 'guided-breathing/', icon: '🫁', name: 'Respiration guidée', desc: 'Suivre un rythme lent, dont la cohérence cardiaque.', duration: '5-10 min' },
  { id: 'grounding', path: 'grounding/', icon: '🖐', name: 'Ancrage 5-4-3-2-1', desc: 'Revenir à l’instant présent avec ses cinq sens.', duration: '3-5 min' },
  { id: 'progressive-muscle-relaxation', path: 'progressive-muscle-relaxation/', icon: '💪', name: 'Relaxation musculaire progressive', desc: 'Contracter puis relâcher les muscles pour détendre le corps.', duration: '8-12 min' },
  { id: 'peaceful-visualization', path: 'peaceful-visualization/', icon: '🏞', name: 'Visualisation apaisante', desc: 'Se laisser guider vers un lieu calme, avec une voix.', duration: '10-12 min' },
  { id: 'self-compassion', path: 'self-compassion/', icon: '💛', name: 'Pause d’autocompassion', desc: 'Se parler avec douceur dans un moment difficile.', duration: '3-5 min' },
  { id: 'leaves-on-stream', path: 'leaves-on-stream/', icon: '🍃', name: 'Les feuilles sur la rivière', desc: 'Poser ses pensées sur des feuilles et les regarder s’éloigner.', duration: '3-5 min' },
  { id: 'sound-therapy', path: 'sound-therapy/', icon: '🎧', name: 'Sons apaisants', desc: 'Écouter des sons doux pour se détendre.', duration: '5-30 min' },
  { id: 'stress-relief-bubbles', path: 'stress-relief-bubbles/', icon: '🫧', name: 'Bulles anti-stress', desc: 'Éclater des bulles pour occuper ses mains et son esprit.', duration: '2-5 min' },
  { id: 'fidget-spinner', path: 'fidget-spinner/', icon: '🌀', name: 'Fidget spinner', desc: 'Faire tourner une toupie pour canaliser l’agitation.', duration: '1-3 min' },
];

export const exerciseById = (id) => EXERCISES.find((e) => e.id === id);
export const exerciseUrl = (e) => BOUSSOLE_BASE + e.path; // mode intégré détecté par Ma boussole (page dans un cadre)

/* ---------- préparation hors connexion ---------- */

/** État : { sw: bool, pages: n, audios: n, audiosTotal: n|null } (même site requis) */
export async function offlineStatus() {
  const st = { sw: false, pages: 0, audios: 0, audiosTotal: null };
  try {
    const reg = await navigator.serviceWorker?.getRegistration(BOUSSOLE_SCOPE);
    st.sw = !!reg?.active && new URL(reg.scope).pathname === BOUSSOLE_SCOPE;
    for (const k of await caches.keys()) {
      if (k.startsWith('workbox-precache') && k.includes(BOUSSOLE_SCOPE)) st.pages += (await (await caches.open(k)).keys()).length;
    }
    if (await caches.has('mbb-audios')) st.audios = (await (await caches.open('mbb-audios')).keys()).length;
  } catch { /* stockage indisponible */ }
  return st;
}

/**
 * Charge Ma boussole dans un cadre invisible (installe son service worker et ses pages),
 * puis télécharge les sons français. onProgress({ step, done, total }).
 */
export async function prepareOffline(onProgress = () => {}) {
  if (!('serviceWorker' in navigator) || !window.caches) throw new Error('unsupported');
  onProgress({ step: 'pages' });
  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.setAttribute('aria-hidden', 'true');
  frame.src = BOUSSOLE_BASE;
  document.body.appendChild(frame);
  try {
    // Attendre que le service worker de Ma boussole soit actif (pages en mémoire)
    const t0 = Date.now();
    for (;;) {
      const reg = await navigator.serviceWorker.getRegistration(BOUSSOLE_SCOPE);
      if (reg?.active && new URL(reg.scope).pathname === BOUSSOLE_SCOPE) break;
      if (Date.now() - t0 > 180000) throw new Error('timeout');
      await new Promise((r) => setTimeout(r, 1000));
    }
    // Sons et narrations en français
    const list = await (await fetch(BOUSSOLE_BASE + 'audios/offline-fr.json', { cache: 'no-store' })).json();
    const files = list.files || [];
    const cache = await caches.open('mbb-audios');
    let done = 0;
    onProgress({ step: 'audios', done, total: files.length });
    const queue = [...files];
    const worker = async () => {
      while (queue.length) {
        const f = queue.shift();
        const url = BOUSSOLE_BASE + f;
        if (!(await cache.match(url))) {
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) await cache.put(url, res);
        }
        done += 1;
        onProgress({ step: 'audios', done, total: files.length });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    return files.length;
  } finally {
    frame.remove();
  }
}
