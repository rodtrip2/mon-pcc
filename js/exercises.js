/*
 * Mon PCC — exercices de « Ma boussole bien-être » affichés dans Mon PCC.
 * Les exercices restent ceux de Ma boussole (projet distinct, licence GPL-3) :
 * Mon PCC n'en copie pas le code, il affiche leurs pages dans un cadre
 * (même site : rodtrip2.github.io). Descriptions rédigées pour Mon PCC.
 */

/** Adresse de Ma boussole bien-être, à côté de Mon PCC sur le même site */
import { LANG } from './i18n.js';

export const BOUSSOLE_BASE = new URL('../ma-boussole-bien-etre/', location.origin + location.pathname.replace(/[^/]*$/, '')).href;
export const BOUSSOLE_SCOPE = new URL(BOUSSOLE_BASE).pathname;

const EX = [
  { id: 'breathing', path: 'breathing/', icon: '💨', duration: '2-3 min',
    fr: { name: 'Respiration en 2 minutes', desc: 'Ralentir sa respiration pour se poser.' },
    en: { name: '2-Minute Breathing', desc: 'Slow your breathing down to settle.' } },
  { id: 'guided-breathing', path: 'guided-breathing/', icon: '🫁', duration: '5-10 min',
    fr: { name: 'Respiration guidée', desc: 'Suivre un rythme lent, dont la cohérence cardiaque.' },
    en: { name: 'Guided Breathing', desc: 'Follow a slow rhythm, including coherent breathing.' } },
  { id: 'grounding', path: 'grounding/', icon: '🖐', duration: '3-5 min',
    fr: { name: 'Ancrage 5-4-3-2-1', desc: 'Revenir à l’instant présent avec ses cinq sens.' },
    en: { name: '5-4-3-2-1 Grounding', desc: 'Come back to the present moment through your five senses.' } },
  { id: 'progressive-muscle-relaxation', path: 'progressive-muscle-relaxation/', icon: '💪', duration: '8-12 min',
    fr: { name: 'Relaxation musculaire progressive', desc: 'Contracter puis relâcher les muscles pour détendre le corps.' },
    en: { name: 'Progressive Muscle Relaxation', desc: 'Tense then release your muscles to relax your body.' } },
  { id: 'peaceful-visualization', path: 'peaceful-visualization/', icon: '🏞', duration: '10-12 min',
    fr: { name: 'Visualisation apaisante', desc: 'Se laisser guider vers un lieu calme, avec une voix.' },
    en: { name: 'Peaceful Visualization', desc: 'Let a voice guide you to a calm place.' } },
  { id: 'self-compassion', path: 'self-compassion/', icon: '💛', duration: '3-5 min',
    fr: { name: 'Pause d’autocompassion', desc: 'Se parler avec douceur dans un moment difficile.' },
    en: { name: 'Self-Compassion Break', desc: 'Speak to yourself kindly in a difficult moment.' } },
  { id: 'leaves-on-stream', path: 'leaves-on-stream/', icon: '🍃', duration: '3-5 min',
    fr: { name: 'Les feuilles sur la rivière', desc: 'Poser ses pensées sur des feuilles et les regarder s’éloigner.' },
    en: { name: 'Leaves on a Stream', desc: 'Place your thoughts on leaves and watch them float away.' } },
  { id: 'sound-therapy', path: 'sound-therapy/', icon: '🎧', duration: '5-30 min',
    fr: { name: 'Sons apaisants', desc: 'Écouter des sons doux pour se détendre.' },
    en: { name: 'Sound Therapy', desc: 'Listen to gentle sounds to relax.' } },
  { id: 'stress-relief-bubbles', path: 'stress-relief-bubbles/', icon: '🫧', duration: '2-5 min',
    fr: { name: 'Bulles anti-stress', desc: 'Éclater des bulles pour occuper ses mains et son esprit.' },
    en: { name: 'Stress Relief Bubbles', desc: 'Pop bubbles to keep your hands and mind busy.' } },
  { id: 'fidget-spinner', path: 'fidget-spinner/', icon: '🌀', duration: '1-3 min',
    fr: { name: 'Fidget spinner', desc: 'Faire tourner une toupie pour canaliser l’agitation.' },
    en: { name: 'Fidget Spinner', desc: 'Spin a fidget spinner to channel restlessness.' } },
];

/** Exercices dans la langue courante */
export const EXERCISES_ALL = EX;
const local = (e) => ({ id: e.id, path: e.path, icon: e.icon, duration: e.duration, ...(e[LANG] || e.fr) });
export const exercises = () => EX.map(local);
export const exerciseById = (id) => { const e = EX.find((x) => x.id === id); return e ? local(e) : undefined; };
/** Page de l'exercice, dans la langue de Mon PCC (Ma boussole : anglais sous /en/) */
export const exerciseUrl = (e) => BOUSSOLE_BASE + (LANG === 'en' ? 'en/' : '') + e.path; // mode intégré détecté par Ma boussole (page dans un cadre)

/* ---------- préparation hors connexion ----------
 * Français : les pages sont gardées par le service worker de Ma boussole (précache).
 * Anglais : Mon PCC dépose les pages anglaises des exercices et les textes anglais dans
 * le cache « mbb-pages-en », que le service worker de Ma boussole sert hors connexion.
 */
const PAGES_EN = 'mbb-pages-en';

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
    if (LANG === 'en') st.pages = (await caches.has(PAGES_EN)) ? (await (await caches.open(PAGES_EN)).keys()).length : 0;
  } catch { /* stockage indisponible */ }
  return st;
}

/**
 * Charge Ma boussole dans un cadre invisible (installe son service worker et ses pages),
 * puis télécharge les sons (et, en anglais, les pages anglaises). onProgress({ step, done, total }).
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
    // Pages et textes anglais (les pages françaises sont déjà en mémoire)
    if (LANG === 'en') {
      const pages = await caches.open(PAGES_EN);
      const urls = [BOUSSOLE_BASE + '_i18n/en/messages.json', ...EX.map((e) => BOUSSOLE_BASE + 'en/' + e.path)];
      for (const url of urls) {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) await pages.put(url, res);
      }
    }
    // Sons et narrations dans la langue de Mon PCC
    const list = await (await fetch(BOUSSOLE_BASE + `audios/offline-${LANG === 'en' ? 'en' : 'fr'}.json`, { cache: 'no-store' })).json();
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
