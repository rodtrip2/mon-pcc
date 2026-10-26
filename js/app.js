/* Mon PCC — application (sans dépendance, sans serveur, sans traceur) */
import { STEPS, PROCESS, SOURCE } from './data.js';
import * as store from './storage.js';
import * as media from './media.js';
import { appUrl, displayUrl, makeQr, qrSvg, renderCard, canvasToJpeg, buildSheetPdf } from './share.js';
import {
  esc, fmtDate, addMonths, stepIsFilled, progress, documentHTML, planText,
  fileBaseName, sigValid, lastUpdate, fmtDateTime,
} from './export.js';
import { buildPlanPdf } from './planpdf.js';
import { renderCrisisCard, toJpeg, crisisCardPdf } from './crisiscard.js';

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const saveState = $('#save-state');

let plan = null;
let locked = false;
let saveTimer = null;
let hiddenAt = 0;
const openExamples = new Set(); // groupes dont les exemples sont affichés
const AUTO_LOCK_MS = 5 * 60 * 1000;

/* ---------- utilitaires ---------- */

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 3200);
}

function scheduleSave(content = true) {
  if (content && plan) plan.contentUpdated = new Date().toISOString();
  saveState.textContent = 'Enregistrement…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await store.save(plan);
      saveState.textContent = 'Enregistré sur ce téléphone';
    } catch {
      saveState.textContent = 'Échec de l’enregistrement';
      toast('Impossible d’enregistrer : la mémoire du navigateur est peut-être pleine ou bloquée.');
    }
  }, 350);
}

function modal({ title, body, ok = 'Continuer', cancel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    const d = $('#modal');
    d.innerHTML = `<form method="dialog" class="modal-inner">
      <h2>${esc(title)}</h2><div class="modal-body">${body}</div>
      <div class="modal-actions">
        ${cancel ? `<button value="cancel" class="btn btn-ghost">${esc(cancel)}</button>` : ''}
        <button value="ok" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(ok)}</button>
      </div></form>`;
    d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true });
    d.showModal();
  });
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function rerender(fn) {
  const y = window.scrollY;
  const key = document.activeElement?.dataset?.fk;
  fn();
  window.scrollTo(0, y);
  if (key) {
    const el = app.querySelector(`[data-fk="${CSS.escape(key)}"]`);
    if (el) el.focus({ preventScroll: true });
  }
}

const hasData = () => plan && STEPS.some((s) => stepIsFilled(s, plan.data));

/* ---------- accès aux données d'une étape ---------- */

function getArr(step, gid) {
  const d = plan.data;
  if (step.type === 'final') {
    d.signature ??= {};
    d.signature.signataires ??= [];
    return d.signature.signataires;
  }
  if (step.groups) {
    d[step.id] ??= {};
    d[step.id][gid] ??= [];
    return d[step.id][gid];
  }
  d[step.id] ??= [];
  return d[step.id];
}

const groupsOf = (step) => step.groups || [{
  id: '_', label: null, suggestions: step.suggestions || [], suggestField: step.suggestField,
}];

/* ---------- routage ---------- */

