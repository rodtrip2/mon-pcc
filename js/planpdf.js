/* Mon PCC — plan de crise conjoint au format PDF (A4), chiffrement facultatif */
import { STEPS, SOURCE, PRINT_TITLE, PRINT_SUBTITLE } from './data.js';
import { stepContent, fmtDate, fmtDateTime, lastUpdate } from './export.js';
import { PdfDoc, wrap, textWidth, jpegSize } from './pdf.js';
import { tr } from './i18n.js';

const MM = 72 / 25.4;
const M = 18 * MM;            // marges latérales et haute
const BOTTOM = 20 * MM;       // marge basse (pied de page)
const TEAL = '0.184 0.435 0.416';
const TEAL_DARK = '0.141 0.322 0.306';
const INK = '0.114 0.165 0.173';
const GREY = '0.36 0.42 0.42';

/** Signature PNG (fond transparent) → JPEG sur fond blanc */
async function sigToJpeg(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { bytes, ...(jpegSize(bytes) || { width: c.width, height: c.height }) };
}

export async function buildPlanPdf(plan, password = '') {
  const doc = new PdfDoc();
  const PW = doc.width;
  const PH = doc.height;
  const CW = PW - 2 * M;
  let page = doc.addPage();
  let y = M;

  const need = (h) => {
    if (y + h > PH - BOTTOM) { page = doc.addPage(); y = M; }
  };
  const para = (str, { font = 'R', size = 10, color = INK, indent = 0, lead = 1.32, bullet = '' } = {}) => {
    const lines = wrap(str, font, size, CW - indent);
    lines.forEach((l, i) => {
      need(size * lead);
      if (i === 0 && bullet) doc.text(page, M + indent - textWidth(bullet, 'R', size) - 4, y + size, bullet, 'R', size, color);
      doc.text(page, M + indent, y + size, l, font, size, color);
      y += size * lead;
    });
  };

  // En-tête
  doc.text(page, M, y + 16, PRINT_TITLE, 'B', 16, TEAL);
  y += 22;
  para(PRINT_SUBTITLE, { size: 10, color: GREY });
  y += 2;
  para(`${tr('Dernière mise à jour :', 'Last updated:')} ${fmtDateTime(lastUpdate(plan))}`, { font: 'B', size: 9.5, color: TEAL_DARK });
  y += 3;
  doc.line(page, M, y, M + CW, y, 2, 0.35);
  doc.op(page, ''); // séparation lisible
  y += 12;

  for (const step of STEPS) {
    const content = stepContent(step, plan.data, plan);
    if (step.type === 'identity') {
      if (content.length) {
        const [first, ...rest] = content[0].lines;
        para(first, { font: 'B', size: 13 });
        rest.forEach((l) => para(l, { size: 10 }));
      } else para(tr('Coordonnées non renseignées', 'Details not filled in'), { font: 'I', size: 10, color: GREY });
      y += 8;
      continue;
    }

    // Titre (question) gardé avec le début de la réponse
    const qLines = wrap(step.question, 'B', 10.5, CW);
    need(qLines.length * 10.5 * 1.3 + 16);
    para(step.question, { font: 'B', size: 10.5, color: TEAL_DARK, lead: 1.3 });
    y += 2;

    if (!content.length && step.type !== 'final') para(tr('Non renseigné', 'Not filled in'), { font: 'I', size: 10, color: GREY });

    for (const block of content) {
      if (block.label) {
        need(26);
        y += 3;
        para(block.label.toUpperCase(), { font: 'B', size: 8, color: GREY });
      }
      if (block.signatures) {
        await signatureBoxes(block.signers);
      } else if (step.type === 'final') {
        block.lines.forEach((l) => para(l, { size: 10 }));
      } else {
        block.lines.forEach((l, i) => para(l, { size: 10, indent: 16, bullet: block.ordered ? `${i + 1}.` : '•' }));
      }
    }
    if (step.type === 'final' && !content.some((b) => b.signatures)) await signatureBoxes([{}, {}]);
    y += 9;
  }

  // Mention de source
  y += 4;
  need(50);
  doc.line(page, M, y, M + CW, y, 0.5, 0.75);
  y += 8;
  para(`${tr('Document rédigé avec Mon PCC, d’après le support :', 'Document written with Mon PCC, based on:')} ${SOURCE.citation} ${SOURCE.url} — © ${SOURCE.holder}, ${tr('licence', 'licence')} ${SOURCE.license}. ${tr('Mise en page adaptée.', 'Layout adapted.')}`, { size: 7.5, color: GREY });
  para(`${tr('Dernière mise à jour :', 'Last updated:')} ${fmtDateTime(lastUpdate(plan))}. ${tr('À relire après une crise, lors d’un changement important et au moins tous les six mois.', 'To be reviewed after a crisis, when something important changes, and at least every six months.')}`, { size: 7.5, color: GREY });

  // Pied de page
  const id = plan.data.coordonnees || {};
  const who = [id.prenom, id.nom].filter(Boolean).join(' ');
  doc.pages.forEach((_, i) => {
    const t = `${tr('Plan de crise conjoint', 'Joint crisis plan')}${who ? ' — ' + who : ''} — ${tr('mis à jour le', 'updated on')} ${fmtDate(lastUpdate(plan))}`;
    doc.text(i, M, PH - 10 * MM, t, 'R', 7.5, GREY);
    const pn = `Page ${i + 1} / ${doc.pages.length}`;
    doc.text(i, PW - M - textWidth(pn, 'R', 7.5), PH - 10 * MM, pn, 'R', 7.5, GREY);
  });

  return doc.build({ title: tr('Plan de crise conjoint', 'Joint crisis plan') + (who ? ' - ' + who : ''), password });

  async function signatureBoxes(signers) {
    const gap = 10;
    const bw = (CW - gap) / 2;
    const bh = 30 * MM;
    for (let i = 0; i < signers.length; i += 2) {
      need(bh + 8);
      for (let k = 0; k < 2 && i + k < signers.length; k++) {
        const r = signers[i + k];
        const x = M + k * (bw + gap);
        doc.rect(page, x, y, bw, bh, { stroke: '0.74 0.8 0.8', width: 0.7, radius: 4 });
        const name = [r.nom, r.role].filter(Boolean).join(' — ') || tr('Nom et rôle', 'Name and role');
        const nl = wrap(name, 'R', 9, bw - 14).slice(0, 2);
        nl.forEach((l, j) => doc.text(page, x + 7, y + 13 + j * 11, l, 'R', 9, r.nom || r.role ? INK : GREY));
        const lineY = y + bh - 13;
        if (r.sig) {
          try {
            const im = await sigToJpeg(r.sig);
            const name2 = doc.addJpeg(im.bytes, im.width, im.height);
            const top = y + 13 + nl.length * 11;
            const maxH = lineY - top - 3;
            const maxW = bw - 14;
            const s = Math.min(maxW / im.width, maxH / im.height);
            doc.image(page, name2, x + 7, lineY - 2 - im.height * s, im.width * s, im.height * s);
          } catch { /* signature illisible */ }
        }
        doc.line(page, x + 7, lineY, x + bw - 7, lineY, 0.5, 0.6, '2 2');
        doc.text(page, x + 7, lineY + 9, r.sig ? tr(`Signé sur écran le ${fmtDate(r.signedAt)}`, `Signed on screen on ${fmtDate(r.signedAt)}`) : 'Signature', 'R', 7, GREY);
      }
      y += bh + 8;
    }
  }
}
