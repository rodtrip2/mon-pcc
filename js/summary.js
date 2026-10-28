/*
 * Mon PCC — synthèse d'une page (A4) pour les urgences.
 * Reprend l'essentiel du plan sur deux colonnes : signes de crise, ce qui aide,
 * soins souhaités ou à éviter et alternatives, personnes à prévenir.
 * La taille du texte diminue si besoin pour que tout tienne sur une seule page ;
 * au-delà, les listes sont raccourcies (le plan complet reste la référence).
 */
import { STEPS, VERSION } from './data.js';
import { stepContent, fmtDate, lastUpdate, sigValid } from './export.js';
import { PdfDoc, wrap, textWidth } from './pdf.js';
import { tr } from './i18n.js';

const MM = 72 / 25.4;
const M = 13 * MM;
const TEAL = '0.184 0.435 0.416';
const TEAL_DARK = '0.141 0.322 0.306';
const INK = '0.114 0.165 0.173';
const GREY = '0.36 0.42 0.42';

/** Sections de la synthèse : [{ title, lines, ordered }] */
function sections(plan) {
  const data = plan.data;
  const step = (id) => STEPS.find((s) => s.id === id);
  const lines = (id) => {
    const st = step(id);
    if (!st) return [];
    return stepContent(st, data, plan).filter((b) => !b.toolbox && !b.signatures).flatMap((b) => b.lines);
  };
  const ado = VERSION === 'ado';
  const S = (title, id, extra = {}) => ({ title, lines: lines(id), ...extra });
  // Ordre pensé pour une lecture rapide aux urgences : qui prévenir, soins à éviter, puis le reste
  const out = ado ? [
    S(tr('Qui informer, par qui, comment', 'Who to inform, by whom, how'), 'information'),
    S(tr('Ce qui me fait du bien (par priorité)', 'What helps me (in order)'), 'strategies', { ordered: true }),
    S(tr('Ce que je remarque quand ça ne va pas', 'What I notice when things are not okay'), 'enCrise'),
    S(tr('Ce que remarque mon entourage', 'What the people around me notice'), 'signesEntourage'),
    S(tr('Ce qui peut me déborder', 'What can overwhelm me'), 'declencheurs'),
  ] : [
    S(tr('Personnes à prévenir (par priorité)', 'People to contact (in order)'), 'aide', { ordered: true }),
    S(tr('Soins que je souhaite éviter', 'Care I want to avoid'), 'soinsEvites', { warn: true }),
    S(tr('Alternatives que je propose', 'Alternatives I suggest'), 'alternatives'),
    S(tr('Soins que je souhaite recevoir', 'Care I want to receive'), 'soinsSouhaites'),
    S(tr('Ce qui m’aide (par priorité)', 'What helps me (in order)'), 'strategies', { ordered: true }),
    S(tr('Comment je suis en crise', 'What I am like in a crisis'), 'enCrise'),
    S(tr('Ce que remarque mon entourage', 'What the people around me notice'), 'signesEntourage'),
    S(tr('Ce qui peut me mettre en crise', 'What can trigger a crisis'), 'declencheurs'),
    S(tr('Démarches à faire ou à déléguer', 'Practical arrangements'), 'demarches'),
  ];
  return out.filter((s) => s.lines.length);
}