function route() {
  if (locked) return renderLock();
  const h = location.hash.replace(/^#\/?/, '');
  const [page, arg] = h.split('/');
  document.body.dataset.page = page || 'accueil';
  closeMenu();
  switch (page) {
    case '': case 'accueil': renderHome(); break;
    case 'demarche': renderProcess(); break;
    case 'etape': renderStep(Math.max(0, Math.min(STEPS.length - 1, parseInt(arg, 10) || 0))); break;
    case 'plan': renderPlan(); break;
    case 'reglages': renderSettings(); break;
    case 'partager': renderShare(); break;
    case 'mon-espace-sante': renderMES(); break;
    case 'boite-outils': renderToolbox(arg === 'etape'); break;
    case 'apropos': renderAbout(); break;
    case 'confidentialite': renderPrivacy(); break;
    default: renderHome();
  }
  if (!rerender.active) window.scrollTo(0, 0);
  const h1 = app.querySelector('h1');
  if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
}

/* ---------- écrans ---------- */

function emergencyNote() {
  return `<aside class="emergency" aria-label="Urgence">
    <strong>Besoin d’aide maintenant ?</strong>
    Appelez le <a href="tel:15">15</a> ou le <a href="tel:112">112</a>.
    Si vous pensez au suicide, le <a href="tel:3114">3114</a> répond 24 h/24, 7 j/7 (France).
  </aside>`;
}

function renderHome() {
  if (!hasData()) {
    app.innerHTML = `
      <section class="hero">
        <div class="hero-logo" aria-hidden="true">${logoSVG()}</div>
        <h1>Mon PCC</h1>
        <p class="lead">Préparer mon <strong>plan de crise conjoint</strong>, pas à pas, avec mes propres mots.</p>
        <a class="btn btn-primary btn-lg" href="#/demarche">Commencer</a>
      </section>
      <section class="card">
        <h2>Le plan de crise conjoint, c’est quoi ?</h2>
        <p>Un document que je construis <strong>avec un·e professionnel·le</strong> qui m’accompagne, et avec mes proches si je le souhaite. Il décrit ce qui peut me mettre en crise, comment le repérer, ce qui m’aide, et les soins que je souhaite recevoir ou éviter.</p>
        <p>Il sert à prévenir les crises et, si elles arrivent, à ce que mes choix soient connus et respectés.</p>
      </section>
      <section class="card card-soft">
        <h2>Mes réponses restent chez moi</h2>
        <p>Pas de compte, pas de serveur, pas de publicité. Ce que j’écris est enregistré uniquement sur ce téléphone. C’est moi qui décide de l’envoyer, et à qui.</p>
        <p><a href="#/confidentialite">En savoir plus sur la confidentialité</a></p>
      </section>
      ${emergencyNote()}
    ${toolboxHomeHTML()}`;
    return;
  }
  const p = progress(plan.data);
  const next = STEPS.findIndex((s) => !stepIsFilled(s, plan.data));
  const sigDate = plan.data.signature?.date;
  let review = '';
  if (sigDate) {
    const due = addMonths(sigDate, 6);
    const late = due <= new Date().toISOString().slice(0, 10);
    review = `<p class="review ${late ? 'late' : ''}">${late ? 'Il est temps de relire mon plan' : 'Prochaine relecture conseillée'} : <strong>${fmtDate(due)}</strong></p>`;
  }
  app.innerHTML = `
    <h1 class="sr-only">Accueil</h1>
    <section class="card progress-card">
      <h2>Mon plan de crise conjoint</h2>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}" aria-label="Étapes complétées"><span style="width:${(p.done / p.total) * 100}%"></span></div>
      <p class="muted">${p.done} étape${p.done > 1 ? 's' : ''} sur ${p.total} complétée${p.done > 1 ? 's' : ''} · modifié le ${fmtDate(lastUpdate(plan))}</p>
      ${review}
      <div class="stack">
        ${next >= 0 ? `<a class="btn btn-primary" href="#/etape/${next}">Continuer : ${esc(STEPS[next].short)}</a>` : ''}
        <a class="btn ${next >= 0 ? 'btn-secondary' : 'btn-primary'}" href="#/plan">Voir, imprimer ou envoyer mon plan</a>
      </div>
    </section>
    <section class="card">
      <h2>Les étapes</h2>
      ${stepsListHTML()}
    </section>
    <p class="center"><a href="#/demarche">Revoir la démarche</a></p>
    ${emergencyNote()}
    ${toolboxHomeHTML()}`;
}

function stepsListHTML() {
  return `<ol class="steps-list">${STEPS.map((s, i) => `
    <li><a href="#/etape/${i}" class="${stepIsFilled(s, plan.data) ? 'done' : ''}">
      <span class="dot" aria-hidden="true">${stepIsFilled(s, plan.data) ? '✓' : i + 1}</span>
      <span>${esc(s.title)}</span>
      <span class="sr-only">${stepIsFilled(s, plan.data) ? '(complétée)' : '(à faire)'}</span>
    </a></li>`).join('')}</ol>`;
}

function renderProcess() {
  app.innerHTML = `
    <h1>Comment se déroule la démarche</h1>
    <p class="lead">Le plan de crise conjoint est une démarche <strong>volontaire</strong>, qui se construit en plusieurs temps.</p>
    <ol class="process">${PROCESS.map((s) => `<li><h2>${esc(s.t)}</h2><p>${esc(s.d)}</p></li>`).join('')}</ol>
    <section class="card card-soft">
      <h2>Comment utiliser Mon PCC</h2>
      <ul>
        <li>Chaque étape reprend une question du plan de crise conjoint officiel.</li>
        <li>Je commence par <strong>écrire avec mes mots</strong>. Si je manque d’idées, le bouton <strong>« Exemples »</strong> propose des formulations que je peux ajouter puis reformuler.</li>
        <li>Chaque ligne reste modifiable.</li>
        <li>À la fin, chaque signataire peut <strong>signer avec le doigt</strong> sur le téléphone, ou à la main sur la version imprimée.</li>
        <li>Rien n’est obligatoire, vous pouvez sauter une étape et y revenir.</li>
        <li>Tout est enregistré automatiquement sur ce téléphone.</li>
      </ul>
    </section>
    <div class="nav-bottom"><a class="btn btn-ghost" href="#/">Retour</a><a class="btn btn-primary" href="#/etape/0">C’est parti</a></div>`;
}

function renderStep(i) {
  const step = STEPS[i];
  const pct = ((i + 1) / STEPS.length) * 100;
  let body = '';
  if (step.type === 'identity') body = identityHTML(step);
  else if (step.type === 'final') body = finalHTML(step);
  else body = groupsOf(step).map((g) => (step.type === 'list' ? listGroupHTML(step, g) : recordsGroupHTML(step, g))).join('');

  let warn = '';
  if (step.requiresIfNotEmpty) {
    const ref = STEPS.find((s) => s.id === step.requiresIfNotEmpty);
    const refused = (plan.data[ref.id] || []).filter((r) => r.soin && r.soin.trim());
    if (refused.length) {
      const empty = !(plan.data[step.id] || []).some((x) => x.trim());
      warn = `<div class="${empty ? 'warn' : 'note'}" role="status">
        <strong>${empty ? 'À compléter :' : 'Rappel :'}</strong> j’ai indiqué des soins à éviter. Pour chacun, je propose une alternative.
        <ul>${refused.map((r) => `<li>${esc(r.soin)}</li>`).join('')}</ul></div>`;
    }
  }

  app.innerHTML = `
    <div class="step-top">
      <p class="step-count">Étape ${i + 1} sur ${STEPS.length}</p>
      <div class="bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
    </div>
    <h1>${esc(step.title)}</h1>
    <blockquote class="question"><span class="q-label">Question du PCC</span>${esc(step.question)}</blockquote>
    <details class="tip"><summary>Conseil</summary><p>${esc(step.tip)}</p></details>
    ${warn}
    <div class="step-body" data-step="${i}">${body}</div>
    <div class="nav-bottom">
      ${i > 0 ? `<a class="btn btn-ghost" href="#/etape/${i - 1}">← Précédent</a>` : '<a class="btn btn-ghost" href="#/demarche">← Démarche</a>'}
      ${i < STEPS.length - 1 ? `<a class="btn btn-primary" href="#/etape/${i + 1}">Suivant →</a>` : '<a class="btn btn-primary" href="#/plan">Voir mon plan →</a>'}
    </div>`;
}

function identityHTML() {
  const v = plan.data.coordonnees || {};
  const f = (k, label, type = 'text', extra = '') => `
    <label class="field"><span>${label}</span>
      <input type="${type}" data-k="${k}" data-fk="id:${k}" value="${esc(v[k] || '')}" ${extra}></label>`;
  return `<div class="card form-grid">
    ${f('prenom', 'Prénom', 'text', 'autocomplete="given-name"')}
    ${f('nom', 'Nom', 'text', 'autocomplete="family-name"')}
    ${f('naissance', 'Date de naissance', 'date', 'autocomplete="bday"')}
    ${f('tel', 'Téléphone', 'tel', 'autocomplete="tel" inputmode="tel"')}
    <label class="field field-wide"><span>Adresse</span>
      <textarea rows="2" data-k="adresse" data-fk="id:adresse" autocomplete="street-address">${esc(v.adresse || '')}</textarea></label>
  </div>`;
}

function chipLabel(s) {
  return typeof s === 'string' ? s : s.nom;
}

function suggestionsHTML(step, g, isOn) {
  const list = g.suggestions || [];
  if (!list.length) return '';
  const key = step.id + ':' + g.id;
  const open = openExamples.has(key);
  return `<div class="sugg">
    <button type="button" class="btn btn-ghost btn-sm ex-btn" data-act="examples" data-g="${g.id}" data-fk="ex:${g.id}" aria-expanded="${open}">${open ? 'Masquer les exemples' : 'Exemples'}</button>
    ${open ? `<p class="muted small">Si un exemple me correspond, je le touche pour l’ajouter, puis je peux le reformuler avec mes mots. Je le touche à nouveau pour le retirer.</p>
    <div class="chips">${list.map((s, si) => {
      const on = isOn(s);
      return `<button type="button" class="chip" aria-pressed="${on}" data-act="chip" data-g="${g.id}" data-si="${si}" data-fk="chip:${g.id}:${si}">${on ? '✓ ' : '+ '}${esc(chipLabel(s))}</button>`;
    }).join('')}</div>` : ''}</div>`;
}

function listGroupHTML(step, g) {
  const arr = getArr(step, g.id);
  const items = arr.map((t, idx) => `
    <li class="item">
      ${step.ordered ? `<span class="rank" aria-hidden="true">${idx + 1}</span>` : ''}
      <textarea rows="1" class="item-input" aria-label="${esc(g.label || step.title)}, ligne ${idx + 1}" data-g="${g.id}" data-i="${idx}" data-fk="it:${g.id}:${idx}">${esc(t)}</textarea>
      <div class="item-tools">
        ${step.ordered ? `<button type="button" class="icon" data-act="up" data-g="${g.id}" data-i="${idx}" data-fk="up:${g.id}:${idx}" aria-label="Monter" ${idx === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="icon" data-act="down" data-g="${g.id}" data-i="${idx}" data-fk="down:${g.id}:${idx}" aria-label="Descendre" ${idx === arr.length - 1 ? 'disabled' : ''}>↓</button>` : ''}
        <button type="button" class="icon icon-del" data-act="del" data-g="${g.id}" data-i="${idx}" aria-label="Supprimer">✕</button>
      </div>
    </li>`).join('');
  return `<section class="group card">
    ${g.label ? `<h2>${esc(g.label)}</h2>` : ''}
    <form class="free" data-act="free" data-g="${g.id}">
      <label class="sr-only" for="free-${g.id}">Écrire avec mes mots</label>
      <input id="free-${g.id}" data-fk="free:${g.id}" placeholder="Écrire avec mes mots…" autocomplete="off">
      <button class="btn btn-secondary btn-sm">Ajouter</button>
    </form>
    ${arr.length ? `<p class="kept-label">Ce que je retiens${step.ordered ? ' <span class="muted">(par ordre de priorité)</span>' : ''}</p><ol class="items ${step.ordered ? 'ordered' : ''}">${items}</ol>` : ''}
    ${suggestionsHTML(step, g, (s) => arr.includes(s))}
    ${step.id === 'strategies' && g.id === 'moi' ? toolboxTeaserHTML() : ''}
  </section>`;
}

function recordsGroupHTML(step, g) {
  const arr = getArr(step, g.id);
  const sf = g.suggestField || step.suggestField;
  const isOn = (s) => typeof s === 'string'
    ? arr.some((r) => r[sf] === s)
    : arr.some((r) => r.nom === s.nom && r.tel === s.tel);
  const cards = arr.map((r, idx) => `
    <li class="record">
      ${step.ordered ? `<span class="rank" aria-hidden="true">${idx + 1}</span>` : ''}
      <div class="record-fields">
        ${step.fields.map((f) => `<label class="field"><span>${esc(f.label)}</span>
          ${f.multiline
            ? `<textarea rows="2" data-g="${g.id}" data-i="${idx}" data-f="${f.key}" data-fk="rf:${g.id}:${idx}:${f.key}" placeholder="${esc(f.placeholder || '')}">${esc(r[f.key] || '')}</textarea>`
            : `<input type="${f.type === 'tel' ? 'text' : 'text'}" ${f.type === 'tel' ? 'inputmode="tel"' : ''} data-g="${g.id}" data-i="${idx}" data-f="${f.key}" data-fk="rf:${g.id}:${idx}:${f.key}" value="${esc(r[f.key] || '')}" placeholder="${esc(f.placeholder || '')}">`}
        </label>`).join('')}
        ${r.tel && /^[\d +().-]{2,}$/.test(r.tel) ? `<a class="call" href="tel:${esc(r.tel.replace(/[^\d+]/g, ''))}">Appeler ${esc(r.tel)}</a>` : ''}
      </div>
      <div class="item-tools">
        ${step.ordered ? `<button type="button" class="icon" data-act="up" data-g="${g.id}" data-i="${idx}" data-fk="up:${g.id}:${idx}" aria-label="Monter" ${idx === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="icon" data-act="down" data-g="${g.id}" data-i="${idx}" data-fk="down:${g.id}:${idx}" aria-label="Descendre" ${idx === arr.length - 1 ? 'disabled' : ''}>↓</button>` : ''}
        <button type="button" class="icon icon-del" data-act="del" data-g="${g.id}" data-i="${idx}" aria-label="Supprimer">✕</button>
      </div>
    </li>`).join('');
  return `<section class="group card">
    ${g.label ? `<h2>${esc(g.label)}</h2>` : ''}
    ${arr.length ? `<ol class="records">${cards}</ol>` : ''}
    <div class="row-btns">
      <button type="button" class="btn btn-secondary btn-sm" data-act="empty" data-g="${g.id}" data-fk="empty:${g.id}">+ Ajouter une ligne</button>
      ${contactsEnabled(step, g) ? `<button type="button" class="btn btn-secondary btn-sm" data-act="contacts" data-g="${g.id}" data-fk="contacts:${g.id}">👤 Choisir dans mes contacts</button>` : ''}
    </div>
    ${contactsNoteHTML(step, g)}
    ${suggestionsHTML(step, g, isOn)}
  </section>`;
}

function finalHTML(step) {
  const v = plan.data.signature || {};
  const arr = getArr(step);
  const partners = (plan.data.partenaires || []).filter((r) => r.nom || r.role);
  return `<section class="card form-grid">
      <label class="field"><span>Lieu</span><input data-k="lieu" data-fk="fin:lieu" value="${esc(v.lieu || '')}" placeholder="Ex. : CMP, à domicile…"></label>
      <label class="field"><span>Date</span><input type="date" data-k="date" data-fk="fin:date" value="${esc(v.date || '')}"></label>
      <button type="button" class="btn btn-ghost btn-sm" data-act="today">Mettre la date du jour</button>
    </section>
    ${modifiedAfterSigning() ? `<div class="warn" role="status"><strong>Le plan a été modifié le ${esc(fmtDateTime(lastUpdate(plan)))}, après certaines signatures.</strong> Ces signatures ne figurent plus sur l’impression ni sur le PDF : relisez le plan ensemble puis signez à nouveau.</div>` : ''}
    <section class="group card">
      <h2>Signataires</h2>
      <p class="muted small">Chacun·e peut signer avec le doigt directement sur ce téléphone, ou à la main sur le document imprimé.</p>
      <div class="chips">
        <button type="button" class="chip" data-act="me" data-fk="me">+ Moi-même</button>
        ${partners.length ? `<button type="button" class="chip" data-act="partners" data-fk="partners">+ Mes partenaires (${partners.length})</button>` : ''}
      </div>
      ${arr.length ? `<ol class="records">${arr.map((r, idx) => `
        <li class="record"><div class="record-fields">
          ${step.fields.map((f) => `<label class="field"><span>${esc(f.label)}</span><input data-g="_" data-i="${idx}" data-f="${f.key}" data-fk="rf:_:${idx}:${f.key}" value="${esc(r[f.key] || '')}" placeholder="${esc(f.placeholder)}"></label>`).join('')}
          <div class="sig-area">
            ${r.sig
              ? `<img class="sig-img${sigValid(r, plan) ? '' : ' stale'}" src="${r.sig}" alt="Signature de ${esc(r.nom || 'ce·tte signataire')}"><p class="muted small">Signé le ${esc(fmtDateTime(r.signedAt))}</p>
                 ${sigValid(r, plan) ? '' : '<p class="sig-stale">⚠ Signature antérieure à la dernière modification du plan : elle n’apparaîtra pas sur l’impression ni sur le PDF. À signer à nouveau.</p>'}
                 <div class="sig-tools"><button type="button" class="btn btn-ghost btn-sm" data-act="sign" data-i="${idx}" data-fk="sign:${idx}">Signer à nouveau</button>
                 <button type="button" class="btn btn-ghost btn-sm" data-act="unsign" data-i="${idx}">Effacer la signature</button></div>`
              : `<button type="button" class="btn btn-primary btn-sm" data-act="sign" data-i="${idx}" data-fk="sign:${idx}">✍ Signer sur l’écran</button>`}
          </div>
        </div><div class="item-tools"><button type="button" class="icon icon-del" data-act="del" data-g="_" data-i="${idx}" aria-label="Supprimer">✕</button></div></li>`).join('')}</ol>` : '<p class="muted empty">Personne pour l’instant.</p>'}
      <button type="button" class="btn btn-secondary btn-sm" data-act="empty" data-g="_">+ Ajouter un·e signataire</button>
    </section>`;
}

function modifiedAfterSigning() {
  return (plan.data.signature?.signataires || []).some((r) => r.sig && !sigValid(r, plan));
}

/* Signature au doigt : renvoie une image PNG (data URL) ou null */
function signaturePad(who) {
  return new Promise((resolve) => {
    const d = $('#sigpad');
    d.innerHTML = `<div class="sig-inner">
      <p class="sig-who">${esc(who)}</p>
      <p class="muted small">Signez avec le doigt dans le cadre. Tournez le téléphone pour plus de place.</p>
      <div class="sig-canvas-wrap"><canvas aria-label="Zone de signature"></canvas><span class="sig-base" aria-hidden="true">✕</span></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-sig="clear">Effacer</button>
        <button type="button" class="btn btn-ghost" data-sig="cancel">Annuler</button>
        <button type="button" class="btn btn-primary" data-sig="ok">Valider la signature</button>
      </div></div>`;
    const canvas = d.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    let drawing = false; let last = null; let inked = false;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.6; ctx.strokeStyle = '#14233a';
      inked = false;
    };
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener('pointerdown', (e) => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2); ctx.fillStyle = '#14233a'; ctx.fill(); inked = true; e.preventDefault(); });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e); const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
      ctx.beginPath(); ctx.moveTo(last.lastMid?.x ?? last.x, last.lastMid?.y ?? last.y); ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y); ctx.stroke();
      last = { ...p, lastMid: mid }; inked = true; e.preventDefault();
    });
    const stop = () => { drawing = false; last = null; };
    canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop);
    const onResize = () => size();
    window.addEventListener('resize', onResize);
    const finish = (val) => { window.removeEventListener('resize', onResize); d.close(); resolve(val); };
    d.onclick = (e) => {
      const a = e.target.closest('[data-sig]')?.dataset.sig;
      if (a === 'clear') size();
      else if (a === 'cancel') finish(null);
      else if (a === 'ok') {
        if (!inked) { toast('La zone de signature est vide.'); return; }
        // réduction pour limiter la place occupée
        // recadrage sur le tracé, puis réduction pour limiter la place occupée
        const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let x1 = canvas.width, y1 = canvas.height, x2 = 0, y2 = 0;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            if (px[(y * canvas.width + x) * 4 + 3] > 10) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
          }
        }
        const m = Math.round(8 * dpr);
        x1 = Math.max(0, x1 - m); y1 = Math.max(0, y1 - m);
        x2 = Math.min(canvas.width, x2 + m); y2 = Math.min(canvas.height, y2 + m);
        const w = x2 - x1, hh = y2 - y1;
        const out = document.createElement('canvas');
        const scale = Math.min(1, 500 / w, 160 / hh);
        out.width = Math.max(1, Math.round(w * scale)); out.height = Math.max(1, Math.round(hh * scale));
        out.getContext('2d').drawImage(canvas, x1, y1, w, hh, 0, 0, out.width, out.height);
        finish(out.toDataURL('image/png'));
      }
    };
    d.oncancel = (e) => { e.preventDefault(); finish(null); };
    d.showModal();
    requestAnimationFrame(size);
  });
}

