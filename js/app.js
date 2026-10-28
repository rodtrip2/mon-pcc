/* Mon PCC — application (sans dépendance, sans serveur, sans traceur) */
import { tr, L, LANG, COUNTRY, LANGS, COUNTRY_CODES, initLocale, setLangPref, setCountryPref, langPref, countryPref, deviceLang, deviceCountry, plural } from './i18n.js';
import { STEPS, PROCESS, SOURCE, VERSION, VERSIONS, setVersion, hiddenSteps } from './data.js';
import * as store from './storage.js';
import * as media from './media.js';
import { appUrl, displayUrl, makeQr, qrSvg, renderCard, canvasToJpeg, buildSheetPdf, renderPoster, posterPdf } from './share.js';
import {
  esc, fmtDate, addMonths, stepIsFilled, stepContent, progress, documentHTML, planText,
  fileBaseName, sigValid, lastUpdate, fmtDateTime,
} from './export.js';
import { buildPlanPdf } from './planpdf.js';
import { buildSummaryPdf } from './summary.js';
import { COUNTRIES, countryData } from './resources.js';
import { parseEmbed, fetchTitle } from './embed.js';
import { exercises, exerciseById, exerciseUrl, offlineStatus, prepareOffline } from './exercises.js';
import { renderCrisisCard, toJpeg, crisisCardPdf } from './crisiscard.js';
import { ttsReady, ttsAvailable, speak, stopSpeaking, dictationPref, setDictationPref, dictationSupported, localCheckSupported, localStatus, dictationOn, dictateInto } from './voice.js';

initLocale();

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const saveState = $('#save-state');

let plan = null;
let locked = false;
let saveTimer = null;
let hiddenAt = 0;
const openExamples = new Set(); // groupes dont les exemples sont affichés
const editing = new Set(); // listes en mode modification (sinon affichage compact)
const editKey = (step, g) => step.id + ':' + g.id;

/** Pays choisi pour les ressources d'aide */
const country = () => countryData(COUNTRY);
const isFrance = () => COUNTRY === 'FR';
const savedLabel = () => tr('Enregistré sur ce téléphone', 'Saved on this phone');

function editToggleHTML(key, label = tr('Modifier', 'Edit')) {
  const on = editing.has(key);
  return on
    ? `<span class="editing-tag" data-edit-key="${esc(key)}">✏️ ${tr('En modification', 'Editing')}</span>`
    : `<button type="button" class="icon edit-btn" data-act="edit-toggle" data-key="${esc(key)}" data-fk="edit:${esc(key)}" aria-label="${esc(label)}" title="${esc(label)}">✏️</button>`;
}

const telLink = (t) => (t && /^[\d +().-]{2,}$/.test(t) ? `<a class="call" href="tel:${esc(t.replace(/[^\d+]/g, ''))}">☎ ${esc(t)}</a>` : esc(t || ''));

/** Résumé lisible d'une fiche (mode affichage) */
function recordSummaryHTML(step, r) {
  if (step.id === 'soinsEvites') {
    return `<span class="rv-main">${esc(r.soin || '')}</span>${r.raison ? `<span class="rv-sub">${tr('parce que :', 'because:')} ${esc(r.raison)}</span>` : ''}`;
  }
  if (step.labelled) {
    return step.fields.filter((f) => (r[f.key] || '').trim()).map((f) => `<span class="rv-sub"><strong>${esc(f.label)}</strong> ${esc(r[f.key])}</span>`).join('');
  }
  const [first, ...rest] = step.fields;
  const main = (r[first.key] || '').trim();
  const others = rest.filter((f) => (r[f.key] || '').trim()).map((f) => (f.type === 'tel' ? telLink(r[f.key]) : esc(r[f.key])));
  return `<span class="rv-main">${esc(main) || `<span class="muted">${tr('à compléter', 'to complete')}</span>`}</span>${others.length ? `<span class="rv-sub">${others.join(' · ')}</span>` : ''}`;
}
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
  saveState.textContent = tr('Enregistrement…', 'Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await store.save(plan);
      syncCrisisSnapshot();
      saveState.textContent = savedLabel();
    } catch {
      saveState.textContent = tr('Échec de l’enregistrement', 'Could not save');
      toast(tr('Impossible d’enregistrer : la mémoire du navigateur est peut-être pleine ou bloquée.', 'Could not save: the browser’s storage may be full or blocked.'));
    }
  }, 350);
}

function modal({ title, body, ok = tr('Continuer', 'Continue'), cancel = tr('Annuler', 'Cancel'), danger = false }) {
  return new Promise((resolve) => {
    const d = $('#modal');
    d.innerHTML = `<form method="dialog" class="modal-inner">
      <h2>${esc(title)}</h2><div class="modal-body">${body}</div>
      <div class="modal-actions">
        ${cancel ? `<button value="cancel" class="btn btn-ghost">${esc(cancel)}</button>` : ''}
        <button value="ok" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(ok)}</button>
      </div></form>`;
    d.returnValue = '';
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

/** Applique la version du plan (adulte / ado) à toute l'application, dans la langue courante */
function applyVersion() {
  setVersion(plan?.data?.version || 'adulte');
}
const isAdo = () => VERSION === 'ado';
const versionLabel = (v = VERSION) => (v === 'ado' ? tr('version ado', 'teen version') : tr('version adulte', 'adult version'));

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

/** Exemples d'un groupe ; services de garde : ceux du pays choisi */
function groupSuggestions(g) {
  if (!g.countrySuggestions) return g.suggestions || [];
  return country().garde.map((x) => ({ nom: L(x.nom), lien: L(x.lien), tel: x.tel }));
}

/* ---------- routage ---------- */

function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [page, arg] = h.split('/');
  if (locked) {
    if (page === 'crise' && crisisSnapshot()) { closeMenu(); renderCrisis(); window.scrollTo(0, 0); return; }
    return renderLock();
  }
  document.body.dataset.page = page || 'accueil';
  closeMenu();
  if (!$('#exercise').hidden) closeExercise();
  stopSpeaking();
  switch (page) {
    case '': case 'accueil': renderHome(); break;
    case 'demarche': renderProcess(); break;
    case 'etape': renderStep(Math.max(0, Math.min(STEPS.length - 1, parseInt(arg, 10) || 0))); break;
    case 'plan': renderPlan(); break;
    case 'reglages':
      renderSettings();
      if (arg) setTimeout(() => $('#' + CSS.escape(arg))?.scrollIntoView({ block: 'start' }), 0);
      break;
    case 'partager': renderShare(); break;
    case 'mon-espace-sante': renderMES(); break;
    case 'ressources': renderResources(); break;
    case 'boite-outils': renderToolbox(arg === 'etape'); break;
    case 'crise': renderCrisis(); break;
    case 'versions': renderVersions(arg); break;
    case 'entretien': renderTalk(); break;
    case 'professionnels': renderPros(); break;
    case 'apropos': renderAbout(); break;
    case 'confidentialite': renderPrivacy(); break;
    default: renderHome();
  }
  if (!rerender.active) window.scrollTo(0, 0);
  const h1 = app.querySelector('h1');
  if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
}

/* ---------- écrans ---------- */

/** Texte avec les numéros (et liens) du pays transformés en liens */
function linkify(text, tels = [], links = {}) {
  const parts = [...tels].sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const keys = Object.keys(links).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const all = [...keys, ...parts];
  if (!all.length) return esc(text);
  const re = new RegExp(`(?<![\\d])(${all.join('|')})(?![\\d])`, 'g');
  let out = ''; let last = 0;
  for (const m of text.matchAll(re)) {
    out += esc(text.slice(last, m.index));
    const v = m[0];
    out += links[v] ? `<a href="${esc(links[v])}" target="_blank" rel="noopener noreferrer">${esc(v)}</a>` : `<a href="tel:${esc(v.replace(/[^\d+]/g, ''))}">${esc(v)}</a>`;
    last = m.index + v.length;
  }
  return out + esc(text.slice(last));
}

function emergencyNote() {
  const e = country().emergency;
  return `<aside class="emergency" aria-label="${tr('Urgence', 'Emergency')}">
    <strong>${tr('Besoin d’aide maintenant ?', 'Need help now?')}</strong>
    ${linkify(L(e.text), e.tels, e.links)}
    <a class="res-link" href="#/ressources">${tr('Toutes les ressources d’aide →', 'All help resources →')}</a>
  </aside>`;
}

function renderHome() {
  if (!hasData()) {
    app.innerHTML = `
      <section class="hero">
        <div class="hero-logo" aria-hidden="true">${logoSVG()}</div>
        <h1>Mon PCC</h1>
        <p class="lead">${tr('Préparer mon <strong>plan de crise conjoint</strong>, pas à pas, avec mes propres mots.', 'Prepare my <strong>joint crisis plan</strong>, step by step, in my own words.')}</p>
        <div class="start-choice">
          <button type="button" class="btn btn-primary btn-lg" data-act="start" data-v="adulte">${tr('Commencer — version adulte', 'Start — adult version')}</button>
          <button type="button" class="btn btn-secondary btn-lg" data-act="start" data-v="ado">${tr('Commencer — version ado', 'Start — teen version')}</button>
        </div>
        <p class="muted small">${tr('La version ado est adaptée aux adolescent·es. Je pourrai changer de version à tout moment, sans perdre mes réponses.', 'The teen version is adapted for teenagers. I can switch versions at any time without losing my answers.')}</p>
      </section>
      <section class="card">
        <h2>${tr('Le plan de crise conjoint, c’est quoi ?', 'What is a joint crisis plan?')}</h2>
        <p>${tr('Un document que je construis <strong>avec un·e professionnel·le</strong> qui m’accompagne, et avec mes proches si je le souhaite. Il décrit ce qui peut me mettre en crise, comment le repérer, ce qui m’aide et qui prévenir. Dans la version adulte, il précise aussi les soins que je souhaite recevoir ou éviter.', 'A document I build <strong>with a professional</strong> who supports me, and with people close to me if I wish. It describes what can trigger a crisis, how to spot it, what helps me and who to contact. In the adult version, it also sets out the care I want to receive or avoid.')}</p>
        <p>${tr('Il sert à prévenir les crises et, si elles arrivent, à ce que mes choix soient connus et respectés.', 'It helps prevent crises and, if they happen, makes sure my choices are known and respected.')}</p>
      </section>
      <section class="card card-soft">
        <h2>${tr('Mes réponses restent chez moi', 'My answers stay with me')}</h2>
        <p>${tr('Pas de compte, pas de serveur, pas de publicité. Ce que j’écris est enregistré uniquement sur ce téléphone. C’est moi qui décide de l’envoyer, et à qui.', 'No account, no server, no ads. What I write is saved only on this phone. I decide whether to send it, and to whom.')}</p>
        <p><a href="#/confidentialite">${tr('En savoir plus sur la confidentialité', 'More about privacy')}</a></p>
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
    review = `<p class="review ${late ? 'late' : ''}">${late ? tr('Il est temps de relire mon plan', 'It’s time to review my plan') : tr('Prochaine relecture conseillée', 'Next suggested review')}${tr(' :', ':')} <strong>${fmtDate(due)}</strong>
      <br>${plan.data.rappel?.date ? `<span class="small">📅 ${tr('Rappel prévu le', 'Reminder set for')} ${fmtDate(plan.data.rappel.date)} · </span>` : ''}<button type="button" class="link small" data-act="review-ics">${plan.data.rappel?.date ? tr('modifier', 'change') : `📅 ${tr('Ajouter un rappel à mon agenda', 'Add a reminder to my calendar')}`}</button></p>`;
  }
  const vl = versionLabel();
  app.innerHTML = `
    <h1 class="sr-only">${tr('Accueil', 'Home')}</h1>
    ${crisisButtonHTML()}
    <section class="card progress-card">
      <h2>${tr('Mon plan de crise conjoint', 'My joint crisis plan')}</h2>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}" aria-label="${tr('Étapes complétées', 'Steps completed')}"><span style="width:${(p.done / p.total) * 100}%"></span></div>
      <p class="muted">${tr(`${p.done} étape${p.done > 1 ? 's' : ''} sur ${p.total} complétée${p.done > 1 ? 's' : ''} · modifié le ${fmtDate(lastUpdate(plan))}`, `${p.done} of ${p.total} steps completed · updated ${fmtDate(lastUpdate(plan))}`)}</p>
      <p class="version-line small">${isAdo() ? '🧑‍🎓' : '🧑'} ${esc(vl[0].toUpperCase() + vl.slice(1))} · <a href="#/reglages/version">${tr('changer', 'change')}</a></p>
      ${review}
      <div class="stack">
        ${next >= 0 ? `<a class="btn btn-primary" href="#/etape/${next}">${tr('Continuer :', 'Continue:')} ${esc(STEPS[next].short)}</a>` : ''}
        <a class="btn ${next >= 0 ? 'btn-secondary' : 'btn-primary'}" href="#/plan">${tr('Voir, imprimer ou envoyer mon plan', 'View, print or send my plan')}</a>
      </div>
    </section>
    <section class="card">
      <h2>${tr('Les étapes', 'The steps')}</h2>
      ${stepsListHTML()}
    </section>
    <p class="center"><a href="#/demarche">${tr('Revoir la démarche', 'Review how it works')}</a></p>
    ${emergencyNote()}
    ${toolboxHomeHTML()}`;
}

function stepsListHTML() {
  return `<ol class="steps-list">${STEPS.map((s, i) => `
    <li><a href="#/etape/${i}" class="${stepIsFilled(s, plan.data) ? 'done' : ''}">
      <span class="dot" aria-hidden="true">${stepIsFilled(s, plan.data) ? '✓' : i + 1}</span>
      <span>${esc(s.title)}</span>
      <span class="sr-only">${stepIsFilled(s, plan.data) ? tr('(complétée)', '(completed)') : tr('(à faire)', '(to do)')}</span>
    </a></li>`).join('')}</ol>`;
}

function renderProcess() {
  app.innerHTML = `
    <h1>${tr('Comment se déroule la démarche', 'How it works')}</h1>
    <p class="lead">${tr('Le plan de crise conjoint est une démarche <strong>volontaire</strong>, qui se construit en plusieurs temps.', 'The joint crisis plan is a <strong>voluntary</strong> process, built in several stages.')}</p>
    <p class="version-line small">${isAdo() ? '🧑‍🎓' : '🧑'} ${tr('Je remplis la', 'I am filling in the')} <strong>${versionLabel()}</strong>${isAdo() ? tr(' (en phase de test sur le site officiel)', ' (test phase on the official website; unofficial English translation)') : ''} · <a href="#/reglages/version">${tr('changer de version', 'change version')}</a></p>
    <ol class="process">${PROCESS.map((s) => `<li><h2>${esc(s.t)}</h2><p>${esc(s.d)}</p></li>`).join('')}</ol>
    <section class="card card-soft">
      <h2>${tr('Comment utiliser Mon PCC', 'How to use Mon PCC')}</h2>
      <ul>
        <li>${tr('Chaque étape reprend une question du plan de crise conjoint officiel.', 'Each step follows a question from the official joint crisis plan.')}</li>
        <li>${tr('Je commence par <strong>écrire avec mes mots</strong>. Si je manque d’idées, le bouton <strong>« Exemples »</strong> propose des formulations que je peux ajouter puis reformuler.', 'I start by <strong>writing in my own words</strong>. If I run out of ideas, the <strong>“Examples”</strong> button suggests wordings that I can add and then rephrase.')}</li>
        <li>${tr('Chaque ligne reste modifiable.', 'Every line can still be edited.')}</li>
        <li>${tr('À la fin, chaque signataire peut <strong>signer avec le doigt</strong> sur le téléphone, ou à la main sur la version imprimée.', 'At the end, each signatory can <strong>sign with a finger</strong> on the phone, or by hand on the printed copy.')}</li>
        <li>${tr('Rien n’est obligatoire, vous pouvez sauter une étape et y revenir.', 'Nothing is compulsory: you can skip a step and come back to it.')}</li>
        <li>${tr('Tout est enregistré automatiquement sur ce téléphone.', 'Everything is saved automatically on this phone.')}</li>
      </ul>
    </section>
    <div class="nav-bottom"><a class="btn btn-ghost" href="#/">${tr('Retour', 'Back')}</a><a class="btn btn-primary" href="#/etape/0">${tr('C’est parti', 'Let’s start')}</a></div>`;
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
        <strong>${empty ? tr('À compléter :', 'To complete:') : tr('Rappel :', 'Reminder:')}</strong> ${tr('j’ai indiqué des soins à éviter. Pour chacun, je propose une alternative.', 'I have listed care I want to avoid. For each one, I suggest an alternative.')}
        <ul>${refused.map((r) => `<li>${esc(r.soin)}</li>`).join('')}</ul></div>`;
    }
  }
  const qLabel = isAdo() && LANG === 'en' ? 'JCP question (unofficial translation)' : tr('Question du PCC', 'JCP question');

  app.innerHTML = `
    <div class="step-top">
      <p class="step-count">${tr(`Étape ${i + 1} sur ${STEPS.length}`, `Step ${i + 1} of ${STEPS.length}`)}</p>
      <div class="bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
    </div>
    <h1>${esc(step.title)}</h1>
    ${easyOn() && step.easy
      ? `<blockquote class="question q-easy"><span class="q-label">${tr('En facile à lire', 'Easy read')}</span>${esc(step.easy.q)}${speakBtnHTML()}</blockquote>
    <details class="official"><summary>${qLabel}</summary><p>${esc(step.question)}</p></details>`
      : `<blockquote class="question"><span class="q-label">${qLabel}</span>${esc(step.question)}${speakBtnHTML()}</blockquote>`}
    <details class="tip"><summary>${tr('Conseil', 'Tip')}</summary><p>${esc(easyOn() && step.easy ? step.easy.tip : step.tip)}</p></details>
    ${talkNoteHTML(step)}
    ${warn}
    <div class="step-body" data-step="${i}">${body}</div>
    <div class="nav-bottom">
      ${i > 0 ? `<a class="btn btn-ghost" href="#/etape/${i - 1}">${tr('← Précédent', '← Previous')}</a>` : `<a class="btn btn-ghost" href="#/demarche">${tr('← Démarche', '← How it works')}</a>`}
      ${i < STEPS.length - 1 ? `<a class="btn btn-primary" href="#/etape/${i + 1}">${tr('Suivant →', 'Next →')}</a>` : `<a class="btn btn-primary" href="#/plan">${tr('Voir mon plan →', 'See my plan →')}</a>`}
    </div>`;
  revealSpeak();
}

function identityHTML() {
  const v = plan.data.coordonnees || {};
  const f = (k, label, type = 'text', extra = '') => `
    <label class="field"><span>${label}</span>
      <input type="${type}" data-k="${k}" data-fk="id:${k}" value="${esc(v[k] || '')}" ${extra}></label>`;
  return `<div class="card form-grid">
    ${f('prenom', tr('Prénom', 'First name'), 'text', 'autocomplete="given-name"')}
    ${f('nom', tr('Nom', 'Last name'), 'text', 'autocomplete="family-name"')}
    ${f('naissance', tr('Date de naissance', 'Date of birth'), 'date', 'autocomplete="bday"')}
    ${f('tel', tr('Téléphone', 'Phone'), 'tel', 'autocomplete="tel" inputmode="tel"')}
    <label class="field field-wide"><span>${tr('Adresse', 'Address')}</span>
      <textarea rows="2" data-k="adresse" data-fk="id:adresse" autocomplete="street-address">${esc(v.adresse || '')}</textarea></label>
  </div>`;
}

function chipLabel(s) {
  return typeof s === 'string' ? s : s.nom;
}

function suggestionsHTML(step, g, isOn) {
  const list = groupSuggestions(g);
  if (!list.length) return '';
  const key = step.id + ':' + g.id;
  const open = openExamples.has(key);
  return `<div class="sugg">
    <button type="button" class="btn btn-ghost btn-sm ex-btn" data-act="examples" data-g="${g.id}" data-fk="ex:${g.id}" aria-expanded="${open}">${open ? tr('Masquer les exemples', 'Hide examples') : tr('Exemples', 'Examples')}</button>
    ${open ? `<p class="muted small">${tr('Si un exemple me correspond, je le touche pour l’ajouter, puis je peux le reformuler avec mes mots. Je le touche à nouveau pour le retirer.', 'If an example fits me, I tap it to add it, then I can rephrase it in my own words. I tap it again to remove it.')}</p>
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
      <textarea rows="1" class="item-input" aria-label="${esc(g.label || step.title)}, ${tr('ligne', 'line')} ${idx + 1}" data-g="${g.id}" data-i="${idx}" data-fk="it:${g.id}:${idx}">${esc(t)}</textarea>
      <div class="item-tools">
        ${step.ordered ? `<button type="button" class="icon" data-act="up" data-g="${g.id}" data-i="${idx}" data-fk="up:${g.id}:${idx}" aria-label="${tr('Monter', 'Move up')}" ${idx === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="icon" data-act="down" data-g="${g.id}" data-i="${idx}" data-fk="down:${g.id}:${idx}" aria-label="${tr('Descendre', 'Move down')}" ${idx === arr.length - 1 ? 'disabled' : ''}>↓</button>` : ''}
        <button type="button" class="icon icon-del" data-act="del" data-g="${g.id}" data-i="${idx}" aria-label="${tr('Supprimer', 'Delete')}">✕</button>
      </div>
    </li>`).join('');
  return `<section class="group card">
    ${g.label ? `<h2>${esc(g.label)}</h2>` : ''}
    ${arr.length ? `<div class="kept-head"><p class="kept-label">${tr('Ce que je retiens', 'What I keep')}${step.ordered ? ` <span class="muted">${tr('(par ordre de priorité)', '(in order of priority)')}</span>` : ''}</p>${editToggleHTML(editKey(step, g))}</div>
      ${editing.has(editKey(step, g))
        ? `<ol class="items ${step.ordered ? 'ordered' : ''}">${items}</ol>`
        : `<${step.ordered ? 'ol' : 'ul'} class="view-list ${step.ordered ? 'ordered' : ''}">${arr.map((t) => `<li>${esc(t)}</li>`).join('')}</${step.ordered ? 'ol' : 'ul'}>`}` : ''}
    <form class="free" data-act="free" data-g="${g.id}">
      <label class="sr-only" for="free-${g.id}">${tr('Écrire avec mes mots', 'Write in my own words')}</label>
      <input id="free-${g.id}" data-fk="free:${g.id}" placeholder="${tr('Écrire avec mes mots…', 'Write in my own words…')}" autocomplete="off">
      ${micBtnHTML(`free-${g.id}`)}
      <button class="btn btn-secondary btn-sm">${tr('Ajouter', 'Add')}</button>
    </form>
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
        ${r.tel && /^[\d +().-]{2,}$/.test(r.tel) ? `<a class="call" href="tel:${esc(r.tel.replace(/[^\d+]/g, ''))}">${tr('Appeler', 'Call')} ${esc(r.tel)}</a>` : ''}
      </div>
      <div class="item-tools">
        ${step.ordered ? `<button type="button" class="icon" data-act="up" data-g="${g.id}" data-i="${idx}" data-fk="up:${g.id}:${idx}" aria-label="${tr('Monter', 'Move up')}" ${idx === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="icon" data-act="down" data-g="${g.id}" data-i="${idx}" data-fk="down:${g.id}:${idx}" aria-label="${tr('Descendre', 'Move down')}" ${idx === arr.length - 1 ? 'disabled' : ''}>↓</button>` : ''}
        <button type="button" class="icon icon-del" data-act="del" data-g="${g.id}" data-i="${idx}" aria-label="${tr('Supprimer', 'Delete')}">✕</button>
      </div>
    </li>`).join('');
  return `<section class="group card">
    ${g.label ? `<h2>${esc(g.label)}</h2>` : ''}
    ${arr.length ? `<div class="kept-head"><p class="kept-label">${step.ordered ? tr('Par ordre de priorité', 'In order of priority') : tr('Ce que je retiens', 'What I keep')}</p>${editToggleHTML(editKey(step, g))}</div>
      ${editing.has(editKey(step, g))
        ? `<ol class="records">${cards}</ol>`
        : `<${step.ordered ? 'ol' : 'ul'} class="view-list view-records ${step.ordered ? 'ordered' : ''}">${arr.map((r) => `<li>${recordSummaryHTML(step, r)}</li>`).join('')}</${step.ordered ? 'ol' : 'ul'}>`}` : ''}
    <div class="row-btns">
      <button type="button" class="btn btn-secondary btn-sm" data-act="empty" data-g="${g.id}" data-fk="empty:${g.id}">${tr('+ Ajouter une ligne', '+ Add a line')}</button>
      ${contactsEnabled(step, g) ? `<button type="button" class="btn btn-secondary btn-sm" data-act="contacts" data-g="${g.id}" data-fk="contacts:${g.id}">${tr('👤 Choisir dans mes contacts', '👤 Choose from my contacts')}</button>` : ''}
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
      <label class="field"><span>${tr('Lieu', 'Place')}</span><input data-k="lieu" data-fk="fin:lieu" value="${esc(v.lieu || '')}" placeholder="${tr('Ex. : CMP, à domicile…', 'E.g. clinic, at home…')}"></label>
      <label class="field"><span>${tr('Date', 'Date')}</span><input type="date" data-k="date" data-fk="fin:date" value="${esc(v.date || '')}"></label>
      <button type="button" class="btn btn-ghost btn-sm" data-act="today">${tr('Mettre la date du jour', 'Use today’s date')}</button>
      ${v.date ? `<p class="small field-wide">${tr('Relecture conseillée le', 'Suggested review on')} <strong>${fmtDate(addMonths(v.date, 6))}</strong> · <button type="button" class="link small" data-act="review-ics">📅 ${plan.data.rappel?.date ? tr(`Rappel prévu le ${fmtDate(plan.data.rappel.date)} (modifier)`, `Reminder set for ${fmtDate(plan.data.rappel.date)} (change)`) : tr('Ajouter un rappel à mon agenda', 'Add a reminder to my calendar')}</button></p>` : ''}
    </section>
    ${modifiedAfterSigning() ? `<div class="warn" role="status"><strong>${tr(`Le plan a été modifié le ${esc(fmtDateTime(lastUpdate(plan)))}, après certaines signatures.`, `The plan was changed on ${esc(fmtDateTime(lastUpdate(plan)))}, after some signatures.`)}</strong> ${tr('Ces signatures ne figurent plus sur l’impression ni sur le PDF : relisez le plan ensemble puis signez à nouveau.', 'These signatures no longer appear on the printout or the PDF: read the plan through together, then sign again.')}${(plan.data.versions || []).length ? ` <a href="#/versions">${tr('Voir ce qui a changé', 'See what changed')}</a>` : ''}</div>` : ''}
    <section class="group card">
      <h2>${tr('Signataires', 'Signatories')}</h2>
      <p class="muted small">${tr('Chacun·e peut signer avec le doigt directement sur ce téléphone, ou à la main sur le document imprimé.', 'Everyone can sign with a finger directly on this phone, or by hand on the printed copy.')}</p>
      <div class="chips">
        <button type="button" class="chip" data-act="me" data-fk="me">${tr('+ Moi-même', '+ Me')}</button>
        ${partners.length ? `<button type="button" class="chip" data-act="partners" data-fk="partners">${tr('+ Mes partenaires', '+ My partners')} (${partners.length})</button>` : ''}
      </div>
      ${arr.length ? `<ol class="records">${arr.map((r, idx) => `
        <li class="record"><div class="record-fields">
          ${step.fields.map((f) => `<label class="field"><span>${esc(f.label)}</span><input data-g="_" data-i="${idx}" data-f="${f.key}" data-fk="rf:_:${idx}:${f.key}" value="${esc(r[f.key] || '')}" placeholder="${esc(f.placeholder)}"></label>`).join('')}
          <div class="sig-area">
            ${r.sig
              ? `<img class="sig-img${sigValid(r, plan) ? '' : ' stale'}" src="${r.sig}" alt="${tr('Signature de', 'Signature of')} ${esc(r.nom || tr('ce·tte signataire', 'this signatory'))}"><p class="muted small">${tr('Signé le', 'Signed on')} ${esc(fmtDateTime(r.signedAt))}</p>
                 ${sigValid(r, plan) ? '' : `<p class="sig-stale">${tr('⚠ Signature antérieure à la dernière modification du plan : elle n’apparaîtra pas sur l’impression ni sur le PDF. À signer à nouveau.', '⚠ This signature is older than the latest change to the plan: it will not appear on the printout or the PDF. Please sign again.')}</p>`}
                 <div class="sig-tools"><button type="button" class="btn btn-ghost btn-sm" data-act="sign" data-i="${idx}" data-fk="sign:${idx}">${tr('Signer à nouveau', 'Sign again')}</button>
                 <button type="button" class="btn btn-ghost btn-sm" data-act="unsign" data-i="${idx}">${tr('Effacer la signature', 'Clear signature')}</button></div>`
              : `<button type="button" class="btn btn-primary btn-sm" data-act="sign" data-i="${idx}" data-fk="sign:${idx}">${tr('✍ Signer sur l’écran', '✍ Sign on screen')}</button>`}
          </div>
        </div><div class="item-tools"><button type="button" class="icon icon-del" data-act="del" data-g="_" data-i="${idx}" aria-label="${tr('Supprimer', 'Delete')}">✕</button></div></li>`).join('')}</ol>` : `<p class="muted empty">${tr('Personne pour l’instant.', 'No one yet.')}</p>`}
      <button type="button" class="btn btn-secondary btn-sm" data-act="empty" data-g="_">${tr('+ Ajouter un·e signataire', '+ Add a signatory')}</button>
    </section>
    ${(plan.data.versions || []).length ? `<p class="center"><a class="btn btn-ghost btn-sm" href="#/versions">🔄 ${tr('Versions signées et changements', 'Signed versions and changes')} (${plan.data.versions.length})</a></p>` : ''}`;
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
      <p class="muted small">${tr('Signez avec le doigt dans le cadre. Tournez le téléphone pour plus de place.', 'Sign with your finger inside the box. Turn the phone sideways for more space.')}</p>
      <div class="sig-canvas-wrap"><canvas aria-label="${tr('Zone de signature', 'Signature area')}"></canvas><span class="sig-base" aria-hidden="true">✕</span></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-sig="clear">${tr('Effacer', 'Clear')}</button>
        <button type="button" class="btn btn-ghost" data-sig="cancel">${tr('Annuler', 'Cancel')}</button>
        <button type="button" class="btn btn-primary" data-sig="ok">${tr('Valider la signature', 'Confirm signature')}</button>
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
        if (!inked) { toast(tr('La zone de signature est vide.', 'The signature area is empty.')); return; }
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

/* ---------- écran « Ça ne va pas » (à utiliser en crise) ---------- */

const CRISIS_OPEN = 'monpcc.crisisOpen'; // '1' : accessible sans le code (choix de la personne)
const CRISIS_SNAP = 'monpcc.crisisSnap'; // copie non chiffrée des seuls éléments de cet écran
const crisisOpenPref = () => { try { return localStorage.getItem(CRISIS_OPEN) === '1'; } catch { return false; } };

/** Éléments de l'écran de crise (jamais les photos, vidéos ou sons) */
function crisisSubset(d) {
  const keep = ['citation', 'lien', 'exercice'];
  return {
    version: d.version, strategies: d.strategies, aide: d.aide, information: d.information,
    boiteOutils: (d.boiteOutils || []).filter((it) => keep.includes(it.kind))
      .map(({ kind, text, author, url, title, ex }) => ({ kind, text, author, url, title, ex })),
  };
}
function clearCrisisSnapshot() { try { localStorage.removeItem(CRISIS_SNAP); } catch { /* ignoré */ } }
/** Copie lisible sans code : seulement si le plan est protégé ET si la personne l'a choisi */
function syncCrisisSnapshot() {
  try {
    if (plan && store.isProtected() && crisisOpenPref()) localStorage.setItem(CRISIS_SNAP, JSON.stringify(crisisSubset(plan.data)));
    else if (!crisisOpenPref() || !store.isProtected()) localStorage.removeItem(CRISIS_SNAP);
  } catch { /* ignoré */ }
}
function crisisSnapshot() {
  if (!crisisOpenPref()) return null;
  try { return JSON.parse(localStorage.getItem(CRISIS_SNAP) || 'null'); } catch { return null; }
}

function crisisButtonHTML() {
  return `<a class="btn btn-crisis" href="#/crise"><span aria-hidden="true">💛</span> ${tr('Ça ne va pas', 'I’m not OK')}</a>`;
}

const telFrom = (t) => { const m = String(t || '').match(/(\+?\d[\d .()-]{1,}\d)/); return m ? m[1] : ''; };

function renderCrisis() {
  const limited = !plan;
  const d = limited ? crisisSnapshot() : plan.data;
  if (!d) { location.hash = '#/'; return; }
  document.body.dataset.page = 'crise';
  const ado = d.version === 'ado';
  const strat = d.strategies || {};
  const groups = [
    ['moi', tr('Ce que je fais moi-même', 'What I do myself')],
    ['entourage', tr('Avec mon entourage', 'With the people around me')],
    ['pros', tr('Avec des professionnel·les', 'With professionals')],
  ].map(([k, label]) => [label, (strat[k] || []).filter((x) => x && x.trim())]).filter(([, l]) => l.length);

  // Personnes à appeler, dans l'ordre du plan
  let people = [];
  if (ado) {
    people = (d.information || []).filter((r) => r.qui).map((r) => ({ nom: r.qui, lien: r.parQui ? `${tr('prévenu·e par', 'told by')} ${r.parQui}` : '', tel: telFrom(r.comment), note: r.comment }));
  } else {
    const a = d.aide || {};
    people = ['proches', 'pros', 'garde'].flatMap((k) => (a[k] || []).filter((r) => r.nom || r.tel));
  }
  const tb = (d.boiteOutils || []);
  const tbHTML = limited
    ? tb.map((it) => {
      if (it.kind === 'citation') return `<blockquote class="tbv tbv-quote"><p>${tr('« ', '“')}${esc(it.text || '')}${tr(' »', '”')}</p>${it.author ? `<cite>— ${esc(it.author)}</cite>` : ''}</blockquote>`;
      if (it.kind === 'exercice') { const e = exerciseById(it.ex); return e ? `<button type="button" class="tbv tbv-exercise" data-act="exercise-open" data-ex="${esc(e.id)}"><span class="tbx-ico" aria-hidden="true">${e.icon}</span><span class="tbv-col"><span class="tbv-title">${esc(e.name)}</span><span class="tbx-dur">⏱ ${esc(e.duration)}</span></span><span class="tbx-play" aria-hidden="true">▶</span></button>` : ''; }
      if (it.kind === 'lien') return `<a class="tbv tbv-link" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer"><span class="tbv-ico" aria-hidden="true">🔗</span><span class="tbv-col"><span class="tbv-title">${esc(it.title || it.url)}</span></span></a>`;
      return '';
    }).map((h) => (h ? `<div class="tbv-cell size-m">${h}</div>` : '')).join('')
    : '';

  app.innerHTML = `
    <h1 class="crisis-title">💛 ${tr('Ça ne va pas', 'I’m not OK')}</h1>
    <p class="lead">${tr('Je respire. Voici ce qui peut m’aider, dans l’ordre que j’ai choisi quand j’allais mieux.', 'I breathe. Here is what can help me, in the order I chose when I was feeling better.')}</p>
    ${groups.length ? `<section class="card crisis-sec"><h2>${tr('Ce que je peux faire', 'What I can do')}</h2>
      ${groups.map(([label, list]) => `<h3>${esc(label)}</h3><ol class="crisis-list">${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`).join('')}</section>` : ''}
    ${people.length ? `<section class="card crisis-sec"><h2>${tr('Qui je peux appeler', 'Who I can call')}</h2>
      <ul class="crisis-people">${people.map((r) => `<li><span class="cp-who"><strong>${esc(r.nom || '')}</strong>${r.lien ? ` <span class="muted small">${esc(r.lien)}</span>` : ''}</span>
        ${r.tel && /\d/.test(r.tel) ? `<a class="btn btn-primary btn-sm" href="tel:${esc(r.tel.replace(/[^\d+]/g, ''))}">☎ ${esc(r.tel)}</a>` : (r.note ? `<span class="small">${esc(r.note)}</span>` : '')}</li>`).join('')}</ul></section>` : ''}
    ${tb.length ? `<section class="crisis-sec crisis-tb"><h2>🧰 ${tr('Ma boîte à outils', 'My toolbox')}</h2>
      ${limited ? `<div class="tbv-grid">${tbHTML}</div><p class="muted small">${tr('Photos, vidéos et sons : ils s’affichent après avoir saisi mon code.', 'Photos, videos and sounds appear once I enter my code.')}</p>` : toolboxGridHTML(toolbox())}</section>` : ''}
    ${!groups.length && !people.length && !tb.length ? `<p class="card">${tr('Mon plan ne contient pas encore de stratégies ni de personnes à appeler. Les numéros ci-dessous peuvent m’aider tout de suite.', 'My plan doesn’t contain any strategies or people to call yet. The numbers below can help right away.')}</p>` : ''}
    ${emergencyNote()}
    <div class="nav-bottom">${limited ? `<a class="btn btn-ghost" href="#/">${tr('← Saisir mon code', '← Enter my code')}</a>` : `<a class="btn btn-ghost" href="#/">${tr('← Accueil', '← Home')}</a><a class="btn btn-ghost" href="#/plan">${tr('Mon plan complet', 'My full plan')}</a>`}</div>`;
  if (!limited) fillMedia();
}

