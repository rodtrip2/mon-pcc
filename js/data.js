import { STEPS_ADO, PROCESS_ADO, SOURCE_ADO, PRINT_TITLE_ADO, PRINT_SUBTITLE_ADO } from './data-ado.js';
/*
 * Mon PCC — trame et suggestions
 *
 * Les intitulés des questions reprennent le « Support Plan de Crise Conjoint
 * uniformisé et validé » (version adulte, V6) :
 *   Ferrari, P., Suter, C., Martino, P. (2026). https://plandecriseconjoint.ch/
 *   © Haute École de la Santé La Source, Lausanne — licence CC BY-NC-SA.
 * Modifications apportées : découpage en étapes, conseils de rédaction,
 * suggestions cochables et exemples rédigés pour Mon PCC.
 * Ce fichier est diffusé sous la même licence (CC BY-NC-SA 4.0).
 */

const SOURCE_ADULTE = {
  citation:
    'Ferrari, P., Suter, C., Martino, P. (2026). Support Plan de Crise Conjoint uniformisé et validé.',
  url: 'https://plandecriseconjoint.ch/',
  holder: 'Haute École de la Santé La Source, Lausanne',
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr',
};

/* Les six temps de la démarche, d'après le guide et la FAQ du PCC */
const PROCESS_ADULTE = [
  { t: 'Je choisis un moment calme', d: 'Idéalement à distance d’une crise, dans un moment d’apaisement. Je peux faire des pauses et avancer à mon rythme.' },
  { t: 'Je remplis d’abord seul·e', d: 'À la première personne (« je »), avec mes propres mots. Des exemples sont disponibles si je manque d’idées, mais ils ne parlent pas à ma place.' },
  { t: 'J’en discute avec un·e professionnel·le', d: 'Au minimum avec un·e professionnel·le qui m’accompagne, et avec mes proches si je le souhaite. Ensemble, nous complétons ou modifions le plan : c’est une décision partagée.' },
  { t: 'Nous datons et signons', d: 'Chaque partenaire indique son rôle et signe, avec le doigt sur le téléphone ou à la main sur le document imprimé.' },
  { t: 'Je le transmets', d: 'Aux proches et professionnel·les cités dans le plan, et je le range dans un endroit facile d’accès.' },
  { t: 'Je le relis régulièrement', d: 'Après une crise ou une rechute, lors d’un changement important, et au moins tous les six mois.' },
];

/*
 * Types d'étape :
 *  identity : coordonnées
 *  list     : liste de phrases (suggestions cochables + saisie libre)
 *  records  : liste de fiches à plusieurs champs
 *  final    : lieu, date, signatures
 * Une étape list/records peut avoir des groupes (groups).
 * ordered : l'ordre compte (priorité), on affiche les flèches.
 */