/* ---------- boîte à outils (photos, vidéos, sons, liens) ---------- */

const KINDS = {
  photo: { icon: '📷', label: 'Photo', accept: 'image/*' },
  video: { icon: '🎬', label: 'Vidéo', accept: 'video/*' },
  audio: { icon: '🎵', label: 'Son ou musique', accept: 'audio/*' },
  voix: { icon: '🎙', label: 'Message vocal' },
  lien: { icon: '🔗', label: 'Lien' },
};
const mediaURLs = new Map(); // id -> URL d'affichage (session)
const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
const toolbox = () => (plan.data.boiteOutils ??= []);

function toolboxHomeHTML() {
  return `<section class="card home-tb">${toolboxTeaserHTML('#/boite-outils')}</section>`;
}

function toolboxTeaserHTML(href = '#/boite-outils/etape') {
  const items = plan.data.boiteOutils || [];
  return `<div class="tb-teaser">
    <h3>🧰 Ma boîte à outils</h3>
    <p class="muted small">J’y range ce qui m’aide à aller mieux : une photo qui m’apaise, une musique, une vidéo, un message que je me suis enregistré, un lien…</p>
    ${items.length ? `<p class="small"><strong>${items.length} élément${items.length > 1 ? 's' : ''}</strong> : ${items.slice(0, 4).map((it) => esc(KINDS[it.kind].icon + ' ' + (it.title || KINDS[it.kind].label))).join(' · ')}${items.length > 4 ? '…' : ''}</p>` : ''}
    <a class="btn btn-secondary btn-sm" href="${href}">${items.length ? 'Ouvrir ma boîte à outils' : 'Créer ma boîte à outils'}</a>
  </div>`;
}

function renderToolbox(fromStep) {
  const items = toolbox();
  const stepIdx = STEPS.findIndex((x) => x.id === 'strategies');
  app.innerHTML = `
    <h1>🧰 Ma boîte à outils</h1>
    <p class="lead">Ce qui m’aide quand ça ne va pas : une photo qui m’apaise, une musique, une vidéo, un message vocal que je me suis enregistré quand j’allais bien, un lien utile…</p>
    <section class="card tb-add">
      <h2>Ajouter</h2>
      <div class="tb-add-grid">
        ${['photo', 'video', 'audio'].map((k) => `<label class="btn btn-secondary tb-add-btn"><span aria-hidden="true">${KINDS[k].icon}</span> ${KINDS[k].label}<input type="file" accept="${KINDS[k].accept}" data-act="tb-file" data-kind="${k}" hidden></label>`).join('')}
        ${canRecord() ? `<button type="button" class="btn btn-secondary tb-add-btn" data-act="tb-record"><span aria-hidden="true">🎙</span> M’enregistrer</button>` : ''}
      </div>
      <form class="tb-link" data-act="tb-link">
        <label class="field"><span>🔗 Ajouter un lien (playlist, vidéo, site…)</span>
          <input type="text" name="url" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://…" autocomplete="off" required></label>
        <button class="btn btn-secondary btn-sm">Ajouter le lien</button>
      </form>
      <p class="muted small">Tout reste sur ce téléphone${store.isProtected() ? ', chiffré avec mon code' : ''}. Dans le plan imprimé ou envoyé, seuls les titres et les liens apparaissent, jamais les photos, vidéos ou sons.</p>
    </section>
    ${items.length ? `<ol class="tb-list">${items.map((it, idx) => toolboxItemHTML(it, idx, items.length)).join('')}</ol>` : '<p class="muted empty center">Ma boîte à outils est vide pour l’instant.</p>'}
    <div class="nav-bottom">
      ${fromStep ? `<a class="btn btn-ghost" href="#/etape/${stepIdx}">← Retour à l’étape 7</a>` : '<a class="btn btn-ghost" href="#/">← Accueil</a>'}
    </div>`;
  fillMedia();
}

function toolboxItemHTML(it, idx, n) {
  const k = KINDS[it.kind];
  let body = '';
  if (it.kind === 'photo') body = `<img class="tb-media" data-media="${esc(it.file)}" alt="${esc(it.title || 'Photo')}">`;
  else if (it.kind === 'video') body = `<video class="tb-media" data-media="${esc(it.file)}" controls playsinline preload="metadata"></video>`;
  else if (it.kind === 'audio' || it.kind === 'voix') body = `<audio class="tb-audio" data-media="${esc(it.file)}" controls preload="metadata"></audio>`;
  else if (it.kind === 'lien') {
    let host = '';
    try { host = new URL(it.url).hostname.replace(/^www\./, ''); } catch { /* lien invalide */ }
    body = `<a class="btn btn-primary btn-sm tb-open" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">Ouvrir ${esc(host || 'le lien')} ↗</a>`;
  }
  return `<li class="card tb-item">
    <div class="tb-head">
      <span class="tb-kind" aria-hidden="true">${k.icon}</span>
      <label class="sr-only" for="tb-t-${idx}">Titre</label>
      <input id="tb-t-${idx}" class="tb-title" data-tb="${idx}" data-fk="tb:${idx}" value="${esc(it.title || '')}" placeholder="${esc(k.label)} — donner un titre…">
    </div>
    <div class="tb-body">${body}</div>
    <div class="tb-tools">
      <button type="button" class="icon" data-act="tb-up" data-i="${idx}" data-fk="tb-up:${idx}" aria-label="Monter" ${idx === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="icon" data-act="tb-down" data-i="${idx}" data-fk="tb-down:${idx}" aria-label="Descendre" ${idx === n - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="icon icon-del" data-act="tb-del" data-i="${idx}" aria-label="Supprimer">✕</button>
    </div>
  </li>`;
}

async function fillMedia() {
  for (const el of app.querySelectorAll('[data-media]')) {
    const id = el.dataset.media;
    try {
      if (!mediaURLs.has(id)) {
        const blob = await media.get(id);
        if (!blob) { el.replaceWith(Object.assign(document.createElement('p'), { className: 'muted small', textContent: 'Fichier introuvable sur ce téléphone.' })); continue; }
        mediaURLs.set(id, URL.createObjectURL(blob));
      }
      el.src = mediaURLs.get(id);
    } catch {
      el.replaceWith(Object.assign(document.createElement('p'), { className: 'muted small', textContent: 'Impossible d’afficher ce fichier.' }));
    }
  }
}

function forgetMediaURLs() {
  for (const u of mediaURLs.values()) URL.revokeObjectURL(u);
  mediaURLs.clear();
}

async function addToolboxBlob(kind, blob, title = '') {
  if (blob.size > media.MAX_BYTES) { toast('Fichier trop volumineux (150 Mo maximum).'); return; }
  try {
    const file = await media.put(blob);
    toolbox().push({ kind, file, title, added: new Date().toISOString() });
    scheduleSave();
    rerender(() => renderToolbox(location.hash.endsWith('/etape')));
    app.querySelector(`[data-fk="tb:${toolbox().length - 1}"]`)?.focus();
    toast('Ajouté. Je peux lui donner un titre.');
  } catch {
    toast('Enregistrement impossible : la mémoire du téléphone est peut-être pleine.');
  }
}

