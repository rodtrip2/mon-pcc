/*
 * Mon PCC — fichiers de la boîte à outils (photos, vidéos, sons).
 * Stockés uniquement sur l'appareil (IndexedDB), chiffrés si le plan est protégé.
 */
import { encryptBytes, decryptBytes } from './storage.js';

const DB = 'monpcc-media';
const STORE = 'files';
export const MAX_BYTES = 150 * 1024 * 1024; // 150 Mo par fichier

let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    let out;
    Promise.resolve(fn(s)).then((r) => { out = r; });
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Stockage refusé'));
  }));
}

const reqP = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Enregistre un Blob ; renvoie son identifiant */
export async function put(blob, id = newId()) {
  const buf = await blob.arrayBuffer();
  const sealed = await encryptBytes(buf);
  await tx('readwrite', (s) => s.put({ id, mime: blob.type || 'application/octet-stream', size: blob.size, ...sealed }));
  return id;
}

/** Renvoie le Blob (déchiffré) ou null */
export async function get(id) {
  const rec = await tx('readonly', (s) => reqP(s.get(id)));
  if (!rec) return null;
  const buf = await decryptBytes(rec);
  return new Blob([buf], { type: rec.mime });
}

export async function remove(id) {
  await tx('readwrite', (s) => s.delete(id));
}

export async function ids() {
  return tx('readonly', (s) => reqP(s.getAllKeys()));
}

export async function clear() {
  try { await tx('readwrite', (s) => s.clear()); } catch { /* rien à effacer */ }
}

/** Charge tous les fichiers en clair (avant de changer la protection) */
export async function loadAll() {
  const out = [];
  for (const id of await ids()) {
    const b = await get(id);
    if (b) out.push({ id, blob: b });
  }
  return out;
}

/** Réenregistre tous les fichiers avec la clé courante */
export async function saveAll(list) {
  for (const { id, blob } of list) await put(blob, id);
}

/** Supprime les fichiers qui ne sont plus utilisés */
export async function prune(usedIds) {
  const used = new Set(usedIds);
  for (const id of await ids()) if (!used.has(id)) await remove(id);
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function dataURLToBlob(url) {
  const [head, b64] = url.split(',');
  const mime = (head.match(/^data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
