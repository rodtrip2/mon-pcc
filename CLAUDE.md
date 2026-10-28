# Mon PCC — règles du projet

Ce fichier regroupe les décisions prises avec le porteur du projet. Il s'adresse à toute personne (ou assistant IA) qui modifie le dépôt. **À relire avant tout changement, à mettre à jour quand une nouvelle décision est prise.**

Mon PCC est une application web installable (PWA), gratuite et sans serveur, qui aide à rédiger un Plan de Crise Conjoint (PCC) d'après https://plandecriseconjoint.ch/. Le README décrit les fonctionnalités. Ce fichier décrit **ce qu'il faut respecter**.

## 1. Esprit et rédaction des contenus

- **Ne pas induire les réponses.** La saisie libre « avec mes mots » vient toujours en premier. Les exemples ne s'affichent que si la personne touche le bouton « Exemples ».
- **Ce que la personne a ajouté s'affiche en premier**, avant le champ de saisie et les exemples. Cela vaut pour les listes des étapes comme pour la boîte à outils.
- **Écrire à la première personne (« je »)** dans les questions, les conseils et les exemples, y compris dans la version ado.
- **Pas d'exemples paternalistes ou moralisateurs.** On ne restreint pas, on ne juge pas, on n'ajoute pas de « pas trop longtemps » ou de « avec modération ». Un exemple décrit ce que la personne fait, pas ce qu'elle devrait faire. Exemples corrigés : « Je joue à un jeu que j'aime » ; « Je continue mon traitement ».
- **Écriture inclusive avec le point médian** : professionnel·le, seul·e, étudiant·es.
- **Ne pas supposer de situation familiale**, surtout dans la version ado. La personne peut vivre en famille d'accueil ou en foyer, être suivie par l'ASE, ou avoir des parents absents. Les rôles proposés incluent famille d'accueil, éducateur·rice et référent·e ASE.
- **Questions officielles reprises telles quelles** : support PCC adulte V6 (2026) et support PCC Ado V1 « phase test » (Ferrari, Zambrano-Ovalle, Martino, 2026). L'ordre et le découpage des étapes suivent ces supports. Les conseils et les exemples sont propres à Mon PCC.
- **Citations** : n'attribuer une citation que si l'auteur est vérifié. Par exemple, la prière de la sérénité est de Reinhold Niebuhr, pas de Marc Aurèle. Pas de proverbes. Les traductions sont reformulées et les citations restent courtes.
- **Vérifier l'orthographe et les accents** dans les textes affichés (exemple d'erreur passée : « préférez », pas « préfèrez »).
- Ton général : simple, chaleureux, non médical, phrases courtes, accessible en période difficile.

## 2. Deux versions : adulte et ado

- Les deux versions sont dans `js/data.js` (adulte, 14 étapes) et `js/data-ado.js` (ado, 10 étapes). `setVersion()` met à jour les exports utilisés par toute l'application.
- **On peut changer de version à tout moment** dans Réglages › Version. Les réponses communes sont conservées. Les rubriques propres à l'autre version sont masquées, jamais effacées.
- Toute nouvelle fonctionnalité doit marcher dans les deux versions. Exemples : pour l'ado, les ressources sont ajoutées à `strategies.pros` ; pour l'adulte, à `aide.garde`. Sur la page Mon Espace Santé, une note s'adresse aux mineur·es. Elle s'affiche si la date de naissance indique moins de 18 ans, ou en version ado quand cette date n'est pas renseignée. Elle ne s'affiche jamais pour une personne majeure, et on peut la masquer (✕).

## 2 bis. Langues et pays

- **Deux langues, français et anglais.** Tout texte affiché s'écrit `tr('français', 'English')` (`js/i18n.js`) ; les valeurs bilingues des données s'écrivent `{ fr, en }` et se lisent avec `L()`. Aucun texte d'interface en dur dans une seule langue.
- Langue : celle du téléphone par défaut, changeable dans le menu et les Réglages, sans recharger. Les réponses de la personne ne sont **jamais traduites**.
- Version adulte anglaise : questions **reprises mot pour mot** du formulaire officiel anglais (V5). Version ado anglaise : **traduction non officielle**, à signaler partout où la source est citée.
- **Pays** (réglage séparé de la langue, déduit du fuseau horaire) : il décide des numéros d'urgence, des ressources, des exemples « services de garde » (`countrySuggestions`) et de la page dossier de santé. Mon Espace Santé et la note pour les mineur·es ne concernent que la France.
- Exemples en anglais : neutres, valables dans tous les pays anglophones (pas de service propre à un pays) ; orthographe britannique, sauf dans les questions officielles.
- Toute nouvelle fonctionnalité est testée en français **et** en anglais. Avant de toucher au code, vérifier qu'en français l'affichage reste identique.
- Ma boussole bien-être en anglais : pages sous `/en/` ; hors connexion en anglais via le cache `mbb-pages-en` et `audios/offline-en.json`.

