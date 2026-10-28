/*
 * Mon PCC — image pour l'écran verrouillé du téléphone.
 *
 * Un site ne peut ni lire ni changer le fond d'écran : Mon PCC crée seulement
 * une image, que la personne choisit elle-même comme fond d'écran verrouillé.
 * L'image est dessinée sur ce téléphone, rien n'est envoyé.
 *
 * Mise en page : le haut (heure, date) et le bas (raccourcis, lampe, appareil
 * photo) restent libres ; le texte occupe la bande du milieu.
 */
import { tr } from './i18n.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Taille de l'image : celle de l'écran du téléphone, en pixels réels */
export function wallpaperSize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 4);
  let w = Math.round(Math.min(screen.width, screen.height) * dpr);
  let h = Math.round(Math.max(screen.width, screen.height) * dpr);
  if (w < 720 || h / w < 1.6 || h / w > 2.4) { w = 1179; h = 2556; } // ordinateur ou écran inhabituel : format téléphone courant
  return { w, h };
}

/** Coupe un texte en lignes qui tiennent dans la largeur */
function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width <= maxW || !line) line = t;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Dessine l'image.
 * o = { level: 'discret' | 'detaille', title, people: [{nom, lien, tel}], strategies: [texte], mention: bool, theme: 'sombre' | 'clair' }
 */
export function renderWallpaper(o, size = wallpaperSize()) {
  const { w: W, h: H } = size;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const dark = o.theme !== 'clair';
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  if (dark) { g.addColorStop(0, '#16403d'); g.addColorStop(1, '#0c2321'); } else { g.addColorStop(0, '#eef5f3'); g.addColorStop(1, '#d6e7e3'); }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const ink = dark ? '#ffffff' : '#163634';
  const soft = dark ? 'rgba(255,255,255,.72)' : '#4d6563';
  const accent = dark ? '#9fd8cf' : '#2f6f6a';
  const u = W / 100; // unité : 1 % de la largeur
  const L = 8 * u;
  const maxW = W - 2 * L;

  // Bande utile : sous l'heure (≈ 36 % de la hauteur) et au-dessus des raccourcis (≈ 86 %)
  const top = H * 0.36;
  const bottom = H * 0.86;

  // On compose d'abord, puis on réduit tout si ça ne tient pas
  const blocks = [];
  const title = (o.title || '').trim();
  if (title) blocks.push({ text: title, size: 8, weight: 700, color: ink, gap: 2.6 });
  if (o.level === 'detaille' && o.strategies?.length) {
    blocks.push({ text: tr('Ce qui m’aide :', 'What helps me:'), size: 4.4, weight: 600, color: accent, gap: 1.2 });
    o.strategies.forEach((s, i) => blocks.push({ text: `${i + 1}. ${s}`, size: 5.2, weight: 500, color: ink, gap: 1.1, indent: true }));
    blocks[blocks.length - 1].gap = 2.6;
  }
  if (o.people?.length) {
    blocks.push({ text: tr('Si besoin, appeler :', 'If needed, call:'), size: 4.4, weight: 600, color: accent, gap: 1.2 });
    for (const p of o.people) {
      blocks.push({ text: [p.nom, p.lien && `(${p.lien})`].filter(Boolean).join(' '), size: 5.4, weight: 650, color: ink, gap: p.tel ? 0.4 : 1.4 });
      if (p.tel) blocks.push({ text: '☎ ' + p.tel, size: 6, weight: 700, color: ink, gap: 1.8 });
    }
  }
  if (o.mention) blocks.push({ text: tr('Mon plan est dans l’application Mon PCC.', 'My plan is in the Mon PCC app.'), size: 3.8, weight: 400, color: soft, gap: 0, top: 1.2 });

  let k = 1;
  let laid = [];
  for (let tries = 0; tries < 12; tries++) {
    laid = [];
    let y = 0;
    for (const b of blocks) {
      const fs = b.size * u * k;
      ctx.font = `${b.weight} ${fs}px ${FONT}`;
      const lines = wrap(ctx, b.text, maxW - (b.indent ? 2 * u : 0));
      y += (b.top || 0) * u * k;
      for (const line of lines) { y += fs * 1.22; laid.push({ line, y, fs, b }); }
      y += b.gap * u * k;
    }
    if (y <= bottom - top) break;
    k *= 0.9;
  }
  const total = laid.length ? laid[laid.length - 1].y : 0;
  const y0 = top + Math.max(0, (bottom - top - total) / 3);
  ctx.textBaseline = 'alphabetic';
  for (const { line, y, fs, b } of laid) {
    ctx.font = `${b.weight} ${fs}px ${FONT}`;
    ctx.fillStyle = b.color;
    ctx.fillText(line, L + (b.indent ? 2 * u : 0), y0 + y);
  }
  return c;
}

export const toPng = (canvas) =>
  new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