/* ---------- boîte à outils (photos, vidéos, sons, liens) ---------- */

const KINDS = {
  photo: { icon: '📷', label: () => tr('Photo', 'Photo'), accept: 'image/*' },
  video: { icon: '🎬', label: () => tr('Vidéo', 'Video'), accept: 'video/*' },
  audio: { icon: '🎵', label: () => tr('Son ou musique', 'Sound or music'), accept: 'audio/*' },
  voix: { icon: '🎙', label: () => tr('Message vocal', 'Voice message') },
  lien: { icon: '🔗', label: () => tr('Lien', 'Link') },
  citation: { icon: '❝', label: () => tr('Citation', 'Quote') },
  album: { icon: '🖼', label: () => tr('Album photo', 'Photo album') },
  exercice: { icon: '🧘', label: () => tr('Exercice', 'Exercise') },
};
const SIZES = () => [['s', tr('Petit', 'Small')], ['m', tr('Moyen', 'Medium')], ['l', tr('Grand', 'Large')]];
const dossiers = () => (plan.data.dossiers ??= []);
const openFolders = new Set(); // dossiers dépliés (session)

/* Exemples de citations (affichés seulement sur demande) :
   phrases-repères rédigées pour Mon PCC et extraits d'auteurs
   (traductions reformulées). La « prière de la sérénité », souvent attribuée
   à Marc Aurèle, est du théologien Reinhold Niebuhr (années 1930-1940).
   En anglais : texte d'origine pour les auteurs anglophones. */
const QUOTES_ALL = [
  { fr: { text: 'Cette vague passera, comme les autres sont passées.' }, en: { text: 'This wave will pass, like the others have.' } },
  { fr: { text: 'J’ai déjà traversé des moments difficiles. Je peux traverser celui-ci.' }, en: { text: 'I have got through hard times before. I can get through this one.' } },
  { fr: { text: 'Je n’ai pas à tout régler aujourd’hui. Juste le prochain pas.' }, en: { text: 'I don’t have to fix everything today. Just the next step.' } },
  { fr: { text: 'Ce que je ressens est réel, et ça ne durera pas toujours.' }, en: { text: 'What I feel is real, and it won’t last forever.' } },
  { fr: { text: 'Demander de l’aide, c’est prendre soin de moi.' }, en: { text: 'Asking for help is taking care of myself.' } },
  { fr: { text: 'Je suis plus que ce moment difficile.' }, en: { text: 'I am more than this difficult moment.' } },
  { fr: { text: 'Une respiration à la fois.' }, en: { text: 'One breath at a time.' } },
  { fr: { text: 'Je fais de mon mieux, et c’est suffisant pour aujourd’hui.' }, en: { text: 'I am doing my best, and that is enough for today.' } },
  { fr: { text: 'Mes émotions sont des visiteuses : elles viennent, puis elles repartent.' }, en: { text: 'My emotions are visitors: they come, and then they go.' } },
  { fr: { text: 'Je ne suis pas seul·e.' }, en: { text: 'I am not alone.' } },
  { fr: { text: 'Prendre soin de moi n’est pas égoïste.' }, en: { text: 'Taking care of myself is not selfish.' } },
  { fr: { text: 'Les mauvais jours ne font pas une mauvaise vie.' }, en: { text: 'Bad days don’t make a bad life.' } },
  { fr: { text: 'Je me parle comme je parlerais à quelqu’un que j’aime.' }, en: { text: 'I speak to myself the way I would speak to someone I love.' } },
  { fr: { text: 'J’ai le droit de ralentir.' }, en: { text: 'I am allowed to slow down.' } },
  { fr: { text: 'Parmi les choses, les unes dépendent de nous, les autres n’en dépendent pas.', author: 'Épictète, Manuel' }, en: { text: 'Some things are within our power, and some are not.', author: 'Epictetus, Enchiridion' } },
  { fr: { text: 'Ce ne sont pas les choses qui nous troublent, mais les jugements que nous portons sur elles.', author: 'Épictète, Manuel' }, en: { text: 'It is not things that disturb us, but our judgements about them.', author: 'Epictetus, Enchiridion' } },
  { fr: { text: 'Nous souffrons plus souvent en imagination que dans la réalité.', author: 'Sénèque, Lettres à Lucilius' }, en: { text: 'We suffer more often in imagination than in reality.', author: 'Seneca, Letters to Lucilius' } },
  { fr: { text: 'Que la force me soit donnée d’accepter ce qui ne peut être changé, le courage de changer ce qui peut l’être, et surtout la sagesse de distinguer l’un de l’autre.', author: 'Prière de la sérénité, Reinhold Niebuhr' }, en: { text: 'Grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference.', author: 'Serenity Prayer, Reinhold Niebuhr' } },
  { fr: { text: 'Ce n’est pas parce que les choses sont difficiles que nous n’osons pas, c’est parce que nous n’osons pas qu’elles sont difficiles.', author: 'Sénèque, Lettres à Lucilius' }, en: { text: 'It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.', author: 'Seneca, Letters to Lucilius' } },
  { fr: { text: 'Nulle part on ne trouve de retraite plus paisible qu’en son âme.', author: 'Marc Aurèle, Pensées' }, en: { text: 'Nowhere can one find a quieter retreat than in one’s own soul.', author: 'Marcus Aurelius, Meditations' } },
  { fr: { text: 'L’âme prend la couleur de ses pensées.', author: 'Marc Aurèle, Pensées' }, en: { text: 'The soul takes on the colour of its thoughts.', author: 'Marcus Aurelius, Meditations' } },
  { fr: { text: 'Qui craint de souffrir souffre déjà de ce qu’il craint.', author: 'Montaigne, Essais' }, en: { text: 'Whoever fears suffering already suffers from what they fear.', author: 'Montaigne, Essays' } },
  { fr: { text: 'Un voyage de mille lieues commence par un pas.', author: 'Lao Tseu, Tao Te King' }, en: { text: 'A journey of a thousand miles begins with a single step.', author: 'Lao Tzu, Tao Te Ching' } },
  { fr: { text: 'L’espoir est cette chose à plumes qui se pose dans l’âme.', author: 'Emily Dickinson' }, en: { text: '“Hope” is the thing with feathers that perches in the soul.', author: 'Emily Dickinson' } },
  { fr: { text: 'Laisse tout t’arriver, la beauté comme l’effroi. Avance simplement : aucun sentiment n’est définitif.', author: 'Rainer Maria Rilke, Le Livre d’heures' }, en: { text: 'Let everything happen to you, beauty and terror alike. Just keep going: no feeling is final.', author: 'Rainer Maria Rilke, The Book of Hours' } },
];
const quotes = () => QUOTES_ALL.map((q) => q[LANG] || q.fr);

/** Libellé court d'un élément de la boîte à outils */
function tbLabel(it) {
  if (it.kind === 'citation') {
    const t = (it.text || '').trim();
    return t ? tr('« ', '“') + (t.length > 40 ? t.slice(0, 38) + '…' : t) + tr(' »', '”') : tr('Citation', 'Quote');
  }
  if (it.kind === 'exercice') return exerciseById(it.ex)?.name || tr('Exercice', 'Exercise');
  if (it.kind === 'album') { const n = (it.photos || []).length; return it.title || `${tr('Album', 'Album')} (${n} photo${n > 1 ? 's' : ''})`; }
  return it.title || KINDS[it.kind].label();
}
const mediaURLs = new Map(); // id -> URL d'affichage (session)
const embedLoaded = new Set(); // liens dont le lecteur intégré a été ouvert (session)
const EMBED_OK = 'monpcc.embedOk';

function embedPlayerHTML(e, title) {
  const box = e.ratio ? `style="aspect-ratio:${e.ratio.toFixed(4)}"` : `style="height:${e.height}px"`;
  if (e.media === 'video') return `<div class="embed-box" ${box}><video src="${esc(e.src)}" controls playsinline preload="metadata"></video></div>`;
  if (e.media === 'audio') return `<audio class="tb-audio" src="${esc(e.src)}" controls preload="metadata"></audio>`;
  return `<div class="embed-box" ${box}><iframe src="${esc(e.src)}" title="${esc(title || e.provider)}" loading="lazy"
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write" allowfullscreen
    referrerpolicy="${e.referrer || 'strict-origin-when-cross-origin'}"></iframe></div>`;
}

async function confirmEmbed(provider) {
  try { if (localStorage.getItem(EMBED_OK)) return true; } catch { /* stockage indisponible */ }
  let remember = false;
  const ok = await modal({
    title: tr(`Lire ici depuis ${provider} ?`, `Play here from ${provider}?`),
    body: `<p>${tr(`Pour lire ce contenu dans Mon PCC, mon téléphone va se connecter à <strong>${esc(provider)}</strong>. Ce site recevra mon adresse IP et saura ce que je regarde ou j’écoute, comme si j’ouvrais le lien.`, `To play this content in Mon PCC, my phone will connect to <strong>${esc(provider)}</strong>. That site will receive my IP address and know what I watch or listen to, as if I opened the link.`)}</p>
      <p class="small muted">${tr('Mon plan, lui, n’est jamais transmis.', 'My plan itself is never sent.')}</p>
      <label class="check"><input type="checkbox" id="embed-remember"> ${tr('Ne plus me demander sur cet appareil', 'Don’t ask me again on this device')}</label>`,
    ok: tr('Lire ici', 'Play here'),
  });
  remember = !!document.getElementById('embed-remember')?.checked;
  if (ok && remember) { try { localStorage.setItem(EMBED_OK, '1'); } catch { /* ignoré */ } }
  return ok;
}
const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
const toolbox = () => (plan.data.boiteOutils ??= []);

function toolboxHomeHTML() {
  return `<section class="card home-tb">${toolboxTeaserHTML('#/boite-outils')}</section>`;
}

function toolboxTeaserHTML(href = '#/boite-outils/etape') {
  const items = plan.data.boiteOutils || [];
  const n = items.length;
  return `<div class="tb-teaser">
    <h3>🧰 ${tr('Ma boîte à outils', 'My toolbox')}</h3>
    <p class="muted small">${tr('J’y range ce qui m’aide à aller mieux : une photo qui m’apaise, une musique, une vidéo, un message que je me suis enregistré, une citation, un lien…', 'I keep what helps me feel better here: a photo that calms me, music, a video, a message I recorded for myself, a quote, a link…')}</p>
    ${n ? `<p class="small"><strong>${n} ${tr(plural(n, 'élément', 'éléments'), plural(n, 'item', 'items'))}</strong>${tr(' :', ':')} ${items.slice(0, 4).map((it) => esc(KINDS[it.kind].icon + ' ' + tbLabel(it))).join(' · ')}${n > 4 ? '…' : ''}</p>` : ''}
    <a class="btn btn-secondary btn-sm" href="${href}">${n ? tr('Ouvrir ma boîte à outils', 'Open my toolbox') : tr('Créer ma boîte à outils', 'Create my toolbox')}</a>
  </div>`;
}

function renderToolbox(fromStep) {
  const items = toolbox();
  const stepIdx = STEPS.findIndex((x) => x.id === 'strategies');
  app.innerHTML = `
    <h1>🧰 ${tr('Ma boîte à outils', 'My toolbox')}</h1>
    <p class="lead">${tr('Ce qui m’aide quand ça ne va pas : une photo qui m’apaise, une musique, une vidéo, un message vocal que je me suis enregistré quand j’allais bien, une citation, un lien utile…', 'What helps me when things are hard: a photo that calms me, music, a video, a voice message I recorded when I was feeling well, a quote, a useful link…')}</p>
    ${items.length ? `<div class="kept-head"><h2 class="tb-mine">${tr('Mes éléments', 'My items')}</h2>${editToggleHTML('toolbox', tr('Modifier mes éléments', 'Edit my items'))}</div>
      ${editing.has('toolbox') ? `${foldersBarHTML()}<ol class="tb-list">${items.map((it, idx) => toolboxItemHTML(it, idx, items.length)).join('')}</ol>` : toolboxGridHTML(items)}` : `<p class="muted empty center">${tr('Ma boîte à outils est vide pour l’instant.', 'My toolbox is empty for now.')}</p>`}
    <section class="card tb-add">
      <h2>${tr('Ajouter', 'Add')}</h2>
      <div class="tb-add-grid">
        ${['photo', 'video', 'audio'].map((k) => `<label class="btn btn-secondary tb-add-btn"><span aria-hidden="true">${KINDS[k].icon}</span> ${KINDS[k].label()}<input type="file" accept="${KINDS[k].accept}" data-act="tb-file" data-kind="${k}" hidden></label>`).join('')}
        <label class="btn btn-secondary tb-add-btn"><span aria-hidden="true">🖼</span> ${tr('Album photo', 'Photo album')}<input type="file" accept="image/*" multiple data-act="tb-album-new" hidden></label>
        <button type="button" class="btn btn-secondary tb-add-btn" data-act="tb-link-new"><span aria-hidden="true">🔗</span> ${tr('Lien', 'Link')}</button>
        <button type="button" class="btn btn-secondary tb-add-btn" data-act="tb-quote-new"><span aria-hidden="true">❝</span> ${tr('Citation', 'Quote')}</button>
        <button type="button" class="btn btn-secondary tb-add-btn" data-act="tb-exercises"><span aria-hidden="true">🧘</span> ${tr('Exercice', 'Exercise')}</button>
        ${canRecord() ? `<button type="button" class="btn btn-secondary tb-add-btn" data-act="tb-record"><span aria-hidden="true">🎙</span> ${tr('M’enregistrer', 'Record myself')}</button>
        <button type="button" class="btn btn-secondary tb-add-btn" data-act="tb-video"><span aria-hidden="true">🎥</span> ${tr('Me filmer', 'Film myself')}</button>` : ''}
      </div>
      <p class="muted small">${tr('Tout reste sur ce téléphone', 'Everything stays on this phone')}${store.isProtected() ? tr(', chiffré avec mon code', ', encrypted with my code') : ''}. ${tr('Dans le plan imprimé ou envoyé, seuls les titres, les liens et les citations apparaissent, jamais les photos, vidéos ou sons.', 'In the printed or sent plan, only titles, links and quotes appear, never photos, videos or sounds.')}</p>
    </section>
    <div class="nav-bottom">
      ${fromStep ? `<a class="btn btn-ghost" href="#/etape/${stepIdx}">${tr(`← Retour à l’étape ${stepIdx + 1}`, `← Back to step ${stepIdx + 1}`)}</a>` : `<a class="btn btn-ghost" href="#/">${tr('← Accueil', '← Home')}</a>`}
    </div>`;
  fillMedia();
}

/** Grille d'affichage : éléments hors dossier, puis un bloc repliable par dossier */
function toolboxGridHTML(items) {
  const cell = (it) => `<div class="tbv-cell size-${it.size || 'm'}">${toolboxViewHTML(it, items.indexOf(it))}</div>`;
  const loose = items.filter((it) => !it.folder || !dossiers().some((d) => d.id === it.folder));
  let h = loose.length ? `<div class="tbv-grid">${loose.map(cell).join('')}</div>` : '';
  for (const d of dossiers()) {
    const inside = items.filter((it) => it.folder === d.id);
    h += `<details class="tb-folder" data-folder="${esc(d.id)}" ${openFolders.has(d.id) ? 'open' : ''}>
      <summary><span class="tbf-ico" aria-hidden="true">📁</span><span class="tbf-name">${esc(d.name)}</span><span class="tbf-count">${inside.length}</span></summary>
      ${inside.length ? `<div class="tbv-grid">${inside.map(cell).join('')}</div>` : `<p class="muted small empty">${tr('Dossier vide. Je range des éléments ici avec ✏️.', 'Empty folder. I can put items here with ✏️.')}</p>`}
    </details>`;
  }
  return h;
}

/** Barre de gestion des dossiers (mode modification) */
function foldersBarHTML() {
  return `<div class="tb-folders-bar">
    <p class="kept-label">📁 ${tr('Mes dossiers', 'My folders')}</p>
    <div class="chips">${dossiers().map((d) => `<span class="chip folder-chip">${esc(d.name)}
      <button type="button" class="chip-x" data-act="folder-rename" data-id="${esc(d.id)}" aria-label="${tr('Renommer', 'Rename')} ${esc(d.name)}">✎</button>
      <button type="button" class="chip-x" data-act="folder-del" data-id="${esc(d.id)}" aria-label="${tr('Supprimer', 'Delete')} ${esc(d.name)}">✕</button></span>`).join('')}
      <button type="button" class="chip" data-act="folder-new" data-fk="folder-new">＋ ${tr('Nouveau dossier', 'New folder')}</button></div>
  </div>`;
}

/** Affichage compact d'un élément (hors mode modification) */
function toolboxViewHTML(it, idx) {
  const title = it.title ? `<p class="tbv-title" data-title-for="${idx}">${esc(it.title)}</p>` : `<p class="tbv-title" data-title-for="${idx}" hidden></p>`;
  if (it.kind === 'citation') {
    return `<blockquote class="tbv tbv-quote"><p>${tr('« ', '“')}${esc(it.text || '')}${tr(' »', '”')}</p>${it.author ? `<cite>— ${esc(it.author)}</cite>` : ''}</blockquote>`;
  }
  if (it.kind === 'exercice') {
    const e = exerciseById(it.ex);
    if (!e) return '';
    return `<button type="button" class="tbv tbv-exercise" data-act="exercise-open" data-ex="${esc(e.id)}">
      <span class="tbx-ico" aria-hidden="true">${e.icon}</span>
      <span class="tbv-col"><span class="tbv-title">${esc(e.name)}</span><span class="tbx-desc">${esc(e.desc)}</span><span class="tbx-dur">⏱ ${esc(e.duration)}</span></span>
      <span class="tbx-play" aria-hidden="true">▶</span></button>`;
  }
  if (it.kind === 'album') {
    const ph = it.photos || [];
    const max = it.size === 's' ? 4 : 6;
    return `<div class="tbv tbv-album">
      <p class="tbv-title">🖼 ${esc(tbLabel(it))}</p>
      <div class="album-grid n${Math.min(ph.length, max)}">${ph.slice(0, max).map((p, k) => `<button type="button" class="album-th" data-act="lightbox" data-i="${idx}" data-k="${k}" aria-label="${tr(`Voir la photo ${k + 1} sur ${ph.length}`, `View photo ${k + 1} of ${ph.length}`)}">
        <img data-media="${esc(p.file)}" alt="">${k === max - 1 && ph.length > max ? `<span class="album-more">+${ph.length - max}</span>` : ''}</button>`).join('')}</div>
    </div>`;
  }
  if (it.kind === 'photo') {
    return `<figure class="tbv tbv-photo"><button type="button" class="photo-open" data-act="lightbox" data-i="${idx}" data-k="0" aria-label="${tr('Agrandir la photo', 'Enlarge photo')}"><img data-media="${esc(it.file)}" alt="${esc(it.title || 'Photo')}"></button>${it.title ? `<figcaption>${esc(it.title)}</figcaption>` : ''}</figure>`;
  }
  if (it.kind === 'video') {
    return `<figure class="tbv tbv-video"><video data-media="${esc(it.file)}" controls playsinline preload="metadata"></video>${it.title ? `<figcaption>${esc(it.title)}</figcaption>` : ''}</figure>`;
  }
  if (it.kind === 'audio' || it.kind === 'voix') {
    return `<div class="tbv tbv-audio"><span class="tbv-ico" aria-hidden="true">${KINDS[it.kind].icon}</span><div class="tbv-col">
      <p class="tbv-title">${esc(it.title || KINDS[it.kind].label())}</p><audio data-media="${esc(it.file)}" controls preload="metadata"></audio></div></div>`;
  }
  if (it.kind === 'lien') {
    let host = '';
    try { host = new URL(it.url).hostname.replace(/^www\./, ''); } catch { /* lien invalide */ }
    const e = parseEmbed(it.url);
    if (!e) {
      return `<a class="tbv tbv-link" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer"><span class="tbv-ico" aria-hidden="true">🔗</span>
        <span class="tbv-col"><span class="tbv-title">${esc(it.title || host || tr('Lien', 'Link'))}</span><span class="muted small">${esc(host)} ↗</span></span></a>`;
    }
    const inner = embedLoaded.has(it.url)
      ? embedPlayerHTML(e, it.title)
      : `<button type="button" class="embed-ph compact" data-act="tb-embed" data-i="${idx}"><span class="embed-play" aria-hidden="true">▶</span>
          <span class="embed-lbl">${esc(it.title || tr('Lire ici', 'Play here'))}</span><span class="embed-sub">${esc(e.provider)} · ${tr('se connecte à ce site', 'connects to this site')}</span></button>`;
    return `<div class="tbv tbv-embed">${it.title && embedLoaded.has(it.url) ? title : ''}<div class="tb-body">${inner}</div></div>`;
  }
  return '';
}