/* Enregistrement d'un message vocal */
function recordVoice() {
  return new Promise((resolve) => {
    const d = $('#modal');
    let rec = null; let stream = null; let chunks = []; let timer = null; let t0 = 0; let result = null;
    d.innerHTML = `<div class="modal-inner">
      <h2>🎙 M’enregistrer</h2>
      <p class="muted small">Par exemple, un message que je m’adresse quand je vais bien, pour me le faire écouter dans les moments difficiles.</p>
      <p class="rec-time" aria-live="polite">0:00</p>
      <audio class="tb-audio" controls hidden></audio>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-r="cancel">Annuler</button>
        <button type="button" class="btn btn-primary" data-r="start">● Démarrer</button>
        <button type="button" class="btn btn-danger" data-r="stop" hidden>■ Arrêter</button>
        <button type="button" class="btn btn-primary" data-r="keep" hidden>Garder</button>
      </div></div>`;
    const $r = (k) => d.querySelector(`[data-r="${k}"]`);
    const time = d.querySelector('.rec-time');
    const player = d.querySelector('audio');
    const cleanup = () => { clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); if (player.src) URL.revokeObjectURL(player.src); };
    const finish = (v) => { cleanup(); d.close(); resolve(v); };
    d.onclick = async (e) => {
      const a = e.target.closest('[data-r]')?.dataset.r;
      if (a === 'cancel') finish(null);
      else if (a === 'start') {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { toast('Micro non autorisé.'); return; }
        chunks = []; rec = new MediaRecorder(stream);
        rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
        rec.onstop = () => {
          result = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          stream.getTracks().forEach((t) => t.stop());
          player.src = URL.createObjectURL(result); player.hidden = false;
          $r('keep').hidden = false; $r('start').hidden = false; $r('start').textContent = '● Recommencer';
        };
        rec.start(); t0 = Date.now();
        timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 250);
        $r('start').hidden = true; $r('keep').hidden = true; $r('stop').hidden = false; player.hidden = true;
      } else if (a === 'stop') { clearInterval(timer); rec?.stop(); $r('stop').hidden = true; }
      else if (a === 'keep' && result) finish(result);
    };
    d.oncancel = (e) => { e.preventDefault(); if (rec?.state === 'recording') rec.stop(); finish(null); };
    d.showModal();
  });
}

const usedMediaIds = () => (plan?.data.boiteOutils || []).map((it) => it.file).filter(Boolean);

/* ---------- Mon Espace Santé + carte de crise ---------- */

const MES_URL = 'https://www.monespacesante.fr/';
let cardTimer = null;
let cardPreviewUrl = '';

/** Données de la carte, préremplies depuis le plan au premier affichage */
function carte() {
  if (!plan.data.carte) {
    const proche = (plan.data.aide?.proches || []).find((r) => r.nom || r.tel) || {};
    const pro = (plan.data.aide?.pros || []).find((r) => r.nom || r.tel) || {};
    const id = plan.data.coordonnees || {};
    plan.data.carte = {
      nom: [id.prenom, id.nom].filter(Boolean).join(' '),
      ou: 'Dans Mon Espace Santé',
      contactNom: proche.nom || '', contactLien: proche.lien || '', contactTel: proche.tel || '',
      soignantNom: [pro.nom, pro.lien].filter(Boolean).join(', '), soignantTel: pro.tel || '',
    };
  }
  return plan.data.carte;
}

async function refreshCardPreview() {
  const box = $('#crisis-preview');
  if (!box) return;
  const blob = await toJpeg(renderCrisisCard(carte()));
  if (cardPreviewUrl) URL.revokeObjectURL(cardPreviewUrl);
  cardPreviewUrl = URL.createObjectURL(blob);
  box.innerHTML = `<img src="${cardPreviewUrl}" alt="Aperçu de ma carte de crise">`;
}

function renderMES() {
  const c = carte();
  const f = (k, label, ph, type = 'text') => `<label class="field"><span>${label}</span><input ${type === 'tel' ? 'inputmode="tel"' : ''} data-card="${k}" data-fk="card:${k}" value="${esc(c[k] || '')}" placeholder="${esc(ph)}"></label>`;
  app.innerHTML = `
    <h1>🏥 Ajouter à Mon Espace Santé</h1>
    <p class="lead">Déposer mon plan dans Mon Espace Santé permet aux soignant·es que j’autorise de le consulter, y compris en cas d’hospitalisation ou d’urgence. Ma carte de crise signale qu’il existe.</p>

    <section class="card">
      <h2>1. Télécharger mon plan en PDF</h2>
      <p class="muted small">Sans code : Mon Espace Santé est déjà un espace sécurisé, et un code empêcherait les soignant·es de lire le document.</p>
      ${modifiedAfterSigning() ? '<p class="warn small">Certaines signatures sont antérieures à la dernière modification : elles ne figureront pas dans le PDF. <a href="#/etape/' + (STEPS.length - 1) + '">Signer à nouveau</a></p>' : ''}
      <button type="button" class="btn btn-primary" data-act="mes-pdf">📄 Télécharger le PDF</button>
    </section>

    <section class="card">
      <h2>2. Le déposer dans Mon Espace Santé</h2>
      <ol class="mes-steps">
        <li>J’ouvre l’application <strong>Mon Espace Santé</strong> ou le site monespacesante.fr, et je me connecte.</li>
        <li>Dans <strong>Documents</strong>, je touche <strong>« Ajouter un document »</strong> et je choisis le PDF téléchargé.</li>
        <li>Je lui donne un titre clair : <strong>« Plan de crise conjoint »</strong>, avec la date.</li>
        <li>Je vérifie qu’il <strong>n’est pas masqué</strong> aux professionnel·les qui me suivent.</li>
        <li>Dans les <strong>paramètres de confidentialité</strong>, je peux autoriser l’<strong>accès en cas d’urgence</strong> (médecin du SAMU-Centre 15, soignant·es face à un risque immédiat pour ma santé). C’est ce qui rend mon plan utile en situation de crise.</li>
        <li>À chaque mise à jour de mon plan, je dépose la nouvelle version et je supprime l’ancienne.</li>
      </ol>
      <a class="btn btn-secondary" href="${MES_URL}" target="_blank" rel="noopener noreferrer">Ouvrir Mon Espace Santé ↗</a>
      <details class="more">
        <summary>Si je suis hospitalisé·e</summary>
        <ul class="small">
          <li>Si le logiciel de l’hôpital est relié à Mon Espace Santé, les soignant·es que j’autorise peuvent consulter mon plan.</li>
          <li>Je peux aussi le remettre à l’équipe à mon arrivée (PDF ou version imprimée), pour qu’il soit ajouté à mon dossier.</li>
          <li>Le ou la soignant·e qui m’accompagne peut l’envoyer à l’hôpital par la messagerie sécurisée de santé (MSSanté).</li>
        </ul>
      </details>
    </section>

    <section class="card">
      <h2>3. Ma carte de crise</h2>
      <p class="muted small">Une carte au format carte bancaire, à garder dans mon portefeuille à côté de ma carte Vitale. Elle indique seulement que j’ai un plan de crise conjoint, où le trouver et qui prévenir : aucune information sur ma santé.</p>
      <div class="card-preview" id="crisis-preview"><span class="muted">Préparation…</span></div>
      <div class="form-grid">
        ${f('nom', 'Mon nom', 'Prénom Nom')}
        ${f('ou', 'Où trouver mon plan', 'Ex. : Dans Mon Espace Santé')}
        ${f('contactNom', 'Personne à prévenir', 'Ex. : Julie Durand')}
        ${f('contactLien', 'Lien', 'Ex. : ma sœur')}
        ${f('contactTel', 'Son téléphone', '06 …', 'tel')}
        ${f('soignantNom', 'Mon soignant référent (facultatif)', 'Ex. : Mme Martin, CMP')}
        ${f('soignantTel', 'Son téléphone (facultatif)', '02 …', 'tel')}
      </div>
      <div class="stack">
        <button type="button" class="btn btn-primary" data-act="card-print">🖨 Imprimer la carte (PDF)</button>
        <button type="button" class="btn btn-secondary" data-act="card-img">🖼 Enregistrer l’image</button>
      </div>
      <p class="muted small">Je vérifie avec la personne à prévenir qu’elle est d’accord pour figurer sur ma carte.</p>
    </section>
    <div class="nav-bottom"><a class="btn btn-ghost" href="#/plan">← Mon plan</a></div>`;
  refreshCardPreview();
}

/* ---------- plan complet et partage ---------- */

function renderPlan() {
  const refused = (plan.data.soinsEvites || []).some((r) => r.soin && r.soin.trim());
  const alt = (plan.data.alternatives || []).some((x) => x.trim());
  const canShare = !!navigator.share;
  app.innerHTML = `
    <h1>Mon plan</h1>
    ${refused && !alt ? '<div class="warn" role="status"><strong>À compléter :</strong> j’ai indiqué des soins à éviter sans proposer d’alternative. <a href="#/etape/' + STEPS.findIndex((s) => s.id === 'alternatives') + '">Compléter les alternatives</a></div>' : ''}
    ${modifiedAfterSigning() ? '<div class="warn no-print" role="status"><strong>Le plan a été modifié après certaines signatures</strong> : elles ne figurent plus sur l’impression ni sur le PDF. <a href="#/etape/' + (STEPS.length - 1) + '">Signer à nouveau</a></div>' : ''}
    <section class="card actions no-print">
      <h2>Imprimer, enregistrer, envoyer</h2>
      <p class="muted">Rien ne part sans mon accord. Je choisis à qui j’envoie mon plan et par quel moyen.</p>
      <div class="stack">
        <button class="btn btn-secondary" data-act="print">🖨 Imprimer</button>
        <button class="btn btn-secondary" data-act="pdf-save">📄 Enregistrer en PDF</button>
        <button class="btn btn-primary" data-act="pdf-send">📤 Envoyer le PDF</button>
        <a class="btn btn-secondary" href="#/mon-espace-sante">🏥 Ajouter à Mon Espace Santé</a>
      </div>
      <p class="muted small">Pour l’enregistrement comme pour l’envoi, je peux <strong>protéger le PDF par un code</strong> : il sera demandé à l’ouverture du fichier.</p>
      <details class="more">
        <summary>Autre option : envoyer en texte</summary>
        <p class="muted small">Le texte se colle dans un message. Il <strong>ne peut pas être protégé</strong> par un code : préférez le PDF protégé pour un envoi.</p>
        <button class="btn btn-ghost btn-sm" data-act="share-text">${canShare ? 'Envoyer en texte (non protégé)' : 'Copier le texte (non protégé)'}</button>
      </details>
    </section>
    <article class="doc">${documentHTML(plan)}</article>
    <div class="nav-bottom no-print"><a class="btn btn-ghost" href="#/etape/${STEPS.length - 1}">← Modifier</a><a class="btn btn-ghost" href="#/">Accueil</a></div>`;
}

