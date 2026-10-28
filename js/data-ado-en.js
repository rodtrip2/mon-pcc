/*
 * Mon PCC — English teen version (UNOFFICIAL TRANSLATION)
 *
 * There is no official English version of the teen form. The questions below are
 * Mon PCC's own translation of the « Support Plan de Crise Conjoint Ado
 * uniformisé — V1 phase test »:
 *   Ferrari, P., Zambrano-Ovalle, T., Martino, P. (2026). https://plandecriseconjoint.ch/
 *   © Haute École de la Santé La Source, Lausanne — CC BY-NC-SA licence.
 * This translation has not been reviewed or approved by the authors.
 * Changes: translation, split into steps, tips and examples written for Mon PCC.
 * Shared under the same licence (CC BY-NC-SA 4.0).
 */

export const SOURCE_ADO_EN = {
  citation:
    'Ferrari, P., Zambrano-Ovalle, T., Martino, P. (2026). Support Plan de Crise Conjoint Ado uniformisé — V1 phase test. Unofficial English translation by Mon PCC.',
  url: 'https://plandecriseconjoint.ch/',
  holder: 'Haute École de la Santé La Source, Lausanne',
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en',
};

export const PRINT_TITLE_ADO_EN = 'MY JOINT CRISIS PLAN';
export const PRINT_SUBTITLE_ADO_EN = 'A partnership between me and my support network — teen version (test phase, unofficial translation)';

// Adults who may look after the young person, whatever their living situation
const ADULTS = [
  'Parent', 'Legal guardian', 'Foster carer', 'Key worker (residential home)',
  'Social worker', 'Grandparent or other relative', 'Trusted adult',
];

export const PROCESS_ADO_EN = [
  { t: 'I choose a calm moment', d: 'When things are going fairly well, not in the middle of a crisis. I can take breaks and go at my own pace.' },
  { t: 'I fill it in on my own first', d: 'In my own words, saying “I”. Examples are available if I run out of ideas, but they don’t speak for me.' },
  { t: 'I talk about it with a professional', d: 'With a professional who supports me, and with the adults who look after me: my parents, my foster carers, my key worker, my social worker… depending on my situation. Together, we add to or change the plan.' },
  { t: 'We date and sign it', d: 'Each person gives their role and signs, with a finger on the phone or by hand on the printed copy.' },
  { t: 'I share it', d: 'With the people named in the plan, and I keep it somewhere easy to find.' },
  { t: 'I review it regularly', d: 'After a crisis, when something changes in my life (school, where I live, my support…), and at least every six months.' },
];

