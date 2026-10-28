/*
 * Mon PCC — English adult version
 *
 * Questions are quoted from the official English form, "Validated Joint Crisis
 * Plan Support" (English version, V5):
 *   Ferrari, P., Suter, C., Martino, P. (2026). https://plandecriseconjoint.ch/
 *   © Haute École de la Santé La Source, Lausanne — CC BY-NC-SA licence.
 * Changes: split into steps, writing tips and examples written for Mon PCC.
 * Shared under the same licence (CC BY-NC-SA 4.0).
 *
 * Step ids are the same as in the French version: answers are shared.
 * The examples of the "garde" group (crisis services) come from the country
 * chosen in Settings (resources.js).
 */

export const SOURCE_ADULTE_EN = {
  citation: 'Ferrari, P., Suter, C., Martino, P. (2026). Validated Joint Crisis Plan Support.',
  url: 'https://plandecriseconjoint.ch/',
  holder: 'Haute École de la Santé La Source, Lausanne',
  license: 'CC BY-NC-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en',
};

export const PRINT_TITLE_ADULTE_EN = 'JOINT CRISIS PLAN';
export const PRINT_SUBTITLE_ADULTE_EN = 'A partnership between me and my support network — adult version';

export const PROCESS_ADULTE_EN = [
  { t: 'I choose a calm moment', d: 'Ideally away from a crisis, at a time when I feel settled. I can take breaks and go at my own pace.' },
  { t: 'I fill it in on my own first', d: 'In the first person (“I”), in my own words. Examples are available if I run out of ideas, but they don’t speak for me.' },
  { t: 'I talk it through with a professional', d: 'At least with a professional who supports me, and with people close to me if I wish. Together, we add to or change the plan: it is a shared decision.' },
  { t: 'We date and sign it', d: 'Each partner gives their role and signs, with a finger on the phone or by hand on the printed copy.' },
  { t: 'I share it', d: 'With the people and professionals named in the plan, and I keep it somewhere easy to find.' },
  { t: 'I review it regularly', d: 'After a crisis or relapse, when something important changes, and at least every six months.' },
];