/* ---------- contacts du téléphone (API Contact Picker, Android/Chrome) ---------- */

// Brave (Android) expose l'API mais select() ne fait rien : bug connu
// https://github.com/brave/brave-browser/issues/18908
const isBrave = () => !!navigator.brave;
const contactsSupported = () => 'contacts' in navigator && 'ContactsManager' in window
  && typeof navigator.contacts.select === 'function' && !isBrave();

function contactsWanted(step, g) {
  if (!step.contacts) return false;
  return step.contactGroupsOnly ? !!g.contacts : true;
}
function contactsEnabled(step, g) {
  return contactsWanted(step, g) && contactsSupported();
}
function contactsNoteHTML(step, g) {
  if (!contactsWanted(step, g) || contactsSupported() || !isBrave() || !/Android/i.test(navigator.userAgent)) return '';
  return '<p class="muted small contacts-note">Pour choisir directement dans mes contacts, j’ouvre Mon PCC dans <strong>Chrome</strong> : le navigateur Brave ne le permet pas encore.</p>';
}

async function confirmContacts() {
  if (sessionStorage.getItem('monpcc.contactsOk')) return true;
  const ok = await modal({
    title: 'Accéder à mes contacts',
    body: `<p>Mon téléphone va afficher sa liste de contacts. <strong>Seuls les contacts que je coche</strong> seront ajoutés à mon plan (nom et numéro). Mon PCC n’a pas accès au reste de mon carnet.</p>
      <ul><li>Les contacts choisis restent enregistrés sur ce téléphone, comme le reste de mon plan.</li>
      <li>Je vérifie avec chaque personne qu’elle est d’accord pour figurer dans mon plan et pour être contactée.</li></ul>`,
    ok: 'Ouvrir mes contacts',
  });
  if (ok) sessionStorage.setItem('monpcc.contactsOk', '1');
  return ok;
}

async function pickContacts(step, gid) {
  if (!(await confirmContacts())) return;
  const map = step.contacts;
  const props = map.tel ? ['name', 'tel'] : ['name'];
  let picked;
  try {
    picked = await navigator.contacts.select(props, { multiple: true });
  } catch {
    toast('Impossible d’ouvrir les contacts sur cet appareil.');
    return;
  }
  if (!picked || !picked.length) return;
  const arr = getArr(step, gid);
  let added = 0;
  for (const c of picked) {
    const name = (c.name || []).find((n) => n && n.trim()) || '';
    const tel = (c.tel || []).find((t) => t && t.trim()) || '';
    if (!name && !tel) continue;
    const rec = { [map.name]: name.trim() };
    if (map.tel) rec[map.tel] = tel.trim();
    const dup = arr.some((r) => r[map.name] === rec[map.name] && (!map.tel || r[map.tel] === rec[map.tel]));
    if (!dup) { arr.push(rec); added++; }
  }
  scheduleSave();
  rerender(() => renderStep(STEPS.indexOf(step)));
  toast(added ? `${added} contact${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''}. Pensez à préciser le lien ou le rôle.` : 'Ces contacts figurent déjà dans la liste.');
}

async function confirmShare() {
  if (sessionStorage.getItem('monpcc.shareOk')) return true;
  const ok = await modal({
    title: 'Avant d’envoyer',
    body: `<p>Mon plan contient des <strong>informations de santé</strong>. Une fois envoyé, il quitte ce téléphone et je n’en ai plus le contrôle.</p>
      <ul><li>Je l’envoie seulement à des personnes de confiance ou aux professionnel·les qui m’accompagnent.</li>
      <li>Je privilégie un moyen sûr : remise en main propre, messagerie sécurisée de santé, application chiffrée.</li>
      <li>Je vérifie le destinataire avant d’envoyer.</li></ul>`,
    ok: 'J’ai compris, continuer',
  });
  if (ok) sessionStorage.setItem('monpcc.shareOk', '1');
  return ok;
}

/* ---------- PDF du plan (enregistrer / envoyer), protégé par code ---------- */

function randomCode() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint8Array(8));
  const c = Array.from(r, (b) => A[b % A.length]).join('');
  return c.slice(0, 4) + '-' + c.slice(4);
}

/** Demande s'il faut protéger le PDF ; renvoie { password } ou null si annulé */
function pdfDialog(mode) {
  return new Promise((resolve) => {
    const d = $('#modal');
    const send = mode === 'send';
    d.innerHTML = `<form method="dialog" class="modal-inner pdf-dlg">
      <h2>${send ? '📤 Envoyer mon plan en PDF' : '📄 Enregistrer mon plan en PDF'}</h2>
      ${send ? `<p class="small">Mon plan contient des <strong>informations de santé</strong>. Une fois envoyé, il quitte ce téléphone : je l’envoie seulement à des personnes de confiance ou aux professionnel·les qui m’accompagnent, et je vérifie le destinataire.</p>` : ''}
      <fieldset class="choice">
        <legend class="sr-only">Protection</legend>
        <label class="radio"><input type="radio" name="mode" value="code" checked> <span><strong>Protéger par un code</strong> (recommandé)<br><span class="muted small">Le code sera demandé pour ouvrir le PDF.</span></span></label>
        <div class="code-box">
          <label class="field"><span>Code (6 caractères minimum)</span>
            <input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
          <button type="button" class="btn btn-ghost btn-sm" data-gen>Générer un code</button>
          <p class="muted small">${send
            ? 'Je communique ce code au destinataire <strong>par un autre moyen</strong> (de vive voix, par SMS séparé…), jamais dans le même message que le fichier.'
            : 'Je note ce code : sans lui, le fichier ne pourra pas être ouvert. Mon PCC ne le garde pas.'}</p>
        </div>
        <label class="radio"><input type="radio" name="mode" value="none"> <span>Sans code</span></label>
      </fieldset>
      <p class="error" role="alert" hidden></p>
      <div class="modal-actions">
        <button value="cancel" class="btn btn-ghost" formnovalidate>Annuler</button>
        <button value="ok" class="btn btn-primary">${send ? 'Préparer l’envoi' : 'Enregistrer'}</button>
      </div></form>`;
    const f = d.querySelector('form');
    const box = d.querySelector('.code-box');
    const err = d.querySelector('.error');
    const sync = () => { box.hidden = f.mode.value !== 'code'; };
    f.addEventListener('change', sync);
    d.querySelector('[data-gen]').onclick = () => { f.code.value = randomCode(); f.code.focus(); };
    f.addEventListener('submit', (e) => {
      if (e.submitter?.value !== 'ok') return;
      if (f.mode.value === 'code' && f.code.value.trim().length < 6) {
        e.preventDefault();
        err.textContent = 'Le code doit comporter au moins 6 caractères.';
        err.hidden = false;
        f.code.focus();
      }
    });
    d.addEventListener('close', () => {
      if (d.returnValue !== 'ok') return resolve(null);
      resolve({ password: f.mode.value === 'code' ? f.code.value.trim() : '' });
    }, { once: true });
    d.returnValue = '';
    d.showModal();
    sync();
  });
}

async function makePlanPdf(password) {
  saveState.textContent = 'Préparation du PDF…';
  try {
    const blob = await buildPlanPdf(plan, password);
    return new File([blob], fileBaseName(plan) + (password ? '-protege' : '') + '.pdf', { type: 'application/pdf' });
  } finally {
    saveState.textContent = 'Enregistré sur ce téléphone';
  }
}

async function pdfSave() {
  const opt = await pdfDialog('save');
  if (!opt) return;
  try {
    const file = await makePlanPdf(opt.password);
    download(file, file.name);
    toast(opt.password ? 'PDF protégé enregistré. Gardez le code en lieu sûr.' : 'PDF enregistré.');
  } catch {
    toast('Impossible de créer le PDF sur cet appareil.');
  }
}

async function pdfSend() {
  const opt = await pdfDialog('send');
  if (!opt) return;
  let file;
  try { file = await makePlanPdf(opt.password); } catch { toast('Impossible de créer le PDF sur cet appareil.'); return; }
  const share = () => navigator.share({ files: [file], title: 'Mon plan de crise conjoint' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await share(); return; } catch (e) {
      if (e.name === 'AbortError') return;
      // Certains navigateurs exigent un nouveau geste après la préparation
      if (e.name === 'NotAllowedError') {
        if (await modal({ title: 'Le PDF est prêt', body: `<p>${opt.password ? 'Le fichier est protégé par le code choisi.' : 'Le fichier n’est pas protégé.'}</p>`, ok: 'Envoyer' })) {
          try { await share(); return; } catch (e2) { if (e2.name === 'AbortError') return; }
        } else return;
      }
    }
  }
  download(file, file.name);
  toast('Envoi direct indisponible : le PDF a été téléchargé, je peux le joindre à un message.');
}