const STEPS_ADULTE = [
  {
    id: 'coordonnees',
    type: 'identity',
    short: 'Coordonnées',
    title: 'Mes coordonnées',
    question: 'Nom, prénom, date de naissance, téléphone, adresse.',
    tip: 'Ces informations permettent d’identifier mon plan. Elles restent sur ce téléphone tant que je ne choisis pas de l’envoyer.',
  },
  {
    id: 'partenaires',
    type: 'records',
    short: 'Partenaires',
    title: 'Avec qui je l’élabore',
    question: 'Mon plan de crise a été élaboré conjointement avec (noms et rôles des différents partenaires) :',
    tip: 'Au moins un·e professionnel·le qui m’accompagne. Des proches ou un·e pair-aidant·e peuvent participer si je le souhaite : c’est moi qui choisis.',
    fields: [
      { key: 'nom', label: 'Nom', placeholder: 'Ex. : Mme Martin' },
      { key: 'role', label: 'Rôle', placeholder: 'Ex. : infirmière référente' },
    ],
    suggestField: 'role',
    contacts: { name: 'nom' },
    suggestLabel: 'Ajouter un partenaire selon son rôle',
    suggestions: [
      'Infirmier·ère référent·e', 'Psychiatre', 'Médecin traitant', 'Psychologue',
      'Pair-aidant·e', 'Assistant·e social·e', 'Éducateur·rice', 'Proche (famille)',
      'Ami·e', 'Personne de confiance',
    ],
  },
  {
    id: 'difficultes',
    type: 'list',
    short: 'Mes difficultés',
    title: 'Ce qui a motivé mon suivi',
    question: 'Les difficultés psychiques et/ou problèmes d’addiction qui ont motivé mon suivi :',
    tip: 'Je peux employer mes propres mots plutôt qu’un diagnostic. Je n’écris que ce que j’ai envie de partager.',
    suggestions: [
      'Des périodes de grande tristesse ou de découragement',
      'Des moments d’angoisse intense',
      'Des périodes d’excitation où je dors très peu',
      'Des moments où je ne sais plus ce qui est réel',
      'Des pensées qui m’envahissent',
      'Des idées de mort',
      'Ma consommation d’alcool',
      'Ma consommation de cannabis ou d’autres produits',
      'Des difficultés liées à un événement traumatisant',
      'Des relations aux autres qui deviennent très difficiles',
    ],
  },
  {
    id: 'declencheurs',
    type: 'list',
    short: 'Déclencheurs',
    title: 'Ce qui peut me mettre en crise',
    question: 'Qu’est-ce qui peut m’amener à une situation qui me dépasse, me mette en crise ou me fasse rechuter ?',
    tip: 'Je pense aux dernières fois où ça n’allait pas : que s’était-il passé juste avant, ou les semaines précédentes ?',
    suggestions: [
      'Le manque de sommeil', 'Un conflit avec un proche', 'Une rupture ou une séparation',
      'Un deuil', 'Le stress au travail ou aux études', 'Perdre mon travail ou mon logement',
      'Des soucis d’argent', 'Me sentir seul·e ou isolé·e', 'Arrêter mon traitement sans accompagnement',
      'Consommer de l’alcool ou d’autres produits', 'Une date anniversaire difficile',
      'Un changement important (déménagement, nouvelle équipe…)', 'Un problème de santé physique',
      'Les fêtes de fin d’année', 'Me sentir jugé·e ou rejeté·e',
    ],
  },
  {
    id: 'enCrise',
    type: 'list',
    short: 'Quand je suis en crise',
    title: 'Comment je suis en crise',
    question: 'Comment suis-je concrètement quand je suis en crise ? (pensées, émotions, réactions physiques, comportements)',
    tip: 'Plus c’est concret, plus mon entourage pourra repérer les signes tôt. « Je ne réponds plus au téléphone » parle davantage que « je vais mal ».',
    groups: [
      { id: 'pensees', label: 'Mes pensées', suggestions: [
        'Je pense que je ne vaux rien', 'Mes pensées vont très vite', 'Je crois qu’on me veut du mal',
        'Je n’arrive plus à me concentrer', 'Je rumine sans arrêt', 'Je pense que rien ne s’arrangera',
        'Je pense à mourir',
      ] },
      { id: 'emotions', label: 'Mes émotions', suggestions: [
        'Je suis très angoissé·e', 'Je suis irritable', 'Je me sens vide', 'Je suis euphorique',
        'J’ai peur', 'J’ai honte', 'Je pleure beaucoup', 'Je ne ressens plus rien',
      ] },
      { id: 'physique', label: 'Mes réactions physiques', suggestions: [
        'Je dors très peu ou plus du tout', 'Je dors beaucoup plus que d’habitude', 'Je ne mange plus',
        'Je mange beaucoup plus', 'J’ai le cœur qui bat vite', 'Je suis épuisé·e', 'J’ai des tensions, des douleurs',
      ] },
      { id: 'comportements', label: 'Mes comportements', suggestions: [
        'Je m’isole dans ma chambre', 'Je ne réponds plus au téléphone', 'Je dépense beaucoup',
        'Je parle très vite et beaucoup', 'Je ne prends plus soin de moi', 'J’arrête mon traitement',
        'Je consomme davantage', 'Je n’arrive plus à aller au travail', 'Je deviens agressif·ve en paroles',
      ] },
    ],
  },
  {
    id: 'signesEntourage',
    type: 'list',
    short: 'Ce que voit mon entourage',
    title: 'Ce que remarque mon entourage',
    question: 'Y a-t-il d’autres signes qui apparaissent selon mon entourage ?',
    tip: 'Je peux poser la question à mes proches : « Qu’est-ce que tu remarques en premier quand je commence à aller moins bien ? »',
    suggestions: [
      'Je me renferme et je parle peu', 'Je suis plus irritable', 'Je néglige mon apparence',
      'Je ne donne plus de nouvelles', 'Je tiens des propos inhabituels', 'Mon logement est en désordre',
      'Je suis très agité·e', 'Je change mes habitudes de sommeil', 'J’annule mes activités',
    ],
  },
  {
    id: 'strategies',
    type: 'list',
    ordered: true,
    short: 'Ce que je peux faire',
    title: 'Ce que je peux faire pour gérer la situation',
    question: 'Que pourrais-je faire concrètement pour gérer cette situation difficile ? (mettre par ordre de priorité en favorisant d’abord les stratégies personnelles, puis celles de l’entourage et finalement celles nécessitant l’intervention de professionnels)',
    tip: 'Je classe par ordre de priorité avec les flèches : ce que je fais en premier en haut. Je commence par ce que je peux faire seul·e. Dans ma boîte à outils, je peux garder des photos, musiques, vidéos ou liens qui m’aident.',
    groups: [
      { id: 'moi', label: '1. Ce que je fais moi-même', suggestions: [
        'Je respire calmement quelques minutes', 'Je vais marcher', 'J’écoute de la musique qui m’apaise',
        'Je prends une douche', 'Je me couche à heure régulière', 'J’écris ce que je ressens',
        'J’évite l’alcool et les autres produits', 'Je prends mon traitement comme prévu',
        'Je fais une activité qui m’occupe les mains', 'Je relis mon plan de crise',
      ] },
      { id: 'entourage', label: '2. Avec l’aide de mon entourage', suggestions: [
        'J’appelle un·e proche pour parler', 'Je demande à quelqu’un de rester avec moi',
        'Je vais passer quelques jours chez un·e proche', 'Je demande qu’on m’aide pour les courses ou les repas',
        'Je confie ma carte bancaire à une personne de confiance', 'Je demande qu’on m’accompagne à un rendez-vous',
      ] },
      { id: 'pros', label: '3. Avec l’intervention de professionnel·les', suggestions: [
        'J’appelle mon infirmier·ère référent·e', 'Je demande un rendez-vous rapide avec mon psychiatre',
        'Je contacte mon médecin traitant', 'Je me rends au centre médico-psychologique (CMP)',
        'J’appelle une ligne d’écoute', 'Je demande une hospitalisation de courte durée',
        'Je me rends aux urgences',
      ] },
    ],
  },
  {
    id: 'aide',
    type: 'records',
    ordered: true,
    contacts: { name: 'nom', tel: 'tel' },
    contactGroupsOnly: true,
    short: 'À qui demander de l’aide',
    title: 'À qui demander de l’aide',
    question: 'En cas de besoin, à qui puis-je demander de l’aide ? (nom, nature du lien ou rôle, tél ; mettre par ordre de priorité en favorisant d’abord le réseau des proches, puis des professionnels du réseau habituel, puis les services et institutions de garde)',
    tip: 'Je vérifie avec chaque personne qu’elle est d’accord pour être contactée, et je note un numéro qui répond vraiment.',
    fields: [
      { key: 'nom', label: 'Nom', placeholder: 'Ex. : Julie' },
      { key: 'lien', label: 'Lien ou rôle', placeholder: 'Ex. : ma sœur' },
      { key: 'tel', label: 'Téléphone', placeholder: '06 …', type: 'tel' },
    ],
    groups: [
      { id: 'proches', label: '1. Mes proches', contacts: true, suggestField: 'lien', suggestions: [
        'Parent', 'Frère ou sœur', 'Conjoint·e', 'Ami·e', 'Voisin·e', 'Personne de confiance',
      ] },
      { id: 'pros', label: '2. Mes professionnel·les habituel·les', contacts: true, suggestField: 'lien', suggestions: [
        'Infirmier·ère référent·e', 'Psychiatre', 'Médecin traitant', 'Psychologue', 'CMP de mon secteur', 'Pair-aidant·e',
      ] },
      { id: 'garde', label: '3. Services et institutions de garde', suggestions: [
        { nom: 'SAMU', lien: 'Urgence médicale (France)', tel: '15' },
        { nom: 'Numéro d’urgence européen', lien: 'Toute urgence', tel: '112' },
        { nom: '3114', lien: 'Numéro national de prévention du suicide, 24 h/24 (France)', tel: '3114' },
        { nom: 'Urgences sourds et malentendants', lien: 'SMS ou visio (France)', tel: '114' },
        { nom: 'Urgences psychiatriques', lien: 'Service de garde de mon secteur', tel: '' },
        { nom: 'Médecin de garde', lien: 'Permanence des soins', tel: '' },
      ] },
    ],
  },
  {
    id: 'soinsSouhaites',
    type: 'list',
    short: 'Soins souhaités',
    title: 'Les soins que je souhaite recevoir',
    question: 'Quand je vais moins bien, en cas de crise et/ou de rechute : 1. Quels sont les soins que je souhaite recevoir ?',
    tip: 'Je peux m’appuyer sur ce qui m’a déjà aidé lors de crises précédentes, y compris un traitement précis.',
    suggestions: [
      'Être écouté·e calmement, sans être jugé·e', 'Qu’on m’explique ce qui se passe et ce qui est prévu',
      'Voir rapidement mon infirmier·ère référent·e', 'Être reçu·e en consultation dans la journée',
      'Un traitement qui m’a déjà aidé (à préciser)', 'Un endroit calme, avec peu de bruit et de lumière',
      'Pouvoir garder mon téléphone pour joindre mes proches', 'Que mon/ma proche de confiance soit prévenu·e',
      'Être hospitalisé·e en soins libres si c’est nécessaire', 'Être soigné·e près de chez moi',
    ],
  },
  {
    id: 'soinsEvites',
    type: 'records',
    short: 'Soins à éviter',
    title: 'Les soins que je souhaite éviter',
    question: '2. Quels sont les soins que je souhaite éviter ? (argumenter les raisons du refus)',
    tip: 'Pour chaque soin, j’explique pourquoi : un effet indésirable déjà vécu, un mauvais souvenir… Cela aide les soignant·es à comprendre et à respecter mon choix.',
    fields: [
      { key: 'soin', label: 'Soin à éviter', placeholder: 'Ex. : tel médicament' },
      { key: 'raison', label: 'Pourquoi', placeholder: 'Ex. : forte prise de poids en 2024', multiline: true },
    ],
    suggestField: 'soin',
    suggestLabel: 'Ajouter un soin à éviter',
    suggestions: [
      'Un médicament qui m’a causé des effets indésirables (à préciser)',
      'Une injection sans explication préalable', 'Être mis·e en chambre d’isolement',
      'La contention', 'Être hospitalisé·e loin de chez moi', 'Rester seul·e sans pouvoir parler à quelqu’un',
      'Que telle personne soit prévenue (à préciser)',
    ],
  },
  {
    id: 'alternatives',
    type: 'list',
    short: 'Alternatives',
    title: 'Les alternatives possibles',
    question: '3. Quelles sont alors les alternatives possibles ? (indispensable à renseigner en cas de refus de soins ou de traitements)',
    tip: 'Pour chaque soin que je souhaite éviter, je propose ce qui pourrait le remplacer. C’est ce qui rend mon refus utilisable en situation de crise.',
    requiresIfNotEmpty: 'soinsEvites',
    suggestions: [
      'Un autre médicament que je tolère mieux (à préciser)', 'Me proposer d’abord un traitement par voie orale',
      'Rester avec un·e soignant·e dans un espace calme', 'Pouvoir appeler mon/ma proche de confiance',
      'Me laisser du temps et m’expliquer avant d’agir', 'Un apaisement par la parole, la respiration, la musique',
      'Une hospitalisation dans mon secteur', 'Augmenter la fréquence des rendez-vous ou des visites à domicile',
    ],
  },
  {
    id: 'demarches',
    type: 'records',
    short: 'Démarches à déléguer',
    title: 'Préserver mes intérêts et mon quotidien',
    question: 'Dans une situation de crise, quelles sont les démarches concrètes à faire ou à déléguer pour préserver mes intérêts et mon quotidien ? (courrier, garde d’enfants, animaux, domicile, travail, … nommer qui peut ou doit faire quoi, mettre les coordonnées des personnes afin qu’elles puissent être atteintes en cas de besoin)',
    tip: 'Je nomme une personne par tâche et je vérifie qu’elle est d’accord. Je note où se trouvent les clés ou les documents utiles.',
    fields: [
      { key: 'quoi', label: 'Quoi', placeholder: 'Ex. : nourrir mon chat' },
      { key: 'qui', label: 'Qui', placeholder: 'Ex. : Karim, mon voisin' },
      { key: 'contact', label: 'Coordonnées', placeholder: 'Téléphone, adresse…', type: 'tel' },
    ],
    suggestField: 'quoi',
    contacts: { name: 'qui', tel: 'contact' },
    suggestLabel: 'Ajouter une démarche',
    suggestions: [
      'Récupérer mon courrier', 'Garder ou accompagner mes enfants', 'Prévenir l’école ou la crèche',
      'M’occuper de mon animal', 'Arroser les plantes, vider le réfrigérateur', 'Garder un double de mes clés',
      'Prévenir mon employeur', 'Payer le loyer et les factures', 'Annuler ou reporter mes rendez-vous',
      'Apporter des affaires si je suis hospitalisé·e', 'Garer ou surveiller ma voiture',
    ],
  },
  {
    id: 'transmis',
    type: 'records',
    short: 'Transmis à',
    title: 'À qui je transmets mon plan',
    question: 'Mon plan de crise conjoint a été transmis à : (lieu ou nom, nature du lien)',
    tip: 'Le document m’appartient. Je le transmets aux personnes citées dans le plan et je le range dans un endroit facile à trouver.',
    fields: [
      { key: 'nom', label: 'Lieu ou nom', placeholder: 'Ex. : CMP de mon secteur' },
      { key: 'lien', label: 'Nature du lien', placeholder: 'Ex. : équipe qui me suit' },
    ],
    suggestField: 'nom',
    suggestLabel: 'Ajouter un destinataire',
    suggestions: [
      'Mon infirmier·ère référent·e', 'Mon psychiatre', 'Mon médecin traitant', 'Ma personne de confiance',
      'Un·e proche cité·e dans le plan', 'Mon dossier médical partagé (Mon espace santé)',
      'Un exemplaire chez moi, dans un endroit accessible',
    ],
  },
  {
    id: 'signature',
    type: 'final',
    short: 'Date et signatures',
    title: 'Lieu, date et signatures',
    question: 'Lieu et date. Rôles & signatures :',
    tip: 'Avant de signer, nous relisons le plan ensemble. Chacun·e peut signer sur l’écran de ce téléphone ou sur le document imprimé. La date me rappellera quand relire mon plan.',
    fields: [
      { key: 'nom', label: 'Nom', placeholder: 'Ex. : moi-même' },
      { key: 'role', label: 'Rôle', placeholder: 'Ex. : usager·ère, infirmier·ère…' },
    ],
  },
];

