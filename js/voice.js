/*
 * Mon PCC — voix : lecture à voix haute et dictée.
 *
 * Lecture à voix haute : uniquement avec une voix installée sur l'appareil
 * (localService), pour qu'aucun texte ne parte vers un service en ligne.
 *
 * Dictée : désactivée par défaut, activable seulement dans les Réglages.
 *  - « local » : reconnaissance sur l'appareil (Web Speech API, processLocally),
 *    sans envoi de la voix. Refusée si le navigateur ne peut pas le garantir.
 *  - « online » : reconnaissance par le service du navigateur (Google pour Chrome,
 *    Apple pour Safari…), après un avertissement clair.
 */
import { LANG } from './i18n.js';

/* ---------------------------------------------------------- lecture à voix haute */

const synth = () => window.speechSynthesis;

function localVoice() {
  const s = synth();
  if (!s) return null;
  const pref = LANG === 'en' ? 'en' : 'fr';
  const voices = s.getVoices().filter((v) => v.localService && v.lang.toLowerCase().startsWith(pref));
  return voices.find((v) => v.default) || voices[0] || null;
}

/** Les voix se chargent parfois après l'ouverture de la page */
export function ttsReady() {
  return new Promise((resolve) => {
    const s = synth();
    if (!s) return resolve(false);
    if (s.getVoices().length) return resolve(!!localVoice());
    const t = setTimeout(() => resolve(!!localVoice()), 1500);
    s.addEventListener('voiceschanged', () => { clearTimeout(t); resolve(!!localVoice()); }, { once: true });
  });
}

export const ttsAvailable = () => !!localVoice();

let speakingBtn = null;
export function speak(text, btn) {
  const s = synth();
  const v = localVoice();
  if (!s || !v) return false;
  const wasMe = speakingBtn === btn && s.speaking;
  s.cancel();
  if (speakingBtn) speakingBtn.setAttribute('aria-pressed', 'false');
  speakingBtn = null;
  if (wasMe) return true; // second appui : arrêt
  const u = new SpeechSynthesisUtterance(text);
  u.voice = v; u.lang = v.lang; u.rate = 0.95;
  u.onend = u.onerror = () => { btn?.setAttribute('aria-pressed', 'false'); if (speakingBtn === btn) speakingBtn = null; };
  btn?.setAttribute('aria-pressed', 'true');
  speakingBtn = btn;
  s.speak(u);
  return true;
}
export function stopSpeaking() { synth()?.cancel(); }

/* ------------------------------------------------------------------- dictée */

const DICT_KEY = 'monpcc.dictee'; // 'off' | 'local' | 'online'
const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;

export const dictationPref = () => { try { return localStorage.getItem(DICT_KEY) || 'off'; } catch { return 'off'; } };
export function setDictationPref(v) { try { localStorage.setItem(DICT_KEY, v); } catch { /* ignoré */ } }
export const dictationSupported = () => !!SR();
/** Le navigateur sait-il dire s'il peut reconnaître la voix sur l'appareil ? */
export const localCheckSupported = () => !!(SR() && typeof SR().available === 'function');
const langTag = () => (LANG === 'en' ? 'en-US' : 'fr-FR');

/** 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown' */
export async function localStatus() {
  if (!localCheckSupported()) return 'unknown';
  try { return await SR().available({ langs: [langTag()], processLocally: true }); } catch { return 'unavailable'; }
}

/** Le bouton micro est-il proposé ? */
export const dictationOn = () => dictationPref() !== 'off' && dictationSupported();

/**
 * Dicte dans un champ (le texte reconnu est ajouté à la fin).
 * Renvoie une promesse : 'ok' | 'need-install' | 'no-local' | 'denied' | 'error'.
 */
export async function dictateInto(input, btn, onStatus = () => {}) {
  const Rec = SR();
  if (!Rec) return 'error';
  const mode = dictationPref();
  const rec = new Rec();
  rec.lang = langTag();
  rec.interimResults = true;
  rec.continuous = false;
  if (mode === 'local') {
    if (!localCheckSupported()) return 'no-local';
    let st = await localStatus();
    if (st === 'downloadable' || st === 'downloading') {
      onStatus('installing');
      try { await Rec.install({ langs: [langTag()], processLocally: true }); } catch { /* vérifié ci-dessous */ }
      st = await localStatus();
    }
    if (st !== 'available') return st === 'unavailable' ? 'no-local' : 'need-install';
    try { rec.processLocally = true; } catch { /* propriété absente */ }
    try { rec.options = { langs: [langTag()], processLocally: true }; } catch { /* ancienne forme */ }
    if (rec.processLocally !== true && !(rec.options && rec.options.processLocally)) return 'no-local';
  }
  const base = input.value && !/\s$/.test(input.value) ? input.value + ' ' : input.value;
  return new Promise((resolve) => {
    let done = false;
    const end = (r) => { if (done) return; done = true; btn?.setAttribute('aria-pressed', 'false'); resolve(r); };
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      input.value = base + text.trim();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    rec.onerror = (e) => end(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'no-speech' || e.error === 'aborted' ? 'ok' : 'error');
    rec.onend = () => end('ok');
    btn?.setAttribute('aria-pressed', 'true');
    onStatus('listening');
    try { rec.start(); } catch { end('error'); }
    btn?.addEventListener('click', () => { try { rec.stop(); } catch { /* déjà arrêtée */ } }, { once: true });
  });
}