/** Réglages communs en mode modification : taille et dossier */
function itemControlsHTML(it, idx) {
  return `<div class="tb-ctrl">
    <div class="seg" role="group" aria-label="${tr('Taille d’affichage', 'Display size')}">${SIZES().map(([v, l]) => `<button type="button" class="seg-btn" data-act="tb-size" data-i="${idx}" data-s="${v}" aria-pressed="${(it.size || 'm') === v}">${l}</button>`).join('')}</div>
    <label class="tb-folder-sel"><span class="sr-only">${tr('Dossier', 'Folder')}</span><select data-act="tb-folder" data-i="${idx}">
      <option value="">📂 ${tr('Hors dossier', 'No folder')}</option>
      ${dossiers().map((d) => `<option value="${esc(d.id)}" ${it.folder === d.id ? 'selected' : ''}>📁 ${esc(d.name)}</option>`).join('')}
      <option value="__new">＋ ${tr('Nouveau dossier…', 'New folder…')}</option>
    </select></label>
  </div>`;
}

function itemToolsHTML(idx, n, delLabel = tr('Supprimer', 'Delete')) {
  return `<div class="tb-tools">
      <button type="button" class="icon" data-act="tb-up" data-i="${idx}" data-fk="tb-up:${idx}" aria-label="${tr('Monter', 'Move up')}" ${idx === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="icon" data-act="tb-down" data-i="${idx}" data-fk="tb-down:${idx}" aria-label="${tr('Descendre', 'Move down')}" ${idx === n - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="icon icon-del" data-act="tb-del" data-i="${idx}" aria-label="${esc(delLabel)}">✕</button>
    </div>`;
}

function toolboxItemHTML(it, idx, n) {
  const k = KINDS[it.kind];
  let body = '';
  if (it.kind === 'album') {
    const others = toolbox().map((x, j) => [x, j]).filter(([x]) => x.kind === 'photo');
    body = `<div class="album-edit">${(it.photos || []).map((p, j) => `<div class="album-ed-th"><img data-media="${esc(p.file)}" alt="">
        <button type="button" class="chip-x" data-act="album-out" data-i="${idx}" data-k="${j}" aria-label="${tr('Sortir cette photo de l’album', 'Take this photo out of the album')}">⤴</button>
        <button type="button" class="chip-x danger" data-act="album-del" data-i="${idx}" data-k="${j}" aria-label="${tr('Supprimer cette photo', 'Delete this photo')}">✕</button></div>`).join('')}</div>
      <label class="btn btn-secondary btn-sm file-btn">＋ ${tr('Ajouter des photos', 'Add photos')}<input type="file" accept="image/*" multiple data-act="album-add" data-i="${idx}" hidden></label>
      ${others.length ? `<p class="muted small">${tr('Ou y ranger une photo déjà dans ma boîte :', 'Or move in a photo already in my toolbox:')}</p><div class="album-pick">${others.map(([x, j]) => `<button type="button" class="album-pick-th" data-act="album-take" data-i="${idx}" data-j="${j}" aria-label="${tr(`Ajouter ${esc(x.title || 'cette photo')} à l’album`, `Add ${esc(x.title || 'this photo')} to the album`)}"><img data-media="${esc(x.file)}" alt=""><span>＋</span></button>`).join('')}</div>` : ''}`;
  }
  if (it.kind === 'photo') body = `<img class="tb-media" data-media="${esc(it.file)}" alt="${esc(it.title || 'Photo')}">
    <button type="button" class="btn btn-ghost btn-sm" data-act="album-from" data-i="${idx}">🖼 ${tr('Créer un album avec cette photo', 'Make an album with this photo')}</button>`;
  else if (it.kind === 'video') body = `<video class="tb-media" data-media="${esc(it.file)}" controls playsinline preload="metadata"></video>`;
  else if (it.kind === 'audio' || it.kind === 'voix') body = `<audio class="tb-audio" data-media="${esc(it.file)}" controls preload="metadata"></audio>`;
  else if (it.kind === 'lien') {
    let host = '';
    try { host = new URL(it.url).hostname.replace(/^www\./, ''); } catch { /* lien invalide */ }
    const e = parseEmbed(it.url);
    if (e && embedLoaded.has(it.url)) {
      body = `${embedPlayerHTML(e, it.title)}<a class="small tb-open-small" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${tr('Ouvrir sur', 'Open on')} ${esc(e.provider)} ↗</a>`;
    } else if (e) {
      body = `<button type="button" class="embed-ph" data-act="tb-embed" data-i="${idx}" ${e.ratio ? `style="aspect-ratio:${Math.max(e.ratio, 1.4).toFixed(4)}"` : ''}>
          <span class="embed-play" aria-hidden="true">▶</span>
          <span class="embed-lbl">${tr('Lire ici', 'Play here')}</span>
          <span class="embed-sub">${esc(e.provider)} · ${tr('se connecte à ce site', 'connects to this site')}</span>
        </button>
        <a class="small tb-open-small" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${tr('Ouvrir sur', 'Open on')} ${esc(e.provider)} ↗</a>`;
    } else {
      body = `<a class="btn btn-primary btn-sm tb-open" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${tr('Ouvrir', 'Open')} ${esc(host || tr('le lien', 'the link'))} ↗</a>`;
    }
  }
  if (it.kind === 'exercice') {
    const e = exerciseById(it.ex);
    return `<li class="card tb-item">
    <div class="tb-head"><span class="tb-kind" aria-hidden="true">${e?.icon || '🧘'}</span><span class="tb-kind-label">${esc(e?.name || tr('Exercice', 'Exercise'))}</span></div>
    ${itemControlsHTML(it, idx)}
    ${itemToolsHTML(idx, n, tr('Retirer', 'Remove'))}
  </li>`;
  }
  if (it.kind === 'citation') {
    return `<li class="card tb-item tb-citation">
    <div class="tb-head"><span class="tb-kind" aria-hidden="true">${k.icon}</span><span class="tb-kind-label">${tr('Citation', 'Quote')}</span></div>
    <label class="sr-only" for="tb-q-${idx}">${tr('Texte de la citation', 'Quote text')}</label>
    <textarea id="tb-q-${idx}" class="tb-quote-text" rows="2" data-tbf="text" data-i="${idx}" data-fk="tbq:${idx}">${esc(it.text || '')}</textarea>
    <label class="field tb-quote-author"><span>— ${tr('Auteur', 'Author')}</span><input data-tbf="author" data-i="${idx}" data-fk="tba:${idx}" value="${esc(it.author || '')}" placeholder="${tr('facultatif', 'optional')}"></label>
    ${itemControlsHTML(it, idx)}
    ${itemToolsHTML(idx, n)}
  </li>`;
  }
  return `<li class="card tb-item">
    <div class="tb-head">
      <span class="tb-kind" aria-hidden="true">${k.icon}</span>
      <label class="sr-only" for="tb-t-${idx}">${tr('Titre', 'Title')}</label>
      <input id="tb-t-${idx}" class="tb-title" data-tb="${idx}" data-fk="tb:${idx}" value="${esc(it.title || '')}" placeholder="${esc(k.label())} — ${tr('donner un titre…', 'add a title…')}">
    </div>
    <div class="tb-body">${body}</div>
    ${itemControlsHTML(it, idx)}
    ${itemToolsHTML(idx, n)}
  </li>`;
}

async function fillMedia() {
  for (const el of app.querySelectorAll('[data-media]')) {
    const id = el.dataset.media;
    try {
      if (!mediaURLs.has(id)) {
        const blob = await media.get(id);
        if (!blob) { el.replaceWith(Object.assign(document.createElement('p'), { className: 'muted small', textContent: tr('Fichier introuvable sur ce téléphone.', 'File not found on this phone.') })); continue; }
        mediaURLs.set(id, URL.createObjectURL(blob));
      }
      el.src = mediaURLs.get(id);
    } catch {
      el.replaceWith(Object.assign(document.createElement('p'), { className: 'muted small', textContent: tr('Impossible d’afficher ce fichier.', 'This file cannot be displayed.') }));
    }
  }
}

function forgetMediaURLs() {
  for (const u of mediaURLs.values()) URL.revokeObjectURL(u);
  mediaURLs.clear();
}

async function addToolboxBlob(kind, blob, title = '') {
  if (blob.size > media.MAX_BYTES) { toast(tr('Fichier trop volumineux (150 Mo maximum).', 'File too large (150 MB maximum).')); return; }
  try {
    const file = await media.put(blob);
    toolbox().push({ kind, file, title, added: new Date().toISOString() });
    if (!title) editing.add('toolbox'); // pour lui donner un titre
    scheduleSave();
    rerender(() => renderToolbox(location.hash.endsWith('/etape')));
    app.querySelector(`[data-fk="tb:${toolbox().length - 1}"]`)?.focus();
    toast(tr('Ajouté. Je peux lui donner un titre.', 'Added. I can give it a title.'));
  } catch {
    toast(tr('Enregistrement impossible : la mémoire du téléphone est peut-être pleine.', 'Could not save: the phone’s storage may be full.'));
  }
}

/* ---------- exercices de Ma boussole bien-être ---------- */

function exercisePicker() {
  const d = $('#modal');
  const render = () => {
    const have = new Set(toolbox().filter((x) => x.kind === 'exercice').map((x) => x.ex));
    d.innerHTML = `<div class="modal-inner">
      <h2>🧘 ${tr('Exercices', 'Exercises')}</h2>
      <p class="muted small">${tr('Des exercices de <strong>Ma boussole bien-être</strong>, à faire sans quitter Mon PCC. Je touche un exercice pour l’ajouter à ma boîte à outils.', 'Exercises from <strong>Ma boussole bien-être</strong>, to do without leaving Mon PCC. I tap an exercise to add it to my toolbox.')}</p>
      <ul class="ex-pick">${exercises().map((e) => `<li><button type="button" class="ex-row" data-ex="${e.id}" aria-pressed="${have.has(e.id)}">
        <span class="tbx-ico" aria-hidden="true">${e.icon}</span>
        <span class="tbv-col"><span class="tbv-title">${esc(e.name)}</span><span class="tbx-desc">${esc(e.desc)} · ${esc(e.duration)}</span></span>
        <span class="ex-state">${have.has(e.id) ? '✓' : '+'}</span></button></li>`).join('')}</ul>
      <p class="muted small">${tr('Pour les utiliser sans connexion : Réglages › Exercices hors connexion.', 'To use them offline: Settings › Offline exercises.')}</p>
      <div class="modal-actions"><button type="button" class="btn btn-primary" data-x="close">${tr('Terminé', 'Done')}</button></div></div>`;
  };
  return new Promise((resolve) => {
    render();
    d.onclick = (e) => {
      if (e.target.closest('[data-x="close"]')) { d.close(); return; }
      const row = e.target.closest('.ex-row');
      if (!row) return;
      const arr = toolbox();
      const at = arr.findIndex((x) => x.kind === 'exercice' && x.ex === row.dataset.ex);
      if (at >= 0) arr.splice(at, 1);
      else arr.push({ kind: 'exercice', ex: row.dataset.ex, added: new Date().toISOString() });
      scheduleSave();
      const y = d.querySelector('.ex-pick')?.scrollTop;
      render();
      if (y) d.querySelector('.ex-pick').scrollTop = y;
    };
    d.addEventListener('close', () => { d.onclick = null; resolve(); }, { once: true });
    d.showModal();
  });
}

function openExercise(id) {
  const e = exerciseById(id);
  if (!e) return;
  const el = $('#exercise');
  el.innerHTML = `<div class="xp-top"><button type="button" class="btn btn-ghost btn-sm xp-back" data-xp="close">✕ ${tr('Revenir à ma boîte à outils', 'Back to my toolbox')}</button>
      <span class="xp-title">${e.icon} ${esc(e.name)}</span></div>
    <iframe class="xp-frame" src="${esc(exerciseUrl(e))}" title="${esc(e.name)}" allow="autoplay; fullscreen; screen-wake-lock"></iframe>
    <p class="xp-off" hidden>${tr('Cet exercice n’a pas pu s’ouvrir. Sans connexion, il faut d’abord le préparer dans Réglages › Exercices hors connexion.', 'This exercise could not open. To use it offline, first prepare it in Settings › Offline exercises.')}</p>`;
  el.hidden = false;
  document.body.classList.add('no-scroll');
  const frame = el.querySelector('iframe');
  if (!navigator.onLine) offlineStatus().then((st) => { if (!st.sw || !st.pages) el.querySelector('.xp-off').hidden = false; });
  frame.addEventListener('load', () => frame.focus(), { once: true });
  el.querySelector('[data-xp="close"]').focus();
}
function closeExercise() {
  const el = $('#exercise');
  el.hidden = true;
  el.innerHTML = '';
  document.body.classList.remove('no-scroll');
}
document.getElementById('exercise')?.addEventListener('click', (e) => { if (e.target.closest('[data-xp="close"]')) closeExercise(); });

/* ---------- dossiers, albums, visionneuse ---------- */

function promptModal(title, value = '', ok = tr('Valider', 'OK')) {
  return new Promise((resolve) => {
    const d = $('#modal');
    d.innerHTML = `<form method="dialog" class="modal-inner"><h2>${esc(title)}</h2>
      <label class="field"><span>${tr('Nom', 'Name')}</span><input name="v" value="${esc(value)}" maxlength="40" autocomplete="off" required></label>
      <div class="modal-actions"><button value="cancel" class="btn btn-ghost" formnovalidate>${tr('Annuler', 'Cancel')}</button><button value="ok" class="btn btn-primary">${esc(ok)}</button></div></form>`;
    const f = d.querySelector('form');
    d.addEventListener('close', () => resolve(d.returnValue === 'ok' ? f.v.value.trim() : null), { once: true });
    d.returnValue = '';
    d.showModal();
    f.v.focus(); f.v.select();
  });
}

async function newFolder() {
  const name = await promptModal(tr('Nouveau dossier', 'New folder'), '', tr('Créer', 'Create'));
  if (!name) return null;
  const d = { id: media.newId(), name };
  dossiers().push(d);
  openFolders.add(d.id);
  scheduleSave();
  return d;
}

async function putFiles(files) {
  const out = [];
  for (const f of files) {
    if (f.size > media.MAX_BYTES) { toast(tr('Une photo est trop volumineuse (150 Mo maximum).', 'A photo is too large (150 MB maximum).')); continue; }
    out.push({ file: await media.put(f) });
  }
  return out;
}

const tbRedraw = () => rerender(() => renderToolbox(location.hash.endsWith('/etape')));

/** Fenêtre « Ajouter un lien » */
async function linkDialog() {
  const p = modal({
    title: tr('🔗 Ajouter un lien', '🔗 Add a link'),
    body: `<label class="field"><span>${tr('Adresse (vidéo, musique, podcast, site…)', 'Address (video, music, podcast, website…)')}</span>
        <input type="text" id="tb-url" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="https://…" autocomplete="off"></label>
      <p class="muted small">${tr('YouTube, Vimeo, Dailymotion, Spotify, Deezer, SoundCloud, Apple Music et Podcasts, TikTok, Instagram : le contenu pourra être lu directement ici, et son titre est demandé au site lors de l’ajout.', 'YouTube, Vimeo, Dailymotion, Spotify, Deezer, SoundCloud, Apple Music and Podcasts, TikTok, Instagram: the content can be played right here, and its title is requested from the site when it is added.')}</p>
      <p class="error small" id="tb-url-err" hidden>${tr('Ce lien ne semble pas valide.', 'This link doesn’t seem valid.')}</p>`,
    ok: tr('Ajouter le lien', 'Add link'),
  });
  const d = $('#modal');
  const input = $('#tb-url');
  setTimeout(() => input?.focus(), 50);
  // On vérifie le lien avant de fermer
  d.querySelector('button[value="ok"]').addEventListener('click', (ev) => {
    if (!normalizeUrl(input.value)) { ev.preventDefault(); $('#tb-url-err').hidden = false; input.focus(); }
  });
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); d.querySelector('button[value="ok"]').click(); }
  });
  if (!(await p)) return;
  addLink(normalizeUrl(input.value));
}

function normalizeUrl(v) {
  let url = (v || '').trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
    return u.href;
  } catch { return null; }
}

function addLink(href) {
  if (!href) return;
  const item = { kind: 'lien', url: href, title: '', added: new Date().toISOString() };
  toolbox().push(item);
  scheduleSave();
  tbRedraw();
  toast(tr('Lien ajouté.', 'Link added.'));
  const idx = toolbox().length - 1;
  const input = app.querySelector(`[data-fk="tb:${idx}"]`);
  if (parseEmbed(href)) {
    if (input) input.placeholder = tr('Recherche du titre…', 'Looking up the title…');
    fetchTitle(href).then((t) => {
      const el = app.querySelector(`[data-fk="tb:${toolbox().indexOf(item)}"]`);
      if (el) el.placeholder = `${KINDS.lien.label()} — ${tr('donner un titre…', 'add a title…')}`;
      if (t && !item.title) {
        item.title = t;
        if (el && !el.value) el.value = t;
        const v = app.querySelector(`.embed-ph[data-i="${toolbox().indexOf(item)}"] .embed-lbl`);
        if (v) v.textContent = t;
        scheduleSave();
      }
    });
  }
  app.querySelector('.tb-mine')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Fenêtre « Ajouter une citation », avec les exemples à la demande */
async function quoteDialog() {
  const Q = quotes();
  const exLabel = () => tr('Exemples de citations', 'Example quotes');
  const p = modal({
    title: tr('❝ Ajouter une citation', '❝ Add a quote'),
    body: `<label class="field"><span>${tr('Une citation, une phrase qui m’aide', 'A quote, a phrase that helps me')}</span>
        <textarea id="tb-qtext" rows="3" placeholder="${tr('Avec mes mots, ou une phrase que j’aime…', 'In my own words, or a phrase I like…')}"></textarea></label>
      ${micBtnHTML('tb-qtext', 'mic-corner')}
      <label class="field"><span>${tr('Auteur (facultatif)', 'Author (optional)')}</span><input id="tb-qauthor" autocomplete="off" placeholder="${tr('Ex. : ma grand-mère, un livre, une chanson…', 'E.g. my grandmother, a book, a song…')}"></label>
      <p class="error small" id="tb-q-err" hidden>${tr('J’écris d’abord la citation, ou j’en choisis une dans les exemples.', 'First write the quote, or choose one from the examples.')}</p>
      <div class="sugg">
        <button type="button" class="btn btn-ghost btn-sm ex-btn" id="tb-qex" aria-expanded="false">${exLabel()}</button>
        <div id="tb-qchips" hidden>
          <p class="muted small">${tr('Je touche une citation pour la reprendre (je peux ensuite la modifier avant de l’ajouter).', 'I tap a quote to use it (I can then change it before adding it).')}</p>
          <div class="chips">${Q.map((q, i) => `<button type="button" class="chip" data-q="${i}">${tr('« ', '“')}${esc(q.text)}${tr(' »', '”')}${q.author ? ` <span class="muted">— ${esc(q.author)}</span>` : ''}</button>`).join('')}</div>
        </div>
      </div>`,
    ok: tr('Ajouter la citation', 'Add quote'),
  });
  const d = $('#modal');
  const text = $('#tb-qtext');
  const author = $('#tb-qauthor');
  setTimeout(() => text?.focus(), 50);
  d.querySelector('button[value="ok"]').addEventListener('click', (ev) => {
    if (!text.value.trim()) { ev.preventDefault(); $('#tb-q-err').hidden = false; text.focus(); }
  });
  $('#tb-qex').addEventListener('click', (ev) => {
    const box = $('#tb-qchips');
    box.hidden = !box.hidden;
    ev.currentTarget.setAttribute('aria-expanded', String(!box.hidden));
    ev.currentTarget.textContent = box.hidden ? exLabel() : tr('Masquer les exemples de citations', 'Hide example quotes');
  });
  $('#tb-qchips').addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-q]');
    if (!c) return;
    const q = Q[+c.dataset.q];
    text.value = q.text;
    author.value = q.author || '';
    $('#tb-q-err').hidden = true;
    // On replie les exemples pour que le bouton « Ajouter » reste à portée
    $('#tb-qex').click();
    d.scrollTo?.({ top: 0, behavior: 'smooth' });
  });
  if (!(await p)) return;
  const t = text.value.trim();
  if (!t) return;
  toolbox().push({ kind: 'citation', text: t, author: author.value.trim(), added: new Date().toISOString() });
  scheduleSave();
  tbRedraw();
  toast(tr('Citation ajoutée.', 'Quote added.'));
}

/* Visionneuse plein écran (photos et albums) */
let lb = null; // { idx, k }
function lbPhotos() {
  const it = toolbox()[lb.idx];
  return it.kind === 'album' ? (it.photos || []) : [{ file: it.file }];
}
async function showLightbox() {
  const el = $('#lightbox');
  const it = toolbox()[lb.idx];
  const ph = lbPhotos();
  lb.k = (lb.k + ph.length) % ph.length;
  el.innerHTML = `<div class="lb-top"><span class="lb-count">${ph.length > 1 ? `${lb.k + 1} / ${ph.length}` : ''}</span><span class="lb-title">${esc(it.title || '')}</span>
    <button type="button" class="lb-btn" data-lb="close" aria-label="${tr('Fermer', 'Close')}">✕</button></div>
    <div class="lb-stage"><img alt="${esc(it.title || 'Photo')}" data-media="${esc(ph[lb.k].file)}"></div>
    ${ph.length > 1 ? `<button type="button" class="lb-btn lb-prev" data-lb="prev" aria-label="${tr('Photo précédente', 'Previous photo')}">‹</button><button type="button" class="lb-btn lb-next" data-lb="next" aria-label="${tr('Photo suivante', 'Next photo')}">›</button>` : ''}`;
  el.hidden = false;
  document.body.classList.add('no-scroll');
  const img = el.querySelector('img');
  const id = img.dataset.media;
  try {
    if (!mediaURLs.has(id)) { const b = await media.get(id); if (b) mediaURLs.set(id, URL.createObjectURL(b)); }
    img.src = mediaURLs.get(id) || '';
  } catch { /* fichier illisible */ }
  el.querySelector('[data-lb="close"]').focus({ preventScroll: true });
}
function closeLightbox() {
  $('#lightbox').hidden = true;
  document.body.classList.remove('no-scroll');
  lb = null;
}
(() => {
  const el = document.getElementById('lightbox');
  if (!el) return;
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-lb]')?.dataset.lb;
    if (a === 'close') closeLightbox();
    else if (a === 'prev') { lb.k -= 1; showLightbox(); }
    else if (a === 'next') { lb.k += 1; showLightbox(); }
    else if (e.target.classList.contains('lb-stage')) closeLightbox();
  });
  let x0 = null;
  el.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  el.addEventListener('pointerup', (e) => {
    if (x0 === null || !lb) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50 && lbPhotos().length > 1) { lb.k += dx < 0 ? 1 : -1; showLightbox(); }
  });
})();

/* ---------- accès caméra / micro : diagnostic et solution de secours ---------- */

/** État de l'autorisation sans déclencher de demande ('granted' | 'denied' | 'prompt' | 'unknown') */
async function permState(name) {
  try { return (await navigator.permissions.query({ name })).state; } catch { return 'unknown'; }
}

/** Bloc d'aide quand le micro ou la caméra ne sont pas accessibles */
function mediaHelpHTML(kind, errName) {
  const video = kind === 'video';
  const site = esc(location.host || 'Mon PCC');
  let cause;
  if (errName === 'NotFoundError' || errName === 'OverconstrainedError') cause = video ? tr('Aucune caméra n’a été trouvée sur cet appareil.', 'No camera was found on this device.') : tr('Aucun micro n’a été trouvé sur cet appareil.', 'No microphone was found on this device.');
  else if (errName === 'NotReadableError' || errName === 'AbortError') cause = tr('Le micro ou la caméra est peut-être déjà utilisé par une autre application : je la ferme, puis je réessaie.', 'The microphone or camera may already be in use by another app: I close it, then try again.');
  else cause = video ? tr('L’accès à la caméra et au micro est bloqué pour Mon PCC.', 'Access to the camera and microphone is blocked for Mon PCC.') : tr('L’accès au micro est bloqué pour Mon PCC.', 'Access to the microphone is blocked for Mon PCC.');
  const blocked = !['NotFoundError', 'OverconstrainedError', 'NotReadableError', 'AbortError'].includes(errName);
  const fallback = video
    ? `<label class="btn btn-primary file-btn">🎥 ${tr('Utiliser l’appareil photo du téléphone', 'Use the phone’s camera app')}<input type="file" accept="video/*" capture="user" data-r-file hidden></label>`
    : `<label class="btn btn-primary file-btn">🎙 ${tr('Utiliser l’enregistreur du téléphone', 'Use the phone’s voice recorder')}<input type="file" accept="audio/*" capture data-r-file hidden></label>`;
  const mic = tr('Micro', 'Microphone');
  const cam = tr('Caméra', 'Camera');
  const retry = `<button type="button" class="btn btn-secondary btn-sm" data-r="retry">↻ ${tr('Réessayer', 'Try again')}</button>`;
  return `<div class="media-help" role="alert">
    <p><strong>${cause}</strong></p>
    <p class="small">${tr('Solution simple : enregistrer avec l’application du téléphone, puis le fichier s’ajoute à ma boîte à outils.', 'Simple solution: record with the phone’s own app, and the file is added to my toolbox.')}</p>
    ${fallback}
    ${blocked ? `<details class="more small"><summary>${tr('Autoriser l’accès dans Mon PCC', 'Allow access in Mon PCC')}</summary>
      <p>${tr('<strong>Sur Android</strong> (Brave, Chrome…), deux réglages comptent :', '<strong>On Android</strong> (Brave, Chrome…), two settings matter:')}</p>
      <ol>
        <li>${tr('Réglages du téléphone › Applications › <em>mon navigateur</em> (Brave, Chrome…) › Autorisations ›', 'Phone settings › Apps › <em>my browser</em> (Brave, Chrome…) › Permissions ›')} <strong>${mic}</strong>${video ? ` ${tr('et', 'and')} <strong>${cam}</strong>` : ''}${tr(' : Autoriser.', ': Allow.')}</li>
        <li>${tr('Dans le navigateur lui-même (en l’ouvrant normalement, pas depuis l’icône Mon PCC) : menu ⋮ › Paramètres › Paramètres des sites (ou Autorisations des sites) ›', 'In the browser itself (opened normally, not from the Mon PCC icon): menu ⋮ › Settings › Site settings (or Site permissions) ›')} <strong>${mic}</strong>${video ? ` ${tr('et', 'and')} <strong>${cam}</strong>` : ''} › ${site}${tr(' : Autoriser.', ': Allow.')}</li>
      </ol>
      <p>${tr('<strong>Sur iPhone</strong> : Réglages › Safari ›', '<strong>On iPhone</strong>: Settings › Safari ›')} ${tr('Microphone', 'Microphone')}${video ? ` ${tr('et Caméra', 'and Camera')}` : ''} › ${tr('Autoriser (ou Demander).', 'Allow (or Ask).')}</p>
      <p>${tr('Puis je reviens ici et je touche « Réessayer ».', 'Then I come back here and tap “Try again”.')}</p>
      ${retry}
    </details>` : retry}
  </div>`;
}

/* Enregistrement d'une vidéo (caméra du téléphone) */
const VIDEO_MAX_S = 180; // 3 minutes maximum

