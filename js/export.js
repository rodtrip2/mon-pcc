/* Mon PCC — mise en forme du plan (affichage, texte, fichier autonome) */
import { STEPS, SOURCE, PRINT_TITLE, PRINT_SUBTITLE } from './data.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function addMonths(iso, n) {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

const filled = (v) => typeof v === 'string' ? v.trim() !== '' : !!v;
const recFilled = (r) => r && Object.values(r).some(filled);

/** Contenu d'une étape sous forme neutre : [{label?, lines:[...]}] */
export function stepContent(step, data) {
  const v = data[step.id];
  const out = [];
  if (step.type === 'identity') {
    const id = v || {};
    const lines = [];
    const nom = [id.prenom, id.nom].filter(filled).join(' ');
    if (filled(nom)) lines.push(nom);
    if (filled(id.naissance)) lines.push('Né·e le ' + fmtDate(id.naissance));
    if (filled(id.tel)) lines.push('Tél. : ' + id.tel);
    if (filled(id.adresse)) lines.push('Adresse : ' + id.adresse);
    if (lines.length) out.push({ lines });
    return out;
  }
  if (step.type === 'final') {
    const f = v || {};
    const lines = [];
    const ld = [f.lieu, f.date ? fmtDate(f.date) : ''].filter(filled).join(', le ');
    if (filled(ld)) lines.push(ld);
    if (lines.length) out.push({ lines });
    const sig = (f.signataires || []).filter(recFilled);
    if (sig.length) out.push({ label: 'Rôles & signatures', lines: sig.map((r) => [r.nom, r.role].filter(filled).join(' — ') + (r.sig ? ' (signé le ' + fmtDate(r.signedAt) + ')' : '')), signers: sig, signatures: true });
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
        if (step.id === 'soinsEvites') return [r.soin, filled(r.raison) ? 'parce que : ' + r.raison : ''].filter(filled).join(' — ');
        return step.fields.map((f) => r[f.key]).filter(filled).join(' — ');
      });
      out.push({ label: g.label, lines, ordered: step.ordered });
    }
  }
  if (step.id === 'strategies') {
    const tb = (data.boiteOutils || []).filter((it) => it && (it.title || it.url || it.file));
    const names = { photo: 'photo', video: 'vidéo', audio: 'son', voix: 'message vocal', lien: 'lien' };
    if (tb.length) {
      out.push({
        label: 'Ma boîte à outils (sur mon téléphone)',
        lines: tb.map((it) => (it.title ? it.title + ' ' : '') + '(' + names[it.kind] + ')' + (it.kind === 'lien' ? ' : ' + it.url : '')),
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
  let h = `<header class="doc-head"><h1>${PRINT_TITLE}</h1><p class="doc-sub">${esc(PRINT_SUBTITLE)}</p></header>`;
  for (const step of STEPS) {
    const content = stepContent(step, data);
    if (step.type === 'identity') {
      h += `<section class="doc-sec doc-id">${content.length ? content[0].lines.map((l) => `<p>${esc(l)}</p>`).join('') : '<p class="doc-empty">Coordonnées non renseignées</p>'}</section>`;
      continue;
    }
    h += `<section class="doc-sec"><h2>${esc(step.question)}</h2>`;
    if (!content.length) {
      h += step.type === 'final' ? '' : '<p class="doc-empty">Non renseigné</p>';
    }
    for (const block of content) {
      if (block.label) h += `<h3>${esc(block.label)}</h3>`;
      if (block.signatures) {
        h += '<div class="doc-sign">' + block.signers.map((r) => {
          const who = [r.nom, r.role].filter(filled).join(' — ');
          const img = r.sig && r.sig.startsWith('data:image/png;base64,') ? `<img class="doc-sign-img" src="${r.sig}" alt="Signature">` : '';
          const line = r.sig ? `Signé sur écran le ${esc(fmtDate(r.signedAt))}` : 'Signature';
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
      h += '<div class="doc-sign"><div class="doc-sign-box"><span>Nom et rôle</span><span class="doc-sign-line">Signature</span></div><div class="doc-sign-box"><span>Nom et rôle</span><span class="doc-sign-line">Signature</span></div></div>';
    }
    h += '</section>';
  }
  h += `<footer class="doc-foot"><p>Document rédigé avec Mon PCC, d’après le support : ${esc(SOURCE.citation)} ${esc(SOURCE.url)} — © ${esc(SOURCE.holder)}, licence ${esc(SOURCE.license)}. Mise en page adaptée.</p><p>Dernière mise à jour : ${esc(fmtDate(plan.updated))}. À relire après une crise, lors d’un changement important et au moins tous les six mois.</p></footer>`;
  return h;
}

export function planText(plan) {
  const data = plan.data;
  const L = [PRINT_TITLE, PRINT_SUBTITLE, ''];
  for (const step of STEPS) {
    const content = stepContent(step, data);
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
  L.push(`Mis à jour le ${fmtDate(plan.updated)}.`);
  L.push(`D’après : ${SOURCE.citation} ${SOURCE.url} — ${SOURCE.license}.`);
  return L.join('\n');
}

export const DOC_CSS = `
.doc{font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1d2a2c;max-width:760px;margin:0 auto}
.doc-head{border-bottom:3px solid #2f6f6a;margin-bottom:1rem;padding-bottom:.5rem}
.doc-head h1{font-size:1.35rem;letter-spacing:.06em;margin:0;color:#2f6f6a}
.doc-sub{margin:.2rem 0 0;color:#566}
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
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Plan de crise conjoint${nom ? ' — ' + esc(nom) : ''}</title><style>body{margin:0;padding:16px;background:#fff}${DOC_CSS}@media print{body{padding:0}}</style></head><body><article class="doc">${documentHTML(plan)}</article></body></html>`;
}

export function fileBaseName(plan) {
  const id = plan.data.coordonnees || {};
  const who = [id.prenom, id.nom].filter(Boolean).join('-').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '-');
  return 'plan-de-crise-conjoint' + (who ? '-' + who.toLowerCase() : '') + '-' + new Date().toISOString().slice(0, 10);
}
