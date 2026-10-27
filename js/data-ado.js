/*
 * Mon PCC — trame et exemples de la VERSION ADOS
 *
 * Les intitulés des questions reprennent le « Support Plan de Crise Conjoint
 * Ado uniformisé — V1 phase test » :
 *   Ferrari, P., Zambrano-Ovalle, T., Martino, P. (2026). https://plandecriseconjoint.ch/
 *   © Haute École de la Santé La Source, Lausanne — site sous licence CC BY-NC-SA.
 * Modifications apportées : découpage en étapes, conseils de rédaction,
 * exemples rédigés pour Mon PCC. Diffusé sous la même licence (CC BY-NC-SA 4.0).
 *
 * Les identifiants d'étapes communs avec la version adulte (coordonnees,
 * partenaires, difficultes, declencheurs, enCrise, signesEntourage, strategies,
 * transmis, signature) partagent les mêmes réponses : on peut changer de
 * version sans rien perdre.
 */

export const SOURCE_ADO = {
  citation:
    'Ferrari, P., Zambrano-Ovalle, T., Martino, P. (2026). Support Plan de Crise Conjoint Ado uniformisé — V1 phase test.',
  url: 'https://plandecriseconjoint.ch/',
  holder: 'Haute École de la Santé La Source, Lausanne',
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr',
};

export const PRINT_TITLE_ADO = 'MON PLAN DE CRISE CONJOINT';
export const PRINT_SUBTITLE_ADO = 'Un partenariat entre moi et mon réseau de soutien — version ado (phase de test)';

// Adultes qui peuvent prendre soin de l'ado, quelle que soit sa situation de vie
const ADULTES = [
  'Parent', 'Représentant·e légal·e', 'Famille d’accueil (assistant·e familial·e)',
  'Éducateur·rice (foyer, lieu de vie)', 'Référent·e de l’aide sociale à l’enfance (ASE)',
  'Grand-parent ou autre membre de la famille', 'Adulte de confiance',
];

export const PROCESS_ADO = [
  { t: 'Je choisis un moment calme', d: 'Quand ça va plutôt bien, pas en pleine crise. Je peux faire des pauses et avancer à mon rythme.' },
  { t: 'Je remplis d’abord seul·e', d: 'Avec mes propres mots, en disant « je ». Des exemples sont disponibles si je manque d’idées, mais ils ne parlent pas à ma place.' },
  { t: 'J’en parle avec un·e professionnel·le', d: 'Avec un·e professionnel·le qui m’accompagne, et avec les adultes qui prennent soin de moi : mes parents, ma famille d’accueil, mon éducateur·rice, mon ou ma référent·e… selon ma situation. Ensemble, on complète ou on modifie le plan.' },
  { t: 'On date et on signe', d: 'Chaque personne indique son rôle et signe, avec le doigt sur le téléphone ou à la main sur le document imprimé.' },
  { t: 'Je le transmets', d: 'Aux personnes citées dans le plan, et je le range dans un endroit facile à trouver.' },
  { t: 'Je le relis régulièrement', d: 'Après une crise, quand quelque chose change dans ma vie (école, lieu de vie, suivi…), et au moins tous les six mois.' },
];