function pickVideoMime() {
  const types = ['video/mp4;codecs=avc1,mp4a', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  return types.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || '';
}

function recordVideo() {
  return new Promise((resolve) => {
    const d = $('#modal');
    let stream = null; let rec = null; let chunks = []; let timer = null; let t0 = 0; let result = null;
    let facing = 'user';
    const startLbl = `● ${tr('Démarrer', 'Start')}`;
    d.innerHTML = `<div class="modal-inner">
      <h2>🎥 ${tr('Me filmer', 'Film myself')}</h2>
      <p class="muted small">${tr('Par exemple, un message que je m’adresse quand je vais bien, pour me le repasser dans les moments difficiles. 3 minutes maximum.', 'For example, a message I record for myself when I am feeling well, to play back in difficult moments. 3 minutes maximum.')}</p>
      <div class="vid-wrap"><video class="vid-live" playsinline muted autoplay></video><video class="vid-play" playsinline controls hidden></video>
        <span class="vid-rec" hidden>● REC</span></div>
      <p class="rec-time" aria-live="polite">0:00</p>
      <div class="media-error" hidden></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-r="flip">🔄 ${tr('Changer de caméra', 'Switch camera')}</button>
        <button type="button" class="btn btn-ghost" data-r="cancel">${tr('Annuler', 'Cancel')}</button>
        <button type="button" class="btn btn-primary" data-r="start" disabled>${startLbl}</button>
        <button type="button" class="btn btn-danger" data-r="stop" hidden>■ ${tr('Arrêter', 'Stop')}</button>
        <button type="button" class="btn btn-primary" data-r="keep" hidden>${tr('Garder', 'Keep')}</button>
      </div></div>`;
    const $r = (k) => d.querySelector(`[data-r="${k}"]`);
    const live = d.querySelector('.vid-live');
    const play = d.querySelector('.vid-play');
    const recBadge = d.querySelector('.vid-rec');
    const time = d.querySelector('.rec-time');
    const err = d.querySelector('.media-error');
    const stopStream = () => { stream?.getTracks().forEach((t) => t.stop()); stream = null; };
    const showHelp = (name) => {
      err.innerHTML = mediaHelpHTML('video', name);
      err.hidden = false;
      d.querySelector('.vid-wrap').hidden = true; time.hidden = true;
      $r('start').hidden = true; $r('flip').hidden = true;
    };
    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const openCam = async (force = false) => {
      stopStream();
      // Si l'accès est déjà refusé, on ne redemande pas en boucle : on explique
      if (!force && ((await permState('camera')) === 'denied' || (await permState('microphone')) === 'denied')) { showHelp('NotAllowedError'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
        live.srcObject = stream;
        live.hidden = false; play.hidden = true;
        d.querySelector('.vid-wrap').hidden = false; time.hidden = false;
        $r('start').disabled = false; $r('start').hidden = false; $r('flip').hidden = false;
        err.hidden = true;
      } catch (e) {
        showHelp(e?.name);
      }
    };
    const cleanup = () => { clearInterval(timer); stopStream(); if (play.src) URL.revokeObjectURL(play.src); };
    const finish = (v) => { cleanup(); d.close(); resolve(v); };
    const stopRec = () => { clearInterval(timer); if (rec?.state === 'recording') rec.stop(); $r('stop').hidden = true; recBadge.hidden = true; };
    d.onclick = async (e) => {
      const a = e.target.closest('[data-r]')?.dataset.r;
      if (a === 'cancel') { if (rec?.state === 'recording') rec.stop(); finish(null); }
      else if (a === 'retry') { await openCam(true); }
      else if (a === 'flip') { if (rec?.state === 'recording') return; facing = facing === 'user' ? 'environment' : 'user'; await openCam(); }
      else if (a === 'start') {
        if (!stream) {
          // « Recommencer » : rouvrir la caméra, puis démarrer au prochain appui
          await openCam();
          $r('start').textContent = startLbl;
          $r('keep').hidden = true;
          time.textContent = '0:00';
          return;
        }
        chunks = [];
        const mimeType = pickVideoMime();
        rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 1_200_000, audioBitsPerSecond: 64_000 });
        rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
        rec.onstop = () => {
          result = new Blob(chunks, { type: (rec.mimeType || mimeType || 'video/webm').split(';')[0] });
          stopStream();
          if (play.src) URL.revokeObjectURL(play.src);
          play.src = URL.createObjectURL(result);
          live.hidden = true; play.hidden = false;
          $r('keep').hidden = false; $r('start').hidden = false; $r('start').textContent = `● ${tr('Recommencer', 'Start again')}`; $r('flip').hidden = false;
        };
        rec.start(1000); t0 = Date.now();
        timer = setInterval(() => {
          const sec = Math.floor((Date.now() - t0) / 1000);
          time.textContent = `${fmt(sec)} / ${fmt(VIDEO_MAX_S)}`;
          if (sec >= VIDEO_MAX_S) stopRec();
        }, 250);
        $r('start').hidden = true; $r('keep').hidden = true; $r('flip').hidden = true; $r('stop').hidden = false; recBadge.hidden = false;
      } else if (a === 'stop') stopRec();
      else if (a === 'keep' && result) finish(result);
    };
    d.oncancel = (e) => { e.preventDefault(); if (rec?.state === 'recording') rec.stop(); finish(null); };
    d.onchange = (e) => { if (e.target.matches('[data-r-file]') && e.target.files[0]) finish(e.target.files[0]); };
    d.showModal();
    if (!navigator.mediaDevices?.getUserMedia) showHelp('NotFoundError'); else openCam();
  });
}

function recordVoice() {
  return new Promise((resolve) => {
    const d = $('#modal');
    let rec = null; let stream = null; let chunks = []; let timer = null; let t0 = 0; let result = null;
    d.innerHTML = `<div class="modal-inner">
      <h2>🎙 ${tr('M’enregistrer', 'Record myself')}</h2>
      <p class="muted small">${tr('Par exemple, un message que je m’adresse quand je vais bien, pour me le faire écouter dans les moments difficiles.', 'For example, a message I record for myself when I am feeling well, to listen to in difficult moments.')}</p>
      <p class="rec-time" aria-live="polite">0:00</p>
      <audio class="tb-audio" controls hidden></audio>
      <div class="media-error" hidden></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-r="cancel">${tr('Annuler', 'Cancel')}</button>
        <button type="button" class="btn btn-primary" data-r="start">● ${tr('Démarrer', 'Start')}</button>
        <button type="button" class="btn btn-danger" data-r="stop" hidden>■ ${tr('Arrêter', 'Stop')}</button>
        <button type="button" class="btn btn-primary" data-r="keep" hidden>${tr('Garder', 'Keep')}</button>
      </div></div>`;
    const $r = (k) => d.querySelector(`[data-r="${k}"]`);
    const time = d.querySelector('.rec-time');
    const player = d.querySelector('audio');
    const err = d.querySelector('.media-error');
    const showHelp = (name) => { err.innerHTML = mediaHelpHTML('audio', name); err.hidden = false; $r('start').hidden = true; time.hidden = true; };
    const cleanup = () => { clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); if (player.src) URL.revokeObjectURL(player.src); };
    const finish = (v) => { cleanup(); d.close(); resolve(v); };
    d.onclick = async (e) => {
      const a = e.target.closest('[data-r]')?.dataset.r;
      if (a === 'cancel') finish(null);
      else if (a === 'retry') {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach((t) => t.stop()); stream = null; err.hidden = true; $r('start').hidden = false; time.hidden = false; } catch (er) { showHelp(er?.name); }
      } else if (a === 'start') {
        if ((await permState('microphone')) === 'denied') { showHelp('NotAllowedError'); return; }
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (er) { showHelp(er?.name); return; }
        chunks = []; rec = new MediaRecorder(stream);
        rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
        rec.onstop = () => {
          result = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          stream.getTracks().forEach((t) => t.stop());
          player.src = URL.createObjectURL(result); player.hidden = false;
          $r('keep').hidden = false; $r('start').hidden = false; $r('start').textContent = `● ${tr('Recommencer', 'Start again')}`;
        };
        rec.start(); t0 = Date.now();
        timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 250);
        $r('start').hidden = true; $r('keep').hidden = true; $r('stop').hidden = false; player.hidden = true;
      } else if (a === 'stop') { clearInterval(timer); rec?.stop(); $r('stop').hidden = true; }
      else if (a === 'keep' && result) finish(result);
    };
    d.onchange = (e) => { if (e.target.matches('[data-r-file]') && e.target.files[0]) finish(e.target.files[0]); };
    d.oncancel = (e) => { e.preventDefault(); if (rec?.state === 'recording') rec.stop(); finish(null); };
    d.showModal();
  });
}

const usedMediaIds = () => (plan?.data.boiteOutils || []).flatMap((it) => [it.file, ...(it.photos || []).map((p) => p.file)]).filter(Boolean);

/* ---------- dossier de santé (Mon Espace Santé en France) + carte de crise ---------- */

const MES_URL = 'https://www.monespacesante.fr/';
const MES_ANDROID = 'fr.assurancemaladie.monespacesante';
const MES_PLAY = `https://play.google.com/store/apps/details?id=${MES_ANDROID}`;
const MES_APPSTORE = 'https://apps.apple.com/fr/app/id1589255019';
const isAndroid = () => /Android/i.test(navigator.userAgent);
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/** Libellés de la page « dossier de santé » selon le pays */
const hasMES = () => country().record === 'mes';
const recordPageLabel = () => (hasMES()
  ? tr('🏥 Mon Espace Santé et carte de crise', '🏥 Mon Espace Santé and crisis card')
  : tr('🏥 Dossier de santé et carte de crise', '🏥 Health record and crisis card'));
const recordButtonLabel = () => (hasMES()
  ? tr('🏥 Ajouter à Mon Espace Santé', '🏥 Add to Mon Espace Santé')
  : tr('🏥 Ajouter à mon dossier de santé', '🏥 Add to my health record'));
const defaultCardWhere = () => (hasMES()
  ? tr('Dans Mon Espace Santé', 'In Mon Espace Santé (French health record)')
  : tr('Auprès de mon équipe de soins', 'With my care team'));

let cardTimer = null;
let cardPreviewUrl = '';

