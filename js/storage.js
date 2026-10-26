/*
 * Mon PCC — stockage local uniquement.
 * Rien n'est envoyé sur Internet : les données restent dans le navigateur
 * de l'appareil (localStorage). Chiffrement facultatif par code (AES-GCM).
 */

const KEY = 'monpcc.v1';
const ITERATIONS = 250000;

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(code, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

let sessionKey = null; // clé gardée en mémoire tant que l'appli est ouverte
let sessionSalt = null;

export function emptyPlan() {
  const now = new Date().toISOString();
  return { version: 1, created: now, updated: now, data: {} };
}

function readRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storageAvailable() {
  try {
    localStorage.setItem(KEY + '.test', '1');
    localStorage.removeItem(KEY + '.test');
    return true;
  } catch {
    return false;
  }
}

/** 'none' | 'plain' | 'locked' */
export function status() {
  const raw = readRaw();
  if (!raw) return 'none';
  return raw.encrypted ? 'locked' : 'plain';
}

export function isProtected() {
  const raw = readRaw();
  return !!(raw && raw.encrypted);
}

export function loadPlain() {
  const raw = readRaw();
  if (!raw || raw.encrypted) return null;
  return raw.plan || null;
}

export async function unlock(code) {
  const raw = readRaw();
  if (!raw || !raw.encrypted) throw new Error('Aucun plan protégé');
  const salt = unb64(raw.salt);
  const key = await deriveKey(code, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(raw.iv) }, key, unb64(raw.ct));
  sessionKey = key;
  sessionSalt = salt;
  return JSON.parse(dec.decode(plain));
}

export async function save(plan) {
  plan.updated = new Date().toISOString();
  if (sessionKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sessionKey, enc.encode(JSON.stringify(plan)));
    localStorage.setItem(KEY, JSON.stringify({ encrypted: true, salt: b64(sessionSalt), iv: b64(iv), ct: b64(ct) }));
  } else {
    localStorage.setItem(KEY, JSON.stringify({ encrypted: false, plan }));
  }
}

export async function protect(plan, code) {
  sessionSalt = crypto.getRandomValues(new Uint8Array(16));
  sessionKey = await deriveKey(code, sessionSalt);
  await save(plan);
}

export async function unprotect(plan) {
  sessionKey = null;
  sessionSalt = null;
  await save(plan);
}

export function lock() {
  sessionKey = null;
  sessionSalt = null;
}

export function wipe() {
  sessionKey = null;
  sessionSalt = null;
  localStorage.removeItem(KEY);
}

export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch { /* sans importance */ }
  return false;
}

/* Chiffrement des fichiers (boîte à outils) avec la même clé que le plan */
export const hasKey = () => !!sessionKey;

export async function encryptBytes(buf) {
  if (!sessionKey) return { enc: false, data: buf };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sessionKey, buf);
  return { enc: true, iv, data };
}

export async function decryptBytes(rec) {
  if (!rec.enc) return rec.data;
  if (!sessionKey) throw new Error('verrouillé');
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv }, sessionKey, rec.data);
}