export const STEPS_ADO_EN = [
  {
    id: 'coordonnees',
    type: 'identity',
    short: 'My details',
    title: 'My details',
    question: 'Last name, first name, date of birth, phone, address.',
    tip: 'These details identify my plan. They stay on this phone unless I choose to send it. The address can be where I live now (family, foster home, residential home…).',
  },
  {
    id: 'partenaires',
    type: 'records',
    short: 'Who with',
    title: 'Who I make my plan with',
    question: 'My crisis plan was made with (names and roles of the different people):',
    tip: 'At least one professional who supports me. I can also make it with the adults who look after me, depending on my situation: parents, foster carers, key worker, social worker…',
    fields: [
      { key: 'nom', label: 'Name', placeholder: 'E.g. Sarah Jones' },
      { key: 'role', label: 'Role', placeholder: 'E.g. school nurse' },
    ],
    contacts: { name: 'nom' },
    suggestField: 'role',
    suggestLabel: 'Add a person by role',
    suggestions: [
      ...ADULTS,
      'School nurse', 'Child and adolescent psychiatrist', 'Psychologist', 'Mental health nurse',
      'GP / family doctor', 'Youth worker', 'Peer support worker',
    ],
  },
  {
    id: 'difficultes',
    type: 'list',
    short: 'My difficulties',
    title: 'Why I am making my plan',
    question: 'What difficulties lead me to write my Joint Crisis Plan?',
    tip: 'I can use my own words. I only write what I want to share.',
    suggestions: [
      'I often feel sad or discouraged',
      'I have panic attacks',
      'I find it hard to manage my anger',
      'I hurt myself',
      'I have thoughts of death',
      'I find it hard to eat, or I eat far too much',
      'I use alcohol, cannabis or other substances',
      'I have been through very difficult things',
      'I find it hard to go to school',
      'I feel lonely or left out',
    ],
  },
  {
    id: 'declencheurs',
    type: 'list',
    short: 'What overwhelms me',
    title: 'What can overwhelm me',
    question: 'What can make me feel overwhelmed (in crisis)?',
    tip: 'I think about the last times things went wrong: what happened just before, or in the days before?',
    suggestions: [
      'An argument where I live', 'An argument with a friend', 'A break-up',
      'Bullying, at school or online', 'Messages or comments on social media',
      'Tests, exams, grades', 'Lack of sleep', 'Feeling lonely',
      'Feeling judged or not listened to', 'A change (new school, new place to live…)',
      'A difficult visit or contact with my family', 'A difficult anniversary',
      'Having my phone taken away', 'Using alcohol or other substances',
    ],
  },
  {
    id: 'enCrise',
    type: 'list',
    short: 'What I notice',
    title: 'What I notice in myself',
    question: 'What do I notice in myself when things are not okay? (thoughts, emotions, physical reactions, behaviours)',
    tip: 'The more concrete, the sooner the people around me can tell that things are not okay. “I stop answering messages” says more than “I feel bad”.',
    groups: [
      { id: 'pensees', label: 'My thoughts', suggestions: [
        'I think I am useless', 'I think nobody loves me', 'My thoughts go round in circles',
        'I can’t concentrate in class any more', 'I want everything to stop',
        'I think about hurting myself', 'I think about dying',
      ] },
      { id: 'emotions', label: 'My emotions', suggestions: [
        'I am very angry', 'I feel very anxious', 'I feel empty', 'I cry a lot',
        'I feel ashamed', 'I no longer feel anything', 'I get annoyed over nothing',
      ] },
      { id: 'physique', label: 'My physical reactions', suggestions: [
        'I sleep badly or very little', 'I sleep much more than usual', 'I am not hungry any more',
        'I eat much more', 'I have a stomach ache or a headache', 'My heart races', 'I am exhausted',
      ] },
      { id: 'comportements', label: 'My behaviours', suggestions: [
        'I shut myself in my room', 'I stop answering messages', 'I spend the night on my phone',
        'I stop going to class', 'I want to leave, to run away', 'I argue with everyone',
        'I hurt myself', 'I use alcohol or other substances', 'I break things',
      ] },
    ],
  },
  {
    id: 'signesEntourage',
    type: 'list',
    short: 'What others notice',
    title: 'What the people around me notice',
    question: 'What do the people around me notice in me when things are not okay? (thoughts, emotions, physical reactions, behaviours)',
    tip: 'I can ask the people who know me well: “What do you notice first when I start to feel worse?”',
    suggestions: [
      'I talk much less', 'I am more irritable', 'I stay in my room all the time',
      'My grades drop', 'I stop seeing my friends', 'I stop eating with the others',
      'I am very restless', 'I take less care of myself', 'I answer back aggressively',
    ],
  },
  {
    id: 'strategies',
    type: 'list',
    short: 'What helps me',
    title: 'What helps me feel better',
    question: 'What helps me feel better when things are not okay? (hobbies, people around me, help from professionals)',
    tip: 'I can put what helps me most first, with the arrows. In my toolbox, I can keep photos, music, videos or links that help me.',
    ordered: true,
    groups: [
      { id: 'moi', label: 'My hobbies, what I do myself', suggestions: [
        'I listen to music', 'I do some sport or go for a walk', 'I draw, write or play an instrument',
        'I play a game I like', 'I breathe calmly for a few minutes', 'I take a shower',
        'I look at my toolbox', 'I do a breathing or grounding exercise', 'I rest, I take a break', 'I spend time with my pet',
      ] },
      { id: 'entourage', label: 'The people around me', suggestions: [
        'I message or call a friend', 'I talk to an adult I trust', 'I ask someone to stay with me',
        'I spend time with the people I live with', 'I talk to my key worker or social worker',
        'I go to someone close to me',
      ] },
      { id: 'pros', label: 'Help from professionals', suggestions: [
        'I go and see the school nurse', 'I call my psychologist or psychiatrist',
        'I contact my mental health team', 'I call a helpline for young people',
        'I call a crisis line', 'I go to the emergency department',
      ] },
    ],
  },
  {
    id: 'information',
    type: 'records',
    short: 'Who to inform',
    title: 'Who to inform when things are not okay',
    question: 'When things are not okay, who should be informed? By whom? And how?',
    tip: 'For each person, I write who lets them know and how (call, message, in person…). I check with them that they agree.',
    fields: [
      { key: 'qui', label: 'Who?', placeholder: 'E.g. my social worker, Ms Diallo' },
      { key: 'parQui', label: 'By whom?', placeholder: 'E.g. me, or my key worker' },
      { key: 'comment', label: 'How?', placeholder: 'E.g. by phone on 07…', multiline: true },
    ],
    labelled: true,
    contacts: { name: 'qui', tel: 'comment' },
    suggestField: 'qui',
    suggestLabel: 'Add a person to inform',
    suggestions: [
      ...ADULTS, 'My school nurse', 'My psychologist or psychiatrist', 'A friend', 'A brother or sister',
    ],
  },
  {
    id: 'transmis',
    type: 'records',
    short: 'Sent to',
    title: 'Who I share my plan with',
    question: 'My crisis plan has been sent to: (place or name, nature of the relationship)',
    tip: 'I share it with the people named in the plan and keep it somewhere easy to find.',
    fields: [
      { key: 'nom', label: 'Place or name', placeholder: 'E.g. the school nurse’s office' },
      { key: 'lien', label: 'Relationship', placeholder: 'E.g. school nurse' },
    ],
    suggestField: 'nom',
    suggestLabel: 'Add a recipient',
    suggestions: [
      'The adults who look after me', 'My school nurse', 'My key worker or where I live',
      'My social worker', 'My psychologist or psychiatrist', 'My GP / family doctor',
      'A copy at home, somewhere easy to find',
    ],
  },
  {
    id: 'signature',
    type: 'final',
    short: 'Date and signatures',
    title: 'Place, date and signatures',
    question: 'Place and date. Roles & signatures:',
    tip: 'Before signing, we read the plan through together. Everyone can sign on this phone’s screen or on the printed copy.',
    fields: [
      { key: 'nom', label: 'Name', placeholder: 'E.g. me' },
      { key: 'role', label: 'Role', placeholder: 'E.g. me, nurse, key worker…' },
    ],
  },
];
