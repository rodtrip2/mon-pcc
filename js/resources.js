/*
 * Mon PCC — ressources d'aide par pays.
 *
 * Numéros, horaires et publics vérifiés sur les sites officiels des services
 * ou des autorités de santé (France : 26 octobre 2026 ; autres pays : 28 octobre 2026).
 * Les horaires pouvant évoluer, revérifier à chaque mise à jour du projet.
 *
 * Textes bilingues : { fr, en }. tel = numéro à appeler ; sms + smsBody = service par SMS.
 */

const H24 = { fr: '24 h/24, 7 j/7', en: '24/7' };

export const COUNTRIES = {
  /* ------------------------------------------------------------------ France */
  FR: {
    flag: '🇫🇷',
    name: { fr: 'France', en: 'France' },
    inName: { fr: 'en France', en: 'in France' },
    checked: { fr: '26 octobre 2026', en: '26 October 2026' },
    record: 'mes',
    emergency: {
      text: {
        fr: 'Appelez le 15 ou le 112. Si vous pensez au suicide, le 3114 répond 24 h/24, 7 j/7 (France).',
        en: 'Call 15 or 112. If you are thinking about suicide, 3114 is available 24/7 (France, in French).',
      },
      tels: ['15', '112', '3114'],
    },
    garde: [
      { nom: 'SAMU', lien: { fr: 'Urgence médicale (France)', en: 'Medical emergency (France)' }, tel: '15' },
      { nom: { fr: 'Numéro d’urgence européen', en: 'European emergency number' }, lien: { fr: 'Toute urgence', en: 'Any emergency' }, tel: '112' },
      { nom: '3114', lien: { fr: 'Numéro national de prévention du suicide, 24 h/24 (France)', en: 'National suicide prevention line, 24/7 (France)' }, tel: '3114' },
      { nom: { fr: 'Urgences sourds et malentendants', en: 'Emergencies for deaf and hard of hearing people' }, lien: { fr: 'SMS ou visio (France)', en: 'Text or video (France)' }, tel: '114' },
      { nom: { fr: 'Urgences psychiatriques', en: 'Psychiatric emergency service' }, lien: { fr: 'Service de garde de mon secteur', en: 'On-call service for my area' }, tel: '' },
      { nom: { fr: 'Médecin de garde', en: 'On-call doctor' }, lien: { fr: 'Permanence des soins', en: 'Out-of-hours care' }, tel: '' },
    ],
    youthFirst: ['urgence', 'jeunes'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Urgence', en: 'Emergency' },
        intro: { fr: 'En cas de danger immédiat pour moi ou pour quelqu’un d’autre.', en: 'If I or someone else is in immediate danger.' },
        items: [
          { name: 'SAMU', tel: '15', hours: H24, desc: { fr: 'Urgence médicale.', en: 'Medical emergency.' } },
          { name: { fr: 'Numéro d’urgence européen', en: 'European emergency number' }, tel: '112', hours: H24, desc: { fr: 'Toute urgence, depuis n’importe quel pays de l’Union européenne.', en: 'Any emergency, from any country in the European Union.' } },
          { name: { fr: '3114 — prévention du suicide', en: '3114 — suicide prevention' }, tel: '3114', hours: H24, url: 'https://3114.fr/', desc: { fr: 'Pour les personnes qui pensent au suicide, leurs proches, les personnes endeuillées et les professionnel·les. Gratuit et confidentiel.', en: 'For people thinking about suicide, their loved ones, bereaved people and professionals. Free and confidential (in French).' } },
          { name: { fr: 'Urgences pour personnes sourdes ou malentendantes', en: 'Emergencies for deaf or hard of hearing people' }, tel: '114', hours: H24, desc: { fr: 'Par SMS, visio, tchat ou fax.', en: 'By text, video, chat or fax.' } },
        ],
      },
      {
        id: 'ecoute', icon: '💬', title: { fr: 'Besoin de parler', en: 'Need to talk' },
        intro: { fr: 'Des lignes d’écoute anonymes, quand ça ne va pas.', en: 'Anonymous listening lines for when things are hard.' },
        items: [
          { name: 'SOS Amitié', tel: '09 72 39 40 50', hours: { fr: 'Téléphone 24 h/24 ; tchat tous les jours de 13 h à 3 h', en: 'Phone 24/7; chat every day from 1 pm to 3 am' }, url: 'https://www.sos-amitie.com/', desc: { fr: 'Pour toute personne qui traverse une période difficile. Gratuit, anonyme et confidentiel. Écoute en anglais : 01 46 21 46 46.', en: 'For anyone going through a difficult time. Free, anonymous and confidential. English-speaking line: 01 46 21 46 46.' } },
          { name: 'Suicide Écoute', tel: '01 45 39 40 00', hours: H24, url: 'https://suicideecoute.pads.fr/', desc: { fr: 'Pour toute personne concernée par le suicide. Anonyme.', en: 'For anyone affected by suicide. Anonymous (in French).' } },
          { name: 'SOS Suicide Phénix', tel: '01 40 44 46 45', hours: { fr: 'Tous les jours de 13 h à 23 h', en: 'Every day from 1 pm to 11 pm' }, url: 'https://sos-suicide-phenix.org/', desc: { fr: 'Écoute et messagerie pour toute personne concernée par le suicide.', en: 'Listening and messaging for anyone affected by suicide (in French).' } },
        ],
      },
      {
        id: 'jeunes', icon: '🎓', title: { fr: 'Jeunes et étudiant·es', en: 'Young people and students' },
        items: [
          { name: 'Fil Santé Jeunes', tel: '0 800 235 236', hours: { fr: 'Téléphone tous les jours de 9 h à 23 h ; tchat de 9 h à 22 h', en: 'Phone every day from 9 am to 11 pm; chat from 9 am to 10 pm' }, url: 'https://www.filsantejeunes.com/', desc: { fr: 'Pour les 12-25 ans : santé, sexualité, amour, mal-être. Gratuit et anonyme.', en: 'For 12 to 25-year-olds: health, sexuality, love, feeling low. Free and anonymous (in French).' } },
          { name: 'Nightline', tel: '0 809 104 104', hours: { fr: 'Tous les soirs de 21 h à 2 h 30', en: 'Every night from 9 pm to 2:30 am' }, url: 'https://www.nightline.fr/', desc: { fr: 'Écoute par et pour les étudiant·es, par des bénévoles formé·es, en français ou en anglais, par téléphone ou tchat. Gratuit, anonyme, sans jugement.', en: 'Listening by and for students, from trained volunteers, in French or English, by phone or chat. Free, anonymous, non-judgemental.' } },
          { name: { fr: '3040 — écoute étudiante', en: '3040 — student helpline' }, tel: '3040', hours: { fr: 'Du lundi au vendredi de 10 h à 21 h, le samedi de 10 h à 14 h (métropole)', en: 'Monday to Friday 10 am to 9 pm, Saturday 10 am to 2 pm (mainland France)' }, desc: { fr: 'Numéro national pour les étudiant·es en difficulté : écoute, information, orientation, signalement de violences ou de discriminations. Gratuit et confidentiel.', en: 'National line for students in difficulty: listening, information, referral, reporting violence or discrimination. Free and confidential.' } },
          { name: 'Santé Psy Étudiant', url: 'https://santepsy.etudiant.gouv.fr/', desc: { fr: 'Jusqu’à 12 séances gratuites par an avec un·e psychologue partenaire, pour tous les étudiant·es.', en: 'Up to 12 free sessions a year with a partner psychologist, for all students.' } },
          { name: 'Phare Enfants-Parents', tel: '01 43 46 00 62', hours: { fr: 'Du lundi au vendredi de 10 h à 17 h', en: 'Monday to Friday, 10 am to 5 pm' }, url: 'https://phare.pads.fr/', desc: { fr: 'Pour les parents et les jeunes confrontés au mal-être et au risque suicidaire.', en: 'For parents and young people facing distress and suicide risk.' } },
        ],
      },
      {
        id: 'agri', icon: '🌾', title: { fr: 'Monde agricole', en: 'Farming community' },
        items: [
          { name: 'Agri’écoute (MSA)', tel: '09 69 39 29 19', hours: H24, url: 'https://agriecoute.fr/', desc: { fr: 'Pour les agriculteur·rices, les salarié·es agricoles et leurs proches : écoute anonyme par des psychologues formé·es au monde agricole. Aussi par tchat, e-mail ou visio. Gratuit.', en: 'For farmers, farm workers and their families: anonymous listening by psychologists trained in farming issues. Also by chat, email or video. Free.' } },
        ],
      },
      {
        id: 'proches', icon: '🤝', title: { fr: 'Pour les proches', en: 'For family and friends' },
        items: [
          { name: { fr: 'Unafam — Écoute famille', en: 'Unafam — family helpline' }, tel: '01 42 63 03 03', hours: { fr: 'Du lundi au vendredi de 9 h à 13 h et de 14 h à 18 h (17 h le vendredi)', en: 'Monday to Friday 9 am to 1 pm and 2 pm to 6 pm (5 pm on Friday)' }, url: 'https://www.unafam.org/', desc: { fr: 'Pour l’entourage d’une personne vivant avec des troubles psychiques : écoute par des psychologues cliniciens. Anonyme et gratuit.', en: 'For the family and friends of someone living with a mental illness: listening by clinical psychologists. Anonymous and free.' } },
          { name: { fr: 'Programme BREF', en: 'BREF programme' }, url: 'https://www.unafam.org/', desc: { fr: 'Programme court de psychoéducation pour les proches d’une personne vivant avec des troubles psychiques, quel que soit le diagnostic : trois séances en famille, sans la personne concernée, animées par des soignant·es (la dernière avec un·e bénévole de l’Unafam), puis un appel de suivi quelques mois plus tard. Pour en bénéficier : le demander à l’équipe qui soigne mon proche ou à la délégation Unafam de mon département.', en: 'A short psychoeducation programme for the family of someone living with a mental illness, whatever the diagnosis: three family sessions, without the person concerned, led by health professionals (the last one with an Unafam volunteer), then a follow-up call a few months later. To take part, ask the team caring for your loved one or your local Unafam branch.' } },
          { name: 'Dites Je suis là', url: 'https://www.ditesjesuisla.fr/', desc: { fr: 'Pour aider un·e proche en crise suicidaire : conseils et lieux de soutien.', en: 'Helping someone in a suicidal crisis: advice and places of support (in French).' } },
        ],
      },
      {
        id: 'addictions', icon: '🧭', title: { fr: 'Addictions', en: 'Addictions' },
        items: [
          { name: 'Alcool Info Service', tel: '0 980 980 930', hours: { fr: 'Tous les jours de 8 h à 2 h', en: 'Every day from 8 am to 2 am' }, url: 'https://www.alcool-info-service.fr/', desc: { fr: 'Anonyme, appel non surtaxé.', en: 'Anonymous, standard call rate.' } },
          { name: 'Drogues Info Service', tel: '0 800 23 13 13', hours: { fr: 'Tous les jours de 8 h à 2 h', en: 'Every day from 8 am to 2 am' }, url: 'https://www.drogues-info-service.fr/', desc: { fr: 'Anonyme et gratuit.', en: 'Anonymous and free.' } },
          { name: 'Joueurs Info Service', tel: '09 74 75 13 13', hours: { fr: 'Tous les jours de 8 h à 2 h', en: 'Every day from 8 am to 2 am' }, url: 'https://www.joueurs-info-service.fr/', desc: { fr: 'Anonyme, appel non surtaxé.', en: 'Anonymous, standard call rate.' } },
        ],
      },
      {
        id: 'violences', icon: '🛡', title: { fr: 'Violences et harcèlement', en: 'Violence and harassment' },
        items: [
          { name: 'Violences Femmes Info', tel: '3919', hours: { fr: 'Du lundi au vendredi de 9 h à 22 h ; week-ends et jours fériés de 9 h à 18 h', en: 'Monday to Friday 9 am to 10 pm; weekends and bank holidays 9 am to 6 pm' }, desc: { fr: 'Pour les femmes victimes de violences, leur entourage et les professionnel·les.', en: 'For women experiencing violence, their friends and family, and professionals.' } },
          { name: { fr: 'Enfance en danger', en: 'Children at risk' }, tel: '119', hours: H24, desc: { fr: 'Pour les victimes ou témoins de violences envers un enfant. Gratuit, possible anonymement ; tchat pour les moins de 21 ans.', en: 'For victims or witnesses of violence against a child. Free, can be anonymous; chat for under-21s.' } },
          { name: { fr: '3018 — violences numériques', en: '3018 — online violence' }, tel: '3018', hours: { fr: '6 jours sur 7 de 9 h à 20 h', en: '6 days a week, 9 am to 8 pm' }, url: 'https://www.3018.fr/', desc: { fr: 'Cyberharcèlement et violences en ligne. Aussi par tchat, Messenger ou WhatsApp. Gratuit, anonyme et confidentiel.', en: 'Cyberbullying and online violence. Also by chat, Messenger or WhatsApp. Free, anonymous and confidential.' } },
          { name: { fr: '3020 — harcèlement à l’école', en: '3020 — bullying at school' }, tel: '3020', hours: { fr: 'Du lundi au vendredi de 9 h à 20 h, le samedi de 9 h à 18 h', en: 'Monday to Friday 9 am to 8 pm, Saturday 9 am to 6 pm' }, desc: { fr: 'Pour les victimes ou témoins de harcèlement scolaire.', en: 'For victims or witnesses of bullying at school.' } },
        ],
      },
      {
        id: 'info', icon: '📚', title: { fr: 'S’informer, trouver un soin', en: 'Information and finding care' },
        items: [
          { name: 'Psycom', url: 'https://www.psycom.org/', desc: { fr: 'Information de référence sur la santé mentale, les troubles, les soins, les droits et les lieux d’aide.', en: 'Reference information on mental health, conditions, care, rights and where to get help (in French).' } },
          { name: 'Santé mentale Info Service', url: 'https://www.santementale-info-service.fr/', desc: { fr: 'Site de Santé publique France pour prendre soin de sa santé mentale, s’informer et trouver de l’aide.', en: 'Santé publique France website to look after your mental health, get information and find help (in French).' } },
          { name: 'Mon soutien psy', url: 'https://monsoutienpsy.ameli.fr/', desc: { fr: 'Jusqu’à 12 séances par an chez un·e psychologue partenaire, remboursées par l’Assurance maladie.', en: 'Up to 12 sessions a year with a partner psychologist, reimbursed by French national health insurance.' } },
          { name: 'Plan de Crise Conjoint', url: 'https://plandecriseconjoint.ch/', desc: { fr: 'Le site de référence du PCC : informations, formulaires officiels et formation en ligne gratuite.', en: 'The reference website for the joint crisis plan: information, official forms and free online training.' } },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------ Royaume-Uni */
  GB: {
    flag: '🇬🇧',
    name: { fr: 'Royaume-Uni', en: 'United Kingdom' },
    inName: { fr: 'au Royaume-Uni', en: 'in the United Kingdom' },
    checked: { fr: '28 octobre 2026', en: '28 October 2026' },
    emergency: {
      text: {
        fr: 'En cas d’urgence, appelez le 999. Pour une aide urgente en santé mentale, appelez le 111 et choisissez l’option santé mentale. Samaritans : 116 123, 24 h/24.',
        en: 'In an emergency, call 999. For urgent mental health help, call 111 and choose the mental health option. Samaritans: 116 123, 24/7.',
      },
      tels: ['999', '111', '116 123'],
    },
    garde: [
      { nom: { fr: 'Services d’urgence', en: 'Emergency services' }, lien: { fr: 'Danger immédiat', en: 'Immediate danger' }, tel: '999' },
      { nom: 'NHS 111', lien: { fr: 'Aide urgente, option santé mentale, 24 h/24', en: 'Urgent help, mental health option, 24/7' }, tel: '111' },
      { nom: 'Samaritans', lien: { fr: 'Écoute, 24 h/24', en: 'Listening support, 24/7' }, tel: '116 123' },
      { nom: 'Shout', lien: { fr: 'SMS « SHOUT » au 85258, 24 h/24', en: 'Text SHOUT to 85258, 24/7' }, tel: '85258' },
      { nom: { fr: 'Équipe de crise de mon secteur', en: 'My local crisis team' }, lien: { fr: 'Équipe de crise et de traitement à domicile', en: 'Crisis resolution and home treatment team' }, tel: '' },
      { nom: { fr: 'Médecin généraliste de garde', en: 'Out-of-hours GP' }, lien: { fr: 'Le soir et le week-end', en: 'Evenings and weekends' }, tel: '' },
    ],
    youthFirst: ['urgence', 'jeunes'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Urgence', en: 'Emergency' },
        intro: { fr: 'En cas de danger immédiat, ou si j’ai besoin d’aide tout de suite.', en: 'If I or someone else is in immediate danger, or I need help right now.' },
        items: [
          { name: { fr: 'Services d’urgence', en: 'Emergency services' }, tel: '999', hours: H24, desc: { fr: 'Danger immédiat pour la vie. Je peux aussi me rendre aux urgences (A&E).', en: 'Immediate risk to life. I can also go to A&E.' } },
          { name: { fr: 'NHS 111, option santé mentale', en: 'NHS 111, mental health option' }, tel: '111', hours: H24, desc: { fr: 'Aide urgente en santé mentale (Angleterre et pays de Galles) : j’appelle le 111 et je choisis l’option santé mentale pour parler à un·e professionnel·le. Pour moi ou pour quelqu’un d’autre.', en: 'Urgent mental health help (England and Wales): call 111 and choose the mental health option to speak to a mental health professional. For yourself or someone else.' } },
          { name: 'Samaritans', tel: '116 123', hours: H24, url: 'https://www.samaritans.org/', desc: { fr: 'Écoute confidentielle pour toute personne en détresse. Gratuit.', en: 'Confidential support for anyone who is struggling. Free.' } },
          { name: 'Shout', sms: '85258', smsBody: 'SHOUT', hours: H24, url: 'https://giveusashout.org/', desc: { fr: 'Soutien par SMS : j’envoie « SHOUT » au 85258. Gratuit et confidentiel, partout au Royaume-Uni.', en: 'Text support: text SHOUT to 85258. Free and confidential, anywhere in the UK.' } },
        ],
      },
      {
        id: 'ecoute', icon: '💬', title: { fr: 'Besoin de parler', en: 'Need to talk' },
        items: [
          { name: 'CALM', tel: '0800 58 58 58', hours: { fr: 'Tous les jours de 17 h à minuit', en: 'Every day, 5 pm to midnight' }, url: 'https://www.thecalmzone.net/', desc: { fr: 'Ligne de prévention du suicide et d’écoute, avec un tchat.', en: 'Suicide prevention and support line, with webchat.' } },
          { name: 'SANEline', tel: '0300 304 7000', hours: { fr: 'Tous les jours de 16 h à 22 h', en: 'Every day, 4 pm to 10 pm' }, desc: { fr: 'Pour les personnes touchées par une maladie psychique, leurs familles et leurs aidant·es.', en: 'For people affected by mental illness, their families and carers.' } },
          { name: 'Breathing Space (Scotland)', tel: '0800 83 85 87', hours: { fr: 'Du lundi au jeudi de 18 h à 2 h ; du vendredi 18 h au lundi 6 h', en: 'Monday to Thursday 6 pm to 2 am; Friday 6 pm to Monday 6 am' }, url: 'https://breathingspace.scot/', desc: { fr: 'Écoute gratuite et confidentielle en Écosse, aussi par tchat.', en: 'Free, confidential listening in Scotland, also by webchat.' } },
          { name: 'C.A.L.L. (Wales)', tel: '0800 132 737', hours: { fr: '24 h/24 ; SMS « help » au 81066 de 9 h à minuit', en: '24/7; text "help" to 81066, 9 am to midnight' }, desc: { fr: 'Ligne d’écoute en santé mentale au pays de Galles.', en: 'Mental health helpline for Wales.' } },
          { name: 'Lifeline (Northern Ireland)', tel: '0808 808 8000', hours: H24, url: 'https://www.lifelinehelpline.info/', desc: { fr: 'Ligne de crise en Irlande du Nord, pour tous les âges. Conseillers formés.', en: 'Crisis line for Northern Ireland, for people of every age. Trained counsellors.' } },
        ],
      },
      {
        id: 'jeunes', icon: '🎓', title: { fr: 'Jeunes', en: 'Young people' },
        items: [
          { name: 'Childline', tel: '0800 1111', hours: H24, url: 'https://www.childline.org.uk/', desc: { fr: 'Pour les moins de 19 ans, partout au Royaume-Uni. Gratuit et confidentiel.', en: 'For anyone under 19 in the UK. Free and confidential.' } },
        ],
      },
      {
        id: 'agri', icon: '🌾', title: { fr: 'Monde agricole', en: 'Farming community' },
        items: [
          { name: 'The Farming Community Network', tel: '03000 111 999', hours: { fr: 'Tous les jours de 7 h à 23 h', en: 'Every day, 7 am to 11 pm' }, url: 'https://fcn.org.uk/', desc: { fr: 'Soutien gratuit et confidentiel pour les agriculteur·rices et leurs familles, sur des questions personnelles ou professionnelles.', en: 'Free, confidential support for farmers and their families, on personal or business issues.' } },
        ],
      },
      {
        id: 'proches', icon: '🤝', title: { fr: 'Pour les proches et les aidant·es', en: 'For family, friends and carers' },
        items: [
          { name: { fr: 'Carers UK — ligne d’aide', en: 'Carers UK Helpline' }, tel: '0808 808 7777', hours: { fr: 'Du lundi au vendredi de 9 h à 18 h', en: 'Monday to Friday, 9 am to 6 pm' }, url: 'https://www.carersuk.org/', desc: { fr: 'Conseils et information pour les aidant·es.', en: 'Advice and information for carers.' } },
        ],
      },
      {
        id: 'addictions', icon: '🧭', title: { fr: 'Addictions', en: 'Addictions' },
        items: [
          { name: 'FRANK', tel: '0300 123 6600', hours: H24, url: 'https://www.talktofrank.com/', desc: { fr: 'Information et conseils sur les drogues. Aussi par SMS au 82111.', en: 'Information and advice about drugs. You can also text 82111.' } },
          { name: { fr: 'Ligne nationale jeux d’argent', en: 'National Gambling Helpline' }, tel: '0808 8020 133', hours: H24, desc: { fr: 'Pour les personnes touchées par les jeux d’argent et leurs proches.', en: 'For anyone affected by gambling harms, and their loved ones.' } },
        ],
      },
      {
        id: 'violences', icon: '🛡', title: { fr: 'Violences', en: 'Violence and abuse' },
        items: [
          { name: { fr: 'Ligne nationale violences conjugales (Refuge)', en: 'National Domestic Abuse Helpline (Refuge)' }, tel: '0808 2000 247', hours: H24, desc: { fr: 'Pour les personnes victimes de violences conjugales.', en: 'For anyone experiencing domestic abuse.' } },
          { name: 'Rape Crisis', tel: '0808 500 2222', hours: H24, desc: { fr: 'Pour les personnes touchées par des violences sexuelles.', en: 'For anyone affected by sexual violence or abuse.' } },
        ],
      },
      {
        id: 'info', icon: '📚', title: { fr: 'S’informer, trouver un soin', en: 'Information and finding care' },
        items: [
          { name: 'Mind', url: 'https://www.mind.org.uk/', desc: { fr: 'Information sur la santé mentale, les droits et les soins (Angleterre et pays de Galles).', en: 'Information on mental health, rights and care (England and Wales).' } },
          { name: 'Rethink Mental Illness', url: 'https://www.rethink.org/', desc: { fr: 'Information et conseils pour les personnes vivant avec une maladie psychique et leurs proches.', en: 'Information and advice for people living with mental illness and those who care about them.' } },
          { name: 'Hub of Hope', url: 'https://hubofhope.co.uk/', desc: { fr: 'Annuaire des services de soutien en santé mentale près de chez moi.', en: 'Directory of mental health support services near you.' } },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- Irlande */
  IE: {
    flag: '🇮🇪',
    name: { fr: 'Irlande', en: 'Ireland' },
    inName: { fr: 'en Irlande', en: 'in Ireland' },
    checked: { fr: '28 octobre 2026', en: '28 October 2026' },
    emergency: {
      text: {
        fr: 'En cas d’urgence, appelez le 112 ou le 999. Samaritans : 116 123 ; Pieta : 1800 247 247 (24 h/24).',
        en: 'In an emergency, call 112 or 999. Samaritans: 116 123; Pieta: 1800 247 247 (24/7).',
      },
      tels: ['112', '999', '116 123', '1800 247 247'],
    },
    garde: [
      { nom: { fr: 'Services d’urgence', en: 'Emergency services' }, lien: { fr: 'Danger immédiat', en: 'Immediate danger' }, tel: '112' },
      { nom: 'Samaritans', lien: { fr: 'Écoute, 24 h/24', en: 'Listening support, 24/7' }, tel: '116 123' },
      { nom: 'Pieta', lien: { fr: 'Crise suicidaire, 24 h/24', en: 'Suicidal crisis, 24/7' }, tel: '1800 247 247' },
      { nom: 'Text About It', lien: { fr: 'SMS « HELLO » au 50808, 24 h/24', en: 'Text HELLO to 50808, 24/7' }, tel: '50808' },
      { nom: { fr: 'Mon équipe de santé mentale', en: 'My mental health team' }, lien: { fr: 'Équipe qui me suit', en: 'The team that supports me' }, tel: '' },
      { nom: { fr: 'Médecin généraliste de garde', en: 'Out-of-hours GP' }, lien: { fr: 'Le soir et le week-end', en: 'Evenings and weekends' }, tel: '' },
    ],
    youthFirst: ['urgence', 'jeunes'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Urgence', en: 'Emergency' },
        intro: { fr: 'En cas de danger immédiat, je peux aussi me rendre au service des urgences le plus proche.', en: 'In immediate danger, I can also go to the nearest emergency department.' },
        items: [
          { name: { fr: 'Services d’urgence', en: 'Emergency services' }, tel: '112', hours: H24, desc: { fr: 'Aussi joignables au 999.', en: 'You can also call 999.' } },
          { name: 'Samaritans', tel: '116 123', hours: H24, url: 'https://www.samaritans.org/ireland/', desc: { fr: 'Écoute confidentielle, aussi par e-mail (jo@samaritans.ie). Gratuit.', en: 'Confidential, non-judgemental support, also by email (jo@samaritans.ie). Free.' } },
          { name: 'Pieta', tel: '1800 247 247', hours: H24, url: 'https://www.pieta.ie/', desc: { fr: 'Pour les personnes qui pensent au suicide ou s’automutilent, et leurs proches. Aussi par SMS « HELP » au 51444.', en: 'For people thinking about suicide or self-harm, and those worried about them. You can also text HELP to 51444.' } },
          { name: 'Text About It', sms: '50808', smsBody: 'HELLO', hours: H24, desc: { fr: 'Échange anonyme par SMS avec un·e bénévole formé·e : j’envoie « HELLO » au 50808. Gratuit.', en: 'Anonymous text chat with a trained volunteer: text HELLO to 50808. Free.' } },
        ],
      },
      {
        id: 'ecoute', icon: '💬', title: { fr: 'Besoin de parler', en: 'Need to talk' },
        items: [
          { name: { fr: 'Aware — ligne de soutien', en: 'Aware Support Line' }, tel: '1800 80 48 48', hours: { fr: 'Tous les jours de 10 h à 22 h', en: 'Every day, 10 am to 10 pm' }, url: 'https://www.aware.ie/', desc: { fr: 'Pour les adultes concernés par l’anxiété, la dépression ou le trouble bipolaire, pour eux-mêmes ou un proche.', en: 'For adults affected by anxiety, depression or bipolar disorder, for themselves or a loved one.' } },
          { name: { fr: 'Ligne d’information HSE en santé mentale', en: 'Your Mental Health Information Line (HSE)' }, tel: '1800 111 888', hours: H24, desc: { fr: 'Pour savoir quels services de santé mentale sont disponibles et comment y accéder. Ce n’est pas une ligne d’écoute.', en: 'Find out which mental health services are available and how to access them. Not a counselling service.' } },
        ],
      },
      {
        id: 'jeunes', icon: '🎓', title: { fr: 'Jeunes', en: 'Young people' },
        items: [
          { name: 'Childline', tel: '1800 66 66 66', hours: H24, url: 'https://www.childline.ie/', desc: { fr: 'Pour les enfants et les jeunes, aussi par tchat en ligne. Gratuit.', en: 'For children and young people, also by online chat. Free.' } },
          { name: 'Jigsaw', url: 'https://jigsaw.ie/', desc: { fr: 'Service national de santé mentale pour les 12-25 ans.', en: 'National youth mental health service for 12 to 25-year-olds.' } },
        ],
      },
      {
        id: 'addictions', icon: '🧭', title: { fr: 'Addictions', en: 'Addictions' },
        items: [
          { name: { fr: 'Ligne drogues et alcool (HSE)', en: 'HSE Drugs and Alcohol Helpline' }, tel: '1800 459 459', hours: { fr: 'Du lundi au vendredi de 9 h 30 à 17 h 30', en: 'Monday to Friday, 9:30 am to 5:30 pm' }, desc: { fr: 'Information et soutien. Aussi par e-mail : helpline@hse.ie.', en: 'Information and support. Also by email: helpline@hse.ie.' } },
        ],
      },
      {
        id: 'violences', icon: '🛡', title: { fr: 'Violences', en: 'Violence and abuse' },
        items: [
          { name: 'Women’s Aid', tel: '1800 341 900', hours: H24, url: 'https://www.womensaid.ie/', desc: { fr: 'Pour les femmes victimes de violences conjugales.', en: 'For women experiencing domestic violence and abuse.' } },
        ],
      },
      {
        id: 'info', icon: '📚', title: { fr: 'S’informer, trouver un soin', en: 'Information and finding care' },
        items: [
          { name: 'HSE — Mental health', url: 'https://www2.hse.ie/mental-health/', desc: { fr: 'Information du service de santé irlandais sur la santé mentale et les services.', en: 'Information from the Irish health service on mental health and services.' } },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------- États-Unis */
  US: {
    flag: '🇺🇸',
    name: { fr: 'États-Unis', en: 'United States' },
    inName: { fr: 'aux États-Unis', en: 'in the United States' },
    checked: { fr: '28 octobre 2026', en: '28 October 2026' },
    record: 'us',
    emergency: {
      text: {
        fr: 'En cas d’urgence, appelez le 911. Pour une crise suicidaire ou une détresse, appelez ou envoyez un SMS au 988, 24 h/24.',
        en: 'In an emergency, call 911. For a suicidal crisis or emotional distress, call or text 988, 24/7.',
      },
      tels: ['911', '988'],
    },
    garde: [
      { nom: { fr: 'Services d’urgence', en: 'Emergency services' }, lien: { fr: 'Danger immédiat', en: 'Immediate danger' }, tel: '911' },
      { nom: '988 Suicide & Crisis Lifeline', lien: { fr: 'Appel, SMS ou tchat, 24 h/24', en: 'Call, text or chat, 24/7' }, tel: '988' },
      { nom: 'Crisis Text Line', lien: { fr: 'SMS « HOME » au 741741, 24 h/24', en: 'Text HOME to 741741, 24/7' }, tel: '741741' },
      { nom: { fr: 'Équipe de crise de mon secteur', en: 'My local crisis team' }, lien: { fr: 'Équipe mobile de crise', en: 'Mobile crisis team' }, tel: '' },
    ],
    youthFirst: ['urgence', 'jeunes'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Urgence', en: 'Emergency' },
        items: [
          { name: { fr: 'Services d’urgence', en: 'Emergency services' }, tel: '911', hours: H24, desc: { fr: 'Danger immédiat.', en: 'Immediate danger.' } },
          { name: '988 Suicide & Crisis Lifeline', tel: '988', hours: H24, url: 'https://988lifeline.org/', desc: { fr: 'Appel, SMS ou tchat (chat.988lifeline.org). Gratuit et confidentiel. En espagnol : touche 2. Vétérans : touche 1, ou SMS au 838255.', en: 'Call, text or chat (chat.988lifeline.org). Free and confidential. Spanish: press 2. Veterans: press 1, or text 838255.' } },
          { name: 'Crisis Text Line', sms: '741741', smsBody: 'HOME', hours: H24, url: 'https://www.crisistextline.org/', desc: { fr: 'Soutien par SMS avec un·e bénévole formé·e : j’envoie « HOME » au 741741. Gratuit (tarifs SMS de l’opérateur possibles).', en: 'Text support with a trained volunteer: text HOME to 741741. Free (carrier message rates may apply).' } },
        ],
      },
      {
        id: 'ecoute', icon: '💬', title: { fr: 'Information et orientation', en: 'Information and referral' },
        items: [
          { name: 'NAMI HelpLine', tel: '1-800-950-6264', hours: { fr: 'Du lundi au vendredi de 10 h à 22 h (heure de l’Est)', en: 'Monday to Friday, 10 am to 10 pm ET' }, url: 'https://www.nami.org/nami-helpline/', desc: { fr: 'Information, soutien et orientation, aussi par SMS « NAMI » au 62640. Ce n’est pas une ligne de crise.', en: 'Information, support and referrals; you can also text NAMI to 62640. Not a crisis line.' } },
          { name: 'SAMHSA National Helpline', tel: '1-800-662-4357', hours: H24, desc: { fr: 'Orientation vers des soins en santé mentale et en addictologie, en anglais et en espagnol. Gratuit et confidentiel.', en: 'Treatment referral and information for mental health and substance use, in English and Spanish. Free and confidential.' } },
        ],
      },
      {
        id: 'jeunes', icon: '🎓', title: { fr: 'Jeunes', en: 'Young people' },
        items: [
          { name: 'The Trevor Project', tel: '1-866-488-7386', hours: H24, url: 'https://www.thetrevorproject.org/get-help/', desc: { fr: 'Pour les jeunes LGBTQ+ : appel, tchat, ou SMS « START » au 678-678.', en: 'For LGBTQ+ young people: call, chat, or text START to 678-678.' } },
        ],
      },
      {
        id: 'violences', icon: '🛡', title: { fr: 'Violences', en: 'Violence and abuse' },
        items: [
          { name: 'National Domestic Violence Hotline', tel: '1-800-799-7233', hours: H24, url: 'https://www.thehotline.org/', desc: { fr: 'Pour les victimes de violences conjugales. Aussi par SMS « START » au 88788 ou par tchat.', en: 'For anyone experiencing domestic violence. You can also text START to 88788 or chat online.' } },
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- Canada */
  CA: {
    flag: '🇨🇦',
    name: { fr: 'Canada', en: 'Canada' },
    inName: { fr: 'au Canada', en: 'in Canada' },
    checked: { fr: '28 octobre 2026', en: '28 October 2026' },
    emergency: {
      text: {
        fr: 'En cas d’urgence, appelez le 911. Si vous pensez au suicide, appelez ou textez le 9-8-8, 24 h/24, en français ou en anglais.',
        en: 'In an emergency, call 911. If you are thinking about suicide, call or text 9-8-8, 24/7, in English or French.',
      },
      tels: ['911', '9-8-8'],
    },
    garde: [
      { nom: { fr: 'Services d’urgence', en: 'Emergency services' }, lien: { fr: 'Danger immédiat', en: 'Immediate danger' }, tel: '911' },
      { nom: { fr: '9-8-8 : Ligne d’aide en cas de crise de suicide', en: '9-8-8: Suicide Crisis Helpline' }, lien: { fr: 'Appel ou texto, 24 h/24', en: 'Call or text, 24/7' }, tel: '988' },
      { nom: { fr: 'Services de crise de ma région', en: 'Local crisis services' }, lien: { fr: 'Équipe de crise', en: 'Crisis team' }, tel: '' },
    ],
    youthFirst: ['urgence', 'jeunes'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Urgence', en: 'Emergency' },
        items: [
          { name: { fr: 'Services d’urgence', en: 'Emergency services' }, tel: '911', hours: H24, desc: { fr: 'Danger immédiat ou besoin médical urgent.', en: 'Immediate danger or urgent medical help.' } },
          { name: { fr: '9-8-8 : Ligne d’aide en cas de crise de suicide', en: '9-8-8: Suicide Crisis Helpline' }, tel: '988', hours: H24, url: 'https://988.ca/', desc: { fr: 'Appel ou texto, partout au Canada, en français et en anglais. Soutien spécialisé possible pour les jeunes et pour les Premières Nations, les Inuit et les Métis.', en: 'Call or text, anywhere in Canada, in English and French. Specialised support available for young people and for First Nations, Inuit and Métis people.' } },
        ],
      },
      {
        id: 'jeunes', icon: '🎓', title: { fr: 'Jeunes', en: 'Young people' },
        items: [
          { name: { fr: 'Jeunesse, J’écoute', en: 'Kids Help Phone' }, tel: '1-800-668-6868', hours: H24, url: 'https://kidshelpphone.ca/', desc: { fr: 'Pour les 5-29 ans. Aussi par texto « CONNECT » au 686868, ou par tchat. Confidentiel et anonyme.', en: 'For 5 to 29-year-olds. You can also text CONNECT to 686868, or chat online. Confidential and anonymous.' } },
        ],
      },
      {
        id: 'autochtones', icon: '🪶', title: { fr: 'Premières Nations, Inuit et Métis', en: 'First Nations, Inuit and Métis' },
        items: [
          { name: { fr: 'Ligne d’écoute d’espoir pour le mieux-être', en: 'Hope for Wellness Help Line' }, tel: '1-855-242-3310', hours: H24, desc: { fr: 'Soutien émotionnel et intervention en situation de crise, aussi par tchat. En français et en anglais ; en cri, ojibwé ou inuktitut sur demande.', en: 'Emotional support and crisis intervention, also by chat. In English and French; Cree, Ojibway or Inuktitut on request.' } },
        ],
      },
      {
        id: 'info', icon: '📚', title: { fr: 'S’informer, trouver un soin', en: 'Information and finding care' },
        items: [
          { name: { fr: 'Association canadienne pour la santé mentale', en: 'Canadian Mental Health Association' }, url: 'https://cmha.ca/', desc: { fr: 'Information et filiales locales partout au Canada.', en: 'Information and local branches across Canada.' } },
          { name: { fr: 'Gouvernement du Canada — obtenir de l’aide', en: 'Government of Canada — get help' }, url: 'https://www.canada.ca/en/public-health/services/mental-health-services/mental-health-get-help.html', desc: { fr: 'Services de soutien nationaux et de chaque province ou territoire.', en: 'National supports and services in each province and territory.' } },
        ],
      },
    ],
  },

  /* -------------------------------------------------------------- Australie */
  AU: {
    flag: '🇦🇺',
    name: { fr: 'Australie', en: 'Australia' },
    inName: { fr: 'en Australie', en: 'in Australia' },
    checked: { fr: '28 octobre 2026', en: '28 October 2026' },
    emergency: {
      text: {
        fr: 'En cas de danger immédiat, appelez le 000. Lifeline : 13 11 14, 24 h/24.',
        en: 'If life is in danger, call 000. Lifeline: 13 11 14, 24/7.',
      },
      tels: ['000', '13 11 14'],
    },
    garde: [
      { nom: { fr: 'Services d’urgence', en: 'Emergency services' }, lien: { fr: 'Danger immédiat', en: 'Immediate danger' }, tel: '000' },
      { nom: 'Lifeline', lien: { fr: 'Crise, 24 h/24', en: 'Crisis support, 24/7' }, tel: '13 11 14' },
      { nom: 'Suicide Call Back Service', lien: { fr: '24 h/24', en: '24/7' }, tel: '1300 659 467' },
      { nom: { fr: 'Équipe de crise de ma région', en: 'Local mental health crisis team' }, lien: { fr: 'Équipe d’évaluation et de traitement', en: 'Acute care team' }, tel: '' },
    ],
    youthFirst: ['urgence', 'jeunes'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Urgence et crise', en: 'Emergency and crisis' },
        items: [
          { name: { fr: 'Services d’urgence', en: 'Emergency services' }, tel: '000', hours: H24, desc: { fr: 'Danger immédiat pour la vie.', en: 'Immediate danger to life.' } },
          { name: 'Lifeline', tel: '13 11 14', hours: H24, url: 'https://www.lifeline.org.au/', desc: { fr: 'Soutien en situation de crise. Aussi par SMS au 0477 13 11 14 et par tchat.', en: 'Crisis support. You can also text 0477 13 11 14 or chat online.' } },
          { name: 'Suicide Call Back Service', tel: '1300 659 467', hours: H24, url: 'https://www.suicidecallbackservice.org.au/', desc: { fr: 'Pour les personnes à risque suicidaire, leurs proches et les personnes endeuillées par un suicide. Gratuit.', en: 'For people at risk of suicide, people worried about someone, and people bereaved by suicide. Free.' } },
          { name: '13YARN', tel: '13 92 76', hours: H24, url: 'https://www.13yarn.org.au/', desc: { fr: 'Ligne de crise pour les Aborigènes et les insulaires du détroit de Torres. SMS au 0447 13 92 76 de 16 h à minuit.', en: 'Crisis support line for Aboriginal and Torres Strait Islander people. Text 0447 13 92 76 from 4 pm to midnight.' } },
        ],
      },
      {
        id: 'ecoute', icon: '💬', title: { fr: 'Besoin de parler', en: 'Need to talk' },
        items: [
          { name: 'Beyond Blue', tel: '1300 22 4636', hours: H24, url: 'https://www.beyondblue.org.au/', desc: { fr: 'Courtes séances d’écoute avec un·e conseiller·ère, aussi par tchat. Gratuit et confidentiel.', en: 'Brief counselling, also by chat. Free and confidential.' } },
        ],
      },
      {
        id: 'jeunes', icon: '🎓', title: { fr: 'Jeunes', en: 'Young people' },
        items: [
          { name: 'Kids Helpline', tel: '1800 55 1800', hours: H24, url: 'https://kidshelpline.com.au/', desc: { fr: 'Pour les 5-25 ans. Gratuit, depuis un portable ou un fixe.', en: 'For 5 to 25-year-olds. Free from mobiles and landlines.' } },
        ],
      },
      {
        id: 'violences', icon: '🛡', title: { fr: 'Violences', en: 'Violence and abuse' },
        items: [
          { name: '1800RESPECT', tel: '1800 737 732', hours: H24, url: 'https://1800respect.org.au/', desc: { fr: 'Violences conjugales, familiales ou sexuelles : pour les victimes, leurs proches et les professionnel·les. Aussi par SMS au 0458 737 732.', en: 'Domestic, family and sexual violence: for people affected, those supporting them and professionals. You can also text 0458 737 732.' } },
        ],
      },
    ],
  },

  /* -------------------------------------------------------- Nouvelle-Zélande */
  NZ: {
    flag: '🇳🇿',
    name: { fr: 'Nouvelle-Zélande', en: 'New Zealand' },
    inName: { fr: 'en Nouvelle-Zélande', en: 'in New Zealand' },
    checked: { fr: '28 octobre 2026', en: '28 October 2026' },
    emergency: {
      text: {
        fr: 'En cas d’urgence, appelez le 111. Pour parler à un·e conseiller·ère, appelez ou envoyez un SMS au 1737, 24 h/24.',
        en: 'In an emergency, call 111. To talk to a trained counsellor, call or text 1737, 24/7.',
      },
      tels: ['111', '1737'],
    },
    garde: [
      { nom: { fr: 'Services d’urgence', en: 'Emergency services' }, lien: { fr: 'Danger immédiat', en: 'Immediate danger' }, tel: '111' },
      { nom: { fr: '1737 (besoin de parler ?)', en: '1737 Need to talk?' }, lien: { fr: 'Appel ou SMS, 24 h/24', en: 'Call or text, 24/7' }, tel: '1737' },
      { nom: { fr: 'Ligne de crise suicidaire', en: 'Suicide Crisis Helpline' }, lien: { fr: 'De 7 h à minuit', en: '7 am to midnight' }, tel: '0508 828 865' },
      { nom: { fr: 'Équipe de crise de ma région', en: 'Local mental health crisis team' }, lien: { fr: 'Équipe de crise', en: 'Crisis team' }, tel: '' },
    ],
    youthFirst: ['urgence', 'jeunes'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Urgence et crise', en: 'Emergency and crisis' },
        items: [
          { name: { fr: 'Services d’urgence', en: 'Emergency services' }, tel: '111', hours: H24, desc: { fr: 'Danger immédiat.', en: 'Immediate danger.' } },
          { name: { fr: '1737 (besoin de parler ?)', en: '1737 Need to talk?' }, tel: '1737', hours: H24, desc: { fr: 'Appel ou SMS gratuit pour parler à un·e conseiller·ère formé·e. Soutien par des pair·es tous les jours de 14 h à 22 h.', en: 'Free call or text to talk to a trained counsellor. Peer support every day from 2 pm to 10 pm.' } },
          { name: { fr: 'Ligne de crise suicidaire', en: 'Suicide Crisis Helpline' }, tel: '0508 828 865', hours: { fr: 'De 7 h à minuit', en: '7 am to midnight' }, desc: { fr: 'Pour les personnes qui pensent au suicide, ou leurs proches.', en: 'For anyone thinking about suicide, or someone who knows them.' } },
        ],
      },
      {
        id: 'ecoute', icon: '💬', title: { fr: 'Besoin de parler', en: 'Need to talk' },
        items: [
          { name: 'Lifeline', tel: '0800 543 354', hours: { fr: 'De 7 h à minuit', en: '7 am to midnight' }, desc: { fr: 'Écoute et aide. Aussi par SMS au 4357.', en: 'Listening and support. You can also text 4357.' } },
          { name: 'Samaritans', tel: '0800 726 666', hours: H24, desc: { fr: 'Pour toute personne seule ou en détresse.', en: 'For anyone who is lonely or in distress.' } },
          { name: { fr: 'Ligne dépression', en: 'Depression Helpline' }, tel: '0800 111 757', hours: H24, desc: { fr: 'Parler à un·e conseiller·ère. Aussi par SMS au 4202.', en: 'Talk to a counsellor. You can also text 4202.' } },
          { name: 'Healthline', tel: '0800 611 116', hours: H24, desc: { fr: 'Conseils et informations santé par des professionnel·les.', en: 'Health advice and information from health professionals.' } },
        ],
      },
      {
        id: 'jeunes', icon: '🎓', title: { fr: 'Jeunes', en: 'Young people' },
        items: [
          { name: 'Youthline', tel: '0800 376 633', hours: H24, url: 'https://www.youthline.co.nz/', desc: { fr: 'Pour les jeunes et leurs proches. Aussi par SMS au 234 et par tchat.', en: 'For young people and their families and friends. You can also text 234 or chat online.' } },
        ],
      },
      {
        id: 'agri', icon: '🌾', title: { fr: 'Monde rural', en: 'Rural communities' },
        items: [
          { name: 'Rural Support Trust', tel: '0800 787 254', hours: { fr: 'De 8 h à 18 h', en: '8 am to 6 pm' }, url: 'https://www.rural-support.org.nz/', desc: { fr: 'Soutien confidentiel pour les personnes vivant en milieu rural.', en: 'Confidential support for rural New Zealanders.' } },
        ],
      },
      {
        id: 'addictions', icon: '🧭', title: { fr: 'Addictions', en: 'Addictions' },
        items: [
          { name: { fr: 'Ligne alcool et drogues', en: 'Alcohol Drug Helpline' }, tel: '0800 787 797', hours: H24, url: 'https://alcoholdrughelp.org.nz/', desc: { fr: 'Information et soutien, aussi par tchat.', en: 'Information and support, also by webchat.' } },
        ],
      },
      {
        id: 'violences', icon: '🛡', title: { fr: 'Violences', en: 'Violence and abuse' },
        items: [
          { name: 'Women’s Refuge', tel: '0800 733 843', hours: H24, url: 'https://womensrefuge.org.nz/', desc: { fr: 'Ligne de crise pour les victimes de violences familiales, aussi par tchat.', en: 'Crisis line for people experiencing family violence, also by chat.' } },
        ],
      },
      {
        id: 'info', icon: '📚', title: { fr: 'S’informer', en: 'Information' },
        items: [
          { name: 'Mental Health Foundation', url: 'https://mentalhealth.org.nz/get-help-support/helplines-support/', desc: { fr: 'Liste des lignes d’aide et informations sur la santé mentale.', en: 'Helplines and mental health information.' } },
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- Suisse */
  CH: {
    flag: '🇨🇭',
    name: { fr: 'Suisse', en: 'Switzerland' },
    inName: { fr: 'en Suisse', en: 'in Switzerland' },
    checked: { fr: '28 octobre 2026', en: '28 October 2026' },
    emergency: {
      text: {
        fr: 'En cas d’urgence, appelez le 144 (ambulance) ou le 112. Pour parler à quelqu’un : La Main Tendue au 143, 24 h/24.',
        en: 'In an emergency, call 144 (ambulance) or 112. To talk to someone: La Main Tendue on 143, 24/7.',
      },
      tels: ['144', '112', '143'],
    },
    garde: [
      { nom: { fr: 'Ambulance', en: 'Ambulance' }, lien: { fr: 'Urgence médicale', en: 'Medical emergency' }, tel: '144' },
      { nom: { fr: 'Numéro d’urgence européen', en: 'European emergency number' }, lien: { fr: 'Toute urgence', en: 'Any emergency' }, tel: '112' },
      { nom: 'La Main Tendue', lien: { fr: 'Écoute, 24 h/24', en: 'Listening support, 24/7' }, tel: '143' },
      { nom: { fr: 'Urgences psychiatriques', en: 'Psychiatric emergency service' }, lien: { fr: 'Service de garde de ma région', en: 'On-call service for my area' }, tel: '' },
      { nom: { fr: 'Médecin de garde', en: 'On-call doctor' }, lien: { fr: 'Permanence de mon canton', en: 'My canton’s on-call service' }, tel: '' },
    ],
    youthFirst: ['urgence', 'jeunes'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Urgence', en: 'Emergency' },
        items: [
          { name: { fr: 'Ambulance', en: 'Ambulance' }, tel: '144', hours: H24, desc: { fr: 'Urgence médicale.', en: 'Medical emergency.' } },
          { name: { fr: 'Numéro d’urgence européen', en: 'European emergency number' }, tel: '112', hours: H24, desc: { fr: 'Toute urgence.', en: 'Any emergency.' } },
          { name: 'Tox Info Suisse', tel: '145', desc: { fr: 'En cas d’intoxication.', en: 'In case of poisoning.' } },
        ],
      },
      {
        id: 'ecoute', icon: '💬', title: { fr: 'Besoin de parler', en: 'Need to talk' },
        items: [
          { name: 'La Main Tendue', tel: '143', hours: H24, url: 'https://www.143.ch/', desc: { fr: 'Écoute pour les adultes, en français, allemand ou italien. Aussi par chat et par e-mail. Appel à petit prix.', en: 'Listening support for adults, in French, German or Italian. Also by chat and email. Low-cost call. English line: 0800 143 000, every day from 6 pm to 11 pm.' } },
        ],
      },
      {
        id: 'jeunes', icon: '🎓', title: { fr: 'Jeunes et parents', en: 'Young people and parents' },
        items: [
          { name: { fr: '147 — Pro Juventute', en: '147 — Pro Juventute' }, tel: '147', hours: H24, url: 'https://www.147.ch/fr', desc: { fr: 'Pour les enfants et les jeunes. Aussi par WhatsApp, e-mail ou chat.', en: 'For children and young people. Also by WhatsApp, email or chat.' } },
          { name: { fr: 'Pro Juventute — conseil aux parents', en: 'Pro Juventute — parent advice' }, tel: '058 261 61 61', hours: H24, desc: { fr: 'Pour les parents : éducation, développement, organisation familiale.', en: 'For parents: upbringing, development, family organisation.' } },
        ],
      },
      {
        id: 'violences', icon: '🛡', title: { fr: 'Violences', en: 'Violence and abuse' },
        items: [
          { name: { fr: 'Aide aux victimes', en: 'Victim support' }, tel: '142', url: 'https://www.opferhilfe-schweiz.ch/fr/', desc: { fr: 'Pour les victimes de violences ou d’abus : conseil gratuit, confidentiel et anonyme.', en: 'For victims of violence or abuse: free, confidential and anonymous advice.' } },
        ],
      },
      {
        id: 'info', icon: '📚', title: { fr: 'S’informer', en: 'Information' },
        items: [
          { name: { fr: 'OFSP — offres d’aide en santé mentale', en: 'FOPH — mental health support' }, url: 'https://www.bag.admin.ch/fr/offres-daide-sante-mentale', desc: { fr: 'Liste officielle des offres d’aide en Suisse.', en: 'Official list of support services in Switzerland.' } },
          { name: 'Parler peut sauver', url: 'https://www.parler-peut-sauver.ch', desc: { fr: 'Plateforme de prévention du suicide : informations et soutien.', en: 'Suicide prevention platform: information and support.' } },
          { name: 'Plan de Crise Conjoint', url: 'https://plandecriseconjoint.ch/', desc: { fr: 'Le site de référence du PCC, créé en Suisse : informations, formulaires officiels et formation en ligne gratuite.', en: 'The reference website for the joint crisis plan, created in Switzerland: information, official forms and free online training (in French).' } },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- Belgique */
  BE: {
    flag: '🇧🇪',
    name: { fr: 'Belgique', en: 'Belgium' },
    inName: { fr: 'en Belgique', en: 'in Belgium' },
    checked: { fr: '28 octobre 2026', en: '28 October 2026' },
    emergency: {
      text: {
        fr: 'En cas d’urgence, appelez le 112. Si vous pensez au suicide : 0800 32 123 (en français) ou 1813 (en néerlandais), 24 h/24.',
        en: 'In an emergency, call 112. If you are thinking about suicide: 0800 32 123 (in French) or 1813 (in Dutch), 24/7.',
      },
      tels: ['112', '0800 32 123', '1813'],
    },
    garde: [
      { nom: { fr: 'Numéro d’urgence', en: 'Emergency number' }, lien: { fr: 'Toute urgence', en: 'Any emergency' }, tel: '112' },
      { nom: { fr: 'Centre de Prévention du Suicide', en: 'Suicide Prevention Centre' }, lien: { fr: 'Crise suicidaire, 24 h/24', en: 'Suicidal crisis, 24/7' }, tel: '0800 32 123' },
      { nom: 'Télé-Accueil', lien: { fr: 'Écoute, 24 h/24', en: 'Listening support, 24/7' }, tel: '107' },
      { nom: { fr: 'Urgences psychiatriques', en: 'Psychiatric emergency service' }, lien: { fr: 'Service de garde de ma région', en: 'On-call service for my area' }, tel: '' },
      { nom: { fr: 'Médecin de garde', en: 'On-call doctor' }, lien: { fr: 'Le soir et le week-end', en: 'Evenings and weekends' }, tel: '' },
    ],
    youthFirst: ['urgence', 'jeunes'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Urgence et crise', en: 'Emergency and crisis' },
        items: [
          { name: { fr: 'Numéro d’urgence', en: 'Emergency number' }, tel: '112', hours: H24, desc: { fr: 'Toute urgence, danger immédiat.', en: 'Any emergency, immediate danger.' } },
          { name: { fr: 'Centre de Prévention du Suicide', en: 'Suicide Prevention Centre' }, tel: '0800 32 123', hours: H24, url: 'https://www.preventionsuicide.be/', desc: { fr: 'Ligne d’écoute pour les personnes en crise suicidaire (Belgique francophone). Gratuit et anonyme ; si c’est occupé, je rappelle.', en: 'Line for people in a suicidal crisis (French-speaking Belgium). Free and anonymous; if it’s busy, call again.' } },
          { name: 'Zelfmoordlijn 1813', tel: '1813', hours: H24, url: 'https://www.zelfmoord1813.be/', desc: { fr: 'Ligne de prévention du suicide en néerlandais. Gratuit et anonyme ; chat tous les jours de 17 h à minuit.', en: 'Suicide prevention line in Dutch. Free and anonymous; chat every day from 5 pm to midnight.' } },
        ],
      },
      {
        id: 'ecoute', icon: '💬', title: { fr: 'Besoin de parler', en: 'Need to talk' },
        items: [
          { name: 'Télé-Accueil', tel: '107', hours: { fr: '24 h/24 ; chat de 13 h à 3 h', en: '24/7; chat from 1 pm to 3 am' }, url: 'https://tele-accueil.be/', desc: { fr: 'Pour toute personne qui a besoin de parler. Gratuit.', en: 'For anyone who needs to talk (in French). Free.' } },
        ],
      },
      {
        id: 'jeunes', icon: '🎓', title: { fr: 'Jeunes', en: 'Young people' },
        items: [
          { name: { fr: '103 Écoute-Enfants', en: '103 children’s helpline' }, tel: '103', hours: { fr: 'Tous les jours de 10 h à minuit', en: 'Every day, 10 am to midnight' }, url: 'https://www.103ecoute.be/', desc: { fr: 'Pour les enfants et les ados en difficulté, et les adultes qui les accompagnent. Gratuit et anonyme, aussi par chat.', en: 'For children and teenagers in difficulty, and the adults supporting them (in French). Free and anonymous, also by chat.' } },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ Québec */
  QC: {
    flag: '⚜️',
    name: { fr: 'Québec (Canada)', en: 'Quebec (Canada)' },
    inName: { fr: 'au Québec', en: 'in Quebec' },
    checked: { fr: '28 octobre 2026', en: '28 October 2026' },
    emergency: {
      text: {
        fr: 'En cas d’urgence, appelez le 911. Si vous pensez au suicide : 1 866 APPELLE (1 866 277-3553), texto au 535353 ou le 9-8-8, en tout temps.',
        en: 'In an emergency, call 911. If you are thinking about suicide: 1 866 APPELLE (1 866 277-3553), text 535353 or 9-8-8, at any time.',
      },
      tels: ['911', '1 866 277-3553', '9-8-8'],
    },
    garde: [
      { nom: { fr: 'Services d’urgence', en: 'Emergency services' }, lien: { fr: 'Danger immédiat', en: 'Immediate danger' }, tel: '911' },
      { nom: { fr: 'Ligne québécoise de prévention du suicide', en: 'Quebec suicide prevention line' }, lien: { fr: 'En tout temps', en: 'At any time' }, tel: '1 866 277-3553' },
      { nom: 'Info-Social 811', lien: { fr: 'Consultation psychosociale', en: 'Psychosocial consultation' }, tel: '811' },
      { nom: { fr: 'Centre de crise de ma région', en: 'Local crisis centre' }, lien: { fr: 'Intervention de crise', en: 'Crisis intervention' }, tel: '' },
    ],
    youthFirst: ['urgence', 'jeunes'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Urgence et crise', en: 'Emergency and crisis' },
        items: [
          { name: { fr: 'Services d’urgence', en: 'Emergency services' }, tel: '911', hours: H24, desc: { fr: 'Si je crains pour ma sécurité ou celle de quelqu’un.', en: 'If I fear for my safety or someone else’s.' } },
          { name: { fr: 'Ligne d’aide en prévention du suicide', en: 'Suicide prevention helpline' }, tel: '1 866 277-3553', hours: { fr: 'En tout temps', en: 'At any time' }, url: 'https://suicide.ca/', desc: { fr: 'Pour les personnes qui pensent au suicide ou qui s’inquiètent pour quelqu’un. Aussi par texto au 535353 et par clavardage sur suicide.ca. Le 9-8-8 fonctionne aussi.', en: 'For people thinking about suicide or worried about someone. Also by text to 535353 and by chat on suicide.ca. 9-8-8 also works.' } },
          { name: 'Info-Social 811', tel: '811', hours: H24, desc: { fr: 'Consultation téléphonique gratuite et confidentielle avec un·e intervenant·e psychosocial·e, pour moi ou un proche.', en: 'Free, confidential phone consultation with a psychosocial worker, for me or someone close (French and English).' } },
        ],
      },
      {
        id: 'jeunes', icon: '🎓', title: { fr: 'Jeunes et parents', en: 'Young people and parents' },
        items: [
          { name: 'Tel-jeunes', tel: '1 800 263-2266', hours: { fr: 'Téléphone de 6 h à 2 h ; texto et clavardage de 8 h à 22 h 30', en: 'Phone 6 am to 2 am; text and chat 8 am to 10:30 pm' }, desc: { fr: 'Pour les 12-17 ans. Texto ou clavardage : 514 600-1002.', en: 'For 12 to 17-year-olds. Text or chat: 514 600-1002.' } },
          { name: { fr: 'Jeunesse, J’écoute', en: 'Kids Help Phone' }, tel: '1-800-668-6868', hours: H24, url: 'https://jeunessejecoute.ca/', desc: { fr: 'Pour les 5-29 ans, partout au Canada. Aussi par texto au 686868.', en: 'For 5 to 29-year-olds, anywhere in Canada. You can also text CONNECT to 686868.' } },
          { name: 'LigneParents', tel: '1 800 361-5085', hours: { fr: 'De 6 h à minuit', en: '6 am to midnight' }, desc: { fr: 'Pour les parents d’enfants de 0 à 20 ans.', en: 'For parents of children aged 0 to 20.' } },
        ],
      },
      {
        id: 'proches', icon: '🤝', title: { fr: 'Pour les proches', en: 'For family and friends' },
        items: [
          { name: { fr: 'Pair·e·s aidant·e·s famille', en: 'Family peer helpers' }, tel: '1 800 349-9915', hours: { fr: 'Lundi de 13 h à 16 h ; mardi, mercredi, jeudi et samedi de 13 h à 18 h', en: 'Monday 1 pm to 4 pm; Tuesday, Wednesday, Thursday and Saturday 1 pm to 6 pm' }, desc: { fr: 'Pour les membres de l’entourage d’une personne vivant avec un trouble mental. Gratuit et confidentiel.', en: 'For the family of someone living with a mental disorder. Free and confidential.' } },
        ],
      },
      {
        id: 'info', icon: '📚', title: { fr: 'S’informer, trouver un soin', en: 'Information and finding care' },
        items: [
          { name: { fr: 'Québec.ca — ressources en santé mentale', en: 'Québec.ca — mental health resources' }, url: 'https://www.quebec.ca/sante/conseils-et-prevention/sante-mentale/obtenir-aide-en-sante-mentale/ressources-aide-et-soutien-en-sante-mentale', desc: { fr: 'Liste officielle des ressources d’aide, dont les centres de crise par région.', en: 'Official list of support resources, including crisis centres by region.' } },
        ],
      },
    ],
  },

  /* --------------------------------------------------------- Autre pays */
  INT: {
    flag: '🌍',
    name: { fr: 'Autre pays', en: 'Other country' },
    inName: { fr: 'dans le monde', en: 'around the world' },
    checked: { fr: '28 octobre 2026', en: '28 October 2026' },
    emergency: {
      text: {
        fr: 'Appelez le numéro d’urgence de votre pays (le 112 fonctionne dans de nombreux pays, dont toute l’Union européenne). Pour trouver une ligne d’écoute près de chez vous : findahelpline.com.',
        en: 'Call your local emergency number (112 works in many countries, including the whole European Union). To find a helpline near you: findahelpline.com.',
      },
      tels: ['112'],
      links: { 'findahelpline.com': 'https://findahelpline.com/' },
    },
    garde: [
      { nom: { fr: 'Services d’urgence', en: 'Emergency services' }, lien: { fr: 'Numéro d’urgence de mon pays', en: 'My local emergency number' }, tel: '' },
      { nom: { fr: 'Ligne d’écoute de mon pays', en: 'A helpline in my country' }, lien: { fr: 'À trouver sur findahelpline.com', en: 'Find one at findahelpline.com' }, tel: '' },
      { nom: { fr: 'Équipe de crise de ma région', en: 'Local crisis team' }, lien: { fr: 'Service de garde', en: 'On-call service' }, tel: '' },
    ],
    youthFirst: ['urgence'],
    cats: [
      {
        id: 'urgence', icon: '🚨', title: { fr: 'Trouver de l’aide', en: 'Finding help' },
        intro: { fr: 'Mon PCC ne propose pas encore de liste pour mon pays. Je peux choisir un autre pays dans les Réglages.', en: 'Mon PCC does not yet have a list for my country. I can choose another country in Settings.' },
        items: [
          { name: { fr: 'Numéro d’urgence européen', en: 'European emergency number' }, tel: '112', hours: H24, desc: { fr: 'Fonctionne dans toute l’Union européenne et dans de nombreux autres pays, depuis un portable.', en: 'Works across the European Union and in many other countries, from a mobile phone.' } },
          { name: 'Find A Helpline', url: 'https://findahelpline.com/', desc: { fr: 'Annuaire de lignes d’écoute gratuites dans plus de 100 pays.', en: 'Directory of free helplines in more than 100 countries.' } },
        ],
      },
    ],
  },
};

/** Pays courant (repli : autre pays) */
export const countryData = (code) => COUNTRIES[code] || COUNTRIES.INT;

/*
 * Exemples des étapes qui dépendent du pays (versions françaises du plan).
 * Dans data.js et data-ado.js, un exemple écrit « @clé » est remplacé par
 * la valeur du pays ; s'il n'y en a pas (null), l'exemple n'est pas proposé.
 * Les numéros viennent des ressources vérifiées ci-dessus.
 */
const LOCAL_DEFAULT = {
  cmpRole: 'Service de santé mentale de mon secteur',
  cmpAct: 'Je contacte le service de santé mentale de mon secteur',
  adoCmpRole: 'Professionnel·le du service de santé mentale',
  adoCmpAct: 'Je contacte le service de santé mentale',
  adoPlaceRole: null,
  adoPlaceAct: null,
  youthLineAct: null,
  suicideLineAct: null,
  aseRole: 'Travailleur·se social·e de la protection de l’enfance',
  aseInform: 'Mon ou ma travailleur·se social·e',
  asePh: 'ma travailleuse sociale, Mme Diallo',
};
const LOCAL = {
  FR: {
    cmpRole: 'CMP de mon secteur', cmpAct: 'Je me rends au centre médico-psychologique (CMP)',
    adoCmpRole: 'Infirmier·ère du CMP', adoCmpAct: 'Je vais au CMP',
    adoPlaceRole: 'Professionnel·le de la Maison des adolescents', adoPlaceAct: 'Je contacte la Maison des adolescents',
    youthLineAct: 'J’appelle Fil Santé Jeunes (0 800 235 236)', suicideLineAct: 'J’appelle le 3114',
    aseRole: 'Référent·e de l’aide sociale à l’enfance (ASE)', aseInform: 'Mon ou ma référent·e ASE', asePh: 'ma référente ASE, Mme Diallo',
  },
  BE: {
    cmpRole: 'Service de santé mentale (SSM) de ma région', cmpAct: 'Je me rends au service de santé mentale (SSM)',
    adoCmpRole: 'Professionnel·le du service de santé mentale', adoCmpAct: 'Je vais au service de santé mentale',
    youthLineAct: 'J’appelle Écoute-Enfants (103)', suicideLineAct: 'J’appelle le Centre de Prévention du Suicide (0800 32 123)',
    aseRole: 'Délégué·e du SAJ ou du SPJ (aide à la jeunesse)', aseInform: 'Mon ou ma délégué·e du SAJ ou du SPJ', asePh: 'ma déléguée du SAJ, Mme Diallo',
  },
  CH: {
    cmpRole: 'Consultation psychiatrique ambulatoire de ma région', cmpAct: 'Je me rends à la consultation psychiatrique ambulatoire',
    adoCmpRole: 'Professionnel·le de la consultation de pédopsychiatrie', adoCmpAct: 'Je vais à la consultation de pédopsychiatrie',
    youthLineAct: 'J’appelle le 147 (Pro Juventute)', suicideLineAct: 'J’appelle La Main Tendue (143)',
    aseRole: 'Assistant·e social·e de la protection de l’enfance', aseInform: 'Mon assistant·e social·e', asePh: 'mon assistante sociale, Mme Diallo',
  },
  QC: {
    cmpRole: 'CLSC de mon secteur', cmpAct: 'Je me rends à mon CLSC',
    adoCmpRole: 'Intervenant·e du CLSC', adoCmpAct: 'Je vais au CLSC',
    youthLineAct: 'J’appelle Tel-jeunes (1 800 263-2266)', suicideLineAct: 'J’appelle la ligne de prévention du suicide (1 866 277-3553)',
    aseRole: 'Intervenant·e de la DPJ (protection de la jeunesse)', aseInform: 'Mon intervenant·e de la DPJ', asePh: 'mon intervenante de la DPJ, Mme Diallo',
  },
  CA: { youthLineAct: 'J’appelle Jeunesse, J’écoute (1-800-668-6868)', suicideLineAct: 'J’appelle le 9-8-8' },
  GB: {
    adoCmpRole: 'Professionnel·le du CAMHS', adoCmpAct: 'Je contacte le CAMHS (santé mentale des jeunes)',
    youthLineAct: 'J’appelle Childline (0800 1111)', suicideLineAct: 'J’appelle les Samaritans (116 123)',
  },
  IE: {
    adoPlaceRole: 'Professionnel·le de Jigsaw', adoPlaceAct: 'Je contacte Jigsaw',
    youthLineAct: 'J’appelle Childline (1800 66 66 66)', suicideLineAct: 'J’appelle Pieta (1800 247 247)',
  },
  US: { suicideLineAct: 'J’appelle le 988' },
  AU: { youthLineAct: 'J’appelle Kids Helpline (1800 55 1800)', suicideLineAct: 'J’appelle Lifeline (13 11 14)' },
  NZ: { youthLineAct: 'J’appelle Youthline (0800 376 633)', suicideLineAct: 'J’appelle ou j’écris au 1737' },
};

/** Remplace un exemple « @clé » par sa version du pays (null : exemple non proposé) */
export function localExample(code, s) {
  if (typeof s !== 'string' || s[0] !== '@') return s;
  const k = s.slice(1);
  const v = { ...LOCAL_DEFAULT, ...(LOCAL[code] || {}) }[k];
  return v === undefined ? s : v;
}