async function shareText() {
  if (!(await confirmShare())) return;
  const text = planText(plan);
  if (navigator.share) {
    try { await navigator.share({ title: 'Mon plan de crise conjoint', text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(text); toast('Texte copié : collez-le dans le message de votre choix.'); } catch { toast('Copie impossible sur cet appareil.'); }
}

/* ---------- réglages ---------- */

function renderSettings() {
  const prot = store.isProtected();
  app.innerHTML = `
    <h1>Réglages</h1>
    <section class="card">
      <h2>Protéger par un code</h2>
      <p>${prot ? 'Mon plan est <strong>chiffré</strong> sur ce téléphone. Le code est demandé à chaque ouverture.' : 'Je peux chiffrer mon plan avec un code personnel. Il sera demandé à chaque ouverture de l’application.'}</p>
      ${prot
        ? `<div class="stack"><button class="btn btn-secondary" data-act="lock-now">Verrouiller maintenant</button><button class="btn btn-ghost" data-act="unprotect">Retirer le code</button></div>`
        : `<form class="stack" data-act="protect">
            <label class="field"><span>Code (6 caractères minimum)</span><input type="password" name="c1" minlength="6" required autocomplete="new-password"></label>
            <label class="field"><span>Confirmer le code</span><input type="password" name="c2" minlength="6" required autocomplete="new-password"></label>
            <p class="muted small">Attention : si j’oublie ce code, personne ne pourra récupérer mon plan, pas même les créateurs de l’application.</p>
            <button class="btn btn-primary">Activer la protection</button></form>`}
    </section>
    <section class="card">
      <h2>Sauvegarde</h2>
      <p>Pour changer de téléphone ou garder une copie, j’exporte un fichier de sauvegarde que je pourrai réimporter dans Mon PCC.</p>
      <div class="stack">
        <button class="btn btn-secondary" data-act="export">Exporter une sauvegarde</button>
        <label class="btn btn-ghost file-btn">Importer une sauvegarde<input type="file" accept="application/json,.json" data-act="import" hidden></label>
      </div>
      <p class="muted small">Le fichier de sauvegarde contient aussi ma boîte à outils (photos, vidéos, sons) et n’est pas chiffré : je le garde en lieu sûr.</p>
    </section>
    <section class="card">
      <h2>Installer l’application</h2>
      ${isStandalone() ? '<p>✓ Mon PCC est installé sur cet appareil.</p>' : `<button class="btn btn-primary" data-act="install-open">Installer Mon PCC</button>
      <label class="check"><input type="checkbox" data-act="ib-toggle" ${installPref() === 'never' ? '' : 'checked'}> Proposer l’installation par un bandeau</label>`}
      <p class="muted small">Une fois installée, l’application fonctionne même sans connexion.</p>
    </section>
    <section class="card">
      <h2>Partager l’application</h2>
      <p>Lien, QR code, carte ou planche de cartes à imprimer.</p>
      <a class="btn btn-secondary" href="#/partager">📤 Partager Mon PCC</a>
    </section>
    <section class="card card-danger">
      <h2>Effacer mes données</h2>
      <p>Supprime définitivement mon plan de ce téléphone.</p>
      <button class="btn btn-danger" data-act="wipe">Tout effacer</button>
    </section>`;
}

/* ---------- pages d'information ---------- */

function renderAbout() {
  app.innerHTML = `
    <h1>À propos</h1>
    <section class="card">
      <h2>Mon PCC</h2>
      <p>Mon PCC est un outil <strong>gratuit, sans publicité et sans inscription</strong> pour préparer son plan de crise conjoint sur son téléphone.</p>
      <p>Il ne remplace ni l’accompagnement par un·e professionnel·le, ni un avis médical. Le plan de crise conjoint se construit <em>avec</em> son réseau de soutien : Mon PCC aide à préparer et mettre en forme ce travail.</p>
    </section>
    <section class="card">
      <h2>Le plan de crise conjoint</h2>
      <p>Le PCC est une forme de déclaration anticipée en santé mentale. Il résulte d’une décision partagée entre la personne concernée, un·e professionnel·le et, si elle le souhaite, ses proches. Ses bénéfices ont été étudiés : meilleure alliance thérapeutique, moins d’hospitalisations sous contrainte, meilleure qualité de vie.</p>
      <p>Pour en savoir plus, se former gratuitement (e-learning) ou télécharger le formulaire officiel : <a href="${SOURCE.url}" target="_blank" rel="noopener">plandecriseconjoint.ch</a>.</p>
    </section>
    <section class="card">
      <h2>Sources et droits d’auteur</h2>
      <p>Les questions de Mon PCC reprennent le support officiel :<br><em>${esc(SOURCE.citation)}</em> <a href="${SOURCE.url}" target="_blank" rel="noopener">${SOURCE.url}</a> — © ${esc(SOURCE.holder)}.</p>
      <p>Ce support est diffusé sous licence <a href="${SOURCE.licenseUrl}" target="_blank" rel="noopener">Creative Commons BY-NC-SA</a> (attribution, pas d’utilisation commerciale, partage dans les mêmes conditions). Mon PCC respecte ces conditions : il cite la source, reste gratuit et non commercial, et ses contenus sont partagés sous la même licence.</p>
      <p><strong>Modifications apportées</strong> : découpage en étapes, conseils de rédaction, suggestions et exemples ajoutés, numéros d’urgence adaptés à la France, mise en page.</p>
      <p>Mon PCC est un projet indépendant, <strong>non affilié</strong> à la Haute École de la Santé La Source ni aux auteur·es du PCC, qui ne l’ont pas validé.</p>
      <p>Code source libre : voir le dépôt GitHub du projet (fichiers LICENSE). Le QR code est généré par la bibliothèque <em>qrcode-generator</em> de Kazuhiko Arase (licence MIT).</p>
    </section>
    <p class="center"><a href="#/confidentialite">Confidentialité</a></p>`;
}

function renderPrivacy() {
  app.innerHTML = `
    <h1>Confidentialité</h1>
    <section class="card">
      <h2>En résumé</h2>
      <ul>
        <li><strong>Aucune donnée n’est collectée</strong> par Mon PCC : pas de compte, pas de serveur, pas de base de données.</li>
        <li>Mes réponses sont enregistrées <strong>uniquement dans le navigateur de ce téléphone</strong>.</li>
        <li>Aucun cookie, aucune mesure d’audience, aucune publicité, aucune police ou ressource chargée depuis un autre site.</li>
        <li>Quand j’enregistre ou j’envoie mon plan en PDF, je peux le <strong>protéger par un code</strong> (chiffrement AES-256) : sans ce code, le fichier ne peut pas être ouvert. Mon PCC ne conserve pas ce code.</li>
        <li>Les photos, vidéos et sons de ma <strong>boîte à outils</strong> restent sur ce téléphone (chiffrés si j’ai mis un code). Ils ne figurent jamais dans le plan imprimé ou envoyé : seuls leurs titres et les liens y apparaissent.</li>
        <li>Si mon téléphone le permet, je peux <strong>choisir des contacts</strong> dans mon carnet : seuls ceux que je coche sont ajoutés (nom et numéro), le reste de mon carnet n’est jamais lu.</li>
        <li>Je peux <strong>protéger</strong> mon plan par un code (chiffrement AES-256) et <strong>tout effacer</strong> à tout moment dans les Réglages.</li>
      </ul>
    </section>
    <section class="card">
      <h2>Mes données de santé</h2>
      <p>Mon plan contient des données de santé, protégées par le RGPD. Comme elles ne quittent jamais mon appareil sans action de ma part, l’éditeur de Mon PCC n’y a pas accès et ne les traite pas.</p>
      <p>Quand je choisis d’envoyer mon plan (PDF, document ou texte), il passe par l’application que je sélectionne (messagerie, e-mail…) et devient accessible à son destinataire. Je choisis des personnes de confiance et un moyen sûr. Les professionnel·les de santé qui le reçoivent sont tenu·es au secret professionnel.</p>
    </section>
    <section class="card">
      <h2>Hébergement</h2>
      <p>Les fichiers de l’application sont hébergés par GitHub Pages (GitHub Inc.). Comme pour tout site, l’hébergeur peut enregistrer des données techniques de connexion (adresse IP) lors du téléchargement de l’application, indépendamment de Mon PCC. Ces journaux ne contiennent jamais le contenu de mon plan. Voir la <a href="https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">déclaration de confidentialité de GitHub</a>.</p>
      <p>Une fois installée, l’application fonctionne hors connexion.</p>
    </section>
    <section class="card">
      <h2>Mes droits</h2>
      <p>Mes données sont sous mon seul contrôle : je peux les consulter, les modifier, les exporter (Réglages › Sauvegarde) et les effacer (Réglages › Tout effacer). Désinstaller l’application ou effacer les données du site dans mon navigateur les supprime aussi.</p>
      <p>Pour toute question sur Mon PCC : ouvrir un ticket sur le dépôt GitHub du projet. Je peux aussi m’adresser à la <a href="https://www.cnil.fr" target="_blank" rel="noopener">CNIL</a>.</p>
    </section>`;
}

function renderLock() {
  document.body.dataset.page = 'verrou';
  app.innerHTML = `
    <section class="hero">
      <div class="hero-logo" aria-hidden="true">${logoSVG()}</div>
      <h1>Mon PCC est protégé</h1>
      <form class="card stack" data-act="unlock">
        <label class="field"><span>Mon code</span><input type="password" name="code" required autocomplete="current-password" autofocus></label>
        <button class="btn btn-primary">Ouvrir</button>
        <p class="error" role="alert" hidden></p>
      </form>
      <p><button class="link" data-act="forgot">Code oublié ?</button></p>
    </section>
    ${emergencyNote()}`;
}

/* ---------- installation ---------- */

/* ---------- installation (bandeau désactivable) ---------- */

const INSTALL_KEY = 'monpcc.install';   // 'never' ou date (ms) jusqu'à laquelle ne pas proposer
const env = (() => {
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIos || isAndroid || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900);
  return { isIos, isAndroid, isMobile };
})();
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const canPrompt = () => !!window.__pccInstall;

function installPref() {
  try { return localStorage.getItem(INSTALL_KEY); } catch { return null; }
}
function setInstallPref(v) {
  try { if (v === null) localStorage.removeItem(INSTALL_KEY); else localStorage.setItem(INSTALL_KEY, v); } catch { /* ignoré */ }
}
function bannerAllowed() {
  const p = installPref();
  if (p === 'never') return false;
  return !(p && Number(p) > Date.now());
}

function installStepsHTML() {
  if (canPrompt()) return '';
  if (env.isIos) {
    return `<ol class="ib-steps"><li>Touchez le bouton <strong>Partager</strong> <span aria-hidden="true">⎋</span> en bas de l’écran (sur iPad, en haut).</li>
      <li>Faites défiler et touchez <strong>« Sur l’écran d’accueil »</strong>.</li><li>Touchez <strong>« Ajouter »</strong>.</li></ol>
      <p class="muted small">Avec Safari. Sur un autre navigateur, ouvrez d’abord Mon PCC dans Safari.</p>`;
  }
  return `<ol class="ib-steps"><li>Ouvrez le menu du navigateur (<strong>⋮</strong> en haut à droite, ou <strong>≡</strong> en bas).</li>
    <li>Touchez <strong>« Installer l’application »</strong> ou <strong>« Ajouter à l’écran d’accueil »</strong>.</li><li>Confirmez : l’icône Mon PCC apparaît sur l’écran d’accueil.</li></ol>`;
}

function showInstallBanner(manual = false) {
  const b = $('#install-banner');
  if (isStandalone()) {
    if (manual) toast('Mon PCC est déjà installé sur cet appareil.');
    return;
  }
  b.innerHTML = `<div class="ib-inner">
    <img src="icons/icon-192.png" alt="" class="ib-icon" width="48" height="48">
    <div class="ib-text">
      <p id="ib-title" class="ib-title">${canPrompt() ? 'Installer Mon PCC' : env.isIos ? 'Ajouter Mon PCC à l’écran d’accueil' : 'Installer Mon PCC sur mon téléphone'}</p>
      <p class="muted small">Pour l’ouvrir comme une application, même sans connexion. Rien n’est envoyé : mon plan reste sur ce téléphone.</p>
      ${installStepsHTML()}
      <div class="ib-actions">
        ${canPrompt() ? '<button type="button" class="btn btn-primary btn-sm" data-act="install">Installer</button>' : ''}
        <button type="button" class="btn btn-ghost btn-sm" data-act="ib-later">Plus tard</button>
        <button type="button" class="link small" data-act="ib-never">Ne plus proposer</button>
      </div>
    </div>
    <button type="button" class="icon ib-close" data-act="ib-later" aria-label="Fermer">✕</button>
  </div>`;
  b.hidden = false;
  if (manual) b.querySelector('button')?.focus();
}
function hideInstallBanner() { $('#install-banner').hidden = true; }

function refreshInstallUI() {
  const mi = $('#menu-install');
  if (mi) mi.hidden = isStandalone();
  if (!$('#install-banner').hidden) showInstallBanner();
}

/* ---------- partager l'application ---------- */

let shareCache = null; // { url, qr, canvas, blob, preview }

async function prepareShare() {
  const url = appUrl();
  if (shareCache && shareCache.url === url) return shareCache;
  if (!window.qrcode) throw new Error('qrcode');
  const qr = makeQr(url);
  const canvas = renderCard(url, qr);
  const blob = await canvasToJpeg(canvas);
  shareCache = { url, qr, canvas, blob, preview: URL.createObjectURL(blob) };
  return shareCache;
}

function renderShare() {
  const url = appUrl();
  app.innerHTML = `
    <h1>📤 Partager l’application</h1>
    <p class="lead">Faire connaître Mon PCC : gratuit, sans inscription, sans publicité. Seule l’adresse de l’application est partagée, jamais mon plan.</p>
    <section class="card">
      <h2>🔗 Le lien</h2>
      <div class="share-link"><span>${esc(displayUrl(url))}</span><button type="button" class="btn btn-ghost btn-sm" data-act="share-copy">Copier</button></div>
      ${navigator.share ? '<button type="button" class="btn btn-primary" data-act="share-app">Partager le lien</button>' : ''}
    </section>
    <section class="card">
      <h2>▦ QR code en plein écran</h2>
      <p class="muted">À montrer pour qu’une personne ouvre Mon PCC en le scannant avec son téléphone.</p>
      <button type="button" class="btn btn-secondary" data-act="qr-open">Afficher le QR code</button>
    </section>
    <section class="card">
      <h2>🖼 Carte à partager (JPG)</h2>
      <p class="muted">Une image avec le QR code, à envoyer par message, publier ou imprimer.</p>
      <div class="card-preview" id="card-preview"><span class="muted">Préparation…</span></div>
      <div class="stack">
        ${navigator.canShare ? '<button type="button" class="btn btn-primary" data-act="card-share" hidden>Partager l’image</button>' : ''}
        <button type="button" class="btn btn-secondary" data-act="card-download">Télécharger le JPG</button>
      </div>
    </section>
    <section class="card">
      <h2>🖨 Planche de cartes (PDF)</h2>
      <p class="muted">10 cartes au format carte de visite (85 × 55 mm) sur une page A4, à imprimer à 100 % (taille réelle) puis découper. Idéal pour un service, une salle d’attente ou un groupe d’entraide.</p>
      <button type="button" class="btn btn-secondary" data-act="sheet-download">Télécharger le PDF</button>
    </section>`;
  prepareShare().then((c) => {
    const box = $('#card-preview');
    if (!box) return;
    box.innerHTML = `<img src="${c.preview}" alt="Aperçu de la carte Mon PCC avec QR code">`;
    try {
      const f = new File([c.blob], 'carte-mon-pcc.jpg', { type: 'image/jpeg' });
      const btn = app.querySelector('[data-act="card-share"]');
      if (btn && navigator.canShare({ files: [f] })) btn.hidden = false;
    } catch { /* partage de fichier indisponible */ }
  }).catch(() => {
    const box = $('#card-preview');
    if (box) box.innerHTML = '<p class="error">Impossible de préparer la carte sur ce navigateur.</p>';
  });
}

let wakeLock = null;
async function openQrFull() {
  let c;
  try { c = await prepareShare(); } catch { toast('QR code indisponible.'); return; }
  const el = $('#qr-full');
  el.innerHTML = `<div class="qr-head"><img src="icons/icon-192.png" alt="" width="44" height="44"><p>Mon PCC</p></div>
    ${qrSvg(c.qr, 'Scannez pour ouvrir Mon PCC')}
    <p class="qr-scan">Scannez pour ouvrir l’application</p>
    <p class="qr-url">${esc(displayUrl(c.url))}</p>
    <button type="button" class="btn btn-ghost" data-act="qr-close">✕ Fermer</button>`;
  el.hidden = false;
  el.querySelector('button').focus();
  try { await el.requestFullscreen?.(); } catch { /* indisponible (iPhone) */ }
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { wakeLock = null; }
}
async function closeQrFull() {
  const el = $('#qr-full');
  if (el.hidden) return;
  el.hidden = true;
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* rien */ }
  try { await wakeLock?.release(); } catch { /* rien */ }
  wakeLock = null;
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) closeQrFull(); });

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* rien */ }
    ta.remove();
    return ok;
  }
}

