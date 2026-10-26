/* Mon PCC — application (sans dépendance, sans serveur, sans traceur) */
import { STEPS, PROCESS, SOURCE } from './data.js';
import * as store from './storage.js';
import {
  esc, fmtDate, addMonths, stepIsFilled, progress, documentHTML, planText,
  standaloneHTML, fileBaseName,
} from './export.js';

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const saveState = $('#save-state');

let plan = null;
let locked = false;
let saveTimer = null;
let installEvent = null;
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
        <p class="lead">Préparer mon <strong>plan de crise conjoint</strong>, pas à pas, avec des suggestions à cocher.</p>
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
      ${installCard()}
      ${emergencyNote()}`;
    bindInstall();
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
      <p class="muted">${p.done} étape${p.done > 1 ? 's' : ''} sur ${p.total} complétée${p.done > 1 ? 's' : ''} · modifié le ${fmtDate(plan.updated)}</p>
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
    ${installCard()}
    ${emergencyNote()}`;
  bindInstall();
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
    <button type="button" class="btn btn-secondary btn-sm" data-act="empty" data-g="${g.id}" data-fk="empty:${g.id}">+ Ajouter une ligne</button>
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
    ${modifiedAfterSigning() ? '<div class="warn" role="status"><strong>Le plan a été modifié après les signatures.</strong> Relisez-le ensemble et faites signer à nouveau si le contenu a changé.</div>' : ''}
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
              ? `<img class="sig-img" src="${r.sig}" alt="Signature de ${esc(r.nom || 'ce·tte signataire')}"><p class="muted small">Signé le ${esc(fmtDate(r.signedAt))}</p>
                 <div class="sig-tools"><button type="button" class="btn btn-ghost btn-sm" data-act="sign" data-i="${idx}" data-fk="sign:${idx}">Signer à nouveau</button>
                 <button type="button" class="btn btn-ghost btn-sm" data-act="unsign" data-i="${idx}">Effacer la signature</button></div>`
              : `<button type="button" class="btn btn-primary btn-sm" data-act="sign" data-i="${idx}" data-fk="sign:${idx}">✍ Signer sur l’écran</button>`}
          </div>
        </div><div class="item-tools"><button type="button" class="icon icon-del" data-act="del" data-g="_" data-i="${idx}" aria-label="Supprimer">✕</button></div></li>`).join('')}</ol>` : '<p class="muted empty">Personne pour l’instant.</p>'}
      <button type="button" class="btn btn-secondary btn-sm" data-act="empty" data-g="_">+ Ajouter un·e signataire</button>
    </section>`;
}

function modifiedAfterSigning() {
  const sigs = (plan.data.signature?.signataires || []).filter((r) => r.sig && r.signedAt);
  if (!sigs.length || !plan.contentUpdated) return false;
  const first = sigs.map((r) => r.signedAt).sort()[0];
  return plan.contentUpdated > first;
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

/* ---------- plan complet et partage ---------- */

function renderPlan() {
  const refused = (plan.data.soinsEvites || []).some((r) => r.soin && r.soin.trim());
  const alt = (plan.data.alternatives || []).some((x) => x.trim());
  const canShare = !!navigator.share;
  app.innerHTML = `
    <h1>Mon plan</h1>
    ${refused && !alt ? '<div class="warn" role="status"><strong>À compléter :</strong> j’ai indiqué des soins à éviter sans proposer d’alternative. <a href="#/etape/' + STEPS.findIndex((s) => s.id === 'alternatives') + '">Compléter les alternatives</a></div>' : ''}
    ${modifiedAfterSigning() ? '<div class="warn" role="status"><strong>Le plan a été modifié après les signatures.</strong> <a href="#/etape/' + (STEPS.length - 1) + '">Vérifier les signatures</a></div>' : ''}
    <section class="card actions no-print">
      <h2>Partager mon plan</h2>
      <p class="muted">Rien ne part sans mon accord. Je choisis à qui j’envoie mon plan et par quel moyen.</p>
      <div class="stack">
        <button class="btn btn-primary" data-act="print">Imprimer ou enregistrer en PDF</button>
        <button class="btn btn-secondary" data-act="share-file">${canShare ? 'Envoyer le document' : 'Télécharger le document'}</button>
        <button class="btn btn-secondary" data-act="share-text">${canShare ? 'Envoyer en texte' : 'Copier le texte'}</button>
      </div>
      <p class="muted small">Le PDF permet de recueillir les signatures. Le document s’ouvre sur n’importe quel téléphone ou ordinateur, sans application.</p>
    </section>
    <article class="doc">${documentHTML(plan)}</article>
    <div class="nav-bottom no-print"><a class="btn btn-ghost" href="#/etape/${STEPS.length - 1}">← Modifier</a><a class="btn btn-ghost" href="#/">Accueil</a></div>`;
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

async function shareFile() {
  if (!(await confirmShare())) return;
  const name = fileBaseName(plan) + '.html';
  const file = new File([standaloneHTML(plan)], name, { type: 'text/html' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Mon plan de crise conjoint' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  download(file, name);
  toast('Document téléchargé.');
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
      <p class="muted small">Le fichier de sauvegarde n’est pas chiffré : je le garde en lieu sûr.</p>
    </section>
    <section class="card">
      <h2>Installer l’application</h2>
      ${installEvent ? '<button class="btn btn-primary" data-act="install">Installer Mon PCC</button>' : ''}
      <p><strong>Android (Chrome) :</strong> menu ⋮ puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p>
      <p><strong>iPhone (Safari) :</strong> bouton Partager puis « Sur l’écran d’accueil ».</p>
      <p class="muted small">Une fois installée, l’application fonctionne même sans connexion.</p>
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
      <p>Code source libre : voir le dépôt GitHub du projet (fichiers LICENSE).</p>
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

function installCard() {
  if (!installEvent) return '';
  return `<section class="card card-soft install"><h2>Installer sur mon téléphone</h2><p>Pour retrouver Mon PCC comme une application, même sans connexion.</p><button class="btn btn-secondary" data-act="install">Installer</button></section>`;
}
function bindInstall() { /* délégation globale */ }

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
  } else if (act === 'unlock') {
    const err = form.querySelector('.error');
    try {
      plan = await store.unlock(form.code.value);
      locked = false;
      route();
    } catch {
      err.textContent = 'Code incorrect.';
      err.hidden = false;
    }
  } else if (act === 'protect') {
    if (form.c1.value !== form.c2.value) return toast('Les deux codes ne sont pas identiques.');
    await store.protect(plan, form.c1.value);
    toast('Protection activée.');
    renderSettings();
  }
});

app.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.act !== 'import' || !el.files[0]) return;
  try {
    const obj = JSON.parse(await el.files[0].text());
    if (!obj || obj.app !== 'mon-pcc' || typeof obj.plan?.data !== 'object') throw new Error();
    if (hasData() && !(await modal({ title: 'Remplacer mon plan ?', body: '<p>Le plan actuellement enregistré sur ce téléphone sera remplacé par la sauvegarde.</p>', ok: 'Remplacer', danger: true }))) return;
    plan = obj.plan;
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
    case 'share-file': shareFile(); break;
    case 'share-text': shareText(); break;
    case 'export': {
      const blob = new Blob([JSON.stringify({ app: 'mon-pcc', exported: new Date().toISOString(), plan }, null, 2)], { type: 'application/json' });
      download(blob, 'sauvegarde-mon-pcc-' + new Date().toISOString().slice(0, 10) + '.json');
      break;
    }
    case 'wipe':
      if (await modal({ title: 'Tout effacer ?', body: '<p>Mon plan sera supprimé définitivement de ce téléphone. Pensez à exporter une sauvegarde si vous souhaitez le garder.</p>', ok: 'Tout effacer', danger: true })) {
        store.wipe();
        plan = store.emptyPlan();
        toast('Données effacées.');
        location.hash = '#/';
        route();
      }
      break;
    case 'unprotect':
      await store.unprotect(plan);
      toast('Code retiré.');
      renderSettings();
      break;
    case 'lock-now':
      store.lock();
      plan = null;
      locked = true;
      renderLock();
      break;
    case 'forgot':
      if (await modal({ title: 'Code oublié', body: '<p>Sans le code, le plan chiffré ne peut pas être récupéré. Vous pouvez l’effacer pour recommencer, ou réimporter une sauvegarde ensuite.</p>', ok: 'Effacer et recommencer', danger: true })) {
        store.wipe();
        plan = store.emptyPlan();
        locked = false;
        location.hash = '#/';
        route();
      }
      break;
    case 'install':
      if (installEvent) {
        installEvent.prompt();
        await installEvent.userChoice;
        installEvent = null;
        route();
      }
      break;
    case 'menu': openMenu(); break;
    case 'menu-close': closeMenu(); break;
    default: break;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#menu').hidden) closeMenu();
});

window.addEventListener('hashchange', route);
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; });
window.addEventListener('appinstalled', () => { installEvent = null; });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (store.isProtected() && !locked && hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) {
    store.lock(); plan = null; locked = true; renderLock();
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
  route();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

start();