/** Données de la carte, préremplies depuis le plan au premier affichage */
function carte() {
  if (!plan.data.carte) {
    let proche = (plan.data.aide?.proches || []).find((r) => r.nom || r.tel) || {};
    let pro = (plan.data.aide?.pros || []).find((r) => r.nom || r.tel) || {};
    if (isAdo()) {
      const info = (plan.data.information || []).find((r) => r.qui) || {};
      const tel = (info.comment || '').match(/(\+?\d[\d .-]{7,}\d)/);
      proche = { nom: info.qui || '', lien: '', tel: tel ? tel[1] : '' };
      const p2 = (plan.data.partenaires || []).find((r) => /infirm|psych|médecin|medecin|éduc|educ|référent|referent|CMP|nurse|doctor|social worker|key worker|GP/i.test(r.role || '')) || {};
      pro = { nom: p2.nom || '', lien: p2.role || '', tel: '' };
    }
    const id = plan.data.coordonnees || {};
    plan.data.carte = {
      nom: [id.prenom, id.nom].filter(Boolean).join(' '),
      ou: defaultCardWhere(),
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
  box.innerHTML = `<img src="${cardPreviewUrl}" alt="${tr('Aperçu de ma carte de crise', 'Preview of my crisis card')}">`;
}

/** Âge d'après la date de naissance de l'étape 1 (null si inconnue) */
function ageFromBirth() {
  const d = plan.data.coordonnees?.naissance;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
  if (!m) return null;
  const now = new Date();
  let age = now.getFullYear() - +m[1];
  if (now.getMonth() + 1 < +m[2] || (now.getMonth() + 1 === +m[2] && now.getDate() < +m[3])) age--;
  return age;
}

/** Message « moins de 18 ans » (Mon Espace Santé) : jamais si la personne est majeure ou l'a masqué ;
    affiché si elle est mineure, ou en version ado quand la date de naissance n'est pas renseignée */
function showMinorNote() {
  if (!hasMES() || plan.data.masquerNoteMineur) return false;
  const age = ageFromBirth();
  if (age !== null) return age < 18;
  return isAdo();
}

/** Bloc « Télécharger mon plan en PDF » commun aux deux variantes de la page */
function recordPdfHTML(intro) {
  return `<section class="card">
      <h2>${tr('1. Télécharger mon plan en PDF', '1. Download my plan as a PDF')}</h2>
      <p class="muted small">${intro}</p>
      ${modifiedAfterSigning() ? `<p class="warn small">${tr('Certaines signatures sont antérieures à la dernière modification : elles ne figureront pas dans le PDF.', 'Some signatures are older than the latest change: they will not appear in the PDF.')} <a href="#/etape/${STEPS.length - 1}">${tr('Signer à nouveau', 'Sign again')}</a></p>` : ''}
      <div class="stack">
        <button type="button" class="btn btn-primary" data-act="mes-pdf">📄 ${tr('Télécharger le PDF', 'Download the PDF')}</button>
        <button type="button" class="btn btn-secondary" data-act="mes-summary">📋 ${tr('Et la synthèse d’une page', 'And the one-page summary')}</button>
      </div>
    </section>`;
}

function crisisCardHTML() {
  const c = carte();
  const f = (k, label, ph, type = 'text') => `<label class="field"><span>${label}</span><input ${type === 'tel' ? 'inputmode="tel"' : ''} data-card="${k}" data-fk="card:${k}" value="${esc(c[k] || '')}" placeholder="${esc(ph)}"></label>`;
  return `<section class="card">
      <h2>${tr('3. Ma carte de crise', '3. My crisis card')}</h2>
      <p class="muted small">${hasMES()
        ? tr('Une carte au format carte bancaire, à garder dans mon portefeuille à côté de ma carte Vitale. Elle indique seulement que j’ai un plan de crise conjoint, où le trouver et qui prévenir : aucune information sur ma santé.', 'A bank-card-sized card to keep in my wallet next to my health insurance card. It only says that I have a joint crisis plan, where to find it and who to contact: no information about my health.')
        : tr('Une carte au format carte bancaire, à garder dans mon portefeuille. Elle indique seulement que j’ai un plan de crise conjoint, où le trouver et qui prévenir : aucune information sur ma santé.', 'A bank-card-sized card to keep in my wallet. It only says that I have a joint crisis plan, where to find it and who to contact: no information about my health.')}</p>
      <div class="card-preview" id="crisis-preview"><span class="muted">${tr('Préparation…', 'Preparing…')}</span></div>
      <div class="form-grid">
        ${f('nom', tr('Mon nom', 'My name'), tr('Prénom Nom', 'First name Last name'))}
        ${f('ou', tr('Où trouver mon plan', 'Where to find my plan'), hasMES() ? tr('Ex. : Dans Mon Espace Santé', 'E.g. In Mon Espace Santé') : tr('Ex. : auprès de mon équipe de soins', 'E.g. with my care team'))}
        ${f('contactNom', tr('Personne à prévenir', 'Person to contact'), tr('Ex. : Julie Durand', 'E.g. Julie Smith'))}
        ${f('contactLien', tr('Lien', 'Relationship'), tr('Ex. : ma sœur', 'E.g. my sister'))}
        ${f('contactTel', tr('Son téléphone', 'Their phone'), isFrance() ? '06 …' : '…', 'tel')}
        ${f('soignantNom', tr('Mon soignant référent (facultatif)', 'My key professional (optional)'), tr('Ex. : Mme Martin, CMP', 'E.g. Sarah Jones, care coordinator'))}
        ${f('soignantTel', tr('Son téléphone (facultatif)', 'Their phone (optional)'), isFrance() ? '02 …' : '…', 'tel')}
      </div>
      <div class="stack">
        <button type="button" class="btn btn-primary" data-act="card-print">🖨 ${tr('Imprimer la carte (PDF)', 'Print the card (PDF)')}</button>
        <button type="button" class="btn btn-secondary" data-act="card-img">🖼 ${tr('Enregistrer l’image', 'Save the image')}</button>
      </div>
      <p class="muted small">${tr('Je vérifie avec la personne à prévenir qu’elle est d’accord pour figurer sur ma carte.', 'I check with the person to contact that they agree to be on my card.')}</p>
    </section>`;
}

function renderMES() {
  if (!hasMES()) { renderHealthRecord(); return; }
  app.innerHTML = `
    <h1>🏥 ${tr('Ajouter à Mon Espace Santé', 'Add to Mon Espace Santé')}</h1>
    <p class="lead">${tr('Déposer mon plan dans Mon Espace Santé permet aux soignant·es que j’autorise de le consulter, y compris en cas d’hospitalisation ou d’urgence. Ma carte de crise signale qu’il existe.', 'Mon Espace Santé is the French national digital health record. Adding my plan to it lets the health professionals I authorise read it, including in hospital or in an emergency. My crisis card shows that it exists.')}</p>

    ${showMinorNote() ? `<div class="note small note-x" role="note"><button type="button" class="icon note-close" data-act="mes-minor-hide" aria-label="${tr('Masquer ce message', 'Hide this message')}" title="${tr('Masquer ce message', 'Hide this message')}">✕</button>${tr('<strong>Si j’ai moins de 18 ans :</strong> mon espace Mon Espace Santé est géré par mon ou mes représentant·es légaux (selon ma situation : parents, tuteur·rice, service de l’aide sociale à l’enfance…). Je ne peux pas y déposer mon plan seul·e : je le fais <strong>avec mon ou ma représentant·e légal·e</strong>, ou je demande à un·e <strong>professionnel·le qui me suit</strong> de l’y déposer. À mes 18 ans, j’accède moi-même à mon espace et j’y retrouve mes documents.', '<strong>If I am under 18:</strong> my Mon Espace Santé account is managed by my legal guardian(s) (depending on my situation: parents, guardian, child welfare services…). I cannot add my plan on my own: I do it <strong>with my legal guardian</strong>, or I ask a <strong>professional who supports me</strong> to add it. When I turn 18, I manage my account myself and find my documents there.')}</div>` : ''}
    ${recordPdfHTML(tr('Sans code : Mon Espace Santé est déjà un espace sécurisé, et un code empêcherait les soignant·es de lire le document.', 'Without a code: Mon Espace Santé is already secure, and a code would stop health professionals from reading the document.'))}

    <section class="card">
      <h2>${tr('2. Le déposer dans Mon Espace Santé', '2. Add it to Mon Espace Santé')}</h2>
      <ol class="mes-steps">
        <li>${tr('J’ouvre l’application <strong>Mon Espace Santé</strong> ou le site monespacesante.fr, et je me connecte.', 'I open the <strong>Mon Espace Santé</strong> app or the monespacesante.fr website, and log in.')}</li>
        <li>${tr('Dans <strong>Documents</strong>, je touche <strong>« Ajouter un document »</strong> et je choisis le PDF téléchargé.', 'In <strong>Documents</strong>, I tap <strong>“Ajouter un document”</strong> (add a document) and choose the downloaded PDF.')}</li>
        <li>${tr('Je lui donne un titre clair : <strong>« Plan de crise conjoint »</strong>, avec la date.', 'I give it a clear title: <strong>“Joint crisis plan”</strong>, with the date.')}</li>
        <li>${tr('Je vérifie qu’il <strong>n’est pas masqué</strong> aux professionnel·les qui me suivent.', 'I check that it is <strong>not hidden</strong> from the professionals who support me.')}</li>
        <li>${tr('Dans les <strong>paramètres de confidentialité</strong>, je peux autoriser l’<strong>accès en cas d’urgence</strong> (médecin du SAMU-Centre 15, soignant·es face à un risque immédiat pour ma santé). C’est ce qui rend mon plan utile en situation de crise.', 'In the <strong>privacy settings</strong>, I can allow <strong>emergency access</strong> (SAMU-Centre 15 doctors, professionals facing an immediate risk to my health). This is what makes my plan useful in a crisis.')}</li>
        <li>${tr('À chaque mise à jour de mon plan, je dépose la nouvelle version et je supprime l’ancienne.', 'Each time I update my plan, I add the new version and delete the old one.')}</li>
      </ol>
      <p class="small">${tr('<strong>Si l’application Mon Espace Santé est installée</strong>, je l’ouvre directement depuis l’écran d’accueil de mon téléphone : elle ne peut pas être lancée depuis Mon PCC. Sinon, j’utilise le site :', '<strong>If the Mon Espace Santé app is installed</strong>, I open it directly from my phone’s home screen: it cannot be launched from Mon PCC. Otherwise, I use the website:')}</p>
      <a class="btn btn-secondary" href="${MES_URL}" target="_blank" rel="noopener noreferrer">${tr('Ouvrir le site Mon Espace Santé ↗', 'Open the Mon Espace Santé website ↗')}</a>
      <p class="muted small">${tr('Pas encore l’application ?', 'Don’t have the app yet?')} ${isIOS() ? `<a href="${MES_APPSTORE}" target="_blank" rel="noopener noreferrer">App Store</a>` : isAndroid() ? `<a href="${MES_PLAY}" target="_blank" rel="noopener noreferrer">Google Play</a>` : `<a href="${MES_PLAY}" target="_blank" rel="noopener noreferrer">Google Play</a> · <a href="${MES_APPSTORE}" target="_blank" rel="noopener noreferrer">App Store</a>`}</p>
      <details class="more">
        <summary>${tr('Si je suis hospitalisé·e', 'If I am in hospital')}</summary>
        <ul class="small">
          <li>${tr('Si le logiciel de l’hôpital est relié à Mon Espace Santé, les soignant·es que j’autorise peuvent consulter mon plan.', 'If the hospital’s software is connected to Mon Espace Santé, the professionals I authorise can read my plan.')}</li>
          <li>${tr('Je peux aussi le remettre à l’équipe à mon arrivée (PDF ou version imprimée), pour qu’il soit ajouté à mon dossier.', 'I can also give it to the team when I arrive (PDF or printed copy), so that it is added to my records.')}</li>
          <li>${tr('Le ou la soignant·e qui m’accompagne peut l’envoyer à l’hôpital par la messagerie sécurisée de santé (MSSanté).', 'The professional who supports me can send it to the hospital through the secure health messaging service (MSSanté).')}</li>
        </ul>
      </details>
    </section>

    ${crisisCardHTML()}
    <div class="nav-bottom"><a class="btn btn-ghost" href="#/plan">${tr('← Mon plan', '← My plan')}</a></div>`;
  refreshCardPreview();
}

/** Pays sans Mon Espace Santé : conseils pour faire ajouter le plan au dossier de soins */
function renderHealthRecord() {
  const us = country().record === 'us';
  app.innerHTML = `
    <h1>🏥 ${tr('Ajouter à mon dossier de santé', 'Add to my health record')}</h1>
    <p class="lead">${tr('Pour que mon plan soit utile en situation de crise, les soignant·es doivent pouvoir le trouver. Ma carte de crise signale qu’il existe.', 'For my plan to be useful in a crisis, the professionals caring for me need to be able to find it. My crisis card shows that it exists.')}</p>
    ${recordPdfHTML(tr('Sans code, pour que les soignant·es puissent le lire et l’ajouter à mon dossier.', 'Without a code, so that professionals can read it and add it to my records.'))}
    <section class="card">
      <h2>${tr('2. Le faire ajouter à mon dossier', '2. Have it added to my records')}</h2>
      <ol class="mes-steps">
        <li>${tr('Je remets mon plan (PDF ou version imprimée) à l’équipe qui me suit et à mon médecin généraliste, et je leur demande de l’<strong>ajouter à mon dossier</strong>.', 'I give my plan (PDF or printed copy) to the team that supports me and to my GP / family doctor, and ask them to <strong>add it to my records</strong>.')}</li>
        <li>${tr('Je demande comment il sera <strong>visible en cas de crise</strong> (urgences, équipe de crise, hospitalisation).', 'I ask how it will be <strong>visible in a crisis</strong> (emergency department, crisis team, hospital stay).')}</li>
        <li>${tr('Si mon service de santé propose un espace patient en ligne qui accepte les documents, je peux aussi l’y déposer.', 'If my health service has an online patient portal that accepts documents, I can also upload it there.')}</li>
        <li>${tr('À chaque mise à jour de mon plan, je transmets la nouvelle version et je demande que l’ancienne soit retirée.', 'Each time I update my plan, I share the new version and ask for the old one to be removed.')}</li>
      </ol>
      ${us ? `<p class="small">${tr('Aux États-Unis, un plan de crise peut accompagner une <strong>directive anticipée psychiatrique</strong> (PAD), dont les règles varient selon les États : je peux en parler avec l’équipe qui me suit.', 'In the United States, a crisis plan can go alongside a <strong>psychiatric advance directive</strong> (PAD), whose rules vary from state to state: I can talk about it with the team that supports me.')}</p>` : ''}
      <details class="more">
        <summary>${tr('Si je suis hospitalisé·e', 'If I am in hospital')}</summary>
        <ul class="small">
          <li>${tr('Je remets mon plan à l’équipe à mon arrivée, ou je demande à un·e proche de l’apporter.', 'I give my plan to the team when I arrive, or ask someone close to me to bring it.')}</li>
          <li>${tr('Le ou la professionnel·le qui me suit peut le transmettre à l’hôpital par un moyen sécurisé.', 'The professional who supports me can send it to the hospital securely.')}</li>
        </ul>
      </details>
      <p class="muted small">${tr('Mon pays :', 'My country:')} ${country().flag} ${esc(L(country().name))} · <a href="#/reglages/langue">${tr('changer', 'change')}</a></p>
    </section>
    ${crisisCardHTML()}
    <div class="nav-bottom"><a class="btn btn-ghost" href="#/plan">${tr('← Mon plan', '← My plan')}</a></div>`;
  refreshCardPreview();
}

/* ---------- changement de version ---------- */

async function changeVersion(v) {
  if (v === VERSION) return;
  const masked = hiddenSteps(v).filter((st) => stepIsFilled(st, plan.data));
  const signed = (plan.data.signature?.signataires || []).some((r) => r.sig);
  const ok = !hasData() || await modal({
    title: v === 'ado' ? tr('Passer à la version ado ?', 'Switch to the teen version?') : tr('Passer à la version adulte ?', 'Switch to the adult version?'),
    body: `<p>${tr('Mes réponses communes aux deux versions sont gardées.', 'My answers common to both versions are kept.')}</p>
      ${masked.length ? `<p>${tr('Ces rubriques seront <strong>masquées</strong> (gardées sur ce téléphone, elles réapparaîtront si je reviens à l’autre version) :', 'These sections will be <strong>hidden</strong> (kept on this phone; they will come back if I return to the other version):')}</p><ul>${masked.map((st) => `<li>${esc(st.title)}</li>`).join('')}</ul>` : ''}
      ${signed ? `<p class="small">${tr('<strong>Le plan change de contenu</strong> : les signatures déjà faites ne figureront plus sur l’impression ni sur le PDF. Il faudra signer à nouveau.', '<strong>The plan’s content changes</strong>: existing signatures will no longer appear on the printout or the PDF. You will need to sign again.')}</p>` : ''}`,
    ok: tr('Changer de version', 'Switch version'),
  });
  if (!ok) { rerender(renderSettings); return; }
  plan.data.version = v;
  applyVersion();
  scheduleSave();
  toast(v === 'ado' ? tr('Version ado activée.', 'Teen version on.') : tr('Version adulte activée.', 'Adult version on.'));
  rerender(() => route());
}

/* ---------- langue et pays ---------- */

/** Applique la langue et le pays choisis à toute l'application, sans recharger */
function applyLocale() {
  applyVersion();
  shareCache = null;
  renderChrome();
  saveState.textContent = saveState.textContent ? savedLabel() : '';
  if (!$('#install-banner').hidden) showInstallBanner();
  rerender(() => route());
}

/* ---------- ressources ---------- */

const telHref = (t) => 'tel:' + t.replace(/[^\d+]/g, '');
const smsHref = (n, body) => `sms:${n.replace(/[^\d+]/g, '')}${body ? `?&body=${encodeURIComponent(body)}` : ''}`;
/** Comment joindre un service (numéro, ou SMS avec un mot-clé) */
const reachText = (it) => (it.tel ? it.tel : tr(`SMS « ${it.smsBody} » au ${it.sms}`, `text ${it.smsBody} to ${it.sms}`));

function resourcesOrdered() {
  const cats = country().cats;
  if (!isAdo()) return cats;
  const first = cats.filter((c) => (country().youthFirst || []).includes(c.id));
  return [...first, ...cats.filter((c) => !first.includes(c))];
}

function renderResources() {
  const c0 = country();
  const digits = (t) => String(t || '').replace(/\D/g, '');
  const num = (it) => it.tel || it.sms;
  const inPlan = (it) => (isAdo()
    ? (plan?.data.strategies?.pros || []).some((t) => digits(t).includes(digits(num(it))))
    : (plan?.data.aide?.garde || []).some((r) => r.tel && digits(r.tel) === digits(num(it))));
  const where = isAdo() ? tr('Ce qui me fait du bien › L’aide de professionnel·les', 'What helps me › Help from professionals') : tr('À qui demander de l’aide', 'Who I can ask for help');
  app.innerHTML = `
    <h1>📞 ${tr('Ressources', 'Resources')}</h1>
    <p class="lead">${tr(`Des lignes d’écoute et des sites fiables, ${esc(L(c0.inName))}. Je peux ajouter un numéro à mon plan, dans « ${where} ».`, `Helplines and reliable websites ${esc(L(c0.inName))}. I can add a number to my plan, under “${where}”.`)}</p>
    <p class="small country-line">${c0.flag} ${tr('Pays :', 'Country:')} <strong>${esc(L(c0.name))}</strong> · <a href="#/reglages/langue">${tr('changer', 'change')}</a></p>
    <nav class="res-jump" aria-label="${tr('Catégories', 'Categories')}">${resourcesOrdered().map((c) => `<a class="chip" href="#res-${c.id}" data-act="res-jump" data-id="${c.id}">${c.icon} ${esc(L(c.title))}</a>`).join('')}</nav>
    ${resourcesOrdered().map((c) => `
      <section class="card res-cat" id="res-${c.id}">
        <h2>${c.icon} ${esc(L(c.title))}</h2>
        ${c.intro ? `<p class="muted small">${esc(L(c.intro))}</p>` : ''}
        <ul class="res-list">${c.items.map((it, k) => `
          <li class="res-item">
            <p class="res-name">${esc(L(it.name))}</p>
            ${it.hours ? `<p class="res-hours">🕑 ${esc(L(it.hours))}</p>` : ''}
            <p class="res-desc">${esc(L(it.desc))}</p>
            <div class="res-actions">
              ${it.tel ? `<a class="btn btn-primary btn-sm" href="${telHref(it.tel)}">☎ ${esc(it.tel)}</a>` : ''}
              ${it.sms ? `<a class="btn btn-primary btn-sm" href="${smsHref(it.sms, it.smsBody)}">💬 ${tr('SMS', 'Text')} ${esc(it.sms)}</a>` : ''}
              ${it.url ? `<a class="btn btn-secondary btn-sm" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${tr('Site ↗', 'Website ↗')}</a>` : ''}
              ${num(it) && plan ? (inPlan(it)
                ? `<span class="res-added">✓ ${tr('Dans mon plan', 'In my plan')}</span>`
                : `<button type="button" class="btn btn-ghost btn-sm" data-act="res-add" data-c="${c.id}" data-k="${k}" data-fk="res:${c.id}:${k}">${tr('+ Ajouter à mon plan', '+ Add to my plan')}</button>`) : ''}
            </div>
          </li>`).join('')}</ul>
      </section>`).join('')}
    <p class="muted small center">${tr(`Informations vérifiées le ${L(c0.checked)}. Les horaires peuvent évoluer : en cas de doute, consulter le site du service.`, `Information checked on ${L(c0.checked)}. Opening hours may change: if in doubt, check the service’s website.`)}</p>`;
}

/* ---------- plan complet et partage ---------- */

function renderPlan() {
  const refused = STEPS.some((s) => s.id === 'alternatives') && (plan.data.soinsEvites || []).some((r) => r.soin && r.soin.trim());
  const alt = (plan.data.alternatives || []).some((x) => x.trim());
  const canShare = !!navigator.share;
  app.innerHTML = `
    <h1>${tr('Mon plan', 'My plan')}</h1>
    ${refused && !alt ? `<div class="warn" role="status"><strong>${tr('À compléter :', 'To complete:')}</strong> ${tr('j’ai indiqué des soins à éviter sans proposer d’alternative.', 'I have listed care to avoid without suggesting an alternative.')} <a href="#/etape/${STEPS.findIndex((s) => s.id === 'alternatives')}">${tr('Compléter les alternatives', 'Add alternatives')}</a></div>` : ''}
    ${modifiedAfterSigning() ? `<div class="warn no-print" role="status"><strong>${tr('Le plan a été modifié après certaines signatures', 'The plan was changed after some signatures')}</strong>${tr(' : elles ne figurent plus sur l’impression ni sur le PDF.', ': they no longer appear on the printout or the PDF.')} <a href="#/etape/${STEPS.length - 1}">${tr('Signer à nouveau', 'Sign again')}</a>${(plan.data.versions || []).length ? ` · <a href="#/versions">${tr('Voir ce qui a changé', 'See what changed')}</a>` : ''}</div>` : ''}
    ${(plan.data.versions || []).length ? `<p class="no-print small"><a href="#/versions">🔄 ${tr('Versions signées et changements', 'Signed versions and changes')} (${plan.data.versions.length})</a></p>` : ''}
    <section class="card actions no-print">
      <h2>${tr('Imprimer, enregistrer, envoyer', 'Print, save, send')}</h2>
      <p class="muted">${tr('Rien ne part sans mon accord. Je choisis à qui j’envoie mon plan et par quel moyen.', 'Nothing is sent without my consent. I choose who I send my plan to, and how.')}</p>
      <div class="stack">
        <button class="btn btn-secondary" data-act="print">🖨 ${tr('Imprimer', 'Print')}</button>
        <button class="btn btn-secondary" data-act="pdf-save">📄 ${tr('Enregistrer en PDF', 'Save as PDF')}</button>
        <button class="btn btn-secondary" data-act="summary-save">📋 ${tr('Synthèse d’une page (PDF)', 'One-page summary (PDF)')}</button>
        <button class="btn btn-primary" data-act="pdf-send">📤 ${tr('Envoyer le PDF', 'Send the PDF')}</button>
        <a class="btn btn-secondary" href="#/mon-espace-sante">${recordButtonLabel()}</a>
      </div>
      <p class="muted small">${tr('La <strong>synthèse d’une page</strong> reprend l’essentiel (signes de crise, ce qui m’aide, soins à éviter et alternatives, personnes à prévenir), pour être lue en quelques secondes aux urgences.', 'The <strong>one-page summary</strong> gives the essentials (crisis signs, what helps me, care to avoid and alternatives, people to contact), so it can be read in seconds in an emergency.')}</p>
      <p class="muted small">${tr('À l’enregistrement, je peux <strong>protéger le PDF par un code</strong>. Pour un envoi, je privilégie un moyen sûr et un PDF sans code, que le destinataire pourra ouvrir en cas de crise.', 'When saving, I can <strong>protect the PDF with a code</strong>. To send it, I prefer a secure channel and a PDF without a code, which the recipient can open in a crisis.')}</p>
      <details class="more">
        <summary>${tr('Autre option : envoyer en texte', 'Other option: send as text')}</summary>
        <p class="muted small">${tr('Le texte se colle dans un message. Il <strong>ne peut pas être protégé</strong> par un code : préférez le PDF protégé pour un envoi.', 'The text can be pasted into a message. It <strong>cannot be protected</strong> with a code: prefer the protected PDF for sending.')}</p>
        <button class="btn btn-ghost btn-sm" data-act="share-text">${canShare ? tr('Envoyer en texte (non protégé)', 'Send as text (not protected)') : tr('Copier le texte (non protégé)', 'Copy the text (not protected)')}</button>
      </details>
    </section>
    <article class="doc">${documentHTML(plan)}</article>
    <div class="nav-bottom no-print"><a class="btn btn-ghost" href="#/etape/${STEPS.length - 1}">${tr('← Modifier', '← Edit')}</a><a class="btn btn-ghost" href="#/">${tr('Accueil', 'Home')}</a></div>`;
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
  return `<p class="muted small contacts-note">${tr('Pour choisir directement dans mes contacts, j’ouvre Mon PCC dans <strong>Chrome</strong> : le navigateur Brave ne le permet pas encore.', 'To choose directly from my contacts, I open Mon PCC in <strong>Chrome</strong>: the Brave browser does not support this yet.')}</p>`;
}

async function confirmContacts() {
  if (sessionStorage.getItem('monpcc.contactsOk')) return true;
  const ok = await modal({
    title: tr('Accéder à mes contacts', 'Access my contacts'),
    body: `<p>${tr('Mon téléphone va afficher sa liste de contacts. <strong>Seuls les contacts que je coche</strong> seront ajoutés à mon plan (nom et numéro). Mon PCC n’a pas accès au reste de mon carnet.', 'My phone will show its contact list. <strong>Only the contacts I tick</strong> will be added to my plan (name and number). Mon PCC cannot access the rest of my address book.')}</p>
      <ul><li>${tr('Les contacts choisis restent enregistrés sur ce téléphone, comme le reste de mon plan.', 'The chosen contacts stay saved on this phone, like the rest of my plan.')}</li>
      <li>${tr('Je vérifie avec chaque personne qu’elle est d’accord pour figurer dans mon plan et pour être contactée.', 'I check with each person that they agree to be in my plan and to be contacted.')}</li></ul>`,
    ok: tr('Ouvrir mes contacts', 'Open my contacts'),
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
    toast(tr('Impossible d’ouvrir les contacts sur cet appareil.', 'Contacts cannot be opened on this device.'));
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
  toast(added
    ? tr(`${added} contact${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''}. Pensez à préciser le lien ou le rôle.`, `${added} contact${added > 1 ? 's' : ''} added. Remember to add the relationship or role.`)
    : tr('Ces contacts figurent déjà dans la liste.', 'These contacts are already in the list.'));
}

/** Moyens d'envoi sûrs, selon le pays */
function safeWaysHTML() {
  return hasMES()
    ? `<ul><li>${tr('remise en main propre ou version imprimée ;', 'handing it over in person or as a printed copy;')}</li>
        <li>${tr('messagerie chiffrée (Signal, WhatsApp…) ;', 'an encrypted messaging app (Signal, WhatsApp…);')}</li>
        <li>${tr('dépôt dans Mon Espace Santé ;', 'adding it to Mon Espace Santé;')}</li>
        <li>${tr('envoi par mon soignant via la messagerie sécurisée de santé (MSSanté).', 'sending by my health professional through the secure health messaging service (MSSanté).')}</li></ul>`
    : `<ul><li>${tr('remise en main propre ou version imprimée ;', 'handing it over in person or as a printed copy;')}</li>
        <li>${tr('messagerie chiffrée (Signal, WhatsApp…) ;', 'an encrypted messaging app (Signal, WhatsApp…);')}</li>
        <li>${tr('remise à mon équipe de soins, pour qu’elle l’ajoute à mon dossier ;', 'giving it to my care team, so they can add it to my records;')}</li>
        <li>${tr('envoi par mon soignant via une messagerie sécurisée de santé.', 'sending by my health professional through secure health messaging.')}</li></ul>`;
}

async function confirmShare() {
  if (sessionStorage.getItem('monpcc.shareOk')) return true;
  const ok = await modal({
    title: tr('Avant d’envoyer', 'Before sending'),
    body: `<p>${tr('Mon plan contient des <strong>informations de santé</strong>. Une fois envoyé, il quitte ce téléphone et je n’en ai plus le contrôle.', 'My plan contains <strong>health information</strong>. Once sent, it leaves this phone and I no longer control it.')}</p>
      <ul><li>${tr('Je l’envoie seulement à des personnes de confiance ou aux professionnel·les qui m’accompagnent.', 'I only send it to people I trust or to the professionals who support me.')}</li>
      <li>${tr('Je privilégie un moyen sûr : remise en main propre, messagerie sécurisée de santé, application chiffrée.', 'I prefer a secure channel: in person, secure health messaging, an encrypted app.')}</li>
      <li>${tr('Je vérifie le destinataire avant d’envoyer.', 'I check the recipient before sending.')}</li></ul>`,
    ok: tr('J’ai compris, continuer', 'I understand, continue'),
  });
  if (ok) sessionStorage.setItem('monpcc.shareOk', '1');
  return ok;
}

/* ---------- rappel de relecture (fichier d'agenda .ics, rien n'est envoyé) ---------- */

/** Fichier d'agenda (.ics) pour un rappel d'une journée, avec alertes */
function reminderIcs(date, title, desc) {
  const d = date.replace(/-/g, '');
  const next = new Date(date + 'T12:00:00'); next.setDate(next.getDate() + 1);
  const d2 = next.toISOString().slice(0, 10).replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const icsEsc = (t) => t.replace(/[\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mon PCC//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:monpcc-relecture-${d}@mon-pcc`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d2}`,
    `SUMMARY:${icsEsc(title)}`, `DESCRIPTION:${icsEsc(desc)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, 'TRIGGER:-P7D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, 'TRIGGER:PT9H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

/** Liens d'ajout direct à un agenda (rien n'est envoyé par Mon PCC lui-même) */
function reminderLinks(date, title, desc) {
  const d = date.replace(/-/g, '');
  const next = new Date(date + 'T12:00:00'); next.setDate(next.getDate() + 1);
  const d2 = next.toISOString().slice(0, 10).replace(/-/g, '');
  const enc = encodeURIComponent;
  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(title)}&dates=${d}/${d2}&details=${enc(desc)}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${enc(title)}&startdt=${date}&enddt=${next.toISOString().slice(0, 10)}&allday=true&body=${enc(desc)}`,
  };
}

/** Fenêtre « Rappel de relecture » : date au choix, titre modifiable, ajout direct à l'agenda */
function reminderDialog() {
  const sig = plan.data.signature?.date;
  const def = plan.data.rappel?.date || addMonths(sig || new Date().toISOString().slice(0, 10), 6);
  const defTitle = plan.data.rappel?.title || tr('Relire mon plan de crise conjoint', 'Review my joint crisis plan');
  const desc = tr('Relire mon plan avec les personnes qui m’accompagnent (Mon PCC). À faire aussi après une crise ou un changement important.', 'Review my plan with the people who support me (Mon PCC). Also do this after a crisis or an important change.');
  const d = $('#modal');
  d.innerHTML = `<div class="modal-inner">
    <h2>📅 ${tr('Rappel de relecture', 'Review reminder')}</h2>
    <label class="field"><span>${tr('Date du rappel', 'Reminder date')}</span><input type="date" id="rem-date" value="${esc(def)}" min="${new Date().toISOString().slice(0, 10)}"></label>
    <div class="chips rem-quick">${[1, 3, 6, 12].map((m) => `<button type="button" class="chip" data-m="${m}">${tr(`dans ${m} mois`, `in ${m} month${m > 1 ? 's' : ''}`)}</button>`).join('')}</div>
    ${sig ? `<p class="muted small">${tr(`Conseillé : au plus tard 6 mois après la signature (${fmtDate(addMonths(sig, 6))}), et après chaque crise.`, `Suggested: no later than 6 months after signing (${fmtDate(addMonths(sig, 6))}), and after each crisis.`)}</p>` : ''}
    <label class="field"><span>${tr('Titre dans mon agenda', 'Title in my calendar')}</span><input id="rem-title" value="${esc(defTitle)}" maxlength="80"></label>
    <p class="muted small">${tr('Je peux choisir un titre discret (par exemple «&nbsp;Relecture&nbsp;») si d’autres personnes voient mon agenda.', 'I can choose a discreet title (for example “Review”) if other people can see my calendar.')}</p>
    <div class="stack">
      <button type="button" class="btn btn-primary" data-rem="ics">📅 ${env.isIos ? tr('Ajouter à mon agenda (Calendrier)', 'Add to my calendar (Calendar)') : tr('Fichier agenda (.ics)', 'Calendar file (.ics)')}</button>
      <button type="button" class="btn btn-secondary" data-rem="google">${tr('Google Agenda', 'Google Calendar')} ↗</button>
      <button type="button" class="btn btn-secondary" data-rem="outlook">Outlook ↗</button>
    </div>
    <p class="muted small">${tr('Avec Google Agenda ou Outlook, le titre et la date du rappel sont envoyés à ce service, comme pour tout évènement de mon agenda. Rien d’autre de mon plan.', 'With Google Calendar or Outlook, the reminder’s title and date are sent to that service, like any event in my calendar. Nothing else from my plan.')}</p>
    <div class="modal-actions"><button type="button" class="btn btn-ghost" data-rem="close">${tr('Fermer', 'Close')}</button></div>
  </div>`;
  const dateEl = d.querySelector('#rem-date');
  const titleEl = d.querySelector('#rem-title');
  const remember = () => {
    plan.data.rappel = { date: dateEl.value, title: titleEl.value.trim() || defTitle };
    scheduleSave(false); // le rappel ne fait pas partie du plan signé
  };
  d.onclick = async (e) => {
    const m = e.target.closest('[data-m]')?.dataset.m;
    if (m) { dateEl.value = addMonths(new Date().toISOString().slice(0, 10), +m); return; }
    const a = e.target.closest('[data-rem]')?.dataset.rem;
    if (!a) return;
    if (a === 'close') { d.close(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateEl.value)) { dateEl.focus(); return; }
    remember();
    const title = plan.data.rappel.title;
    const links = reminderLinks(dateEl.value, title, desc);
    if (a === 'google' || a === 'outlook') window.open(links[a], '_blank', 'noopener');
    else {
      const file = new File([reminderIcs(dateEl.value, title, desc)], tr('rappel-relecture.ics', 'review-reminder.ics'), { type: 'text/calendar' });
      if (env.isIos) {
        // Sur iPhone, ouvrir le fichier propose directement « Ajouter au calendrier »
        const u = URL.createObjectURL(file); location.href = u; setTimeout(() => URL.revokeObjectURL(u), 60000);
      } else if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title }); } catch (err) { if (err.name !== 'AbortError') download(file, file.name); }
      } else download(file, file.name);
    }
    d.close();
    toast(tr(`Rappel prévu le ${fmtDate(dateEl.value)}.`, `Reminder set for ${fmtDate(dateEl.value)}.`));
    rerender(() => route());
  };
  d.addEventListener('close', () => { d.onclick = null; }, { once: true });
  d.showModal();
}

/* ---------- page pour les professionnel·les ---------- */

function renderPros() {
  const elearn = 'https://plandecriseconjoint.ch/se-former-au-pcc/';
  app.innerHTML = `
    <h1>🩺 ${tr('Pour les professionnel·les', 'For professionals')}</h1>
    <p class="lead">${tr('Mon PCC aide la personne à préparer son plan de crise conjoint. Le plan, lui, se construit avec vous : voici comment l’accompagner.', 'Mon PCC helps people prepare their joint crisis plan. The plan itself is built with you: here is how to support it.')}</p>
    <section class="card">
      <h2>${tr('Le plan de crise conjoint en bref', 'The joint crisis plan in brief')}</h2>
      <p>${tr('Le PCC est une forme de déclaration anticipée en santé mentale, élaborée par <strong>décision partagée</strong> entre la personne, au moins un·e professionnel·le de son réseau et, si elle le souhaite, ses proches. Contrairement à des directives anticipées rédigées seul·e, chacun·e y définit son rôle avant la crise.', 'A joint crisis plan is a form of advance statement in mental health, developed through <strong>shared decision-making</strong> between the person, at least one professional from their network and, if they wish, the people close to them. Unlike advance directives written alone, everyone defines their role before a crisis.')}</p>
      <p>${tr('Ce que disent les études : des travaux pionniers (Henderson et al., <em>BMJ</em>, 2004) suggéraient moins d’hospitalisations sous contrainte. Un essai plus large (Thornicroft et al., <em>Lancet</em>, 2013) n’a pas retrouvé cette différence, mais une meilleure relation thérapeutique perçue ; ses auteurs et commentateurs pointent surtout la <strong>mise en œuvre</strong> : équipes peu impliquées, plans pas toujours consultés ni respectés lors des crises suivantes. L’adhésion de l’équipe fait la différence.', 'What the studies say: early work (Henderson et al., <em>BMJ</em>, 2004) suggested fewer compulsory admissions. A larger trial (Thornicroft et al., <em>Lancet</em>, 2013) did not find this difference, but did find a better perceived therapeutic relationship; its authors and commentators mainly point to <strong>implementation</strong>: teams not fully involved, plans not always consulted or followed in later crises. Team commitment makes the difference.')}</p>
    </section>
    <section class="card">
      <h2>${tr('Accompagner la démarche', 'Supporting the process')}</h2>
      <ol class="pro-steps">
        <li><strong>${tr('Proposer', 'Offer')}</strong> — ${tr('à distance d’une crise, comme une démarche volontaire. Montrer Mon PCC (QR code ou affiche ci-dessous) ; la version ado existe pour les adolescent·es.', 'away from a crisis, as a voluntary process. Show Mon PCC (QR code or poster below); there is a teen version for adolescents.')}</li>
        <li><strong>${tr('Laisser la personne préparer', 'Let the person prepare')}</strong> — ${tr('seule, avec ses mots. Les exemples ne s’affichent que sur demande, pour ne pas induire les réponses. Elle peut noter des points « à aborder avec mon soignant ».', 'on their own, in their own words. Examples only appear on request, so as not to lead the answers. They can note points “to discuss with my professional”.')}</li>
        <li><strong>${tr('Construire ensemble', 'Build it together')}</strong> — ${tr('relire chaque rubrique. Sur les soins à éviter, chercher une alternative réaliste. Dire clairement ce que l’équipe peut s’engager à respecter, et ce qui ne sera pas possible, et pourquoi.', 'read through each section. For care to avoid, look for a realistic alternative. Say clearly what the team can commit to, what will not be possible, and why.')}</li>
        <li><strong>${tr('Signer et diffuser', 'Sign and share')}</strong> — ${tr('chaque partenaire indique son rôle et signe. Le plan est ajouté au dossier, avec la synthèse d’une page pour les urgences. La personne choisit qui le reçoit.', 'each partner gives their role and signs. The plan is added to the records, with the one-page summary for emergencies. The person chooses who receives it.')}</li>
        <li><strong>${tr('Le faire vivre', 'Keep it alive')}</strong> — ${tr('le consulter lors des crises, le relire après chaque crise et au moins tous les six mois. Mon PCC montre ce qui a changé depuis la dernière signature.', 'consult it during crises, review it after each crisis and at least every six months. Mon PCC shows what has changed since the last signature.')}</li>
      </ol>
    </section>
    <section class="card">
      <h2>${tr('Confidentialité', 'Privacy')}</h2>
      <p>${tr('Mon PCC ne collecte aucune donnée : le plan reste sur le téléphone de la personne, qui décide de l’envoyer, à qui et comment (PDF protégeable par code, synthèse d’une page, dossier de santé). Aucun compte n’est nécessaire, ni pour elle ni pour vous.', 'Mon PCC collects no data: the plan stays on the person’s phone, and they decide whether to send it, to whom and how (code-protected PDF, one-page summary, health record). No account is needed, for them or for you.')}</p>
    </section>
    <section class="card">
      <h2>${tr('Faire connaître Mon PCC', 'Spreading the word')}</h2>
      <div class="stack">
        <button type="button" class="btn btn-primary" data-act="poster-download">🖨 ${tr('Affiche A4 avec QR code (PDF)', 'A4 poster with QR code (PDF)')}</button>
        <a class="btn btn-secondary" href="#/partager">📤 ${tr('Cartes, QR code et lien', 'Cards, QR code and link')}</a>
      </div>
    </section>
    <section class="card">
      <h2>${tr('Se former', 'Training')}</h2>
      <p>${tr('Le site officiel du PCC propose un e-learning gratuit et des informations sur la formation pratique en présentiel, ainsi que les formulaires officiels.', 'The official JCP website offers free e-learning (in French) and information on in-person practical training, as well as the official forms.')}</p>
      <a class="btn btn-secondary" href="${elearn}" target="_blank" rel="noopener">${tr('Se former au PCC ↗', 'JCP training ↗')}</a>
      <p class="muted small">${tr('Mon PCC est un projet indépendant, non validé par les auteur·es du PCC. Une remarque, une idée ?', 'Mon PCC is an independent project, not reviewed by the authors of the JCP. A comment, an idea?')} <a href="https://github.com/rodtrip2/mon-pcc/issues" target="_blank" rel="noopener noreferrer">${tr('Écrire sur GitHub', 'Write on GitHub')}</a></p>
    </section>`;
}

/* ---------- voix : lecture à voix haute et dictée ---------- */

function speakBtnHTML() {
  if (!ttsOn()) return '';
  return `<button type="button" class="icon tts-btn" data-act="speak" aria-pressed="false" aria-label="${tr('Lire à voix haute', 'Read aloud')}" title="${tr('Lire à voix haute', 'Read aloud')}" hidden>🔊</button>`;
}
function micBtnHTML(target, cls = '') {
  if (!dictationOn()) return '';
  return `<button type="button" class="icon mic-btn ${cls}" data-act="dictate" data-target="${esc(target)}" aria-pressed="false" aria-label="${tr('Dicter', 'Dictate')}" title="${tr('Dicter', 'Dictate')}">🎙</button>`;
}
/** Affiche les boutons 🔊 seulement si une voix est installée sur l'appareil */
function revealSpeak() {
  ttsReady().then((ok) => { if (ok) document.querySelectorAll('.tts-btn').forEach((b) => { b.hidden = false; }); });
}

async function voiceSectionHTML() {
  const mode = dictationPref();
  // La disponibilité n'est vérifiée qu'à la demande (certains navigateurs sans service de voix plantent sinon)
  const st = localCheckSupported() ? 'check' : 'unknown';
  const localTxt = localStatusText(st);
  return voiceHTML(mode, localTxt);
}

function localStatusText(st) {
  return {
    check: `<button type="button" class="link small" data-act="dict-check">${tr('Vérifier si c’est disponible sur ce téléphone', 'Check whether it is available on this phone')}</button>`,
    available: tr('✓ Disponible sur ce téléphone.', '✓ Available on this phone.'),
    downloadable: tr('Disponible après un téléchargement unique de la langue (fait au premier usage).', 'Available after a one-time language download (done on first use).'),
    downloading: tr('Téléchargement de la langue en cours…', 'Language download in progress…'),
    unavailable: tr('Non disponible dans ce navigateur pour cette langue.', 'Not available in this browser for this language.'),
    unknown: tr('Ce navigateur ne permet pas la dictée sur l’appareil (essayer une version récente de Chrome).', 'This browser does not support on-device dictation (try a recent version of Chrome).'),
  }[st] || '';
}

function voiceHTML(mode, localTxt) {
  return `<div id="voix">
      <label class="check"><input type="checkbox" data-act="tts" ${ttsOn() ? 'checked' : ''}> <strong>${tr('Lecture à voix haute des questions', 'Read questions aloud')}</strong></label>
      <p class="muted small">${ttsAvailable() ? tr('Un bouton 🔊 lit chaque question avec une voix installée sur ce téléphone : aucun texte n’est envoyé.', 'A 🔊 button reads each question with a voice installed on this phone: no text is sent.') : tr('Aucune voix n’est installée sur ce téléphone pour cette langue : le bouton 🔊 n’apparaîtra pas (Mon PCC n’utilise jamais de voix en ligne).', 'No voice is installed on this phone for this language: the 🔊 button will not appear (Mon PCC never uses online voices).')}</p>
      <fieldset class="choice"><legend class="small"><strong>${tr('Dictée vocale', 'Voice dictation')}</strong> ${tr('(désactivée par défaut)', '(off by default)')}</legend>
        ${!dictationSupported() ? `<p class="muted small">${tr('Ce navigateur ne propose pas la dictée.', 'This browser does not offer dictation.')}</p>` : `
        <label class="radio"><input type="radio" name="dict" value="off" data-act="dictation" ${mode === 'off' ? 'checked' : ''}> <span>${tr('Désactivée', 'Off')}</span></label>
        <label class="radio"><input type="radio" name="dict" value="local" data-act="dictation" ${mode === 'local' ? 'checked' : ''}> <span><strong>${tr('Sur ce téléphone uniquement', 'On this phone only')}</strong> ${tr('(recommandé)', '(recommended)')}<br><span class="muted small">${tr('Ma voix est transformée en texte sur le téléphone, sans être envoyée.', 'My voice is turned into text on the phone, without being sent.')} <span id="dict-local">${localTxt}</span></span></span></label>
        <label class="radio"><input type="radio" name="dict" value="online" data-act="dictation" ${mode === 'online' ? 'checked' : ''}> <span><strong>${tr('Autoriser la dictée en ligne', 'Allow online dictation')}</strong><br><span class="muted small">${tr('⚠ Ma voix est envoyée aux serveurs de l’éditeur du navigateur.', '⚠ My voice is sent to the browser maker’s servers.')}</span></span></label>`}
      </fieldset>
    </div>`;
}

async function confirmOnlineDictation() {
  return modal({
    title: tr('Autoriser la dictée en ligne ?', 'Allow online dictation?'),
    body: `<div class="warn small"><p><strong>${tr('Cette option va à l’encontre du principe de Mon PCC : rien ne quitte mon téléphone.', 'This option goes against Mon PCC’s principle that nothing leaves my phone.')}</strong></p>
      <ul><li>${tr('Quand je dicte, <strong>ma voix est envoyée aux serveurs de l’éditeur de mon navigateur</strong> (Google pour Chrome, Apple pour Safari…) pour être transformée en texte.', 'When I dictate, <strong>my voice is sent to my browser maker’s servers</strong> (Google for Chrome, Apple for Safari…) to be turned into text.')}</li>
      <li>${tr('Ce que je dis peut contenir des <strong>informations de santé</strong>. Mon PCC ne contrôle pas ce traitement ni sa conservation.', 'What I say may contain <strong>health information</strong>. Mon PCC does not control how it is processed or kept.')}</li>
      <li>${tr('Je peux revenir à « Sur ce téléphone uniquement » ou « Désactivée » à tout moment.', 'I can switch back to “On this phone only” or “Off” at any time.')}</li></ul></div>`,
    ok: tr('J’ai compris, autoriser', 'I understand, allow'),
    danger: true,
  });
}

async function runDictation(btn) {
  if (btn.getAttribute('aria-pressed') === 'true') return; // l'appui arrête l'écoute
  const input = document.getElementById(btn.dataset.target);
  if (!input) return;
  stopSpeaking();
  const r = await dictateInto(input, btn, (st) => {
    if (st === 'installing') toast(tr('Téléchargement de la langue pour la dictée sur le téléphone…', 'Downloading the language for on-device dictation…'));
    if (st === 'listening') toast(tr('Je parle… (toucher 🎙 pour arrêter)', 'Speak now… (tap 🎙 to stop)'));
  });
  const msg = {
    'no-local': tr('La dictée sur le téléphone n’est pas disponible ici. Aucune voix n’a été envoyée.', 'On-device dictation is not available here. No voice was sent.'),
    'need-install': tr('La langue de dictée n’est pas encore prête sur ce téléphone. Réessayer dans un moment.', 'The dictation language is not ready on this phone yet. Try again shortly.'),
    denied: tr('Le micro n’est pas autorisé pour Mon PCC.', 'The microphone is not allowed for Mon PCC.'),
    error: tr('La dictée n’a pas fonctionné.', 'Dictation did not work.'),
  }[r];
  if (msg) toast(msg);
  input.focus();
}

/* ---------- préparer l'entretien avec le soignant ---------- */

/** Notes « à aborder avec mon soignant » d'une étape (jamais dans le plan imprimé ou envoyé) */
function talkNoteHTML(step) {
  const v = plan.data.notes?.[step.id] || '';
  return `<details class="talk" ${v ? 'open' : ''}><summary>💬 ${tr('À aborder avec mon soignant', 'To discuss with my professional')}</summary>
    ${micBtnHTML(`note-${step.id}`, 'mic-corner')}
    <textarea rows="2" id="note-${esc(step.id)}" data-note="${esc(step.id)}" data-fk="note:${esc(step.id)}" placeholder="${tr('Une question, un doute, un point à préciser ensemble…', 'A question, a doubt, something to clarify together…')}">${esc(v)}</textarea>
    <p class="muted small">${tr('Ces notes restent sur ce téléphone : elles ne figurent pas dans le plan imprimé ou envoyé.', 'These notes stay on this phone: they are not included in the printed or sent plan.')} <a href="#/entretien">${tr('Toutes mes notes', 'All my notes')}</a></p></details>`;
}

const TEXT_KEY = 'monpcc.text';
const EASY_KEY = 'monpcc.easy';
const TTS_KEY = 'monpcc.tts';
const ttsOn = () => { try { return localStorage.getItem(TTS_KEY) === '1'; } catch { return false; } };
const easyOn = () => { try { return localStorage.getItem(EASY_KEY) === '1'; } catch { return false; } };
const textSize = () => { try { return localStorage.getItem(TEXT_KEY) || 'm'; } catch { return 'm'; } };
let talkMode = false; // mode entretien : texte agrandi, seulement pendant l'entretien (jamais enregistré)
function applyTextSize(v = textSize()) {
  document.documentElement.dataset.text = talkMode ? ({ m: 'l', l: 'xl', xl: 'xl' }[v] || 'l') : v;
  if (typeof talkBar !== 'undefined') {
    talkBar.hidden = !talkMode;
    document.body.classList.toggle('has-talk-bar', talkMode);
  }
}
function setTalkMode(on) {
  talkMode = on;
  applyTextSize();
  if (location.hash.startsWith('#/entretien')) rerender(renderTalk);
}

function renderTalk() {
  const notes = plan.data.notes || {};
  const withNotes = STEPS.map((st, i) => [st, i]).filter(([st]) => (notes[st.id] || '').trim());

  app.innerHTML = `
    <h1>🗣 ${tr('Préparer mon entretien', 'Prepare my appointment')}</h1>
    <p class="lead">${tr('Le plan de crise conjoint se construit avec un·e professionnel·le. Je note ici ce que je veux aborder ; pendant l’entretien, je peux afficher mon plan en grand pour le relire ensemble.', 'A joint crisis plan is built with a professional. I note here what I want to talk about; during the appointment, I can show my plan in large text to read it through together.')}</p>
    <section class="card">
      <h2>💬 ${tr('Mes points à aborder', 'What I want to discuss')}</h2>
      ${withNotes.length ? `<ul class="talk-list">${withNotes.map(([st, i]) => `<li><a href="#/etape/${i}"><strong>${esc(st.title)}</strong></a><p>${esc(notes[st.id]).replace(/\n/g, '<br>')}</p></li>`).join('')}</ul>`
        : `<p class="muted">${tr('Aucun point noté pour l’instant. Dans chaque étape, la rubrique « À aborder avec mon soignant » permet d’en ajouter.', 'Nothing noted yet. In each step, the “To discuss with my professional” section lets me add points.')}</p>`}
    </section>
    <section class="card">
      <h2>🔎 ${tr('Pendant l’entretien', 'During the appointment')}</h2>
      <div class="stack">
        <button type="button" class="btn ${talkMode ? 'btn-secondary' : 'btn-primary'}" data-act="talk-toggle">${talkMode ? tr('✕ Terminer le mode entretien', '✕ End appointment mode') : tr('🗣 Démarrer le mode entretien (texte agrandi)', '🗣 Start appointment mode (larger text)')}</button>
        <a class="btn btn-secondary" href="#/plan">📄 ${tr('Relire mon plan', 'Read my plan')}</a>
        ${(plan.data.versions || []).length ? `<a class="btn btn-secondary" href="#/versions">🔄 ${tr('Ce qui a changé depuis la dernière signature', 'What has changed since the last signature')}</a>` : ''}
      </div>
      <p class="muted small">${tr('Le texte reste agrandi sur toutes les pages pendant l’entretien. Le bandeau en haut de l’écran permet de terminer à tout moment ; le mode s’arrête aussi en fermant l’application.', 'Text stays larger on every page during the appointment. The banner at the top of the screen ends it at any time; the mode also stops when the app is closed.')}</p>
    </section>`;
}

/* ---------- versions signées et changements ---------- */

/** Contenu du plan sans les signatures dessinées ni les fichiers (pour l'archive) */
function contentData(d) {
  const { signature, carte, versions, dossiers, masquerNoteMineur, boiteOutils, notes, rappel, ...rest } = d;
  const copy = JSON.parse(JSON.stringify(rest));
  copy.boiteOutils = (boiteOutils || []).map(({ kind, title, text, author, url, ex, photos }) => ({ kind, title, text, author, url, ex, photos: photos ? photos.map(() => ({})) : undefined }));
  copy.signature = { lieu: signature?.lieu || '', date: signature?.date || '' };
  return copy;
}

/** À chaque signature : garde la version signée (10 au plus) */
/** Plans signés avant l'historique : on garde la version signée actuelle si les signatures sont valables */
function ensureVersionHistory() {
  const d = plan?.data;
  if (!d || (d.versions || []).length) return;
  const valid = (d.signature?.signataires || []).filter((r) => sigValid(r, plan));
  if (!valid.length) return;
  const at = valid.map((r) => r.signedAt).sort().pop();
  d.versions = [{ at, signers: valid.map((r) => ({ nom: r.nom || '', role: r.role || '', at: r.signedAt })), data: contentData(d) }];
  scheduleSave(false);
}

function archiveSigned() {
  const d = plan.data;
  const snap = contentData(d);
  const signers = (d.signature?.signataires || []).filter((r) => sigValid(r, plan)).map((r) => ({ nom: r.nom || '', role: r.role || '', at: r.signedAt }));
  const vs = (d.versions ??= []);
  const last = vs[vs.length - 1];
  const same = last && JSON.stringify({ ...last.data, signature: null }) === JSON.stringify({ ...snap, signature: null });
  if (same) { last.signers = signers; last.data = snap; return; }
  vs.push({ at: new Date().toISOString(), signers, data: snap });
  if (vs.length > 10) vs.shift();
}

/** Lignes du plan par étape, pour comparer deux versions */
function linesByStep(data) {
  return STEPS.filter((st) => st.type !== 'final').map((st) => ({
    st,
    lines: stepContent(st, data).filter((b) => !b.signatures).flatMap((b) => b.lines.map((l) => (b.label ? `${b.label} › ${l}` : l))),
  }));
}

function changesHTML(oldData, newData) {
  const before = linesByStep(oldData);
  const after = linesByStep(newData);
  const rows = after.map(({ st, lines }, k) => {
    const old = before[k].lines;
    const added = lines.filter((l) => !old.includes(l));
    const removed = old.filter((l) => !lines.includes(l));
    if (!added.length && !removed.length) return '';
    return `<li><strong>${esc(st.title)}</strong><ul class="diff">
      ${removed.map((l) => `<li class="diff-del"><span aria-hidden="true">−</span> <span class="sr-only">${tr('retiré :', 'removed:')}</span> ${esc(l)}</li>`).join('')}
      ${added.map((l) => `<li class="diff-add"><span aria-hidden="true">+</span> <span class="sr-only">${tr('ajouté :', 'added:')}</span> ${esc(l)}</li>`).join('')}
    </ul></li>`;
  }).filter(Boolean);
  return rows.length ? `<ul class="diff-steps">${rows.join('')}</ul>` : `<p class="muted">${tr('Aucun changement dans le contenu.', 'No change in the content.')}</p>`;
}

const signersText = (v) => (v.signers || []).map((r) => [r.nom, r.role].filter(Boolean).join(', ')).filter(Boolean).join(' ; ');

function renderVersions(arg) {
  const vs = plan.data.versions || [];
  if (arg !== undefined && arg !== '' && vs[+arg]) {
    const v = vs[+arg];
    const doc = { data: { ...v.data, signature: { ...v.data.signature, signataires: (v.signers || []).map((r) => ({ nom: r.nom, role: r.role })) } }, contentUpdated: v.at, updated: v.at };
    app.innerHTML = `
      <h1>${tr('Version signée', 'Signed version')}</h1>
      <p class="lead">${tr(`Signée sur écran le ${esc(fmtDateTime(v.at))}`, `Signed on screen on ${esc(fmtDateTime(v.at))}`)}${signersText(v) ? ` ${tr('par', 'by')} ${esc(signersText(v))}` : ''}.</p>
      <p class="muted small">${tr('Les signatures dessinées ne sont pas conservées dans l’historique.', 'Drawn signatures are not kept in the history.')}</p>
      <section class="card no-print">
        <h2>${+arg > 0 ? tr(`Changements par rapport à la version du ${esc(fmtDateTime(vs[+arg - 1].at))}`, `Changes since the version of ${esc(fmtDateTime(vs[+arg - 1].at))}`) : tr('Première version signée', 'First signed version')}</h2>
        ${+arg > 0 ? changesHTML(vs[+arg - 1].data, v.data) : `<p class="muted">${tr('Pas de version signée plus ancienne à comparer.', 'No older signed version to compare with.')}</p>`}
        ${+arg < vs.length - 1 ? `<p class="small"><a href="#/versions/${+arg + 1}">${tr('Version suivante →', 'Next version →')}</a></p>` : ''}
      </section>
      <article class="doc">${documentHTML(doc)}</article>
      <div class="nav-bottom no-print"><a class="btn btn-ghost" href="#/versions">${tr('← Versions', '← Versions')}</a></div>`;
    return;
  }
  const last = vs[vs.length - 1];
  app.innerHTML = `
    <h1>🔄 ${tr('Versions signées', 'Signed versions')}</h1>
    <p class="lead">${tr('À chaque signature, Mon PCC garde une copie du plan sur ce téléphone. Cela aide à relire ensemble ce qui a changé avant de signer à nouveau.', 'Each time the plan is signed, Mon PCC keeps a copy on this phone. This helps you review together what has changed before signing again.')}</p>
    ${last ? `<section class="card">
      <h2>${tr('Changements depuis la dernière version signée', 'Changes since the last signed version')}</h2>
      <p class="muted small">${tr(`Version du ${esc(fmtDateTime(last.at))}`, `Version of ${esc(fmtDateTime(last.at))}`)}${signersText(last) ? ` · ${esc(signersText(last))}` : ''}</p>
      ${changesHTML(last.data, contentData(plan.data))}
    </section>
    <section class="card">
      <h2>${tr('Toutes les versions', 'All versions')}</h2>
      <ol class="versions">${vs.map((v, k) => `<li><a href="#/versions/${k}">${esc(fmtDateTime(v.at))}</a>${signersText(v) ? ` <span class="muted small">— ${esc(signersText(v))}</span>` : ''}
        <br><a class="small" href="#/versions/${k}">${k > 0 ? tr('Voir cette version et ses changements', 'See this version and its changes') : tr('Voir cette version', 'See this version')}</a></li>`).reverse().join('')}</ol>
      <p class="muted small">${tr('Les 10 dernières versions sont gardées.', 'The last 10 versions are kept.')}</p>
    </section>` : `<p class="card muted">${tr('Aucune version signée pour l’instant.', 'No signed version yet.')}</p>`}
    <div class="nav-bottom"><a class="btn btn-ghost" href="#/plan">${tr('← Mon plan', '← My plan')}</a></div>`;
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
      <h2>${send ? tr('📤 Envoyer mon plan en PDF', '📤 Send my plan as a PDF') : tr('📄 Enregistrer mon plan en PDF', '📄 Save my plan as a PDF')}</h2>
      ${send ? `<p class="small">${tr('Mon plan contient des <strong>informations de santé</strong>. Une fois envoyé, il quitte ce téléphone : je l’envoie seulement à des personnes de confiance ou aux professionnel·les qui m’accompagnent, et je vérifie le destinataire.', 'My plan contains <strong>health information</strong>. Once sent, it leaves this phone: I only send it to people I trust or to the professionals who support me, and I check the recipient.')}</p>
      <div class="safe-ways small"><strong>${tr('Je choisis un moyen d’envoi sûr :', 'I choose a secure way to send it:')}</strong>
        ${safeWaysHTML()}
        ${tr('J’évite, si possible, un simple e-mail.', 'If possible, I avoid plain email.')}
        <button value="mes" class="btn btn-secondary btn-sm mes-btn" formnovalidate>${hasMES() ? tr('🏥 Déposer dans Mon Espace Santé', '🏥 Add to Mon Espace Santé') : tr('🏥 Ajouter à mon dossier de santé', '🏥 Add to my health record')}</button></div>` : ''}
      <fieldset class="choice">
        <legend class="sr-only">${tr('Protection', 'Protection')}</legend>
        ${send ? `<label class="radio"><input type="radio" name="mode" value="none" checked> <span><strong>${tr('Sans code', 'No code')}</strong> ${tr('(conseillé pour un envoi)', '(recommended for sending)')}<br><span class="muted small">${tr('Le destinataire pourra ouvrir mon plan immédiatement, y compris en situation de crise.', 'The recipient can open my plan straight away, including in a crisis.')}</span></span></label>` : ''}
        <label class="radio"><input type="radio" name="mode" value="code" ${send ? '' : 'checked'}> <span><strong>${tr('Protéger par un code', 'Protect with a code')}</strong> ${send ? `<br><span class="muted small">${tr('Seulement si le destinataire peut recevoir le code par un autre moyen.', 'Only if the recipient can receive the code another way.')}</span>` : `${tr('(recommandé)', '(recommended)')}<br><span class="muted small">${tr('Le code sera demandé pour ouvrir le PDF.', 'The code will be needed to open the PDF.')}</span>`}</span></label>
        <div class="code-box">
          <label class="field"><span>${tr('Code (6 caractères minimum)', 'Code (at least 6 characters)')}</span>
            <input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
          <button type="button" class="btn btn-ghost btn-sm" data-gen>${tr('Générer un code', 'Generate a code')}</button>
          ${send
            ? `<div class="warn small" role="note"><strong>${tr('⚠ Attention aux risques d’un envoi avec code :', '⚠ Be aware of the risks of sending with a code:')}</strong>
                <ul><li>${tr('sans le code, le destinataire <strong>ne pourra pas lire mon plan</strong>, y compris en situation de crise, quand il est le plus utile ;', 'without the code, the recipient <strong>will not be able to read my plan</strong>, including in a crisis, when it matters most;')}</li>
                <li>${hasMES() ? tr('un fichier protégé <strong>ne peut pas être intégré</strong> à mon dossier à l’hôpital ni à Mon Espace Santé sans le code ;', 'a protected file <strong>cannot be added</strong> to my hospital records or to Mon Espace Santé without the code;') : tr('un fichier protégé <strong>ne peut pas être intégré</strong> à mon dossier de soins sans le code ;', 'a protected file <strong>cannot be added</strong> to my health records without the code;')}</li>
                <li>${tr('je transmets le code <strong>par un autre moyen</strong> (de vive voix, par SMS séparé…), jamais dans le même message que le fichier.', 'I share the code <strong>another way</strong> (in person, by a separate text…), never in the same message as the file.')}</li></ul></div>`
            : `<p class="muted small">${tr('Je note ce code : sans lui, le fichier ne pourra pas être ouvert. Mon PCC ne le garde pas.', 'I write this code down: without it, the file cannot be opened. Mon PCC does not keep it.')}</p>`}
        </div>
        ${send ? '' : `<label class="radio"><input type="radio" name="mode" value="none"> <span>${tr('Sans code', 'No code')}</span></label>`}
      </fieldset>
      <p class="error" role="alert" hidden></p>
      <div class="modal-actions">
        <button value="cancel" class="btn btn-ghost" formnovalidate>${tr('Annuler', 'Cancel')}</button>
        <button value="ok" class="btn btn-primary">${send ? tr('Préparer l’envoi', 'Prepare to send') : tr('Enregistrer', 'Save')}</button>
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
        err.textContent = tr('Le code doit comporter au moins 6 caractères.', 'The code must be at least 6 characters long.');
        err.hidden = false;
        f.code.focus();
      }
    });
    d.addEventListener('close', () => {
      if (d.returnValue === 'mes') { location.hash = '#/mon-espace-sante'; return resolve(null); }
      if (d.returnValue !== 'ok') return resolve(null);
      resolve({ password: f.mode.value === 'code' ? f.code.value.trim() : '' });
    }, { once: true });
    d.returnValue = '';
    d.showModal();
    sync();
  });
}