function logoSVG() {
  return `<svg viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="16" fill="var(--brand)"/><circle cx="25" cy="32" r="12" fill="none" stroke="#fff" stroke-width="5"/><circle cx="39" cy="32" r="12" fill="none" stroke="#fff" stroke-width="5" opacity=".85"/></svg>`;
}

/* ---------- menu ---------- */

function openMenu() {
  const m = $('#menu');
  $('#menu-steps').innerHTML = stepsListHTML();
  m.hidden = false;
  $('#menu-btn').setAttribute('aria-expanded', 'true');
  $('#menu-close').focus();
}
function closeMenu() {
  $('#menu').hidden = true;
  $('#menu-btn').setAttribute('aria-expanded', 'false');
}

/* ---------- événements ---------- */

app.addEventListener('input', (e) => {
  const el = e.target;
  if (!plan || el.type === 'file') return;
  if (el.dataset.card !== undefined) {
    carte()[el.dataset.card] = el.value;
    scheduleSave(false); // la carte ne fait pas partie du plan signé
    clearTimeout(cardTimer);
    cardTimer = setTimeout(refreshCardPreview, 400);
    return;
  }
  if (el.dataset.tb !== undefined) {
    toolbox()[+el.dataset.tb].title = el.value;
    scheduleSave();
    return;
  }
  const stepEl = el.closest('[data-step]');
  if (!stepEl) return;
  const step = STEPS[+stepEl.dataset.step];
  if (el.dataset.k) {
    const key = step.type === 'final' ? 'signature' : 'coordonnees';
    plan.data[key] ??= {};
    plan.data[key][el.dataset.k] = el.value;
  } else if (el.dataset.f) {
    getArr(step, el.dataset.g)[+el.dataset.i][el.dataset.f] = el.value;
  } else if (el.dataset.i !== undefined && el.classList.contains('item-input')) {
    getArr(step, el.dataset.g)[+el.dataset.i] = el.value;
    autosize(el);
  } else return;
  scheduleSave();
});

function autosize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

app.addEventListener('submit', async (e) => {
  const form = e.target;
  const act = form.dataset.act;
  if (!act) return;
  e.preventDefault();
  if (act === 'free') {
    const step = STEPS[+form.closest('[data-step]').dataset.step];
    const input = form.querySelector('input');
    const v = input.value.trim();
    if (!v) return;
    getArr(step, form.dataset.g).push(v);
    input.value = '';
    scheduleSave();
    rerender(() => renderStep(STEPS.indexOf(step)));
    app.querySelector(`[data-fk="free:${form.dataset.g}"]`)?.focus({ preventScroll: true });
  } else if (act === 'tb-link') {
    let url = form.url.value.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol)) throw new Error();
      toolbox().push({ kind: 'lien', url: u.href, title: '', added: new Date().toISOString() });
      scheduleSave();
      rerender(() => renderToolbox(location.hash.endsWith('/etape')));
      app.querySelector(`[data-fk="tb:${toolbox().length - 1}"]`)?.focus();
    } catch {
      toast('Ce lien ne semble pas valide.');
    }
  } else if (act === 'unlock') {
    const err = form.querySelector('.error');
    try {
      plan = await store.unlock(form.code.value);
      locked = false;
      media.prune(usedMediaIds()).catch(() => {});
      route();
    } catch {
      err.textContent = 'Code incorrect.';
      err.hidden = false;
    }
  } else if (act === 'protect') {
    if (form.c1.value !== form.c2.value) return toast('Les deux codes ne sont pas identiques.');
    const files = await media.loadAll().catch(() => []);
    await store.protect(plan, form.c1.value);
    await media.saveAll(files);
    forgetMediaURLs();
    toast('Protection activée.');
    renderSettings();
  }
});

app.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.act === 'tb-file' && el.files[0]) {
    const f = el.files[0];
    el.value = '';
    await addToolboxBlob(el.dataset.kind, f, f.name.replace(/\.[^.]+$/, '').replace(/^(IMG|VID|PXL|DSC|Screenshot)[-_ ].*$/i, ''));
    return;
  }
  if (el.dataset.act !== 'import' || !el.files[0]) return;
  try {
    const obj = JSON.parse(await el.files[0].text());
    if (!obj || obj.app !== 'mon-pcc' || typeof obj.plan?.data !== 'object') throw new Error();
    if (hasData() && !(await modal({ title: 'Remplacer mon plan ?', body: '<p>Le plan actuellement enregistré sur ce téléphone sera remplacé par la sauvegarde.</p>', ok: 'Remplacer', danger: true }))) return;
    plan = obj.plan;
    await media.clear();
    forgetMediaURLs();
    for (const m of obj.media || []) await media.put(media.dataURLToBlob(m.data), m.id);
    await store.save(plan);
    toast('Sauvegarde importée.');
    location.hash = '#/';
  } catch {
    toast('Ce fichier n’est pas une sauvegarde Mon PCC valide.');
  } finally {
    el.value = '';
  }
});

