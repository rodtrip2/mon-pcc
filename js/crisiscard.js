/*
 * Mon PCC — carte de crise à glisser dans le portefeuille (85 × 55 mm).
 * Elle signale l'existence du plan et la personne à prévenir,
 * sans aucune information de santé détaillée.
 */
import { PdfDoc, jpegSize } from './pdf.js';

const W = 1700;
const H = 1100;
const BRAND = '#2f6f6a';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function fit(ctx, text, x, y, maxW, size, weight, color) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxW) break;
    s -= 2;
  } while (s > 14);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function logo(ctx, x, y, size) {
  const k = size / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(0, 0, 64, 64, 16) : ctx.rect(0, 0, 64, 64);
  ctx.fill();
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(25, 32, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.arc(39, 32, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/**
 * @param {object} c - { nom, ou, contactNom, contactLien, contactTel, soignantNom, soignantTel }
 */
export function renderCrisisCard(c) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // Bandeau
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, W, 230);
  logo(ctx, 90, 55, 120);
  fit(ctx, 'J’ai un plan de crise conjoint', 250, 140, W - 340, 84, 700, '#fff');
  fit(ctx, c.nom || '', 250, 200, W - 340, 44, 500, '#e3f0ee');

  const L = 90;
  const maxW = W - 2 * L;
  let y = 330;
  fit(ctx, 'Où le trouver :', L, y, maxW, 40, 600, '#5d6b6c');
  y += 70;
  fit(ctx, c.ou || 'Dans Mon Espace Santé', L, y, maxW, 58, 700, '#1d2a2c');

  y += 120;
  ctx.fillStyle = '#d9dfdc';
  ctx.fillRect(L, y - 60, maxW, 3);
  if (c.contactNom || c.contactTel) {
    fit(ctx, 'En cas de crise, merci de prévenir :', L, y, maxW, 40, 600, '#5d6b6c');
    y += 70;
    fit(ctx, [c.contactNom, c.contactLien && `(${c.contactLien})`].filter(Boolean).join(' '), L, y, maxW, 54, 700, '#1d2a2c');
    if (c.contactTel) { y += 70; fit(ctx, '☎ ' + c.contactTel, L, y, maxW, 58, 700, BRAND); }
    y += 100;
  }
  if (c.soignantNom || c.soignantTel) {
    fit(ctx, 'Mon soignant référent :', L, y, maxW, 40, 600, '#5d6b6c');
    y += 66;
    fit(ctx, [c.soignantNom, c.soignantTel && '☎ ' + c.soignantTel].filter(Boolean).join('   '), L, y, maxW, 48, 600, '#1d2a2c');
  }

  fit(ctx, 'Carte réalisée avec Mon PCC', L, H - 45, maxW, 26, 400, '#8a9697');
  return canvas;
}

export const toJpeg = (canvas) =>
  new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.92));

/** Page A4 : la carte en taille réelle avec traits de coupe, deux exemplaires */
export async function crisisCardPdf(jpegBlob) {
  const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const { width, height } = jpegSize(bytes) || { width: W, height: H };
  const doc = new PdfDoc();
  const p = doc.addPage();
  const MM = 72 / 25.4;
  const im = doc.addJpeg(bytes, width, height);
  const cw = 85 * MM;
  const ch = 55 * MM;
  const x = (doc.width - cw) / 2;
  doc.text(p, 20 * MM, 18 * MM, 'Ma carte de crise - imprimer à 100 % (taille réelle), découper le long des pointillés,', 'R', 9, '0.36 0.42 0.42');
  doc.text(p, 20 * MM, 18 * MM + 12, 'puis la glisser dans mon portefeuille, à côté de ma carte Vitale.', 'R', 9, '0.36 0.42 0.42');
  for (let k = 0; k < 2; k++) {
    const y = 32 * MM + k * (ch + 14 * MM);
    doc.image(p, im, x, y, cw, ch);
    doc.rect(p, x, y, cw, ch, { stroke: '0.6 0.6 0.6', width: 0.4 });
    const g = 1.5 * MM; const l = 5 * MM;
    for (const [cx, cy] of [[x, y], [x + cw, y], [x, y + ch], [x + cw, y + ch]]) {
      const left = cx === x;
      doc.line(p, left ? cx - g - l : cx + g, cy, left ? cx - g : cx + g + l, cy, 0.5, 0.4);
      doc.line(p, cx, cy === y ? cy - g - l : cy + g, cx, cy === y ? cy - g : cy + g + l, 0.5, 0.4);
    }
  }
  return doc.build({ title: 'Carte de crise' });
}