async function makePlanPdf(password, summary = false) {
  saveState.textContent = tr('Préparation du PDF…', 'Preparing the PDF…');
  try {
    const blob = await (summary ? buildSummaryPdf : buildPlanPdf)(plan, password);
    return new File([blob], fileBaseName(plan) + (summary ? tr('-synthese', '-summary') : '') + (password ? tr('-protege', '-protected') : '') + '.pdf', { type: 'application/pdf' });
  } finally {
    saveState.textContent = savedLabel();
  }
}

const pdfFail = () => toast(tr('Impossible de créer le PDF sur cet appareil.', 'The PDF cannot be created on this device.'));

async function pdfSave(summary = false) {
  const opt = await pdfDialog('save');
  if (!opt) return;
  try {
    const file = await makePlanPdf(opt.password, summary);
    download(file, file.name);
    toast(opt.password ? tr('PDF protégé enregistré. Gardez le code en lieu sûr.', 'Protected PDF saved. Keep the code somewhere safe.') : tr('PDF enregistré.', 'PDF saved.'));
  } catch {
    pdfFail();
  }
}

async function pdfSend() {
  const opt = await pdfDialog('send');
  if (!opt) return;
  let file;
  try { file = await makePlanPdf(opt.password); } catch { pdfFail(); return; }
  const share = () => navigator.share({ files: [file], title: tr('Mon plan de crise conjoint', 'My joint crisis plan') });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await share(); return; } catch (e) {
      if (e.name === 'AbortError') return;
      // Certains navigateurs exigent un nouveau geste après la préparation
      if (e.name === 'NotAllowedError') {
        if (await modal({ title: tr('Le PDF est prêt', 'The PDF is ready'), body: `<p>${opt.password ? tr('Le fichier est protégé par le code choisi.', 'The file is protected with the chosen code.') : tr('Le fichier n’est pas protégé.', 'The file is not protected.')}</p>`, ok: tr('Envoyer', 'Send') })) {
          try { await share(); return; } catch (e2) { if (e2.name === 'AbortError') return; }
        } else return;
      }
    }
  }
  download(file, file.name);
  toast(tr('Envoi direct indisponible : le PDF a été téléchargé, je peux le joindre à un message.', 'Direct sending is not available: the PDF has been downloaded, and I can attach it to a message.'));
}