document.addEventListener('click', async (e) => {
  if (e.target.closest('#menu a')) closeMenu();
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.tagName === 'FORM' || btn.tagName === 'INPUT') return;
  const act = btn.dataset.act;
  const stepEl = btn.closest('[data-step]');
  const step = stepEl ? STEPS[+stepEl.dataset.step] : null;
  const g = btn.dataset.g;
  const i = +btn.dataset.i;
  const redraw = () => { scheduleSave(); rerender(() => renderStep(STEPS.indexOf(step))); };

  switch (act) {
    case 'chip': {
      const grp = groupsOf(step).find((x) => x.id === g);
      const s = grp.suggestions[+btn.dataset.si];
      const arr = getArr(step, g);
      if (step.type === 'list') {
        const at = arr.indexOf(s);
        if (at >= 0) arr.splice(at, 1);
        else arr.push(s);
      } else {
        const sf = grp.suggestField || step.suggestField;
        const at = typeof s === 'string'
          ? arr.findIndex((r) => r[sf] === s)
          : arr.findIndex((r) => r.nom === s.nom && r.tel === s.tel);
        if (at >= 0) arr.splice(at, 1);
        else arr.push(typeof s === 'string' ? { [sf]: s } : { ...s });
      }
      redraw();
      break;
    }
    case 'del': {
      const arr = getArr(step, g);
      const v = arr[i];
      const nonEmpty = typeof v === 'string' ? v.trim() : Object.values(v || {}).some((x) => x && String(x).trim());
      arr.splice(i, 1);
      redraw();
      if (nonEmpty) toast('Ligne supprimée.');
      break;
    }
    case 'up': case 'down': {
      const arr = getArr(step, g);
      const j = act === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      scheduleSave();
      rerender(() => renderStep(STEPS.indexOf(step)));
      const target = app.querySelector(`[data-fk="${act}:${g}:${j}"]`) || app.querySelector(`[data-fk="${act === 'up' ? 'down' : 'up'}:${g}:${j}"]`);
      target?.focus({ preventScroll: true });
      break;
    }
    case 'contacts': await pickContacts(step, g); break;
    case 'tb-record': {
      const blob = await recordVoice();
      if (blob) await addToolboxBlob('voix', blob, 'Mon message');
      break;
    }
    case 'tb-up': case 'tb-down': {
      const arr = toolbox();
      const j = act === 'tb-up' ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      scheduleSave();
      rerender(() => renderToolbox(location.hash.endsWith('/etape')));
      (app.querySelector(`[data-fk="${act}:${j}"]`) || app.querySelector(`[data-fk="tb:${j}"]`))?.focus({ preventScroll: true });
      break;
    }
    case 'tb-del': {
      const it = toolbox()[i];
      if (!(await modal({ title: 'Retirer de ma boîte à outils ?', body: `<p>« ${esc(it.title || KINDS[it.kind].label)} » sera supprimé de ce téléphone.</p>`, ok: 'Supprimer', danger: true }))) return;
      toolbox().splice(i, 1);
      if (it.file) { await media.remove(it.file).catch(() => {}); const u = mediaURLs.get(it.file); if (u) URL.revokeObjectURL(u); mediaURLs.delete(it.file); }
      scheduleSave();
      rerender(() => renderToolbox(location.hash.endsWith('/etape')));
      break;
    }
    case 'empty': {
      getArr(step, g).push({});
      redraw();
      const arr = getArr(step, g);
      const first = (step.fields || [])[0];
      if (first) app.querySelector(`[data-fk="rf:${g}:${arr.length - 1}:${first.key}"]`)?.focus();
      break;
    }
    case 'examples': {
      const key = step.id + ':' + g;
      if (openExamples.has(key)) openExamples.delete(key); else openExamples.add(key);
      rerender(() => renderStep(STEPS.indexOf(step)));
      break;
    }
    case 'sign': {
      const r = getArr(step)[i];
      const who = [r.nom, r.role].filter(Boolean).join(' — ') || 'Signataire';
      const img = await signaturePad(who);
      if (img) { r.sig = img; r.signedAt = new Date().toISOString(); scheduleSave(false); rerender(() => renderStep(STEPS.indexOf(step))); toast('Signature enregistrée.'); }
      break;
    }
    case 'unsign': {
      const r = getArr(step)[i];
      delete r.sig; delete r.signedAt;
      scheduleSave(false); rerender(() => renderStep(STEPS.indexOf(step)));
      break;
    }
    case 'today':
      plan.data.signature ??= {};
      plan.data.signature.date = new Date().toISOString().slice(0, 10);
      redraw();
      break;
    case 'me': {
      const id = plan.data.coordonnees || {};
      getArr(step).push({ nom: [id.prenom, id.nom].filter(Boolean).join(' ') || 'Moi-même', role: 'Usager·ère' });
      redraw();
      break;
    }
    case 'partners': {
      const arr = getArr(step);
      for (const p of (plan.data.partenaires || []).filter((r) => r.nom || r.role)) {
        if (!arr.some((r) => r.nom === p.nom && r.role === p.role)) arr.push({ nom: p.nom || '', role: p.role || '' });
      }
      redraw();
      break;
    }
    case 'print': window.print(); break;
    case 'pdf-save': pdfSave(); break;
    case 'mes-pdf':
      try {
        const file = await makePlanPdf('');
        download(file, file.name);
        toast('PDF téléchargé : je peux maintenant l’ajouter dans Mon Espace Santé.');
      } catch { toast('Impossible de créer le PDF sur cet appareil.'); }
      break;
    case 'card-img':
      try { download(await toJpeg(renderCrisisCard(carte())), 'carte-de-crise.jpg'); } catch { toast('Impossible de préparer l’image.'); }
      break;
    case 'card-print':
      try { download(await crisisCardPdf(await toJpeg(renderCrisisCard(carte()))), 'carte-de-crise.pdf'); } catch { toast('Impossible de préparer le PDF.'); }
      break;
    case 'pdf-send': pdfSend(); break;
    case 'share-text': shareText(); break;
    case 'export': {
      const files = [];
      for (const id of usedMediaIds()) {
        try { const b = await media.get(id); if (b) files.push({ id, data: await media.blobToDataURL(b) }); } catch { /* ignoré */ }
      }
      const blob = new Blob([JSON.stringify({ app: 'mon-pcc', exported: new Date().toISOString(), plan, media: files })], { type: 'application/json' });
      download(blob, 'sauvegarde-mon-pcc-' + new Date().toISOString().slice(0, 10) + '.json');
      break;
    }
    case 'wipe':
      if (await modal({ title: 'Tout effacer ?', body: '<p>Mon plan sera supprimé définitivement de ce téléphone. Pensez à exporter une sauvegarde si vous souhaitez le garder.</p>', ok: 'Tout effacer', danger: true })) {
        store.wipe();
        await media.clear();
        forgetMediaURLs();
        plan = store.emptyPlan();
        toast('Données effacées.');
        location.hash = '#/';
        route();
      }
      break;
    case 'unprotect':
      {
        const files = await media.loadAll().catch(() => []);
        await store.unprotect(plan);
        await media.saveAll(files);
      }
      toast('Code retiré.');
      renderSettings();
      break;
    case 'lock-now':
      store.lock();
      forgetMediaURLs();
      plan = null;
      locked = true;
      renderLock();
      break;
    case 'forgot':
      if (await modal({ title: 'Code oublié', body: '<p>Sans le code, le plan chiffré ne peut pas être récupéré. Vous pouvez l’effacer pour recommencer, ou réimporter une sauvegarde ensuite.</p>', ok: 'Effacer et recommencer', danger: true })) {
        store.wipe();
        await media.clear();
        plan = store.emptyPlan();
        locked = false;
        location.hash = '#/';
        route();
      }
      break;
    case 'install': {
      const ev = window.__pccInstall;
      if (!ev) { showInstallBanner(true); break; }
      ev.prompt();
      await ev.userChoice.catch(() => null);
      window.__pccInstall = null;
      hideInstallBanner();
      break;
    }
    case 'install-open': closeMenu(); showInstallBanner(true); break;
    case 'ib-later': hideInstallBanner(); if (installPref() !== 'never') setInstallPref(String(Date.now() + 30 * 24 * 3600 * 1000)); break;
    case 'ib-never': hideInstallBanner(); setInstallPref('never'); toast('Le bandeau ne sera plus proposé. Installation possible depuis le menu.'); break;
    case 'share-copy': toast((await copyText(appUrl())) ? 'Lien copié.' : 'Copie impossible sur cet appareil.'); break;
    case 'share-app':
      try { await navigator.share({ title: 'Mon PCC', text: 'Mon PCC : préparer son plan de crise conjoint pas à pas. Gratuit, sans inscription, les réponses restent sur le téléphone.', url: appUrl() }); } catch { /* annulé */ }
      break;
    case 'qr-open': openQrFull(); break;
    case 'qr-close': closeQrFull(); break;
    case 'card-share': {
      const c = await prepareShare();
      const f = new File([c.blob], 'carte-mon-pcc.jpg', { type: 'image/jpeg' });
      try { await navigator.share({ files: [f], title: 'Mon PCC', text: 'Mon PCC : préparer son plan de crise conjoint pas à pas. ' + c.url }); } catch (err) { if (err?.name !== 'AbortError') download(c.blob, 'carte-mon-pcc.jpg'); }
      break;
    }
    case 'card-download': try { download((await prepareShare()).blob, 'carte-mon-pcc.jpg'); } catch { toast('Impossible de préparer la carte.'); } break;
    case 'sheet-download':
      try {
        const c = await prepareShare();
        download(await buildSheetPdf(c.blob, 'Mon PCC - 10 cartes 85 x 55 mm - imprimer à 100 % (taille réelle), puis découper le long des pointillés'), 'planche-cartes-mon-pcc.pdf');
      } catch { toast('Impossible de préparer le PDF.'); }
      break;
    case 'menu': openMenu(); break;
    case 'menu-close': closeMenu(); break;
    default: break;
  }
});

document.addEventListener('change', (e) => {
  if (e.target.dataset?.act === 'ib-toggle') {
    setInstallPref(e.target.checked ? null : 'never');
    toast(e.target.checked ? 'Le bandeau d’installation sera proposé.' : 'Le bandeau ne sera plus proposé.');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#qr-full').hidden) { closeQrFull(); return; }
  if (e.key === 'Escape' && !$('#menu').hidden) closeMenu();
});

window.addEventListener('hashchange', route);
window.addEventListener('pcc-installable', refreshInstallUI);
window.addEventListener('appinstalled', () => { window.__pccInstall = null; hideInstallBanner(); refreshInstallUI(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (store.isProtected() && !locked && hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) {
    store.lock(); forgetMediaURLs(); plan = null; locked = true; renderLock();
  }
});

// Ajuste la hauteur des lignes de texte après chaque affichage
new MutationObserver(() => app.querySelectorAll('textarea.item-input').forEach(autosize))
  .observe(app, { childList: true, subtree: true });

/* ---------- démarrage ---------- */

function start() {
  if (!store.storageAvailable()) {
    app.innerHTML = '<h1>Enregistrement impossible</h1><p class="warn">Ce navigateur bloque l’enregistrement local (navigation privée ?). Ouvrez Mon PCC dans une fenêtre normale pour pouvoir enregistrer votre plan.</p>';
    return;
  }
  const st = store.status();
  if (st === 'locked') locked = true;
  else plan = store.loadPlain() || store.emptyPlan();
  if (plan && !plan.data) plan.data = {};
  saveState.textContent = st === 'none' ? '' : 'Enregistré sur ce téléphone';
  store.requestPersistence();
  if (plan) media.prune(usedMediaIds()).catch(() => {});
  route();
  refreshInstallUI();
  if (env.isMobile && !isStandalone() && bannerAllowed()) setTimeout(() => { if (!isStandalone()) showInstallBanner(); }, 2500);
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

start();
