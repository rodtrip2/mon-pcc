/*
 * Mon PCC — langue de l'interface (français / anglais) et pays des ressources d'aide.
 *
 * Langue : celle du téléphone par défaut (français si ce n'est ni le français ni
 * l'anglais), ou choix enregistré sur l'appareil (Réglages, menu).
 * Pays : déduit du fuseau horaire puis de la langue du téléphone, ou choix enregistré.
 * Les deux réglages restent sur l'appareil (localStorage), jamais dans le plan.
 */

export const LANGS = { fr: 'Français', en: 'English' };
export const COUNTRY_CODES = ['FR', 'GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'INT'];

const LANG_KEY = 'monpcc.lang';
const COUNTRY_KEY = 'monpcc.country';

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignoré */ } };

/** Langue du téléphone (fr ou en ; fr par défaut) */
export function deviceLang() {
  for (const l of navigator.languages || [navigator.language || '']) {
    const c = String(l || '').slice(0, 2).toLowerCase();
    if (c === 'fr' || c === 'en') return c;
  }
  return 'fr';
}

/** Pays probable : fuseau horaire d'abord, puis région de la langue du téléphone */
export function deviceCountry() {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* indisponible */ }
  const TZ = {
    'Europe/Paris': 'FR', 'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Dublin': 'IE',
    'Pacific/Auckland': 'NZ', 'Pacific/Chatham': 'NZ',
    'Indian/Reunion': 'FR', 'America/Guadeloupe': 'FR', 'America/Martinique': 'FR', 'America/Cayenne': 'FR', 'Indian/Mayotte': 'FR',
  };
  if (TZ[tz]) return TZ[tz];
  if (tz.startsWith('Australia/')) return 'AU';
  const CA_TZ = ['Toronto', 'Vancouver', 'Montreal', 'Edmonton', 'Winnipeg', 'Halifax', 'St_Johns', 'Regina', 'Moncton', 'Whitehorse', 'Yellowknife', 'Iqaluit', 'Glace_Bay', 'Goose_Bay', 'Dawson_Creek', 'Swift_Current'];
  if (tz.startsWith('America/') && CA_TZ.some((c) => tz.endsWith(c))) return 'CA';
  const US_TZ = ['New_York', 'Chicago', 'Denver', 'Los_Angeles', 'Phoenix', 'Anchorage', 'Detroit', 'Boise', 'Juneau'];
  if (tz.startsWith('America/') && US_TZ.some((c) => tz.endsWith(c))) return 'US';
  if (tz === 'Pacific/Honolulu') return 'US';
  for (const l of navigator.languages || [navigator.language || '']) {
    const m = /^[a-z]{2}-([A-Z]{2})$/i.exec(l || '');
    if (!m) continue;
    const r = m[1].toUpperCase() === 'UK' ? 'GB' : m[1].toUpperCase();
    if (COUNTRY_CODES.includes(r)) return r;
  }
  return deviceLang() === 'fr' ? 'FR' : 'INT';
}

export let LANG = 'fr';
export let COUNTRY = 'FR';

/** Choix enregistrés (null = automatique) */
export const langPref = () => { const v = get(LANG_KEY); return v in LANGS ? v : null; };
export const countryPref = () => { const v = get(COUNTRY_KEY); return COUNTRY_CODES.includes(v) ? v : null; };

export function initLocale() {
  LANG = langPref() || deviceLang();
  COUNTRY = countryPref() || deviceCountry();
  document.documentElement.lang = LANG;
}

/** v = 'fr' | 'en' | null (automatique) */
export function setLangPref(v) {
  set(LANG_KEY, v in LANGS ? v : null);
  LANG = langPref() || deviceLang();
  document.documentElement.lang = LANG;
  const m = document.querySelector('link[rel="manifest"]');
  if (m) m.setAttribute('href', LANG === 'en' ? 'manifest-en.webmanifest' : 'manifest.webmanifest');
}

/** c = code pays ou null (automatique) */
export function setCountryPref(c) {
  set(COUNTRY_KEY, COUNTRY_CODES.includes(c) ? c : null);
  COUNTRY = countryPref() || deviceCountry();
}

/** Texte selon la langue : tr('français', 'English') */
export const tr = (fr, en) => (LANG === 'en' ? en : fr);

/** Valeur bilingue { fr, en } (ou chaîne simple) dans la langue courante */
export const L = (v) => (v && typeof v === 'object' ? (v[LANG] ?? v.fr ?? v.en ?? '') : (v ?? ''));

/** Locale pour les dates et heures */
export function locale() {
  if (LANG === 'fr') return COUNTRY === 'CA' ? 'fr-CA' : 'fr-FR';
  return { US: 'en-US', CA: 'en-CA', AU: 'en-AU', NZ: 'en-NZ', IE: 'en-IE' }[COUNTRY] || 'en-GB';
}

/** Accord simple : plural(n, 'étape', 'étapes') */
export const plural = (n, one, many) => (n > 1 || (LANG === 'en' && n === 0) ? many : one);