export const STEPS_ADULTE_EN = [
  {
    id: 'coordonnees',
    easy: { q: 'Who am I? I write my last name, first name, date of birth, phone and address.', tip: 'This shows the plan is mine. It stays on my phone.' },
    type: 'identity',
    short: 'My details',
    title: 'My details',
    question: 'Last name, first name, date of birth, phone, address.',
    tip: 'These details identify my plan. They stay on this phone unless I choose to send it.',
  },
  {
    id: 'partenaires',
    easy: { q: 'Who do I make my plan with? I write their names and their roles.', tip: 'I need at least one professional who supports me. I can also choose someone close to me. It is my choice.' },
    type: 'records',
    short: 'Partners',
    title: 'Who I develop it with',
    question: 'My crisis plan was developed jointly with (names and roles of the different partners):',
    tip: 'At least one professional who supports me. People close to me or a peer support worker can take part if I wish: it is my choice.',
    fields: [
      { key: 'nom', label: 'Name', placeholder: 'E.g. Sarah Jones' },
      { key: 'role', label: 'Role', placeholder: 'E.g. care coordinator' },
    ],
    suggestField: 'role',
    contacts: { name: 'nom' },
    suggestLabel: 'Add a partner by role',
    suggestions: [
      'Care coordinator', 'Psychiatrist', 'GP / family doctor', 'Psychologist',
      'Peer support worker', 'Social worker', 'Support worker', 'Family member',
      'Friend', 'Trusted person',
    ],
  },
  {
    id: 'difficultes',
    easy: { q: 'Why do I get care? I write my difficulties.', tip: 'I use my own words. I only write what I want to say.' },
    type: 'list',
    short: 'My difficulties',
    title: 'What I receive treatment for',
    question: 'For what mental health and/or addiction problems do I receive treatment for?',
    tip: 'I can use my own words rather than a diagnosis. I only write what I want to share.',
    suggestions: [
      'Periods of deep sadness or hopelessness',
      'Moments of intense anxiety',
      'Periods of high energy when I hardly sleep',
      'Moments when I am no longer sure what is real',
      'Thoughts that take over',
      'Thoughts of death',
      'My alcohol use',
      'My use of cannabis or other substances',
      'Difficulties linked to a traumatic event',
      'Relationships with others becoming very difficult',
    ],
  },
  {
    id: 'declencheurs',
    easy: { q: 'What can make me become very unwell?', tip: 'I think about the last times I was unwell. What happened before?' },
    type: 'list',
    short: 'Triggers',
    title: 'What can trigger a crisis',
    question: 'What can trigger the onset of a crisis?',
    tip: 'I think about the last times things went wrong: what happened just before, or in the weeks before?',
    suggestions: [
      'Lack of sleep', 'A conflict with someone close', 'A break-up or separation',
      'A bereavement', 'Stress at work or in my studies', 'Losing my job or my home',
      'Money worries', 'Feeling lonely or isolated', 'Stopping my treatment without support',
      'Using alcohol or other substances', 'A difficult anniversary',
      'A big change (moving house, a new team…)', 'A physical health problem',
      'The festive season', 'Feeling judged or rejected',
    ],
  },
  {
    id: 'enCrise',
    easy: { q: 'What am I like when I am very unwell? What I think. What I feel. What happens in my body. What I do.', tip: 'I write precise things. For example: “I stop answering my phone”.' },
    type: 'list',
    short: 'When I am in crisis',
    title: 'What I am like in a crisis',
    question: 'What am I concretely like when I go through a crisis? (thoughts, emotions, physical reactions, behaviors)',
    tip: 'The more concrete, the sooner the people around me can spot the signs. “I stop answering my phone” says more than “I feel bad”.',
    groups: [
      { id: 'pensees', label: 'My thoughts', suggestions: [
        'I think I am worthless', 'My thoughts race', 'I believe people want to harm me',
        'I can no longer concentrate', 'I keep going over the same thoughts', 'I think nothing will get better',
        'I think about dying',
      ] },
      { id: 'emotions', label: 'My emotions', suggestions: [
        'I feel very anxious', 'I am irritable', 'I feel empty', 'I feel euphoric',
        'I feel scared', 'I feel ashamed', 'I cry a lot', 'I no longer feel anything',
      ] },
      { id: 'physique', label: 'My physical reactions', suggestions: [
        'I sleep very little or not at all', 'I sleep much more than usual', 'I stop eating',
        'I eat much more', 'My heart races', 'I am exhausted', 'I have tension or pain',
      ] },
      { id: 'comportements', label: 'My behaviours', suggestions: [
        'I shut myself away in my room', 'I stop answering the phone', 'I spend a lot of money',
        'I talk very fast and a lot', 'I stop looking after myself', 'I stop my treatment',
        'I use more alcohol or substances', 'I can no longer go to work', 'I become verbally aggressive',
      ] },
    ],
  },
  {
    id: 'signesEntourage',
    easy: { q: 'What do the people close to me notice when I am unwell?', tip: 'I can ask them: “What do you notice first when I start to feel worse?”' },
    type: 'list',
    short: 'What others notice',
    title: 'What the people around me notice',
    question: 'Are there other signs that appear according to the people around me?',
    tip: 'I can ask the people close to me: “What do you notice first when I start to feel worse?”',
    suggestions: [
      'I withdraw and talk very little', 'I am more irritable', 'I neglect my appearance',
      'I stop keeping in touch', 'I say unusual things', 'My home becomes untidy',
      'I am very restless', 'My sleep patterns change', 'I cancel my plans',
    ],
  },
  {
    id: 'strategies',
    easy: { q: 'What helps me when I am unwell? First, what I do on my own. Then with people close to me. Then with professionals.', tip: 'I put what I do first at the top. I can use the arrows to change the order.' },
    type: 'list',
    ordered: true,
    short: 'What I can do',
    title: 'What I can do to deal with the situation',
    question: 'What could I do concretely to deal with this distressing situation? (listing personal strategies first, then the ones involving my supporters and finally those requiring the intervention of professionals)',
    tip: 'I put things in order of priority with the arrows: what I do first goes at the top. I start with what I can do on my own. In my toolbox, I can keep photos, music, videos or links that help me.',
    groups: [
      { id: 'moi', label: '1. What I do myself', suggestions: [
        'I breathe calmly for a few minutes', 'I go for a walk', 'I listen to music that soothes me',
        'I take a shower', 'I go to bed at a regular time', 'I write down how I feel', 'I do an exercise from my toolbox (breathing, grounding…)',
        'I avoid alcohol and other substances', 'I keep taking my treatment',
        'I do something that keeps my hands busy', 'I reread my crisis plan',
      ] },
      { id: 'entourage', label: '2. With help from my supporters', suggestions: [
        'I call someone close to talk', 'I ask someone to stay with me',
        'I go and stay with someone close for a few days', 'I ask for help with shopping or meals',
        'I give my bank card to someone I trust', 'I ask someone to come with me to an appointment',
      ] },
      { id: 'pros', label: '3. With help from professionals', suggestions: [
        'I call my care coordinator', 'I ask for an urgent appointment with my psychiatrist',
        'I contact my GP / family doctor', 'I go to my community mental health team',
        'I call a helpline', 'I ask for a short hospital stay',
        'I go to the emergency department',
      ] },
    ],
  },
  {
    id: 'aide',
    easy: { q: 'Who can I ask for help? I write their name, who they are to me, and their phone number. First people close to me. Then professionals. Then crisis services.', tip: 'I ask each person if they agree. I write a number that answers.' },
    type: 'records',
    ordered: true,
    contacts: { name: 'nom', tel: 'tel' },
    contactGroupsOnly: true,
    short: 'Who I can ask for help',
    title: 'Who I can ask for help',
    question: 'Who can I ask for help if needed? (name, nature of the relationship or role, phone number; listing my supporters first, then professionals from my usual support network, and finally the crisis teams or services)',
    tip: 'I check with each person that they agree to be contacted, and I note a number that actually gets answered.',
    fields: [
      { key: 'nom', label: 'Name', placeholder: 'E.g. Julie' },
      { key: 'lien', label: 'Relationship or role', placeholder: 'E.g. my sister' },
      { key: 'tel', label: 'Phone', placeholder: '07…', type: 'tel' },
    ],
    groups: [
      { id: 'proches', label: '1. My supporters', contacts: true, suggestField: 'lien', suggestions: [
        'Parent', 'Brother or sister', 'Partner', 'Friend', 'Neighbour', 'Trusted person',
      ] },
      { id: 'pros', label: '2. My usual professionals', contacts: true, suggestField: 'lien', suggestions: [
        'Care coordinator', 'Psychiatrist', 'GP / family doctor', 'Psychologist', 'Community mental health team', 'Peer support worker',
      ] },
      { id: 'garde', label: '3. Crisis teams and services', countrySuggestions: true, suggestions: [] },
    ],
  },
  {
    id: 'soinsSouhaites',
    easy: { q: 'When I am very unwell, what care do I want?', tip: 'I think about what helped me before. It can be a specific medicine.' },
    type: 'list',
    short: 'Care I want',
    title: 'The care I want to receive',
    question: 'When I am unwell and / or in the event of a crisis: 1. What care or treatment do I want to receive?',
    tip: 'I can draw on what has already helped me in past crises, including a specific treatment.',
    suggestions: [
      'To be listened to calmly, without judgement', 'To have what is happening and what is planned explained to me',
      'To see my care coordinator quickly', 'To be seen the same day',
      'A treatment that has helped me before (to specify)', 'A quiet place with little noise and light',
      'To keep my phone so I can contact my loved ones', 'For my trusted person to be told',
      'To be admitted to hospital voluntarily if needed', 'To be cared for close to home',
    ],
  },
  {
    id: 'soinsEvites',
    easy: { q: 'What care do I not want? I explain why.', tip: 'For each one, I say why I don’t want it. For example: an effect I had before.' },
    type: 'records',
    short: 'Care to avoid',
    title: 'The care I want to avoid',
    question: '2. What care or treatment do I want to avoid? (argue the reasons for the refusal)',
    tip: 'For each one, I explain why: a side effect I have had, a bad memory… This helps professionals understand and respect my choice.',
    fields: [
      { key: 'soin', label: 'Care to avoid', placeholder: 'E.g. a specific medication' },
      { key: 'raison', label: 'Why', placeholder: 'E.g. significant weight gain in 2024', multiline: true },
    ],
    suggestField: 'soin',
    suggestLabel: 'Add care to avoid',
    suggestions: [
      'A medication that gave me side effects (to specify)',
      'An injection without explanation first', 'Being placed in seclusion',
      'Restraint', 'Being admitted to a hospital far from home', 'Being left alone with no one to talk to',
      'A particular person being told (to specify)',
    ],
  },
  {
    id: 'alternatives',
    easy: { q: 'If I don’t want some care, what can be done instead?', tip: 'This is important. For each care I don’t want, I suggest another solution.' },
    type: 'list',
    short: 'Alternatives',
    title: 'The alternatives I suggest',
    question: '3. What alternatives do I suggest? (essential to inform in case of refusal of care or treatment)',
    tip: 'For each type of care I want to avoid, I suggest what could replace it. This is what makes my refusal usable in a crisis.',
    requiresIfNotEmpty: 'soinsEvites',
    suggestions: [
      'Another medication I tolerate better (to specify)', 'Offering me oral medication first',
      'Staying with a staff member in a quiet space', 'Being able to call my trusted person',
      'Giving me time and explaining before acting', 'Calming down through talking, breathing or music',
      'A hospital stay close to home', 'More frequent appointments or home visits',
    ],
  },
  {
    id: 'demarches',
    easy: { q: 'If I am very unwell, who can look after my things? For example: post, children, pets, home, work. I write who does what and how to reach them.', tip: 'I choose one person for each thing. I check they agree.' },
    type: 'records',
    short: 'Practical arrangements',
    title: 'Protecting my interests and my daily life',
    question: 'In a crisis situation, what are the concrete steps to take or delegate to protect my interests and my daily life? (Mail, childcare, pets, home, work, ... name who can or must do what, put in contact details of people so that they can be reached if necessary)',
    tip: 'I name one person per task and check that they agree. I note where keys or useful documents are kept.',
    fields: [
      { key: 'quoi', label: 'What', placeholder: 'E.g. feed my cat' },
      { key: 'qui', label: 'Who', placeholder: 'E.g. Karim, my neighbour' },
      { key: 'contact', label: 'Contact details', placeholder: 'Phone, address…', type: 'tel' },
    ],
    suggestField: 'quoi',
    contacts: { name: 'qui', tel: 'contact' },
    suggestLabel: 'Add a task',
    suggestions: [
      'Collect my mail', 'Look after or take my children', 'Let the school or nursery know',
      'Look after my pet', 'Water the plants, empty the fridge', 'Keep a spare set of my keys',
      'Let my employer know', 'Pay the rent and bills', 'Cancel or move my appointments',
      'Bring me my things if I am in hospital', 'Park or keep an eye on my car',
    ],
  },
  {
    id: 'transmis',
    easy: { q: 'Who do I give my plan to? I write the place or name, and who they are to me.', tip: 'My plan belongs to me. I give it to the people named in the plan.' },
    type: 'records',
    short: 'Sent to',
    title: 'Who I share my plan with',
    question: 'My crisis plan has been sent to: (place or name, nature of the relationship)',
    tip: 'The document belongs to me. I share it with the people named in the plan and keep it somewhere easy to find.',
    fields: [
      { key: 'nom', label: 'Place or name', placeholder: 'E.g. my mental health team' },
      { key: 'lien', label: 'Relationship', placeholder: 'E.g. the team that supports me' },
    ],
    suggestField: 'nom',
    suggestLabel: 'Add a recipient',
    suggestions: [
      'My care coordinator', 'My psychiatrist', 'My GP / family doctor', 'My trusted person',
      'Someone close named in the plan', 'My health record',
      'A copy at home, somewhere easy to reach',
    ],
  },
  {
    id: 'signature',
    easy: { q: 'Where and when we sign. Who signs and their role.', tip: 'We read the plan together before signing. We can sign with a finger on the phone.' },
    type: 'final',
    short: 'Date and signatures',
    title: 'Place, date and signatures',
    question: 'Place and date. Roles & signatures:',
    tip: 'Before signing, we read the plan through together. Everyone can sign on this phone’s screen or on the printed copy. The date will remind me when to review my plan.',
    fields: [
      { key: 'nom', label: 'Name', placeholder: 'E.g. me' },
      { key: 'role', label: 'Role', placeholder: 'E.g. service user, nurse…' },
    ],
  },
];