const PRINT_TITLE_ADULTE = 'PLAN DE CRISE CONJOINT';
const PRINT_SUBTITLE_ADULTE = 'Un partenariat entre moi et mon réseau de soutien — version adulte';

/* ---------- choix de la version (adulte / ado) ----------
 * Les exports ci-dessous sont des liaisons vivantes : après setVersion(),
 * tous les modules qui les importent voient la trame de la version choisie.
 */
export const VERSIONS = {
  adulte: { label: 'Adulte', steps: STEPS_ADULTE, process: PROCESS_ADULTE, source: SOURCE_ADULTE, title: PRINT_TITLE_ADULTE, subtitle: PRINT_SUBTITLE_ADULTE },
  ado: { label: 'Ado', steps: STEPS_ADO, process: PROCESS_ADO, source: SOURCE_ADO, title: PRINT_TITLE_ADO, subtitle: PRINT_SUBTITLE_ADO },
};

export let VERSION = 'adulte';
export let STEPS = STEPS_ADULTE;
export let PROCESS = PROCESS_ADULTE;
export let SOURCE = SOURCE_ADULTE;
export let PRINT_TITLE = PRINT_TITLE_ADULTE;
export let PRINT_SUBTITLE = PRINT_SUBTITLE_ADULTE;

export function setVersion(v) {
  const c = VERSIONS[v] || VERSIONS.adulte;
  VERSION = VERSIONS[v] ? v : 'adulte';
  STEPS = c.steps;
  PROCESS = c.process;
  SOURCE = c.source;
  PRINT_TITLE = c.title;
  PRINT_SUBTITLE = c.subtitle;
}

/** Étapes de l'autre version absentes de la version donnée (réponses gardées mais masquées) */
export function hiddenSteps(v) {
  const mine = new Set(VERSIONS[v].steps.map((s) => s.id));
  const other = v === 'ado' ? VERSIONS.adulte.steps : VERSIONS.ado.steps;
  return other.filter((s) => !mine.has(s.id));
}