export const STEPS_ADO = [
  {
    id: 'coordonnees',
    type: 'identity',
    short: 'Coordonnées',
    title: 'Mes coordonnées',
    question: 'Nom, prénom, date de naissance, téléphone, adresse.',
    tip: 'Ces informations permettent d’identifier mon plan. Elles restent sur ce téléphone tant que je ne choisis pas de l’envoyer. L’adresse peut être celle de mon lieu de vie actuel (famille, famille d’accueil, foyer…).',
  },
  {
    id: 'partenaires',
    type: 'records',
    short: 'Avec qui',
    title: 'Avec qui je fais mon plan',
    question: 'Mon plan de crise a été fait avec (noms et rôles des différentes personnes) :',
    tip: 'Au moins un·e professionnel·le qui m’accompagne. Je peux aussi le faire avec les adultes qui prennent soin de moi, selon ma situation : parents, famille d’accueil, éducateur·rice, référent·e…',
    fields: [
      { key: 'nom', label: 'Nom', placeholder: 'Ex. : Mme Martin' },
      { key: 'role', label: 'Rôle', placeholder: 'Ex. : infirmière scolaire' },
    ],
    contacts: { name: 'nom' },
    suggestField: 'role',
    suggestLabel: 'Ajouter une personne selon son rôle',
    suggestions: [
      ...ADULTES,
      'Infirmier·ère scolaire', 'Pédopsychiatre ou psychiatre', 'Psychologue', 'Infirmier·ère du CMP',
      'Médecin traitant', 'Professionnel·le de la Maison des adolescents', 'Pair-aidant·e',
    ],
  },
  {
    id: 'difficultes',
    type: 'list',
    short: 'Mes difficultés',
    title: 'Ce qui m’amène à faire mon plan',
    question: 'Quelles difficultés m’amènent à écrire mon Plan de Crise Conjoint ?',
    tip: 'Je peux utiliser mes propres mots. Je n’écris que ce que j’ai envie de partager.',
    suggestions: [
      'Je me sens souvent triste ou découragé·e',
      'J’ai des crises d’angoisse',
      'J’ai du mal à gérer ma colère',
      'Je me fais du mal',
      'J’ai des idées de mort',
      'J’ai du mal à manger, ou je mange beaucoup trop',
      'Je consomme de l’alcool, du cannabis ou d’autres produits',
      'J’ai vécu des choses très difficiles',
      'J’ai du mal à aller à l’école',
      'Je me sens seul·e ou rejeté·e',
    ],
  },
  {
    id: 'declencheurs',
    type: 'list',
    short: 'Ce qui me déborde',
    title: 'Ce qui peut me déborder',
    question: 'Qu’est-ce qui peut m’amener à être débordé.e (en crise) ?',
    tip: 'Je pense aux dernières fois où ça n’allait pas : que s’était-il passé juste avant, ou les jours d’avant ?',
    suggestions: [
      'Une dispute là où je vis', 'Une dispute avec un·e ami·e', 'Une rupture amoureuse',
      'Le harcèlement, à l’école ou en ligne', 'Des messages ou commentaires sur les réseaux sociaux',
      'Les contrôles, les examens, les notes', 'Le manque de sommeil', 'Me sentir seul·e',
      'Me sentir jugé·e ou pas écouté·e', 'Un changement (nouvelle école, nouveau lieu de vie…)',
      'Une visite ou un contact difficile avec ma famille', 'Une date anniversaire difficile',
      'Être privé·e de mon téléphone', 'Consommer de l’alcool ou d’autres produits',
    ],
  },
  {
    id: 'enCrise',
    type: 'list',
    short: 'Ce que je remarque',
    title: 'Ce que je remarque chez moi',
    question: 'Qu’est-ce-que je remarque chez moi quand ça ne va pas ? (pensées, émotions, réactions physiques, comportements)',
    tip: 'Plus c’est concret, plus les personnes autour de moi pourront repérer tôt que ça ne va pas. « Je ne réponds plus aux messages » parle plus que « je vais mal ».',
    groups: [
      { id: 'pensees', label: 'Mes pensées', suggestions: [
        'Je pense que je suis nul·le', 'Je pense que personne ne m’aime', 'Mes pensées tournent en boucle',
        'Je n’arrive plus à me concentrer en cours', 'J’ai envie que tout s’arrête',
        'Je pense à me faire du mal', 'Je pense à mourir',
      ] },
      { id: 'emotions', label: 'Mes émotions', suggestions: [
        'Je suis très en colère', 'Je suis très angoissé·e', 'Je me sens vide', 'Je pleure beaucoup',
        'J’ai honte', 'Je ne ressens plus rien', 'Je m’énerve pour un rien',
      ] },
      { id: 'physique', label: 'Mes réactions physiques', suggestions: [
        'Je dors mal ou très peu', 'Je dors beaucoup plus que d’habitude', 'Je n’ai plus faim',
        'Je mange beaucoup plus', 'J’ai mal au ventre ou à la tête', 'Mon cœur bat vite', 'Je suis épuisé·e',
      ] },
      { id: 'comportements', label: 'Mes comportements', suggestions: [
        'Je m’enferme dans ma chambre', 'Je ne réponds plus aux messages', 'Je passe la nuit sur mon téléphone',
        'Je ne vais plus en cours', 'J’ai envie de partir, de fuguer', 'Je me dispute avec tout le monde',
        'Je me fais du mal', 'Je consomme de l’alcool ou d’autres produits', 'Je casse des choses',
      ] },
    ],
  },
  {
    id: 'signesEntourage',
    type: 'list',
    short: 'Ce que voit mon entourage',
    title: 'Ce que remarque mon entourage',
    question: 'Qu’est-ce-que mon entourage remarque chez moi quand ça ne va pas ? (pensées, émotions, réactions physiques, comportements)',
    tip: 'Je peux demander aux personnes qui me connaissent bien : « Qu’est-ce que tu remarques en premier quand je commence à aller moins bien ? »',
    suggestions: [
      'Je parle beaucoup moins', 'Je suis plus irritable', 'Je reste tout le temps dans ma chambre',
      'Mes notes baissent', 'Je ne vois plus mes ami·es', 'Je ne mange plus avec les autres',
      'Je suis très agité·e', 'Je prends moins soin de moi', 'Je réponds de façon agressive',
    ],
  },
  {
    id: 'strategies',
    type: 'list',
    short: 'Ce qui me fait du bien',
    title: 'Ce qui me fait du bien',
    question: 'Qu’est-ce qui me fait du bien quand ça ne va pas ? (loisirs, entourage, aide de professionnels)',
    tip: 'Je peux mettre en premier ce qui m’aide le plus, avec les flèches. Dans ma boîte à outils, je peux garder des photos, musiques, vidéos ou liens qui m’aident.',
    ordered: true,
    groups: [
      { id: 'moi', label: 'Mes loisirs, ce que je fais moi-même', suggestions: [
        'J’écoute de la musique', 'Je fais du sport ou je vais marcher', 'Je dessine, j’écris ou je joue d’un instrument',
        'Je joue à un jeu que j’aime', 'Je respire calmement quelques minutes', 'Je prends une douche',
        'Je regarde ma boîte à outils', 'Je me repose, je fais une pause', 'Je passe du temps avec mon animal',
      ] },
      { id: 'entourage', label: 'Mon entourage', suggestions: [
        'J’écris ou j’appelle un·e ami·e', 'Je parle à un adulte de confiance', 'Je demande à quelqu’un de rester avec moi',
        'Je passe du temps avec les personnes avec qui je vis', 'Je parle à mon éducateur·rice ou à mon ou ma référent·e',
        'Je vais chez un·e proche',
      ] },
      { id: 'pros', label: 'L’aide de professionnel·les', suggestions: [
        'Je vais voir l’infirmier·ère scolaire', 'J’appelle mon ou ma psychologue ou mon pédopsychiatre',
        'Je contacte la Maison des adolescents', 'Je vais au CMP', 'J’appelle Fil Santé Jeunes (0 800 235 236)',
        'J’appelle le 3114', 'Je vais aux urgences',
      ] },
    ],
  },
  {
    id: 'information',
    type: 'records',
    short: 'Qui informer',
    title: 'Qui informer quand ça ne va pas',
    question: 'Quand ça ne va pas, qui devrait être informé ? Par qui ? Et comment ?',
    tip: 'Pour chaque personne, j’indique qui la prévient et comment (appel, message, en personne…). Je vérifie avec elle qu’elle est d’accord.',
    fields: [
      { key: 'qui', label: 'Qui ?', placeholder: 'Ex. : ma référente ASE, Mme Diallo' },
      { key: 'parQui', label: 'Par qui ?', placeholder: 'Ex. : moi, ou mon éducateur' },
      { key: 'comment', label: 'Comment ?', placeholder: 'Ex. : par téléphone au 06…', multiline: true },
    ],
    labelled: true,
    contacts: { name: 'qui', tel: 'comment' },
    suggestField: 'qui',
    suggestLabel: 'Ajouter une personne à informer',
    suggestions: [
      ...ADULTES, 'Mon infirmier·ère scolaire', 'Mon ou ma psychologue ou pédopsychiatre', 'Un·e ami·e', 'Un frère ou une sœur',
    ],
  },
  {
    id: 'transmis',
    type: 'records',
    short: 'Transmis à',
    title: 'À qui je transmets mon plan',
    question: 'Mon plan de crise conjoint a été transmis à : (lieu ou nom, nature du lien)',
    tip: 'Je le transmets aux personnes citées dans le plan et je le range dans un endroit facile à trouver.',
    fields: [
      { key: 'nom', label: 'Lieu ou nom', placeholder: 'Ex. : infirmerie du collège' },
      { key: 'lien', label: 'Nature du lien', placeholder: 'Ex. : infirmière scolaire' },
    ],
    suggestField: 'nom',
    suggestLabel: 'Ajouter un destinataire',
    suggestions: [
      'Les adultes qui prennent soin de moi', 'Mon infirmier·ère scolaire', 'Mon éducateur·rice ou mon lieu de vie',
      'Mon ou ma référent·e ASE', 'Mon ou ma psychologue ou pédopsychiatre', 'Mon médecin traitant',
      'Un exemplaire chez moi, dans un endroit facile à trouver',
    ],
  },
  {
    id: 'signature',
    type: 'final',
    short: 'Date et signatures',
    title: 'Lieu, date et signatures',
    question: 'Lieu et date. Rôles & signatures :',
    tip: 'Avant de signer, on relit le plan ensemble. Chacun·e peut signer sur l’écran de ce téléphone ou sur le document imprimé.',
    fields: [
      { key: 'nom', label: 'Nom', placeholder: 'Ex. : moi-même' },
      { key: 'role', label: 'Rôle', placeholder: 'Ex. : moi, infirmière, éducateur…' },
    ],
  },
];