## 3. Confidentialité et sécurité (RGPD)

- **Aucune donnée ne quitte l'appareil sans action explicite de la personne.** Pas de compte, de serveur, de cookie, de mesure d'audience, de police ou de ressource externe.
- Stockage : le plan est dans `localStorage` (`monpcc.v1`) et les fichiers de la boîte à outils dans IndexedDB (`monpcc-media`). Les deux sont chiffrés avec le code personnel s'il existe (PBKDF2 + AES-GCM).
- **Politique de sécurité du contenu (CSP) stricte** dans `index.html`. Ne l'élargir qu'au strict nécessaire, et ajouter chaque domaine aux listes `FRAME_HOSTS` / `OEMBED_HOSTS` de `js/embed.js`.
- **Contenus externes (vidéos, musique)** : rien n'est chargé avant que la personne touche « Lire ici », après un avertissement. On utilise les versions sans cookies quand elles existent. YouTube passe par youtube-nocookie avec `referrerpolicy="strict-origin"`, faute de quoi on obtient l'erreur 153.
- **Envoi du plan** : PDF sans code par défaut, avec des conseils sur les canaux sûrs. Le code est proposé en option, avec un rappel des risques (illisible en crise sans le code, impossible à intégrer au dossier). Pour l'enregistrement, le code est recommandé. Le chiffrement PDF est en AES-256 R6, écrit à la main dans `js/pdf.js`, sans dépendance.
- **Signatures** : elles ne figurent sur l'export que si elles sont postérieures à la dernière modification du contenu (`contentUpdated`). Signer appelle `scheduleSave(false)`, ce qui n'invalide pas les signatures. Modifier la carte de crise ne les invalide pas non plus.
- L'export affiche toujours la date de dernière mise à jour.
- **Seule l'adresse de l'application est partagée** (QR, carte), jamais le plan.
- **Tout message masquable doit pouvoir être réaffiché.** Il faut l'ajouter à `hiddenWarnings()` et `resetWarnings()` dans `app.js`, qui alimentent Réglages › Messages et avertissements.

## 4. Choix techniques

- HTML, CSS et JavaScript natifs (modules ES), **sans compilation ni framework**. Routage par l'adresse (`#/etape/N`, `#/plan`, `#/boite-outils`…).
- **À chaque mise à jour, incrémenter `CACHE` dans `sw.js`**, et ajouter tout nouveau fichier à `FILES`.
- Mode compact / mode modification : l'ensemble `editing` dans `app.js` contient les listes en cours de modification. On y entre par l'icône ✏️ et on en sort par le bouton flottant « ✓ Terminé ».
- Dans la boîte à outils, chaque type d'ajout a son bouton dans la grille « Ajouter ». Les ajouts qui demandent une saisie (lien, citation) ouvrent une fenêtre.
- Les albums mêlent photos et vidéos : chaque élément de `photos` vaut `{ file }` ou `{ file, video: true }`. Toute fonction qui touche aux albums doit gérer les deux.
- La règle globale `[hidden]{display:none!important}` est nécessaire parce que `.btn` impose un `display`.
- Fenêtres (`modal()`) : formulaire `method="dialog"`. Ne pas mettre `required` sur les champs, sinon « Annuler » est bloqué. On valide plutôt au clic sur OK.
- **Limites connues des navigateurs :**
  - Brave expose l'API Contact Picker mais elle ne fonctionne pas (brave-browser#18908). Le bouton y est masqué et un message propose Chrome.
  - Brave peut refuser le micro ou la caméra. On vérifie l'autorisation, on affiche un seul message d'aide, et on propose la capture native (`<input capture>`) en secours.
  - L'application Mon Espace Santé ne peut pas être ouverte depuis le web (lien intent:// testé, sans effet). On renvoie vers le site, avec des instructions.