async function shareText() {
  if (!(await confirmShare())) return;
  const text = planText(plan);
  if (navigator.share) {
    try { await navigator.share({ title: tr('Mon plan de crise conjoint', 'My joint crisis plan'), text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(text); toast(tr('Texte copié : collez-le dans le message de votre choix.', 'Text copied: paste it into the message of your choice.')); } catch { toast(tr('Copie impossible sur cet appareil.', 'Copying is not possible on this device.')); }
}

/* ---------- réglages ---------- */

async function renderOfflineStatus() {
  const box = $('#ex-off-status');
  if (!box) return;
  const st = await offlineStatus();
  const btn = app.querySelector('[data-act="ex-offline"]');
  if (st.sw && st.pages) {
    box.innerHTML = `✓ <strong>${tr('Prêts hors connexion', 'Ready offline')}</strong>${tr(' :', ':')} ${tr(`${st.pages} fichiers de pages`, `${st.pages} page files`)}${st.audios ? tr(` et ${st.audios} sons`, ` and ${st.audios} sounds`) : ''}.`;
    if (btn) btn.textContent = tr('↻ Mettre à jour les exercices hors connexion', '↻ Update offline exercises');
  } else box.textContent = tr('Pas encore téléchargés sur ce téléphone.', 'Not downloaded on this phone yet.');
}

/** Avertissements que la personne a masqués (libellés lisibles) */
function hiddenWarnings() {
  const h = [];
  const ls = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const ss = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
  if (ls(EMBED_OK)) h.push(tr('Avertissement avant de lire une vidéo ou une musique d’un autre site', 'Warning before playing a video or music from another site'));
  if (plan?.data?.masquerNoteMineur) h.push(tr('Message « Si j’ai moins de 18 ans » (Mon Espace Santé)', '“If I am under 18” message (Mon Espace Santé)'));
  if (installPref() && !isStandalone()) h.push(tr('Bandeau proposant d’installer l’application', 'Banner offering to install the app'));
  if (ss('monpcc.contactsOk')) h.push(tr('Information avant d’ouvrir mes contacts', 'Information before opening my contacts'));
  if (ss('monpcc.shareOk')) h.push(tr('Avertissement avant d’envoyer mon plan', 'Warning before sending my plan'));
  return h;
}

function resetWarnings() {
  try { localStorage.removeItem(EMBED_OK); } catch { /* ignoré */ }
  try { sessionStorage.removeItem('monpcc.contactsOk'); sessionStorage.removeItem('monpcc.shareOk'); } catch { /* ignoré */ }
  if (plan?.data?.masquerNoteMineur) { delete plan.data.masquerNoteMineur; scheduleSave(false); }
  setInstallPref(null);
}

function localeSectionHTML() {
  const lp = langPref();
  const cp = countryPref();
  const autoLang = LANGS[deviceLang()];
  const autoCountry = L(COUNTRIES[deviceCountry()].name);
  return `<section class="card" id="langue">
      <h2>🌐 ${tr('Langue et pays', 'Language and country')}</h2>
      <fieldset class="choice"><legend class="small"><strong>${tr('Langue', 'Language')}</strong></legend>
        <label class="radio"><input type="radio" name="lang" value="" data-act="lang" ${lp ? '' : 'checked'}> <span>${tr('Automatique', 'Automatic')} <span class="muted small">(${tr('langue du téléphone :', 'phone language:')} ${esc(autoLang)})</span></span></label>
        ${Object.entries(LANGS).map(([k, v]) => `<label class="radio"><input type="radio" name="lang" value="${k}" data-act="lang" ${lp === k ? 'checked' : ''} lang="${k}"> <span>${esc(v)}</span></label>`).join('')}
      </fieldset>
      <label class="field"><span><strong>${tr('Pays', 'Country')}</strong> <span class="muted small">${tr('(numéros d’urgence, ressources d’aide, dossier de santé)', '(emergency numbers, help resources, health record)')}</span></span>
        <select data-act="country">
          <option value="" ${cp ? '' : 'selected'}>${tr('Automatique', 'Automatic')} (${esc(autoCountry)})</option>
          ${COUNTRY_CODES.map((c) => `<option value="${c}" ${cp === c ? 'selected' : ''}>${COUNTRIES[c].flag} ${esc(L(COUNTRIES[c].name))}</option>`).join('')}
        </select></label>
      <p class="muted small">${tr('Mes réponses ne sont pas traduites : elles restent telles que je les ai écrites. Les questions, conseils et exemples suivent la langue choisie.', 'My answers are not translated: they stay as I wrote them. Questions, tips and examples follow the chosen language.')}</p>
      ${LANG === 'en' ? '<p class="muted small">The adult questions come from the official English version of the joint crisis plan. There is no official English teen version yet: the teen questions are an unofficial translation by Mon PCC.</p>' : ''}
    </section>`;
}

function renderSettings() {
  const prot = store.isProtected();
  app.innerHTML = `
    <h1>${tr('Réglages', 'Settings')}</h1>
    ${localeSectionHTML()}
    <section class="card" id="accessibilite">
      <h2>♿ ${tr('Accessibilité', 'Accessibility')}</h2>
      <p class="muted small">${tr('Options désactivées par défaut, à activer selon mes besoins.', 'Options are off by default; I turn on the ones I need.')}</p>
      <label class="check"><input type="checkbox" data-act="easy" ${easyOn() ? 'checked' : ''}> <strong>${tr('Questions en « facile à lire et à comprendre » (FALC)', 'Easy-read questions')}</strong></label>
      <p class="muted small">${tr('Des phrases courtes et des mots simples. La question officielle du PCC reste visible en dessous, et c’est elle qui figure dans le plan imprimé.', 'Short sentences and simple words. The official JCP question stays visible below, and it is the one used in the printed plan.')}</p>
      <p class="small"><strong>${tr('Taille du texte', 'Text size')}</strong></p>
      <div class="choice">${[['m', tr('Normale', 'Normal')], ['l', tr('Grande', 'Large')], ['xl', tr('Très grande', 'Extra large')]].map(([v, l]) => `<label class="radio"><input type="radio" name="text" value="${v}" data-act="text-size" ${textSize() === v ? 'checked' : ''}> <span>${l}</span></label>`).join('')}</div>
      <div id="voice-slot"></div>
    </section>
    <section class="card" id="version">
      <h2>${tr('Version du plan', 'Plan version')}</h2>
      <p class="muted small">${tr('Je peux changer de version à tout moment. Les réponses communes sont gardées ; les rubriques propres à l’autre version sont conservées mais masquées.', 'I can switch versions at any time. Shared answers are kept; sections specific to the other version are kept but hidden.')}</p>
      <div class="choice">
        ${Object.entries(VERSIONS).map(([v, c]) => `<label class="radio"><input type="radio" name="version" value="${v}" data-act="version" ${VERSION === v ? 'checked' : ''}>
          <span><strong>${v === 'ado' ? tr('Version ado', 'Teen version') : tr('Version adulte', 'Adult version')}</strong> (${c.steps.length} ${tr('étapes', 'steps')})<br><span class="muted small">${v === 'ado'
            ? tr('Questions adaptées aux adolescent·es. Version en phase de test sur le site officiel du PCC.', 'Questions adapted for teenagers. Test version on the official JCP website; unofficial English translation by Mon PCC.')
            : tr('La version de référence, avec les soins souhaités, à éviter et les démarches à déléguer.', 'The reference version, including care I want, care to avoid and practical arrangements.')}</span></span></label>`).join('')}
      </div>
    </section>
    <section class="card">
      <h2>${tr('Protéger par un code', 'Protect with a code')}</h2>
      <p>${prot ? tr('Mon plan est <strong>chiffré</strong> sur ce téléphone. Le code est demandé à chaque ouverture.', 'My plan is <strong>encrypted</strong> on this phone. The code is needed each time I open the app.') : tr('Je peux chiffrer mon plan avec un code personnel. Il sera demandé à chaque ouverture de l’application.', 'I can encrypt my plan with a personal code. It will be needed each time I open the app.')}</p>
      ${prot
        ? `<div class="stack"><button class="btn btn-secondary" data-act="lock-now">${tr('Verrouiller maintenant', 'Lock now')}</button><button class="btn btn-ghost" data-act="unprotect">${tr('Retirer le code', 'Remove the code')}</button></div>
          <div class="crisis-open" id="acces-crise">
            <label class="check"><input type="checkbox" data-act="crisis-open" ${crisisOpenPref() ? 'checked' : ''}> <strong>${tr('Ouvrir l’écran « Ça ne va pas » sans le code', 'Open the “I’m not OK” screen without the code')}</strong></label>
            <p class="muted small">${tr('Pratique en pleine crise, quand taper un code est difficile. Mais <strong>toute personne qui a mon téléphone en main</strong> pourra alors lire, sans le code : mes stratégies, les personnes à appeler et leurs numéros, et les citations, liens et exercices de ma boîte à outils. Le reste du plan, les photos, les vidéos et les sons restent protégés.', 'Handy in a crisis, when typing a code is hard. But <strong>anyone holding my phone</strong> will then be able to read, without the code: my strategies, the people to call and their numbers, and the quotes, links and exercises in my toolbox. The rest of the plan, photos, videos and sounds stay protected.')}</p>
          </div>`
        : `<form class="stack" data-act="protect">
            <label class="field"><span>${tr('Code (6 caractères minimum)', 'Code (at least 6 characters)')}</span><input type="password" name="c1" minlength="6" required autocomplete="new-password"></label>
            <label class="field"><span>${tr('Confirmer le code', 'Confirm the code')}</span><input type="password" name="c2" minlength="6" required autocomplete="new-password"></label>
            <p class="muted small">${tr('Attention : si j’oublie ce code, personne ne pourra récupérer mon plan, pas même les créateurs de l’application.', 'Warning: if I forget this code, nobody can recover my plan, not even the app’s creators.')}</p>
            <button class="btn btn-primary">${tr('Activer la protection', 'Turn on protection')}</button></form>`}
    </section>
    <section class="card" id="exercices-hors-connexion">
      <h2>${tr('Exercices hors connexion', 'Offline exercises')}</h2>
      <p>${tr('Les exercices de Ma boussole bien-être s’ouvrent dans Mon PCC. Pour pouvoir les faire <strong>sans connexion</strong>, je les télécharge une fois sur ce téléphone (pages et sons, environ 20 Mo).', 'The Ma boussole bien-être exercises open inside Mon PCC. To do them <strong>offline</strong>, I download them once to this phone (pages and sounds, about 20 MB).')}</p>
      <p class="small" id="ex-off-status">${tr('Vérification…', 'Checking…')}</p>
      <button type="button" class="btn btn-secondary" data-act="ex-offline">⬇ ${tr('Préparer les exercices hors connexion', 'Prepare offline exercises')}</button>
      <p class="muted small">${tr('À refaire de temps en temps pour avoir les dernières versions. Rien n’est envoyé : il s’agit seulement de télécharger les exercices.', 'Repeat from time to time to get the latest versions. Nothing is sent: it only downloads the exercises.')}${LANG === 'en' ? ' The download covers the exercises in English.' : ''}</p>
    </section>
    <section class="card" id="avertissements">
      <h2>${tr('Messages et avertissements', 'Messages and warnings')}</h2>
      ${(() => { const h = hiddenWarnings(); return h.length
        ? `<p>${tr('Messages que j’ai masqués ou choisi de ne plus voir :', 'Messages I have hidden or chosen not to see again:')}</p><ul class="small">${h.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
        : `<p class="muted">${tr('Aucun message masqué pour l’instant.', 'No hidden messages for now.')}</p>`; })()}
      <button class="btn btn-secondary" data-act="warnings-reset">${tr('Réafficher tous les avertissements', 'Show all warnings again')}</button>
      <p class="muted small">${tr('Les demandes d’accord (contacts, partage du plan, lecture de vidéos ou de musique) seront de nouveau posées, et les messages d’information masqués réapparaîtront.', 'Consent requests (contacts, sharing the plan, playing videos or music) will be asked again, and hidden information messages will come back.')}</p>
    </section>
    <section class="card">
      <h2>${tr('Sauvegarde', 'Backup')}</h2>
      <p>${tr('Pour changer de téléphone ou garder une copie, j’exporte un fichier de sauvegarde que je pourrai réimporter dans Mon PCC.', 'To change phones or keep a copy, I export a backup file that I can import back into Mon PCC.')}</p>
      <div class="stack">
        <button class="btn btn-secondary" data-act="export">${tr('Exporter une sauvegarde', 'Export a backup')}</button>
        <label class="btn btn-ghost file-btn">${tr('Importer une sauvegarde', 'Import a backup')}<input type="file" accept="application/json,.json" data-act="import" hidden></label>
      </div>
      <p class="muted small">${tr('Le fichier de sauvegarde contient aussi ma boîte à outils (photos, vidéos, sons) et n’est pas chiffré : je le garde en lieu sûr.', 'The backup file also contains my toolbox (photos, videos, sounds) and is not encrypted: I keep it somewhere safe.')}</p>
    </section>
    <section class="card">
      <h2>${tr('Installer l’application', 'Install the app')}</h2>
      ${isStandalone() ? `<p>${tr('✓ Mon PCC est installé sur cet appareil.', '✓ Mon PCC is installed on this device.')}</p>` : `<button class="btn btn-primary" data-act="install-open">${tr('Installer Mon PCC', 'Install Mon PCC')}</button>
      <label class="check"><input type="checkbox" data-act="ib-toggle" ${installPref() === 'never' ? '' : 'checked'}> ${tr('Proposer l’installation par un bandeau', 'Offer installation with a banner')}</label>`}
      <p class="muted small">${tr('Une fois installée, l’application fonctionne même sans connexion.', 'Once installed, the app works even offline.')}</p>
    </section>
    <section class="card">
      <h2>${tr('Partager l’application', 'Share the app')}</h2>
      <p>${tr('Lien, QR code, carte ou planche de cartes à imprimer.', 'Link, QR code, card or a sheet of cards to print.')}</p>
      <a class="btn btn-secondary" href="#/partager">📤 ${tr('Partager Mon PCC', 'Share Mon PCC')}</a>
    </section>
    <section class="card card-danger">
      <h2>${tr('Effacer mes données', 'Delete my data')}</h2>
      <p>${tr('Supprime définitivement mon plan de ce téléphone.', 'Permanently deletes my plan from this phone.')}</p>
      <button class="btn btn-danger" data-act="wipe">${tr('Tout effacer', 'Delete everything')}</button>
    </section>`;
  renderOfflineStatus();
  voiceSectionHTML().then((h) => { const slot = $('#voice-slot'); if (slot) slot.outerHTML = h; });
}

/* ---------- pages d'information ---------- */

const BOUSSOLE_LINK = () => (LANG === 'en' ? '../ma-boussole-bien-etre/en/' : '../ma-boussole-bien-etre/');

function renderAbout() {
  const fr = LANG !== 'en';
  app.innerHTML = `
    <h1>${tr('À propos', 'About')}</h1>
    <section class="card">
      <h2>Mon PCC</h2>
      <p>${tr('Mon PCC est un outil <strong>gratuit, sans publicité et sans inscription</strong> pour préparer son plan de crise conjoint sur son téléphone.', 'Mon PCC is a <strong>free tool, with no ads and no sign-up</strong>, for preparing a joint crisis plan on your phone.')}</p>
      <p>${tr('Il ne remplace ni l’accompagnement par un·e professionnel·le, ni un avis médical. Le plan de crise conjoint se construit <em>avec</em> son réseau de soutien : Mon PCC aide à préparer et mettre en forme ce travail.', 'It does not replace support from a professional or medical advice. A joint crisis plan is built <em>with</em> your support network: Mon PCC helps you prepare and lay out that work.')}</p>
    </section>
    <section class="card">
      <h2>${tr('Crédits', 'Credits')}</h2>
      <p>${tr('Conception et réalisation :', 'Design and development:')} <strong>Roddy Ricart</strong>.</p>
      <p>${tr('Mon PCC est un projet libre : son code source est consultable, et chacun·e peut proposer une amélioration ou signaler un problème.', 'Mon PCC is an open project: its source code is public, and anyone can suggest an improvement or report a problem.')}</p>
      <a class="btn btn-secondary" href="https://github.com/rodtrip2/mon-pcc" target="_blank" rel="noopener noreferrer">${tr('Voir le projet sur GitHub ↗', 'See the project on GitHub ↗')}</a>
    </section>
    <section class="card">
      <h2>${tr('Le plan de crise conjoint', 'The joint crisis plan')}</h2>
      <p>${tr('Le PCC est une forme de déclaration anticipée en santé mentale. Il résulte d’une décision partagée entre la personne concernée, un·e professionnel·le et, si elle le souhaite, ses proches. Ses bénéfices ont été étudiés : meilleure alliance thérapeutique, moins d’hospitalisations sous contrainte, meilleure qualité de vie.', 'A joint crisis plan is a form of advance statement in mental health. It is the result of a shared decision between the person concerned, a professional and, if they wish, the people close to them. Its benefits have been studied: a better therapeutic relationship, fewer compulsory admissions, better quality of life.')}</p>
      <p>${tr('Pour en savoir plus, se former gratuitement (e-learning) ou télécharger le formulaire officiel :', 'To find out more, take free online training (in French) or download the official form:')} <a href="${SOURCE.url}" target="_blank" rel="noopener">plandecriseconjoint.ch</a>.</p>
    </section>
    <section class="card">
      <h2>${tr('Sources et droits d’auteur', 'Sources and copyright')}</h2>
      <p>${tr('Les questions de Mon PCC reprennent les supports officiels :', 'Mon PCC’s questions come from the official forms:')}</p>
      <ul class="small">${Object.values(VERSIONS).map((c) => `<li><em>${esc(c.source.citation)}</em> (${c.label.toLowerCase()})</li>`).join('')}</ul>
      <p><a href="${SOURCE.url}" target="_blank" rel="noopener">${SOURCE.url}</a> — © ${esc(SOURCE.holder)}.</p>
      <p>${tr(`Ce support est diffusé sous licence <a href="${SOURCE.licenseUrl}" target="_blank" rel="noopener">Creative Commons BY-NC-SA</a> (attribution, pas d’utilisation commerciale, partage dans les mêmes conditions). Mon PCC respecte ces conditions : il cite la source, reste gratuit et non commercial, et ses contenus sont partagés sous la même licence.`, `This material is published under the <a href="${SOURCE.licenseUrl}" target="_blank" rel="noopener">Creative Commons BY-NC-SA</a> licence (attribution, non-commercial, share alike). Mon PCC follows these terms: it credits the source, stays free and non-commercial, and its content is shared under the same licence.`)}</p>
      <p class="small">${tr('La version ado est publiée comme « phase test » sur le site officiel ; sa licence n’y est pas précisée séparément. Elle est reprise ici dans les mêmes conditions que le reste du site (CC BY-NC-SA).', 'The teen version is published as a “test phase” on the official website; its licence is not stated separately there. It is used here under the same terms as the rest of the site (CC BY-NC-SA).')}</p>
      ${fr ? '' : '<p class="small"><strong>English version:</strong> the adult questions are quoted from the official English form (V5). There is no official English teen form: the teen questions are Mon PCC’s own translation of the French V1 test version, not reviewed by the authors.</p>'}
      <p><strong>${tr('Modifications apportées', 'Changes made')}</strong>${tr(' : découpage en étapes, conseils de rédaction, suggestions et exemples ajoutés, numéros d’aide selon le pays, mise en page.', ': split into steps, writing tips, added suggestions and examples, help numbers by country, layout.')}${fr ? '' : ' Teen version: unofficial English translation.'}</p>
      <p>${tr('Mon PCC est un projet indépendant, <strong>non affilié</strong> à la Haute École de la Santé La Source ni aux auteur·es du PCC, qui ne l’ont pas validé.', 'Mon PCC is an independent project, <strong>not affiliated</strong> with Haute École de la Santé La Source or the authors of the joint crisis plan, who have not reviewed it.')}</p>
      <p>${tr(`Les exercices de la boîte à outils sont ceux de <a href="${BOUSSOLE_LINK()}" target="_blank" rel="noopener">Ma boussole bien-être</a>, un projet distinct (licence GPL-3), affichés dans Mon PCC sans en copier le code.`, `The toolbox exercises come from <a href="${BOUSSOLE_LINK()}" target="_blank" rel="noopener">Ma boussole bien-être</a>, a separate project (GPL-3 licence), shown inside Mon PCC without copying its code.`)}</p>
      <p>${tr('Code source libre :', 'Open source code:')} <a href="https://github.com/rodtrip2/mon-pcc" target="_blank" rel="noopener noreferrer">${tr('dépôt GitHub du projet', 'the project’s GitHub repository')}</a> ${tr('(fichier LICENSE). Le QR code est généré par la bibliothèque <em>qrcode-generator</em> de Kazuhiko Arase (licence MIT).', '(LICENSE file). The QR code is generated by Kazuhiko Arase’s <em>qrcode-generator</em> library (MIT licence).')}</p>
    </section>
    <p class="center"><a href="#/confidentialite">${tr('Confidentialité', 'Privacy')}</a></p>`;
}

function renderPrivacy() {
  app.innerHTML = `
    <h1>${tr('Confidentialité', 'Privacy')}</h1>
    <section class="card">
      <h2>${tr('En résumé', 'In short')}</h2>
      <ul>
        <li>${tr('<strong>Aucune donnée n’est collectée</strong> par Mon PCC : pas de compte, pas de serveur, pas de base de données.', '<strong>No data is collected</strong> by Mon PCC: no account, no server, no database.')}</li>
        <li>${tr('Mes réponses sont enregistrées <strong>uniquement dans le navigateur de ce téléphone</strong>.', 'My answers are saved <strong>only in this phone’s browser</strong>.')}</li>
        <li>${tr('Aucun cookie, aucune mesure d’audience, aucune publicité, aucune police ou ressource chargée depuis un autre site (sauf les vidéos et musiques que je choisis de lire, voir ci-dessous).', 'No cookies, no analytics, no ads, no fonts or resources loaded from other sites (except videos and music I choose to play, see below).')}</li>
        <li>${tr('Quand j’enregistre ou j’envoie mon plan en PDF, je peux le <strong>protéger par un code</strong> (chiffrement AES-256) : sans ce code, le fichier ne peut pas être ouvert. Mon PCC ne conserve pas ce code.', 'When I save or send my plan as a PDF, I can <strong>protect it with a code</strong> (AES-256 encryption): without the code, the file cannot be opened. Mon PCC does not keep the code.')}</li>
        <li>${tr('Si j’ajoute à ma boîte à outils un lien vers une vidéo ou une musique (YouTube, Spotify…), Mon PCC demande son <strong>titre</strong> au site concerné lors de l’ajout. Le contenu n’est lu dans l’application que si je touche « Lire ici », après un avertissement : mon téléphone se connecte alors à ce site, comme si j’ouvrais le lien. Mon plan n’est jamais transmis.', 'If I add a link to a video or music (YouTube, Spotify…) to my toolbox, Mon PCC asks that site for its <strong>title</strong> when it is added. The content only plays in the app if I tap “Play here”, after a warning: my phone then connects to that site, as if I opened the link. My plan is never sent.')}</li>
        <li>${tr('Les <strong>exercices</strong> de la boîte à outils viennent de Ma boussole bien-être, hébergée sur le même site que Mon PCC : aucun autre site n’est contacté, et rien de mon plan n’est transmis. Je peux les télécharger pour les utiliser sans connexion (Réglages).', 'The toolbox <strong>exercises</strong> come from Ma boussole bien-être, hosted on the same site as Mon PCC: no other site is contacted, and nothing from my plan is sent. I can download them to use offline (Settings).')}</li>
        <li>${tr('Les photos, vidéos et sons de ma <strong>boîte à outils</strong> restent sur ce téléphone (chiffrés si j’ai mis un code). Ils ne figurent jamais dans le plan imprimé ou envoyé : seuls leurs titres et les liens y apparaissent.', 'The photos, videos and sounds in my <strong>toolbox</strong> stay on this phone (encrypted if I set a code). They never appear in the printed or sent plan: only their titles and links do.')}</li>
        <li>${tr('Si mon téléphone le permet, je peux <strong>choisir des contacts</strong> dans mon carnet : seuls ceux que je coche sont ajoutés (nom et numéro), le reste de mon carnet n’est jamais lu.', 'If my phone allows it, I can <strong>choose contacts</strong> from my address book: only the ones I tick are added (name and number); the rest of my address book is never read.')}</li>
        <li>${tr('Je peux <strong>protéger</strong> mon plan par un code (chiffrement AES-256) et <strong>tout effacer</strong> à tout moment dans les Réglages.', 'I can <strong>protect</strong> my plan with a code (AES-256 encryption) and <strong>delete everything</strong> at any time in Settings.')}</li>
      </ul>
    </section>
    <section class="card">
      <h2>${tr('Mes données de santé', 'My health data')}</h2>
      <p>${tr('Mon plan contient des données de santé, protégées par le RGPD. Comme elles ne quittent jamais mon appareil sans action de ma part, l’éditeur de Mon PCC n’y a pas accès et ne les traite pas.', 'My plan contains health data, which is protected by data protection law (such as the GDPR in Europe). Because it never leaves my device unless I act, the publisher of Mon PCC has no access to it and does not process it.')}</p>
      <p>${tr('Quand je choisis d’envoyer mon plan (PDF, document ou texte), il passe par l’application que je sélectionne (messagerie, e-mail…) et devient accessible à son destinataire. Je choisis des personnes de confiance et un moyen sûr. Les professionnel·les de santé qui le reçoivent sont tenu·es au secret professionnel.', 'When I choose to send my plan (PDF, document or text), it goes through the app I select (messaging, email…) and becomes available to the recipient. I choose people I trust and a secure channel. Health professionals who receive it are bound by professional confidentiality.')}</p>
    </section>
    <section class="card">
      <h2>${tr('Hébergement', 'Hosting')}</h2>
      <p>${tr('Les fichiers de l’application sont hébergés par GitHub Pages (GitHub Inc.). Comme pour tout site, l’hébergeur peut enregistrer des données techniques de connexion (adresse IP) lors du téléchargement de l’application, indépendamment de Mon PCC. Ces journaux ne contiennent jamais le contenu de mon plan. Voir la', 'The app’s files are hosted by GitHub Pages (GitHub Inc.). As with any website, the host may log technical connection data (IP address) when the app is downloaded, independently of Mon PCC. These logs never contain the content of my plan. See')} <a href="${tr('https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement', 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement')}" target="_blank" rel="noopener">${tr('déclaration de confidentialité de GitHub', 'GitHub’s privacy statement')}</a>.</p>
      <p>${tr('Une fois installée, l’application fonctionne hors connexion.', 'Once installed, the app works offline.')}</p>
    </section>
    <section class="card">
      <h2>${tr('Mes droits', 'My rights')}</h2>
      <p>${tr('Mes données sont sous mon seul contrôle : je peux les consulter, les modifier, les exporter (Réglages › Sauvegarde) et les effacer (Réglages › Tout effacer). Désinstaller l’application ou effacer les données du site dans mon navigateur les supprime aussi.', 'My data is under my control alone: I can view, change, export (Settings › Backup) and delete it (Settings › Delete everything). Uninstalling the app or clearing the site’s data in my browser also deletes it.')}</p>
      <p>${tr('Pour toute question sur Mon PCC :', 'For any question about Mon PCC:')} <a href="https://github.com/rodtrip2/mon-pcc/issues" target="_blank" rel="noopener noreferrer">${tr('ouvrir un ticket sur le dépôt GitHub du projet', 'open an issue on the project’s GitHub repository')}</a>. ${tr('Je peux aussi m’adresser à la', 'I can also contact the')} <a href="https://www.cnil.fr" target="_blank" rel="noopener">CNIL</a>${tr('.', ' (French data protection authority), or the data protection authority in my country.')}</p>
    </section>`;
}

function renderLock() {
  document.body.dataset.page = 'verrou';
  app.innerHTML = `
    <section class="hero">
      <div class="hero-logo" aria-hidden="true">${logoSVG()}</div>
      <h1>${tr('Mon PCC est protégé', 'Mon PCC is protected')}</h1>
      ${crisisSnapshot() ? crisisButtonHTML() : ''}
      <form class="card stack" data-act="unlock">
        <label class="field"><span>${tr('Mon code', 'My code')}</span><input type="password" name="code" required autocomplete="current-password" autofocus></label>
        <button class="btn btn-primary">${tr('Ouvrir', 'Open')}</button>
        <p class="error" role="alert" hidden></p>
      </form>
      <p><button class="link" data-act="forgot">${tr('Code oublié ?', 'Forgotten code?')}</button></p>
    </section>
    ${emergencyNote()}`;
}

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
    return `<ol class="ib-steps"><li>${tr('Touchez le bouton <strong>Partager</strong> <span aria-hidden="true">⎋</span> en bas de l’écran (sur iPad, en haut).', 'Tap the <strong>Share</strong> button <span aria-hidden="true">⎋</span> at the bottom of the screen (at the top on iPad).')}</li>
      <li>${tr('Faites défiler et touchez <strong>« Sur l’écran d’accueil »</strong>.', 'Scroll down and tap <strong>“Add to Home Screen”</strong>.')}</li><li>${tr('Touchez <strong>« Ajouter »</strong>.', 'Tap <strong>“Add”</strong>.')}</li></ol>
      <p class="muted small">${tr('Avec Safari. Sur un autre navigateur, ouvrez d’abord Mon PCC dans Safari.', 'In Safari. In another browser, first open Mon PCC in Safari.')}</p>`;
  }
  return `<ol class="ib-steps"><li>${tr('Ouvrez le menu du navigateur (<strong>⋮</strong> en haut à droite, ou <strong>≡</strong> en bas).', 'Open the browser menu (<strong>⋮</strong> at the top right, or <strong>≡</strong> at the bottom).')}</li>
    <li>${tr('Touchez <strong>« Installer l’application »</strong> ou <strong>« Ajouter à l’écran d’accueil »</strong>.', 'Tap <strong>“Install app”</strong> or <strong>“Add to Home screen”</strong>.')}</li><li>${tr('Confirmez : l’icône Mon PCC apparaît sur l’écran d’accueil.', 'Confirm: the Mon PCC icon appears on your home screen.')}</li></ol>`;
}

function showInstallBanner(manual = false) {
  const b = $('#install-banner');
  if (isStandalone()) {
    if (manual) toast(tr('Mon PCC est déjà installé sur cet appareil.', 'Mon PCC is already installed on this device.'));
    return;
  }
  b.innerHTML = `<div class="ib-inner">
    <img src="icons/icon-192.png" alt="" class="ib-icon" width="48" height="48">
    <div class="ib-text">
      <p id="ib-title" class="ib-title">${canPrompt() ? tr('Installer Mon PCC', 'Install Mon PCC') : env.isIos ? tr('Ajouter Mon PCC à l’écran d’accueil', 'Add Mon PCC to your home screen') : tr('Installer Mon PCC sur mon téléphone', 'Install Mon PCC on my phone')}</p>
      <p class="muted small">${tr('Pour l’ouvrir comme une application, même sans connexion. Rien n’est envoyé : mon plan reste sur ce téléphone.', 'To open it like an app, even offline. Nothing is sent: my plan stays on this phone.')}</p>
      ${installStepsHTML()}
      <div class="ib-actions">
        ${canPrompt() ? `<button type="button" class="btn btn-primary btn-sm" data-act="install">${tr('Installer', 'Install')}</button>` : ''}
        <button type="button" class="btn btn-ghost btn-sm" data-act="ib-later">${tr('Plus tard', 'Later')}</button>
        <button type="button" class="link small" data-act="ib-never">${tr('Ne plus proposer', 'Don’t offer again')}</button>
      </div>
    </div>
    <button type="button" class="icon ib-close" data-act="ib-later" aria-label="${tr('Fermer', 'Close')}">✕</button>
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
const cardFileName = () => tr('carte-mon-pcc.jpg', 'mon-pcc-card.jpg');
const shareBlurb = () => tr('Mon PCC : préparer son plan de crise conjoint pas à pas.', 'Mon PCC: prepare your joint crisis plan step by step.');

function renderShare() {
  const url = appUrl();
  app.innerHTML = `
    <h1>📤 ${tr('Partager l’application', 'Share the app')}</h1>
    <p class="lead">${tr('Faire connaître Mon PCC : gratuit, sans inscription, sans publicité. Seule l’adresse de l’application est partagée, jamais mon plan.', 'Spread the word about Mon PCC: free, no sign-up, no ads. Only the app’s address is shared, never my plan.')}</p>
    <section class="card">
      <h2>🔗 ${tr('Le lien', 'The link')}</h2>
      <div class="share-link"><span>${esc(displayUrl(url))}</span><button type="button" class="btn btn-ghost btn-sm" data-act="share-copy">${tr('Copier', 'Copy')}</button></div>
      ${navigator.share ? `<button type="button" class="btn btn-primary" data-act="share-app">${tr('Partager le lien', 'Share the link')}</button>` : ''}
    </section>
    <section class="card">
      <h2>▦ ${tr('QR code en plein écran', 'Full-screen QR code')}</h2>
      <p class="muted">${tr('À montrer pour qu’une personne ouvre Mon PCC en le scannant avec son téléphone.', 'Show it so someone can open Mon PCC by scanning it with their phone.')}</p>
      <button type="button" class="btn btn-secondary" data-act="qr-open">${tr('Afficher le QR code', 'Show the QR code')}</button>
    </section>
    <section class="card">
      <h2>🖼 ${tr('Carte à partager (JPG)', 'Card to share (JPG)')}</h2>
      <p class="muted">${tr('Une image avec le QR code, à envoyer par message, publier ou imprimer.', 'An image with the QR code, to send by message, post or print.')}</p>
      <div class="card-preview" id="card-preview"><span class="muted">${tr('Préparation…', 'Preparing…')}</span></div>
      <div class="stack">
        ${navigator.canShare ? `<button type="button" class="btn btn-primary" data-act="card-share" hidden>${tr('Partager l’image', 'Share the image')}</button>` : ''}
        <button type="button" class="btn btn-secondary" data-act="card-download">${tr('Télécharger le JPG', 'Download the JPG')}</button>
      </div>
    </section>
    <section class="card">
      <h2>🖨 ${tr('Planche de cartes (PDF)', 'Sheet of cards (PDF)')}</h2>
      <p class="muted">${tr('10 cartes au format carte de visite (85 × 55 mm) sur une page A4, à imprimer à 100 % (taille réelle) puis découper. Idéal pour un service, une salle d’attente ou un groupe d’entraide.', '10 business-card-sized cards (85 × 55 mm) on an A4 page, to print at 100% (actual size) and cut out. Ideal for a service, a waiting room or a support group.')}</p>
      <button type="button" class="btn btn-secondary" data-act="sheet-download">${tr('Télécharger le PDF', 'Download the PDF')}</button>
    </section>`;
  prepareShare().then((c) => {
    const box = $('#card-preview');
    if (!box) return;
    box.innerHTML = `<img src="${c.preview}" alt="${tr('Aperçu de la carte Mon PCC avec QR code', 'Preview of the Mon PCC card with QR code')}">`;
    try {
      const f = new File([c.blob], cardFileName(), { type: 'image/jpeg' });
      const btn = app.querySelector('[data-act="card-share"]');
      if (btn && navigator.canShare({ files: [f] })) btn.hidden = false;
    } catch { /* partage de fichier indisponible */ }
  }).catch(() => {
    const box = $('#card-preview');
    if (box) box.innerHTML = `<p class="error">${tr('Impossible de préparer la carte sur ce navigateur.', 'The card cannot be prepared in this browser.')}</p>`;
  });
}

let wakeLock = null;
async function openQrFull() {
  let c;
  try { c = await prepareShare(); } catch { toast(tr('QR code indisponible.', 'QR code unavailable.')); return; }
  const el = $('#qr-full');
  el.innerHTML = `<div class="qr-head"><img src="icons/icon-192.png" alt="" width="44" height="44"><p>Mon PCC</p></div>
    ${qrSvg(c.qr, tr('Scannez pour ouvrir Mon PCC', 'Scan to open Mon PCC'))}
    <p class="qr-scan">${tr('Scannez pour ouvrir l’application', 'Scan to open the app')}</p>
    <p class="qr-url">${esc(displayUrl(c.url))}</p>
    <button type="button" class="btn btn-ghost" data-act="qr-close">✕ ${tr('Fermer', 'Close')}</button>`;
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

/* ---------- menu et éléments fixes de la page (traduits) ---------- */

function renderChrome() {
  document.title = tr('Mon PCC — mon plan de crise conjoint', 'Mon PCC — my joint crisis plan');
  $('meta[name="description"]')?.setAttribute('content', tr('Préparer son plan de crise conjoint pas à pas, gratuitement. Les réponses restent sur votre téléphone.', 'Prepare your joint crisis plan step by step, for free. Your answers stay on your phone.'));
  const skip = $('.skip'); if (skip) skip.textContent = tr('Aller au contenu', 'Skip to content');
  $('.brand')?.setAttribute('aria-label', tr('Mon PCC, accueil', 'Mon PCC, home'));
  $('#menu')?.setAttribute('aria-label', tr('Sommaire', 'Contents'));
  const other = LANG === 'en' ? 'fr' : 'en';
  $('.menu-panel').innerHTML = `
      <div class="menu-head">
        <strong>${tr('Sommaire', 'Contents')}</strong>
        <button id="menu-close" class="icon" data-act="menu-close" aria-label="${tr('Fermer le menu', 'Close menu')}">✕</button>
      </div>
      <a class="menu-link menu-crisis" href="#/crise">💛 ${tr('Ça ne va pas', 'I’m not OK')}</a>
      <a class="menu-link" href="#/">${tr('Accueil', 'Home')}</a>
      <a class="menu-link" href="#/demarche">${tr('La démarche', 'How it works')}</a>
      <div id="menu-steps"></div>
      <a class="menu-link" href="#/entretien">🗣 ${tr('Préparer mon entretien', 'Prepare my appointment')}</a>
      <a class="menu-link" href="#/plan">📄 ${tr('Mon plan : imprimer, enregistrer, envoyer', 'My plan: print, save, send')}</a>
      <a class="menu-link tb-link-menu" href="#/boite-outils">🧰 ${tr('Ma boîte à outils', 'My toolbox')}</a>
      <a class="menu-link" href="#/ressources">📞 ${tr('Ressources d’aide', 'Help resources')}</a>
      <a class="menu-link" href="#/mon-espace-sante">${recordPageLabel()}</a>
      <button type="button" class="menu-link menu-btn-link" data-act="install-open" id="menu-install">📲 ${tr('Installer l’application', 'Install the app')}</button>
      <a class="menu-link" href="#/partager">📤 ${tr('Partager l’application', 'Share the app')}</a>
      <a class="menu-link" href="#/reglages">${tr('Réglages et sauvegarde', 'Settings and backup')}</a>
      <a class="menu-link" href="#/professionnels">🩺 ${tr('Pour les professionnel·les', 'For professionals')}</a>
      <a class="menu-link" href="#/apropos">${tr('À propos et sources', 'About and sources')}</a>
      <a class="menu-link" href="#/confidentialite">${tr('Confidentialité', 'Privacy')}</a>
      <button type="button" class="menu-link menu-btn-link" data-act="lang-switch" data-l="${other}" lang="${other}">🌐 ${LANGS[other]}</button>`;
  const mb = $('#menu-btn .sr-only'); if (mb) mb.textContent = 'Menu';
  $('.footer').innerHTML = `
    <p>${tr('D’après le', 'Based on the')} <a href="https://plandecriseconjoint.ch/" target="_blank" rel="noopener">${tr('Plan de Crise Conjoint', 'Joint Crisis Plan')}</a> (Ferrari, Suter, Martino, 2026) © Haute École de la Santé La Source — <a href="${tr('https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr', 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en')}" target="_blank" rel="noopener">CC BY-NC-SA</a>. ${tr('Projet indépendant, gratuit et non commercial.', 'Independent, free and non-commercial project.')}</p>
    <p><a href="#/professionnels">${tr('Professionnel·les', 'Professionals')}</a> · <a href="#/apropos">${tr('À propos', 'About')}</a> · <a href="#/confidentialite">${tr('Confidentialité', 'Privacy')}</a> · <a href="https://github.com/rodtrip2/mon-pcc" target="_blank" rel="noopener noreferrer">GitHub</a></p>`;
  $('#exercise')?.setAttribute('aria-label', tr('Exercice', 'Exercise'));
  $('#qr-full')?.setAttribute('aria-label', tr('QR code de Mon PCC', 'Mon PCC QR code'));
  $('#sigpad')?.setAttribute('aria-label', 'Signature');
  editFloat.textContent = tr('✓ Terminé', '✓ Done');
  renderTalkBar();
  refreshInstallUI();
}

/* ---------- menu ---------- */

function openMenu() {
  const m = $('#menu');
  $('#menu-steps').innerHTML = stepsListHTML() + ((plan?.data.versions || []).length ? `<a class="menu-link" href="#/versions">🔄 ${tr('Versions signées et changements', 'Signed versions and changes')}</a>` : '');
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
  if (el.dataset.tbf) {
    toolbox()[+el.dataset.i][el.dataset.tbf] = el.value;
    if (el.tagName === 'TEXTAREA') autosize(el);
    scheduleSave();
    return;
  }
  if (el.dataset.tb !== undefined) {
    toolbox()[+el.dataset.tb].title = el.value;
    scheduleSave();
    return;
  }
  if (el.dataset.note) {
    (plan.data.notes ??= {})[el.dataset.note] = el.value;
    if (!el.value.trim()) delete plan.data.notes[el.dataset.note];
    scheduleSave(false); // notes personnelles : hors du plan signé
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
  } else if (act === 'unlock') {
    const err = form.querySelector('.error');
    try {
      plan = await store.unlock(form.code.value);
      locked = false;
      applyVersion();
      media.prune(usedMediaIds()).catch(() => {});
      ensureVersionHistory();
      route();
    } catch {
      err.textContent = tr('Code incorrect.', 'Incorrect code.');
      err.hidden = false;
    }
  } else if (act === 'protect') {
    if (form.c1.value !== form.c2.value) return toast(tr('Les deux codes ne sont pas identiques.', 'The two codes do not match.'));
    const files = await media.loadAll().catch(() => []);
    await store.protect(plan, form.c1.value);
    await media.saveAll(files);
    syncCrisisSnapshot();
    forgetMediaURLs();
    toast(tr('Protection activée.', 'Protection turned on.'));
    renderSettings();
  }
});

app.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.act === 'tb-album-new' && el.files.length) {
    const files = [...el.files]; el.value = '';
    const photos = await putFiles(files);
    if (!photos.length) return;
    toolbox().push(photos.length === 1 ? { kind: 'photo', file: photos[0].file, title: '', added: new Date().toISOString() } : { kind: 'album', photos, title: '', added: new Date().toISOString() });
    editing.add('toolbox');
    scheduleSave(); tbRedraw();
    toast(photos.length > 1 ? tr(`Album créé avec ${photos.length} photos. Je peux lui donner un titre.`, `Album created with ${photos.length} photos. I can give it a title.`) : tr('Photo ajoutée.', 'Photo added.'));
    return;
  }
  if (el.dataset.act === 'album-add' && el.files.length) {
    const files = [...el.files]; el.value = '';
    const it = toolbox()[+el.dataset.i];
    (it.photos ??= []).push(...await putFiles(files));
    scheduleSave(); tbRedraw();
    return;
  }
  if (el.dataset.act === 'tb-folder') {
    const it = toolbox()[+el.dataset.i];
    if (el.value === '__new') {
      const d = await newFolder();
      if (d) it.folder = d.id;
    } else it.folder = el.value || undefined;
    scheduleSave(); tbRedraw();
    return;
  }
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
    if (hasData() && !(await modal({ title: tr('Remplacer mon plan ?', 'Replace my plan?'), body: `<p>${tr('Le plan actuellement enregistré sur ce téléphone sera remplacé par la sauvegarde.', 'The plan currently saved on this phone will be replaced by the backup.')}</p>`, ok: tr('Remplacer', 'Replace'), danger: true }))) return;
    plan = obj.plan;
    applyVersion();
    await media.clear();
    forgetMediaURLs();
    for (const m of obj.media || []) await media.put(media.dataURLToBlob(m.data), m.id);
    await store.save(plan);
    toast(tr('Sauvegarde importée.', 'Backup imported.'));
    location.hash = '#/';
  } catch {
    toast(tr('Ce fichier n’est pas une sauvegarde Mon PCC valide.', 'This file is not a valid Mon PCC backup.'));
  } finally {
    el.value = '';
  }
});

