/*
 * Mon PCC — partage de l'application : QR code, carte (JPG), planche de cartes (PDF).
 * Tout est généré sur l'appareil, sans service extérieur.
 * Ne contient jamais de données du plan : uniquement l'adresse de l'application.
 * QR code : bibliothèque qrcode-generator (Kazuhiko Arase, licence MIT), js/vendor/qrcode.js.
 */

import { tr } from './i18n.js';

export const CARD_MM = { w: 85, h: 55 };
export const CARD_PX = { w: 1700, h: 1100 };

const BRAND = '#2f6f6a';
const BRAND_DARK = '#24524e';
const BRAND_LIGHT = '#e3f0ee';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Adresse de l'application (dossier de la page, sans ancre). */
export function appUrl() {
  return location.origin + location.pathname.replace(/[^/]*$/, '');
}
export const displayUrl = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Matrice du QR code. */
export function makeQr(url) {
  const qr = window.qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const size = qr.getModuleCount();
  return { size, isDark: (r, c) => qr.isDark(r, c) };
}

export function qrSvg(qr, label) {
  let d = '';
  for (let r = 0; r < qr.size; r++) for (let c = 0; c < qr.size; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  const n = qr.size + 8;
  return `<svg viewBox="-4 -4 ${n} ${n}" class="qr-svg" shape-rendering="crispEdges" role="img" aria-label="${label}"><rect x="-4" y="-4" width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, x, y, maxWidth, size, weight) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    s -= 2;
  } while (s > 12);
  ctx.fillText(text, x, y);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (const w of text.split(/\s+/)) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function drawLogo(ctx, x, y, size) {
  const k = size / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = BRAND;
  roundRect(ctx, 0, 0, 64, 64, 16);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(25, 32, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(39, 32, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** Dessine la carte de visite 85 × 55 mm. */
export function renderCard(url, qr) {
  const { w: W, h: H } = CARD_PX;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  const panelX = 1080;
  ctx.fillStyle = BRAND_LIGHT;
  ctx.fillRect(panelX, 0, W - panelX, H);
  ctx.fillStyle = BRAND;
  ctx.fillRect(panelX, 0, 10, H);

  const left = 110;
  const maxW = panelX - left - 80;
  drawLogo(ctx, left, 95, 160);

  ctx.fillStyle = '#1d2a2c';
  fitText(ctx, 'Mon PCC', left + 195, 205, maxW - 195, 100, 700);

  ctx.fillStyle = BRAND_DARK;
  fitText(ctx, tr('Mon plan de crise conjoint', 'My joint crisis plan'), left, 400, maxW, 60, 650);

  ctx.fillStyle = '#4b5a5c';
  ctx.font = `400 44px ${FONT}`;
  wrapText(ctx, tr('Le préparer pas à pas sur mon téléphone, puis le construire avec les personnes qui m’accompagnent.', 'Prepare it step by step on my phone, then build it with the people who support me.'), left, 495, maxW, 58);

  ctx.fillStyle = '#5d6b6c';
  fitText(ctx, tr('Gratuit · Sans inscription · Mes réponses restent sur mon téléphone', 'Free · No sign-up · My answers stay on my phone'), left, 805, maxW, 36, 500);

  ctx.fillStyle = '#1d2a2c';
  fitText(ctx, displayUrl(url), left, 900, maxW, 42, 700);

  ctx.fillStyle = '#7a8687';
  fitText(ctx, tr('D’après le Plan de Crise Conjoint — plandecriseconjoint.ch (CC BY-NC-SA)', 'Based on the Joint Crisis Plan — plandecriseconjoint.ch (CC BY-NC-SA)'), left, 1010, maxW, 26, 400);

  // QR code
  const box = 500;
  const bx = panelX + 10 + (W - panelX - 10 - box) / 2;
  const by = 235;
  ctx.save();
  ctx.shadowColor = 'rgba(36, 82, 78, 0.18)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff';
  roundRect(ctx, bx, by, box, box, 36);
  ctx.fill();
  ctx.restore();
  const margin = 44;
  const cell = Math.floor((box - 2 * margin) / qr.size);
  const qrPx = cell * qr.size;
  const qx = Math.round(bx + (box - qrPx) / 2);
  const qy = Math.round(by + (box - qrPx) / 2);
  ctx.fillStyle = '#111';
  for (let r = 0; r < qr.size; r++) for (let c = 0; c < qr.size; c++) if (qr.isDark(r, c)) ctx.fillRect(qx + c * cell, qy + r * cell, cell, cell);

  ctx.fillStyle = '#374445';
  ctx.textAlign = 'center';
  fitText(ctx, tr('Scannez pour ouvrir l’application', 'Scan to open the app'), bx + box / 2, by + box + 90, W - panelX - 80, 38, 500);
  ctx.textAlign = 'left';
  return canvas;
}

export const canvasToJpeg = (canvas, q = 0.92) =>
  new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', q));

/* ---------- PDF minimal (une page A4, une image JPEG répétée) ---------- */

const PT = 72 / 25.4;

function latin1(str) {
  // WinAnsi : caractères usuels du français ; typographie simplifiée
  const s = String(str).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[  ]/g, ' ').replace(/×/g, 'x');
  let out = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    out += c < 256 ? ch : '?';
  }
  return out.replace(/[\\()]/g, (m) => '\\' + m);
}

/**
 * Planche A4 de 10 cartes (2 × 5) 85 × 55 mm, avec traits et repères de coupe.
 */
export async function buildSheetPdf(jpegBlob, header) {
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
  const { w, h } = CARD_MM;
  const cols = 2;
  const rows = 5;
  const x0 = (210 - cols * w) / 2;
  const y0 = (297 - rows * h) / 2;
  const PH = 297 * PT;
  const Y = (mm) => (PH - mm * PT).toFixed(2); // origine en haut, en mm
  const X = (mm) => (mm * PT).toFixed(2);

  let c = '';
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      c += `q ${(w * PT).toFixed(2)} 0 0 ${(h * PT).toFixed(2)} ${X(x0 + k * w)} ${Y(y0 + (r + 1) * h)} cm /Im1 Do Q\n`;
    }
  }
  // traits de découpe en pointillés
  c += '0.82 G 0.28 w [2.83 2.83] 0 d\n';
  for (let k = 0; k <= cols; k++) c += `${X(x0 + k * w)} ${Y(y0)} m ${X(x0 + k * w)} ${Y(y0 + rows * h)} l S\n`;
  for (let r = 0; r <= rows; r++) c += `${X(x0)} ${Y(y0 + r * h)} m ${X(x0 + cols * w)} ${Y(y0 + r * h)} l S\n`;
  // repères de coupe dans les marges
  c += '[] 0 d 0.47 G 0.57 w\n';
  const gap = 1.5;
  for (let k = 0; k <= cols; k++) {
    const x = x0 + k * w;
    c += `${X(x)} ${Y(y0 - gap - 3)} m ${X(x)} ${Y(y0 - gap)} l S\n`;
    c += `${X(x)} ${Y(y0 + rows * h + gap)} m ${X(x)} ${Y(y0 + rows * h + gap + 3)} l S\n`;
  }
  for (let r = 0; r <= rows; r++) {
    const y = y0 + r * h;
    c += `${X(x0 - gap - 5)} ${Y(y)} m ${X(x0 - gap)} ${Y(y)} l S\n`;
    c += `${X(x0 + cols * w + gap)} ${Y(y)} m ${X(x0 + cols * w + gap + 5)} ${Y(y)} l S\n`;
  }
  // consigne d'impression, centrée (largeur moyenne Helvetica ≈ 0,5 em)
  const txt = latin1(header);
  const size = 7;
  const tw = header.length * size * 0.5;
  c += `BT /F1 ${size} Tf 0.47 g ${((210 * PT - tw) / 2).toFixed(2)} ${Y(5)} Td (${txt}) Tj ET\n`;

  const enc = (s) => Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);
  const parts = [];
  const offsets = [];
  let len = 0;
  const push = (u8) => { parts.push(u8); len += u8.length; };
  const obj = (n, body, stream) => {
    offsets[n] = len;
    if (stream) {
      push(enc(`${n} 0 obj\n${body}\nstream\n`));
      push(stream);
      push(enc('\nendstream\nendobj\n'));
    } else push(enc(`${n} 0 obj\n${body}\nendobj\n`));
  };

  // dimensions de l'image (lecture de l'en-tête JPEG)
  const { width, height } = jpegSize(jpeg);
  const content = enc(c);

  push(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${(210 * PT).toFixed(2)} ${PH.toFixed(2)}] /Resources << /XObject << /Im1 4 0 R >> /Font << /F1 5 0 R >> >> /Contents 6 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
  obj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(6, `<< /Length ${content.length} >>`, content);
  obj(7, `<< /Title (${tr('Mon PCC - planche de cartes', 'Mon PCC - sheet of cards')}) /Producer (Mon PCC) >>`);
  const xref = len;
  let x = 'xref\n0 8\n0000000000 65535 f \n';
  for (let n = 1; n <= 7; n++) x += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
  x += `trailer\n<< /Size 8 /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  push(enc(x));
  return new Blob(parts, { type: 'application/pdf' });
}

function jpegSize(b) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    const l = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + l;
  }
  return CARD_PX;
}