- **Exercices de Ma boussole bien-être** (dépôt `rodtrip2/ma-boussole-bien-etre`, licence GPL-3) : ils sont **affichés dans un cadre, jamais copiés**, pour rester compatibles avec la licence. Ma boussole masque sa navigation (`.mbb-chrome`) quand elle est intégrée (`html[data-integre]`). Le mode hors connexion passe par le service worker de Ma boussole et le cache `mbb-audios`.

## 5. Licence et crédits

- Le projet est sous **CC BY-NC-SA 4.0**, comme le PCC dont il reprend les questions. Il faut citer la source PCC (Haute École de la Santé La Source) et indiquer les modifications. Projet indépendant, non validé par les auteur·es du PCC.
- **Pied de page** : la licence s'affiche avec le badge officiel CC BY-NC-SA (`icons/cc-by-nc-sa.svg`, fichier local), centré sur sa propre ligne, et non en texte.
- **Crédits** : « Roddy Ricart » apparaît dans la page À propos, le README et le LICENSE, **pas en pied de page**. **Pas de mention « Copyright » à son nom**, puisque le projet est sous Creative Commons.
- Composants tiers : seulement des licences compatibles, déclarées dans le README et le LICENSE (aujourd'hui, `js/vendor/qrcode.js`, licence MIT).

## 6. Ressources d'aide

- Les données sont dans `js/resources.js`, par pays, avec leur date de vérification (`checked`). Ne garder que des services vérifiés sur une source officielle (exemple : PAPYRUS, au Royaume-Uni, a fermé en septembre 2026). **Revérifier numéros et horaires sur les sites officiels** avant toute modification, et mettre la date à jour.
- La présentation actuelle des ressources est validée : ne pas la changer sans demande.

## 6 bis. Fonctions sensibles

- **Écran « Ça ne va pas » sans code** : uniquement si la personne l'active, plan protégé ; la copie lisible sans code (`monpcc.crisisSnap`) ne contient que stratégies, personnes à appeler, citations, liens et exercices. Ne jamais y ajouter d'autres données sans le dire dans l'avertissement.
- **Notes « à aborder avec mon soignant »** : privées, jamais dans le plan imprimé ou envoyé, sans effet sur les signatures (`scheduleSave(false)`).
- **Voix** : lecture à voix haute seulement avec une voix locale (`localService`). Dictée désactivée par défaut ; mode « sur ce téléphone » refusé si le navigateur ne peut pas garantir le traitement local ; mode en ligne seulement après l'avertissement. Ne pas appeler `SpeechRecognition.available()` automatiquement (plantage de certains navigateurs) : seulement à la demande.
- **Mode entretien** : texte agrandi seulement pendant l'entretien (jamais enregistré), bandeau en haut avec « Terminer », arrêté au verrouillage ou à la fermeture.
- **Rappel de relecture** : rien n'est envoyé par Mon PCC. Google Agenda et Outlook reçoivent seulement le titre et la date, après une mention claire ; le titre est modifiable pour rester discret. Le rappel (`plan.data.rappel`) et les notes ne font pas partie du contenu signé (`contentData`). Un lien `intent:` vers l'agenda Android a été testé sur téléphone, sans effet (Chrome n'ouvre que les applications prévues pour le web) : ne pas le remettre. Le fichier .ics est toujours proposé en premier (choix du porteur du projet), puis Google Agenda et Outlook.
- **FALC** : la question officielle reste visible et c'est elle qui figure dans les documents.
- **Options d'accessibilité** (FALC, taille du texte, lecture à voix haute, dictée) : **désactivées par défaut**, regroupées dans Réglages › Accessibilité. Rien ne s'affiche tant que la personne ne les active pas.

## 7. Méthode de travail

- Vérifier la syntaxe des modules avec `node --input-type=module --check < js/fichier.js` (un simple `node --check` ne détecte pas toutes les erreurs).
- Tester chaque changement dans un navigateur à la taille d'un téléphone (Playwright, 390 × 844), en version adulte **et** ado, sans erreur dans la console. Lancer `tests/run_tests.py` (aussi exécuté par GitHub à chaque envoi) et y ajouter un test pour chaque nouvelle fonctionnalité.
- Messages de commit en français. Pousser sur `main` : GitHub Pages publie depuis la racine de `main`.
- Mettre à jour le README quand une fonctionnalité change, et **ce fichier quand une décision est prise**.