document.addEventListener('click', async (e) => {
  if (e.target.closest('#menu a')) closeMenu();
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.tagName === 'FORM' || btn.tagName === 'INPUT' || btn.tagName === 'SELECT') return;
  const act = btn.dataset.act;
  const stepEl = btn.closest('[data-step]');
  const step = stepEl ? STEPS[+stepEl.dataset.step] : null;
  const g = btn.dataset.g;
  const i = +btn.dataset.i;
  const redraw = () => { scheduleSave(); rerender(() => renderStep(STEPS.indexOf(step))); };

  switch (act) {
    case 'chip': {
      const grp = groupsOf(step).find((x) => x.id === g);
      const s = groupSuggestions(grp)[+btn.dataset.si];
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
        else {
          arr.push(typeof s === 'string' ? { [sf]: s } : { ...s });
          if (typeof s === 'string') editing.add(step.id + ':' + g); // le nom reste à compléter
        }
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
      if (nonEmpty) toast(tr('Ligne supprimée.', 'Line deleted.'));
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
    case 'tb-video': {
      const blob = await recordVideo();
      if (blob) await addToolboxBlob('video', blob, tr('Ma vidéo', 'My video'));
      break;
    }
    case 'tb-embed': {
      const it = toolbox()[i];
      const e = parseEmbed(it?.url || '');
      if (!e || !(await confirmEmbed(e.provider))) break;
      embedLoaded.add(it.url);
      // On remplace seulement ce cadre : les autres lecteurs ouverts continuent
      const body = btn.closest('.tb-body');
      if (body) {
        const inView = !!body.closest('.tbv-embed');
        body.innerHTML = `${inView && it.title ? `<p class="tbv-title">${esc(it.title)}</p>` : ''}${embedPlayerHTML(e, it.title)}${inView ? '' : `<a class="small tb-open-small" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${tr('Ouvrir sur', 'Open on')} ${esc(e.provider)} ↗</a>`}`;
      }
      break;
    }
    case 'tb-link-new': await linkDialog(); break;
    case 'tb-quote-new': await quoteDialog(); break;
    case 'tb-record': {
      const blob = await recordVoice();
      if (blob) await addToolboxBlob('voix', blob, tr('Mon message', 'My message'));
      break;
    }
    case 'tb-size':
      toolbox()[i].size = btn.dataset.s;
      scheduleSave(); tbRedraw();
      break;
    case 'folder-new': { if (await newFolder()) tbRedraw(); break; }
    case 'folder-rename': {
      const d = dossiers().find((x) => x.id === btn.dataset.id);
      const name = d && await promptModal(tr('Renommer le dossier', 'Rename folder'), d.name, tr('Renommer', 'Rename'));
      if (name) { d.name = name; scheduleSave(); tbRedraw(); }
      break;
    }
    case 'folder-del': {
      const d = dossiers().find((x) => x.id === btn.dataset.id);
      if (!d || !(await modal({ title: tr('Supprimer ce dossier ?', 'Delete this folder?'), body: `<p>${tr(`Le dossier « ${esc(d.name)} » sera supprimé. Son contenu n’est pas effacé : il revient hors dossier.`, `The folder “${esc(d.name)}” will be deleted. Its content is not erased: it goes back out of the folder.`)}</p>`, ok: tr('Supprimer le dossier', 'Delete folder'), danger: true }))) break;
      toolbox().forEach((it) => { if (it.folder === d.id) delete it.folder; });
      plan.data.dossiers = dossiers().filter((x) => x.id !== d.id);
      scheduleSave(); tbRedraw();
      break;
    }
    case 'album-from': {
      const it = toolbox()[i];
      toolbox()[i] = { kind: 'album', title: it.title || '', photos: [{ file: it.file }], size: it.size, folder: it.folder, added: it.added };
      scheduleSave(); tbRedraw();
      toast(tr('Album créé : j’y ajoute d’autres photos.', 'Album created: I can add more photos to it.'));
      break;
    }
    case 'album-take': {
      const album = toolbox()[i];
      const j = +btn.dataset.j;
      const photo = toolbox()[j];
      (album.photos ??= []).push({ file: photo.file });
      toolbox().splice(j, 1);
      scheduleSave(); tbRedraw();
      break;
    }
    case 'album-out': {
      const album = toolbox()[i];
      const [p] = album.photos.splice(+btn.dataset.k, 1);
      toolbox().splice(i + 1, 0, { kind: 'photo', file: p.file, title: '', folder: album.folder, added: new Date().toISOString() });
      if (!album.photos.length) toolbox().splice(i, 1);
      scheduleSave(); tbRedraw();
      break;
    }
    case 'album-del': {
      const album = toolbox()[i];
      if (!(await modal({ title: tr('Supprimer cette photo ?', 'Delete this photo?'), body: `<p>${tr('Elle sera effacée de ce téléphone.', 'It will be erased from this phone.')}</p>`, ok: tr('Supprimer', 'Delete'), danger: true }))) break;
      const [p] = album.photos.splice(+btn.dataset.k, 1);
      await media.remove(p.file).catch(() => {});
      if (!album.photos.length) toolbox().splice(i, 1);
      scheduleSave(); tbRedraw();
      break;
    }
    case 'tb-exercises':
      await exercisePicker();
      tbRedraw();
      break;
    case 'exercise-open': openExercise(btn.dataset.ex); break;
    case 'ex-offline': {
      const box = $('#ex-off-status');
      btn.disabled = true;
      try {
        const n = await prepareOffline((p) => {
          if (!box) return;
          box.textContent = p.step === 'pages' ? tr('Téléchargement des pages…', 'Downloading pages…') : tr(`Téléchargement des sons : ${p.done} / ${p.total}`, `Downloading sounds: ${p.done} / ${p.total}`);
        });
        toast(tr(`Exercices prêts hors connexion (${n} sons).`, `Exercises ready offline (${n} sounds).`));
      } catch {
        toast(tr('Préparation impossible : vérifiez la connexion, puis réessayez.', 'Could not prepare: check your connection, then try again.'));
      }
      btn.disabled = false;
      renderOfflineStatus();
      break;
    }
    case 'lightbox':
      lb = { idx: i, k: +btn.dataset.k || 0 };
      showLightbox();
      break;
    case 'tb-up': case 'tb-down': {
      const arr = toolbox();
      const same = (x) => (x.folder || '') === (arr[i].folder || '');
      let j = i;
      do { j += act === 'tb-up' ? -1 : 1; } while (j >= 0 && j < arr.length && !same(arr[j]));
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      scheduleSave();
      tbRedraw();
      (app.querySelector(`[data-fk="${act}:${j}"]`) || app.querySelector(`[data-fk="tb:${j}"]`))?.focus({ preventScroll: true });
      break;
    }
    case 'tb-del': {
      const it = toolbox()[i];
      if (!(await modal({ title: tr('Retirer de ma boîte à outils ?', 'Remove from my toolbox?'), body: `<p>${tr(`${esc(tbLabel(it))} sera supprimé de ce téléphone.`, `${esc(tbLabel(it))} will be deleted from this phone.`)}</p>`, ok: tr('Supprimer', 'Delete'), danger: true }))) return;
      toolbox().splice(i, 1);
      for (const f of [it.file, ...(it.photos || []).map((p) => p.file)].filter(Boolean)) {
        await media.remove(f).catch(() => {}); const u = mediaURLs.get(f); if (u) URL.revokeObjectURL(u); mediaURLs.delete(f);
      }
      scheduleSave();
      rerender(() => renderToolbox(location.hash.endsWith('/etape')));
      break;
    }
    case 'edit-done-all': {
      app.querySelectorAll('[data-edit-key]').forEach((el) => editing.delete(el.dataset.editKey));
      if (location.hash.startsWith('#/boite-outils')) rerender(() => renderToolbox(location.hash.endsWith('/etape')));
      else if (location.hash.startsWith('#/etape/')) rerender(() => renderStep(parseInt(location.hash.split('/')[2], 10) || 0));
      else route();
      toast(tr('Modifications terminées.', 'Changes done.'));
      break;
    }
    case 'edit-toggle': {
      const key = btn.dataset.key;
      if (editing.has(key)) editing.delete(key); else editing.add(key);
      if (key === 'toolbox') rerender(() => renderToolbox(location.hash.endsWith('/etape')));
      else rerender(() => renderStep(STEPS.indexOf(step)));
      break;
    }
    case 'empty': {
      editing.add(step.id + ':' + g);
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
      const who = [r.nom, r.role].filter(Boolean).join(' — ') || tr('Signataire', 'Signatory');
      const img = await signaturePad(who);
      if (img) { r.sig = img; r.signedAt = new Date().toISOString(); archiveSigned(); scheduleSave(false); rerender(() => renderStep(STEPS.indexOf(step))); toast(tr('Signature enregistrée.', 'Signature saved.')); }
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
      getArr(step).push({ nom: [id.prenom, id.nom].filter(Boolean).join(' ') || tr('Moi-même', 'Me'), role: isAdo() ? tr('Moi', 'Me') : tr('Usager·ère', 'Service user') });
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
    case 'review-ics': reminderDialog(); break;
    case 'dictate': await runDictation(btn); break;
    case 'dict-check': {
      e.preventDefault();
      const box = $('#dict-local');
      if (box) box.innerHTML = localStatusText(await localStatus());
      break;
    }
    case 'speak': {
      const q = btn.closest('.question');
      const step = STEPS[parseInt(location.hash.split('/')[2], 10) || 0];
      if (q && step) speak(`${step.title}. ${easyOn() && step.easy ? step.easy.q : step.question}`, btn);
      break;
    }
    case 'talk-toggle': setTalkMode(!talkMode); break;
    case 'talk-end': setTalkMode(false); toast(tr('Mode entretien terminé.', 'Appointment mode ended.')); break;
    case 'summary-save': pdfSave(true); break;
    case 'mes-summary':
      try { const file = await makePlanPdf('', true); download(file, file.name); toast(tr('Synthèse téléchargée.', 'Summary downloaded.')); } catch { pdfFail(); }
      break;
    case 'start':
      plan.data.version = btn.dataset.v === 'ado' ? 'ado' : 'adulte';
      applyVersion();
      scheduleSave(false);
      location.hash = '#/demarche';
      break;
    case 'res-jump': {
      e.preventDefault();
      document.getElementById('res-' + btn.dataset.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'res-add': {
      const cat = country().cats.find((c) => c.id === btn.dataset.c);
      const it = cat.items[+btn.dataset.k];
      const name = L(it.name);
      if (isAdo()) {
        plan.data.strategies ??= {};
        plan.data.strategies.pros ??= [];
        plan.data.strategies.pros.push(it.tel ? tr(`J’appelle ${name} (${it.tel})`, `I call ${name} (${it.tel})`) : tr(`J’écris à ${name} (${reachText(it)})`, `I message ${name} (${reachText(it)})`));
      } else {
        plan.data.aide ??= {};
        plan.data.aide.garde ??= [];
        plan.data.aide.garde.push({ nom: name, lien: [L(cat.title), L(it.hours)].filter(Boolean).join(' · ') + (it.tel ? '' : ` · ${reachText(it)}`), tel: it.tel || it.sms });
      }
      scheduleSave();
      rerender(renderResources);
      const garde = STEPS.findIndex((s) => s.id === 'aide') + 1;
      toast(isAdo() ? tr('Ajouté à mon plan (ce qui me fait du bien, aide de professionnel·les).', 'Added to my plan (what helps me, help from professionals).') : tr(`Ajouté à mon plan (étape ${garde}, services et institutions de garde).`, `Added to my plan (step ${garde}, crisis teams and services).`));
      break;
    }
    case 'warnings-reset':
      resetWarnings();
      rerender(renderSettings);
      toast(tr('Tous les avertissements sont réactivés.', 'All warnings are back on.'));
      break;
    case 'mes-minor-hide':
      plan.data.masquerNoteMineur = true;
      scheduleSave(false);
      btn.closest('.note')?.remove();
      toast(tr('Message masqué.', 'Message hidden.'));
      break;
    case 'mes-pdf':
      try {
        const file = await makePlanPdf('');
        download(file, file.name);
        toast(hasMES() ? tr('PDF téléchargé : je peux maintenant l’ajouter dans Mon Espace Santé.', 'PDF downloaded: I can now add it to Mon Espace Santé.') : tr('PDF téléchargé : je peux maintenant le remettre à mon équipe de soins.', 'PDF downloaded: I can now give it to my care team.'));
      } catch { pdfFail(); }
      break;
    case 'card-img':
      try { download(await toJpeg(renderCrisisCard(carte())), tr('carte-de-crise.jpg', 'crisis-card.jpg')); } catch { toast(tr('Impossible de préparer l’image.', 'The image cannot be prepared.')); }
      break;
    case 'card-print':
      try { download(await crisisCardPdf(await toJpeg(renderCrisisCard(carte()))), tr('carte-de-crise.pdf', 'crisis-card.pdf')); } catch { toast(tr('Impossible de préparer le PDF.', 'The PDF cannot be prepared.')); }
      break;
    case 'pdf-send': pdfSend(); break;
    case 'share-text': shareText(); break;
    case 'export': {
      const files = [];
      for (const id of usedMediaIds()) {
        try { const b = await media.get(id); if (b) files.push({ id, data: await media.blobToDataURL(b) }); } catch { /* ignoré */ }
      }
      const blob = new Blob([JSON.stringify({ app: 'mon-pcc', exported: new Date().toISOString(), plan, media: files })], { type: 'application/json' });
      download(blob, tr('sauvegarde-mon-pcc-', 'mon-pcc-backup-') + new Date().toISOString().slice(0, 10) + '.json');
      break;
    }
    case 'wipe':
      if (await modal({ title: tr('Tout effacer ?', 'Delete everything?'), body: `<p>${tr('Mon plan sera supprimé définitivement de ce téléphone. Pensez à exporter une sauvegarde si vous souhaitez le garder.', 'My plan will be permanently deleted from this phone. Remember to export a backup if you want to keep it.')}</p>`, ok: tr('Tout effacer', 'Delete everything'), danger: true })) {
        store.wipe();
        clearCrisisSnapshot();
        await media.clear();
        forgetMediaURLs();
        plan = store.emptyPlan();
        applyVersion();
        toast(tr('Données effacées.', 'Data deleted.'));
        location.hash = '#/';
        route();
      }
      break;
    case 'unprotect':
      {
        const files = await media.loadAll().catch(() => []);
        await store.unprotect(plan);
        await media.saveAll(files);
        syncCrisisSnapshot();
      }
      toast(tr('Code retiré.', 'Code removed.'));
      renderSettings();
      break;
    case 'lock-now':
      talkMode = false; applyTextSize();
      store.lock();
      forgetMediaURLs();
      plan = null;
      locked = true;
      renderLock();
      break;
    case 'forgot':
      if (await modal({ title: tr('Code oublié', 'Forgotten code'), body: `<p>${tr('Sans le code, le plan chiffré ne peut pas être récupéré. Vous pouvez l’effacer pour recommencer, ou réimporter une sauvegarde ensuite.', 'Without the code, the encrypted plan cannot be recovered. You can delete it to start again, or import a backup afterwards.')}</p>`, ok: tr('Effacer et recommencer', 'Delete and start again'), danger: true })) {
        store.wipe();
        clearCrisisSnapshot();
        await media.clear();
        plan = store.emptyPlan();
        applyVersion();
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
    case 'ib-never': hideInstallBanner(); setInstallPref('never'); toast(tr('Le bandeau ne sera plus proposé. Installation possible depuis le menu.', 'The banner won’t be shown again. You can still install from the menu.')); break;
    case 'share-copy': toast((await copyText(appUrl())) ? tr('Lien copié.', 'Link copied.') : tr('Copie impossible sur cet appareil.', 'Copying is not possible on this device.')); break;
    case 'share-app':
      try { await navigator.share({ title: 'Mon PCC', text: tr('Mon PCC : préparer son plan de crise conjoint pas à pas. Gratuit, sans inscription, les réponses restent sur le téléphone.', 'Mon PCC: prepare your joint crisis plan step by step. Free, no sign-up, your answers stay on your phone.'), url: appUrl() }); } catch { /* annulé */ }
      break;
    case 'qr-open': openQrFull(); break;
    case 'qr-close': closeQrFull(); break;
    case 'card-share': {
      const c = await prepareShare();
      const f = new File([c.blob], cardFileName(), { type: 'image/jpeg' });
      try { await navigator.share({ files: [f], title: 'Mon PCC', text: shareBlurb() + ' ' + c.url }); } catch (err) { if (err?.name !== 'AbortError') download(c.blob, cardFileName()); }
      break;
    }
    case 'poster-download':
      try {
        const c = await prepareShare();
        const jpg = await canvasToJpeg(renderPoster(c.url, c.qr), 0.9);
        download(await posterPdf(jpg), tr('affiche-mon-pcc.pdf', 'mon-pcc-poster.pdf'));
      } catch { toast(tr('Impossible de préparer l’affiche.', 'The poster cannot be prepared.')); }
      break;
    case 'card-download': try { download((await prepareShare()).blob, cardFileName()); } catch { toast(tr('Impossible de préparer la carte.', 'The card cannot be prepared.')); } break;
    case 'sheet-download':
      try {
        const c = await prepareShare();
        download(await buildSheetPdf(c.blob, tr('Mon PCC - 10 cartes 85 x 55 mm - imprimer à 100 % (taille réelle), puis découper le long des pointillés', 'Mon PCC - 10 cards 85 x 55 mm - print at 100% (actual size), then cut along the dotted lines')), tr('planche-cartes-mon-pcc.pdf', 'mon-pcc-card-sheet.pdf'));
      } catch { toast(tr('Impossible de préparer le PDF.', 'The PDF cannot be prepared.')); }
      break;
    case 'lang-switch':
      setLangPref(btn.dataset.l);
      closeMenu();
      applyLocale();
      toast(tr('Langue : français.', 'Language: English.'));
      break;
    case 'menu': openMenu(); break;
    case 'menu-close': closeMenu(); break;
    default: break;
  }
});

document.addEventListener('change', async (e) => {
  const act = e.target.dataset?.act;
  if (act === 'version') {
    await changeVersion(e.target.value);
    return;
  }
  if (act === 'lang') {
    setLangPref(e.target.value || null);
    applyLocale();
    return;
  }
  if (act === 'country') {
    setCountryPref(e.target.value || null);
    applyLocale();
    toast(`${country().flag} ${L(country().name)}`);
    return;
  }
  if (act === 'dictation') {
    const v = e.target.value;
    if (v === 'online' && !(await confirmOnlineDictation())) { rerender(renderSettings); return; }
    setDictationPref(v);
    toast(v === 'off' ? tr('Dictée désactivée.', 'Dictation off.') : v === 'local' ? tr('Dictée sur le téléphone activée : un bouton 🎙 apparaît dans les champs de texte.', 'On-device dictation on: a 🎙 button appears in text fields.') : tr('Dictée en ligne autorisée.', 'Online dictation allowed.'));
    return;
  }
  if (act === 'tts') {
    try { if (e.target.checked) localStorage.setItem(TTS_KEY, '1'); else localStorage.removeItem(TTS_KEY); } catch { /* ignoré */ }
    if (!e.target.checked) stopSpeaking();
    toast(e.target.checked ? tr('Lecture à voix haute activée : bouton 🔊 sur chaque question.', 'Read aloud on: 🔊 button on each question.') : tr('Lecture à voix haute désactivée.', 'Read aloud off.'));
    return;
  }
  if (act === 'easy') {
    try { if (e.target.checked) localStorage.setItem(EASY_KEY, '1'); else localStorage.removeItem(EASY_KEY); } catch { /* ignoré */ }
    toast(e.target.checked ? tr('Questions en facile à lire activées.', 'Easy-read questions on.') : tr('Questions officielles.', 'Official questions.'));
    return;
  }
  if (act === 'text-size') {
    try { localStorage.setItem(TEXT_KEY, e.target.value); } catch { /* ignoré */ }
    applyTextSize(e.target.value);
    return;
  }
  if (act === 'crisis-open') {
    try { if (e.target.checked) localStorage.setItem(CRISIS_OPEN, '1'); else localStorage.removeItem(CRISIS_OPEN); } catch { /* ignoré */ }
    syncCrisisSnapshot();
    toast(e.target.checked ? tr('L’écran « Ça ne va pas » s’ouvrira sans le code.', 'The “I’m not OK” screen will open without the code.') : tr('L’écran « Ça ne va pas » demandera le code.', 'The “I’m not OK” screen will ask for the code.'));
    return;
  }
  if (act === 'ib-toggle') {
    setInstallPref(e.target.checked ? null : 'never');
    toast(e.target.checked ? tr('Le bandeau d’installation sera proposé.', 'The install banner will be shown.') : tr('Le bandeau ne sera plus proposé.', 'The banner won’t be shown again.'));
  }
});

// Mémorise les dossiers dépliés de la boîte à outils
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!d.classList?.contains('tb-folder')) return;
  if (d.open) openFolders.add(d.dataset.folder); else openFolders.delete(d.dataset.folder);
}, true);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#exercise').hidden) { closeExercise(); return; }
  if (e.key === 'Escape' && !$('#lightbox').hidden) { closeLightbox(); return; }
  if (lb && e.key === 'ArrowRight') { lb.k += 1; showLightbox(); return; }
  if (lb && e.key === 'ArrowLeft') { lb.k -= 1; showLightbox(); return; }
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

/* Bandeau du mode entretien (visible sur toutes les pages tant qu'il est actif) */
const talkBar = document.createElement('div');
talkBar.className = 'talk-bar no-print';
talkBar.hidden = true;
talkBar.setAttribute('role', 'status');
document.body.appendChild(talkBar);
function renderTalkBar() {
  talkBar.innerHTML = `<span>🗣 ${tr('Mode entretien', 'Appointment mode')}</span><button type="button" class="btn btn-sm" data-act="talk-end">✕ ${tr('Terminer', 'End')}</button>`;
}

/* Bouton flottant « Terminé » : visible tant qu'une liste de la page est en modification */
const editFloat = document.createElement('button');
editFloat.type = 'button';
editFloat.className = 'btn btn-primary edit-float no-print';
editFloat.dataset.act = 'edit-done-all';
editFloat.textContent = tr('✓ Terminé', '✓ Done');
editFloat.hidden = true;
document.body.appendChild(editFloat);
new MutationObserver(() => {
  const on = !!app.querySelector('[data-edit-key]');
  editFloat.hidden = !on;
  document.body.classList.toggle('has-edit-float', on);
}).observe(app, { childList: true });
// Ajuste la hauteur des lignes de texte après chaque affichage
new MutationObserver(() => app.querySelectorAll('textarea.item-input, textarea.tb-quote-text').forEach(autosize))
  .observe(app, { childList: true, subtree: true });

/* ---------- démarrage ---------- */

function start() {
  applyTextSize();
  renderChrome();
  if (!store.storageAvailable()) {
    app.innerHTML = `<h1>${tr('Enregistrement impossible', 'Saving is not possible')}</h1><p class="warn">${tr('Ce navigateur bloque l’enregistrement local (navigation privée ?). Ouvrez Mon PCC dans une fenêtre normale pour pouvoir enregistrer votre plan.', 'This browser blocks local storage (private browsing?). Open Mon PCC in a normal window to be able to save your plan.')}</p>`;
    return;
  }
  const st = store.status();
  if (st === 'locked') locked = true;
  else plan = store.loadPlain() || store.emptyPlan();
  if (plan && !plan.data) plan.data = {};
  applyVersion();
  saveState.textContent = st === 'none' ? '' : savedLabel();
  store.requestPersistence();
  if (plan) media.prune(usedMediaIds()).catch(() => {});
  if (plan) ensureVersionHistory();
  route();
  refreshInstallUI();
  if (env.isMobile && !isStandalone() && bannerAllowed()) setTimeout(() => { if (!isStandalone()) showInstallBanner(); }, 2500);
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

start();
