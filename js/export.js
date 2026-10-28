/* Mon PCC — mise en forme du plan (affichage, texte, fichier autonome) */
import { STEPS, SOURCE, PRINT_TITLE, PRINT_SUBTITLE } from './data.js';
import { tr, locale, LANG } from './i18n.js';
import { exerciseById } from './exercises.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  if (LANG === 'en') return fmtDate(iso) + ' at ' + d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
  return fmtDate(iso) + ' à ' + d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');
}

/** Date de la dernière modification du contenu du plan */
export const lastUpdate = (plan) => plan.contentUpdated || plan.updated;

/** Une signature n'est valable que si elle est postérieure à la dernière modification */
export const sigValid = (r, plan) => !!(r && r.sig && r.signedAt && (!plan || !plan.contentUpdated || r.signedAt >= plan.contentUpdated));

export function addMonths(iso, n) {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

const filled = (v) => typeof v === 'string' ? v.trim() !== '' : !!v;
const recFilled = (r) => r && Object.values(r).some(filled);

/** Contenu d'une étape sous forme neutre : [{label?, lines:[...]}] */
export function stepContent(step, data, plan = null) {
  const v = data[step.id];
  const out = [];
  if (step.type === 'identity') {
    const id = v || {};
    const lines = [];
    const nom = [id.prenom, id.nom].filter(filled).join(' ');
    if (filled(nom)) lines.push(nom);
    if (filled(id.naissance)) lines.push(tr('Né·e le ', 'Date of birth: ') + fmtDate(id.naissance));
    if (filled(id.tel)) lines.push(tr('Tél. : ', 'Phone: ') + id.tel);
    if (filled(id.adresse)) lines.push(tr('Adresse : ', 'Address: ') + id.adresse);
    if (lines.length) out.push({ lines });
    return out;
  }
  if (step.type === 'final') {
    const f = v || {};
    const lines = [];
    const ld = [f.lieu, f.date ? fmtDate(f.date) : ''].filter(filled).join(tr(', le ', ', '));
    if (filled(ld)) lines.push(ld);
    if (lines.length) out.push({ lines });
    const sig = (f.signataires || []).filter(recFilled);
    // signatures antérieures à la dernière modification : non reprises
    const signers = sig.map((r) => (plan && r.sig && !sigValid(r, plan) ? { nom: r.nom, role: r.role } : r));
    if (sig.length) out.push({ label: tr('Rôles & signatures', 'Roles & signatures'), lines: signers.map((r) => [r.nom, r.role].filter(filled).join(' — ') + (r.sig ? tr(' (signé le ', ' (signed on ') + fmtDate(r.signedAt) + ')' : '')), signers, signatures: true });
    return out;
  }
  const groups = step.groups || [{ id: null }];
  for (const g of groups) {
    const arr = (g.id ? (v || {})[g.id] : v) || [];
    if (step.type === 'list') {
      const lines = arr.filter(filled);
      if (lines.length) out.push({ label: g.label, lines, ordered: step.ordered });
    } else {
      const recs = arr.filter(recFilled);
      if (!recs.length) continue;
      const lines = recs.map((r) => {
        if (step.id === 'soinsEvites') return [r.soin, filled(r.raison) ? tr('parce que : ', 'because: ') + r.raison : ''].filter(filled).join(' — ');
        if (step.labelled) return step.fields.filter((f) => filled(r[f.key])).map((f) => `${f.label} ${r[f.key]}`).join(' — ');
        return step.fields.map((f) => r[f.key]).filter(filled).join(' — ');
      });
      out.push({ label: g.label, lines, ordered: step.ordered });
    }
  }
  if (step.id === 'strategies') {
    const tb = (data.boiteOutils || []).filter((it) => it && (it.title || it.url || it.file || it.ex || (it.photos || []).length || (it.text || '').trim()));
    const names = {
      photo: tr('photo', 'photo'), video: tr('vidéo', 'video'), audio: tr('son', 'audio'), voix: tr('message vocal', 'voice message'),
      lien: tr('lien', 'link'), citation: tr('citation', 'quote'), album: tr('album photo', 'photo album'), exercice: tr('exercice de Ma boussole bien-être', 'Ma boussole bien-être exercise'),
    };
    if (tb.length) {
      out.push({
        label: tr('Ma boîte à outils (sur mon téléphone)', 'My toolbox (on my phone)'),
        lines: tb.map((it) => {
          const n = (it.photos || []).length;
          if (it.kind === 'citation') return tr(`« ${it.text.trim()} »`, `“${it.text.trim()}”`) + (it.author ? ' — ' + it.author : '');
          if (it.kind === 'exercice') return `${exerciseById(it.ex)?.name || tr('Exercice', 'Exercise')} (${tr('exercice de Ma boussole bien-être', 'Ma boussole bien-être exercise')})`;
          if (it.kind === 'album') return `${it.title ? it.title + ' ' : ''}(${tr('album', 'album')}, ${n} photo${n > 1 ? 's' : ''})`;
          return (it.title ? it.title + ' ' : '') + '(' + names[it.kind] + ')' + (it.kind === 'lien' ? tr(' : ', ': ') + it.url : '');
        }),
      });
    }
  }
  return out;
}

export function stepIsFilled(step, data) {
  return stepContent(step, data).length > 0;
}

export function progress(data) {
  const n = STEPS.filter((s) => stepIsFilled(s, data)).length;
  return { done: n, total: STEPS.length };
}

/** Document HTML (sans <html>), réutilisé pour l'aperçu, l'impression et le fichier */
export function documentHTML(plan) {
  const data = plan.data;
  let h = `<header class="doc-head"><h1>${PRINT_TITLE}</h1><p class="doc-sub">${esc(PRINT_SUBTITLE)}</p><p class="doc-date">${tr('Dernière mise à jour :', 'Last updated:')} <strong>${esc(fmtDateTime(lastUpdate(plan)))}</strong></p></header>`;
  for (const step of STEPS) {
    const content = stepContent(step, data, plan);
    if (step.type === 'identity') {
      h += `<section class="doc-sec doc-id">${content.length ? content[0].lines.map((l) => `<p>${esc(l)}</p>`).join('') : `<p class="doc-empty">${tr('Coordonnées non renseignées', 'Details not filled in')}</p>`}</section>`;
      continue;
    }
    h += `<section class="doc-sec"><h2>${esc(step.question)}</h2>`;
    if (!content.length) {
      h += step.type === 'final' ? '' : `<p class="doc-empty">${tr('Non renseigné', 'Not filled in')}</p>`;
    }
    for (const block of content) {
      if (block.label) h += `<h3>${esc(block.label)}</h3>`;
      if (block.signatures) {
        h += '<div class="doc-sign">' + block.signers.map((r) => {
          const who = [r.nom, r.role].filter(filled).join(' — ');
          const img = r.sig && r.sig.startsWith('data:image/png;base64,') ? `<img class="doc-sign-img" src="${r.sig}" alt="${tr('Signature', 'Signature')}">` : '';
          const line = r.sig ? tr(`Signé sur écran le ${esc(fmtDate(r.signedAt))}`, `Signed on screen on ${esc(fmtDate(r.signedAt))}`) : tr('Signature', 'Signature');
          return `<div class="doc-sign-box${img ? ' signed' : ''}"><span>${esc(who)}</span>${img}<span class="doc-sign-line">${line}</span></div>`;
        }).join('') + '</div>';
      } else if (step.type === 'final') {
        h += block.lines.map((l) => `<p>${esc(l)}</p>`).join('');
      } else {
        const tag = block.ordered ? 'ol' : 'ul';
        h += `<${tag}>` + block.lines.map((l) => `<li>${esc(l)}</li>`).join('') + `</${tag}>`;
      }
    }
    if (step.type === 'final' && !content.some((b) => b.signatures)) {
      const box = `<div class="doc-sign-box"><span>${tr('Nom et rôle', 'Name and role')}</span><span class="doc-sign-line">Signature</span></div>`;
      h += `<div class="doc-sign">${box}${box}</div>`;
    }
    h += '</section>';
  }
  h += `<footer class="doc-foot"><p>${tr('Document rédigé avec Mon PCC, d’après le support :', 'Document written with Mon PCC, based on:')} ${esc(SOURCE.citation)} ${esc(SOURCE.url)} — © ${esc(SOURCE.holder)}, ${tr('licence', 'licence')} ${esc(SOURCE.license)}. ${tr('Mise en page adaptée.', 'Layout adapted.')}</p><p>${tr('Dernière mise à jour :', 'Last updated:')} ${esc(fmtDateTime(lastUpdate(plan)))}. ${tr('À relire après une crise, lors d’un changement important et au moins tous les six mois.', 'To be reviewed after a crisis, when something important changes, and at least every six months.')}</p></footer>`;
  return h;
}

export function planText(plan) {
  const data = plan.data;
  const L = [PRINT_TITLE, PRINT_SUBTITLE, `${tr('Dernière mise à jour :', 'Last updated:')} ${fmtDateTime(lastUpdate(plan))}`, ''];
  for (const step of STEPS) {
    const content = stepContent(step, data, plan);
    if (step.type === 'identity') {
      if (content.length) L.push(...content[0].lines, '');
      continue;
    }
    if (!content.length) continue;
    L.push('■ ' + step.question);
    for (const b of content) {
      if (b.label) L.push('  ' + b.label);
      b.lines.forEach((l, i) => L.push((b.ordered ? `   ${i + 1}. ` : '   • ') + l));
    }
    L.push('');
  }
  L.push(`${tr('Dernière mise à jour :', 'Last updated:')} ${fmtDateTime(lastUpdate(plan))}.`);
  L.push(`${tr('D’après :', 'Based on:')} ${SOURCE.citation} ${SOURCE.url} — ${SOURCE.license}.`);
  return L.join('\n');
}

export const DOC_CSS = `
.doc{font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1d2a2c;max-width:760px;margin:0 auto}
.doc-head{border-bottom:3px solid #2f6f6a;margin-bottom:1rem;padding-bottom:.5rem}
.doc-head h1{font-size:1.35rem;letter-spacing:.06em;margin:0;color:#2f6f6a}
.doc-sub{margin:.2rem 0 0;color:#566}
.doc-date{margin:.3rem 0 0;font-size:.85rem;color:#24524e}
.doc-sec{margin:0 0 1rem;break-inside:avoid}
.doc-sec h2{font-size:.95rem;margin:0 0 .35rem;color:#24524e}
.doc-sec h3{font-size:.85rem;margin:.5rem 0 .2rem;text-transform:uppercase;letter-spacing:.04em;color:#566}
.doc-sec ul,.doc-sec ol{margin:.2rem 0;padding-left:1.3rem}
.doc-sec p{margin:.15rem 0}
.doc-id p:first-child{font-weight:700;font-size:1.1rem}
.doc-empty{color:#899;font-style:italic}
.doc-sign{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem;margin-top:.5rem}
.doc-sign-box{border:1px solid #bcc;border-radius:6px;padding:.5rem .6rem 2.6rem;display:flex;flex-direction:column;gap:.2rem;position:relative}
.doc-sign-line{position:absolute;bottom:.4rem;left:.6rem;right:.6rem;border-top:1px dashed #9aa;font-size:.7rem;color:#899;padding-top:.15rem}
.doc-sign-box.signed{padding-bottom:1.6rem}
.doc-sign-img{display:block;max-width:100%;max-height:90px;margin:.2rem 0}
.doc-foot{border-top:1px solid #cdd;margin-top:1.5rem;padding-top:.5rem;font-size:.72rem;color:#677}
`;

export function standaloneHTML(plan) {
  const nom = [plan.data.coordonnees?.prenom, plan.data.coordonnees?.nom].filter(Boolean).join(' ');
  return `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${tr('Plan de crise conjoint', 'Joint crisis plan')}${nom ? ' — ' + esc(nom) : ''}</title><style>body{margin:0;padding:16px;background:#fff}${DOC_CSS}@media print{body{padding:0}}</style></head><body><article class="doc">${documentHTML(plan)}</article></body></html>`;
}

export function fileBaseName(plan) {
  const id = plan.data.coordonnees || {};
  const who = [id.prenom, id.nom].filter(Boolean).join('-').replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '-');
  return tr('plan-de-crise-conjoint', 'joint-crisis-plan') + (who ? '-' + who.toLowerCase() : '') + '-' + new Date().toISOString().slice(0, 10);
}