/** Essaie une mise en page ; renvoie le document ou null si elle déborde d'une page */
function layout(plan, secs, size, cap) {
  const doc = new PdfDoc();
  const page = doc.addPage();
  const PW = doc.width;
  const PH = doc.height;
  const gap = 7 * MM;
  const colW = (PW - 2 * M - gap) / 2;
  const id = plan.data.coordonnees || {};
  const who = [id.prenom, id.nom].filter(Boolean).join(' ');

  // En-tête
  doc.rect(page, 0, 0, PW, 24 * MM, { fill: TEAL });
  doc.text(page, M, 10 * MM, tr('PLAN DE CRISE CONJOINT — SYNTHÈSE', 'JOINT CRISIS PLAN — SUMMARY'), 'B', 13, '1 1 1');
  const sub = [who, id.naissance ? tr('né·e le ', 'born ') + fmtDate(id.naissance) : '', tr('mis à jour le ', 'updated ') + fmtDate(lastUpdate(plan))].filter(Boolean).join(' · ');
  doc.text(page, M, 17 * MM, sub, 'R', 9.5, '0.89 0.94 0.93');
  const bottom = PH - 22 * MM;
  let col = 0;
  let y = 30 * MM;
  const x0 = () => M + col * (colW + gap);
  const lead = size * 1.28;
  const next = () => { if (col === 0) { col = 1; y = 30 * MM; return true; } return false; };

  for (const s of secs) {
    const items = s.lines.length > cap ? [...s.lines.slice(0, cap), tr(`+ ${s.lines.length - cap} autre(s) dans le plan complet`, `+ ${s.lines.length - cap} more in the full plan`)] : s.lines;
    const titleLines = wrap(s.title.toUpperCase(), 'B', size - 0.5, colW);
    const first = wrap(items[0], 'R', size, colW - 12);
    if (y + titleLines.length * lead + first.length * lead + 4 > bottom && !next()) return null;
    titleLines.forEach((l) => { doc.text(page, x0(), y + size, l, 'B', size - 0.5, s.warn ? '0.62 0.25 0.12' : TEAL_DARK); y += lead; });
    y += 1;
    for (let i = 0; i < items.length; i++) {
      const more = i === cap && s.lines.length > cap;
      const ls = wrap(items[i], more ? 'I' : 'R', size, colW - 12);
      if (y + ls.length * lead > bottom && !next()) return null;
      const bullet = more ? '' : s.ordered ? `${i + 1}.` : '•';
      if (bullet) doc.text(page, x0() + 10 - textWidth(bullet, 'R', size), y + size, bullet, 'R', size, GREY);
      ls.forEach((l) => { doc.text(page, x0() + 12, y + size, l, more ? 'I' : 'R', size, more ? GREY : INK); y += lead; });
    }
    y += size * 0.9;
  }

  // Pied de page
  const signed = (plan.data.signature?.signataires || []).filter((r) => sigValid(r, plan));
  const where = plan.data.carte?.ou;
  const foot = [
    where ? tr(`Plan complet : ${where}.`, `Full plan: ${where}.`) : tr('Le plan complet fait référence.', 'The full plan is the reference.'),
    signed.length ? tr(`Signé sur écran par ${signed.map((r) => [r.nom, r.role].filter(Boolean).join(', ')).join(' ; ')}.`, `Signed on screen by ${signed.map((r) => [r.nom, r.role].filter(Boolean).join(', ')).join('; ')}.`) : '',
  ].filter(Boolean).join(' ');
  doc.line(page, M, PH - 19 * MM, PW - M, PH - 19 * MM, 0.5, 0.75);
  wrap(foot, 'R', 7.5, PW - 2 * M).slice(0, 2).forEach((l, i) => doc.text(page, M, PH - 15 * MM + i * 9.5, l, 'R', 7.5, INK));
  doc.text(page, M, PH - 8 * MM, tr('Synthèse réalisée avec Mon PCC, d’après le Plan de Crise Conjoint (plandecriseconjoint.ch, CC BY-NC-SA).', 'Summary made with Mon PCC, based on the Joint Crisis Plan (plandecriseconjoint.ch, CC BY-NC-SA).'), 'R', 6.5, GREY);
  return { doc, who };
}

export async function buildSummaryPdf(plan, password = '') {
  const secs = sections(plan);
  let res = null;
  outer: for (const cap of [99, 8, 6, 4, 3]) {
    for (const size of [10, 9.5, 9, 8.5, 8, 7.5]) {
      res = layout(plan, secs, size, cap);
      if (res) break outer;
    }
  }
  if (!res) res = layout(plan, secs.map((s) => ({ ...s, lines: s.lines.slice(0, 2) })), 7.5, 2) || layout(plan, [], 8, 1);
  return res.doc.build({ title: tr('Synthèse du plan de crise conjoint', 'Joint crisis plan summary') + (res.who ? ' - ' + res.who : ''), password });
}
