/*
 * Mon PCC — ressources d'aide (France).
 * Informations vérifiées le 26 octobre 2026 sur les sites officiels
 * (sante.fr, solidarites.gouv.fr, MSA, Unafam, CIDJ, Santé publique France…).
 * Les horaires pouvant évoluer, revérifier à chaque mise à jour du projet.
 */
export const CHECKED = '26 octobre 2026';

export const RESOURCES = [
  {
    id: 'urgence', title: 'Urgence', icon: '🚨',
    intro: 'En cas de danger immédiat pour moi ou pour quelqu’un d’autre.',
    items: [
      { name: 'SAMU', tel: '15', hours: '24 h/24, 7 j/7', desc: 'Urgence médicale.' },
      { name: 'Numéro d’urgence européen', tel: '112', hours: '24 h/24, 7 j/7', desc: 'Toute urgence, depuis n’importe quel pays de l’Union européenne.' },
      { name: '3114 — prévention du suicide', tel: '3114', hours: '24 h/24, 7 j/7', url: 'https://3114.fr/', desc: 'Pour les personnes qui pensent au suicide, leurs proches, les personnes endeuillées et les professionnel·les. Gratuit et confidentiel.' },
      { name: 'Urgences pour personnes sourdes ou malentendantes', tel: '114', hours: '24 h/24, 7 j/7', desc: 'Par SMS, visio, tchat ou fax.' },
    ],
  },
  {
    id: 'ecoute', title: 'Besoin de parler', icon: '💬',
    intro: 'Des lignes d’écoute anonymes, quand ça ne va pas.',
    items: [
      { name: 'SOS Amitié', tel: '09 72 39 40 50', hours: 'Téléphone 24 h/24 ; tchat tous les jours de 13 h à 3 h', url: 'https://www.sos-amitie.com/', desc: 'Pour toute personne qui traverse une période difficile. Gratuit, anonyme et confidentiel. Écoute en anglais : 01 46 21 46 46.' },
      { name: 'Suicide Écoute', tel: '01 45 39 40 00', hours: '24 h/24, 7 j/7', url: 'https://suicideecoute.pads.fr/', desc: 'Pour toute personne concernée par le suicide. Anonyme.' },
      { name: 'SOS Suicide Phénix', tel: '01 40 44 46 45', hours: 'Tous les jours de 13 h à 23 h', url: 'https://sos-suicide-phenix.org/', desc: 'Écoute et messagerie pour toute personne concernée par le suicide.' },
    ],
  },
  {
    id: 'jeunes', title: 'Jeunes et étudiant·es', icon: '🎓',
    items: [
      { name: 'Fil Santé Jeunes', tel: '0 800 235 236', hours: 'Téléphone tous les jours de 9 h à 23 h ; tchat de 9 h à 22 h', url: 'https://www.filsantejeunes.com/', desc: 'Pour les 12-25 ans : santé, sexualité, amour, mal-être. Gratuit et anonyme.' },
      { name: 'Nightline', tel: '0 809 104 104', hours: 'Tous les soirs de 21 h à 2 h 30', url: 'https://www.nightline.fr/', desc: 'Écoute par et pour les étudiant·es, par des bénévoles formé·es, en français ou en anglais, par téléphone ou tchat. Gratuit, anonyme, sans jugement.' },
      { name: '3040 — écoute étudiante', tel: '3040', hours: 'Du lundi au vendredi de 10 h à 21 h, le samedi de 10 h à 14 h (métropole)', desc: 'Numéro national pour les étudiant·es en difficulté : écoute, information, orientation, signalement de violences ou de discriminations. Gratuit et confidentiel.' },
      { name: 'Santé Psy Étudiant', url: 'https://santepsy.etudiant.gouv.fr/', desc: 'Jusqu’à 12 séances gratuites par an avec un·e psychologue partenaire, pour tous les étudiant·es.' },
      { name: 'Phare Enfants-Parents', tel: '01 43 46 00 62', hours: 'Du lundi au vendredi de 10 h à 17 h', url: 'https://phare.pads.fr/', desc: 'Pour les parents et les jeunes confrontés au mal-être et au risque suicidaire.' },
    ],
  },
  {
    id: 'agri', title: 'Monde agricole', icon: '🌾',
    items: [
      { name: 'Agri’écoute (MSA)', tel: '09 69 39 29 19', hours: '24 h/24, 7 j/7', url: 'https://agriecoute.fr/', desc: 'Pour les agriculteur·rices, les salarié·es agricoles et leurs proches : écoute anonyme par des psychologues formé·es au monde agricole. Aussi par tchat, e-mail ou visio. Gratuit.' },
    ],
  },
  {
    id: 'proches', title: 'Pour les proches', icon: '🤝',
    items: [
      { name: 'Unafam — Écoute famille', tel: '01 42 63 03 03', hours: 'Du lundi au vendredi de 9 h à 13 h et de 14 h à 18 h (17 h le vendredi)', url: 'https://www.unafam.org/', desc: 'Pour l’entourage d’une personne vivant avec des troubles psychiques : écoute par des psychologues cliniciens. Anonyme et gratuit.' },
      { name: 'Programme BREF', url: 'https://www.unafam.org/', desc: 'Programme court de psychoéducation pour les proches d’une personne vivant avec des troubles psychiques, quel que soit le diagnostic : trois séances en famille, sans la personne concernée, animées par des soignant·es (la dernière avec un·e bénévole de l’Unafam), puis un appel de suivi quelques mois plus tard. Pour en bénéficier : le demander à l’équipe qui soigne mon proche ou à la délégation Unafam de mon département.' },
      { name: 'Dites Je suis là', url: 'https://www.ditesjesuisla.fr/', desc: 'Pour aider un·e proche en crise suicidaire : conseils et lieux de soutien.' },
    ],
  },
  {
    id: 'addictions', title: 'Addictions', icon: '🧭',
    items: [
      { name: 'Alcool Info Service', tel: '0 980 980 930', hours: 'Tous les jours de 8 h à 2 h', url: 'https://www.alcool-info-service.fr/', desc: 'Anonyme, appel non surtaxé.' },
      { name: 'Drogues Info Service', tel: '0 800 23 13 13', hours: 'Tous les jours de 8 h à 2 h', url: 'https://www.drogues-info-service.fr/', desc: 'Anonyme et gratuit.' },
      { name: 'Joueurs Info Service', tel: '09 74 75 13 13', hours: 'Tous les jours de 8 h à 2 h', url: 'https://www.joueurs-info-service.fr/', desc: 'Anonyme, appel non surtaxé.' },
    ],
  },
  {
    id: 'violences', title: 'Violences et harcèlement', icon: '🛡',
    items: [
      { name: 'Violences Femmes Info', tel: '3919', hours: 'Du lundi au vendredi de 9 h à 22 h ; week-ends et jours fériés de 9 h à 18 h', desc: 'Pour les femmes victimes de violences, leur entourage et les professionnel·les.' },
      { name: 'Enfance en danger', tel: '119', hours: '24 h/24, 7 j/7', desc: 'Pour les victimes ou témoins de violences envers un enfant. Gratuit, possible anonymement ; tchat pour les moins de 21 ans.' },
      { name: '3018 — violences numériques', tel: '3018', hours: '6 jours sur 7 de 9 h à 20 h', url: 'https://www.3018.fr/', desc: 'Cyberharcèlement et violences en ligne. Aussi par tchat, Messenger ou WhatsApp. Gratuit, anonyme et confidentiel.' },
      { name: '3020 — harcèlement à l’école', tel: '3020', hours: 'Du lundi au vendredi de 9 h à 20 h, le samedi de 9 h à 18 h', desc: 'Pour les victimes ou témoins de harcèlement scolaire.' },
    ],
  },
  {
    id: 'info', title: 'S’informer, trouver un soin', icon: '📚',
    items: [
      { name: 'Psycom', url: 'https://www.psycom.org/', desc: 'Information de référence sur la santé mentale, les troubles, les soins, les droits et les lieux d’aide.' },
      { name: 'Santé mentale Info Service', url: 'https://www.santementale-info-service.fr/', desc: 'Site de Santé publique France pour prendre soin de sa santé mentale, s’informer et trouver de l’aide.' },
      { name: 'Mon soutien psy', url: 'https://monsoutienpsy.ameli.fr/', desc: 'Jusqu’à 12 séances par an chez un·e psychologue partenaire, remboursées par l’Assurance maladie.' },
      { name: 'Plan de Crise Conjoint', url: 'https://plandecriseconjoint.ch/', desc: 'Le site de référence du PCC : informations, formulaires officiels et formation en ligne gratuite.' },
    ],
  },
];
