# Mon PCC

**Préparer son plan de crise conjoint, pas à pas, sur son téléphone. Gratuit, sans compte, sans serveur.**

Mon PCC est une application web installable (PWA) qui guide la rédaction d’un
[Plan de Crise Conjoint](https://plandecriseconjoint.ch/) (PCC) : une forme de
déclaration anticipée en santé mentale, construite par la personne concernée avec
un·e professionnel·le qui l’accompagne et, si elle le souhaite, ses proches.

## Fonctionnalités

- **Trame officielle** : les 14 étapes suivent, dans l’ordre, les questions du support PCC version adulte (V6, 2026).
- **Deux versions** : adulte (support PCC V6, 14 étapes) et **ado** (support PCC Ado V1 « phase test », 10 étapes : questions reformulées, rubrique « Qui informer ? Par qui ? Comment ? », sans les rubriques de soins). Choix au démarrage, changement possible à tout moment dans les Réglages : les réponses communes sont gardées, les rubriques propres à l’autre version masquées mais conservées. Exemples adaptés aux ados et à toutes les situations de vie (parents, famille d’accueil, foyer, ASE…).
- **Français et anglais** : langue du téléphone par défaut, changeable dans le menu (🌐) et les Réglages, sans recharger ni perdre de réponses (les réponses ne sont pas traduites). Version adulte anglaise : questions du formulaire officiel anglais du PCC (*Validated Joint Crisis Plan Support*, V5). Version ado anglaise : **traduction non officielle** par Mon PCC du support Ado V1 (signalée dans l’application et le document). Textes de l’interface dans le code (`tr('français', 'English')`, `js/i18n.js`), trames dans `js/data-en.js` et `js/data-ado-en.js`.
- **Pays** (Réglages, déduit du fuseau horaire) : France, Belgique, Suisse, Québec, Canada, Royaume-Uni, Irlande, États-Unis, Australie, Nouvelle-Zélande ou autre pays. Il règle les numéros d’urgence, les ressources d’aide, les exemples « services de garde » de l’étape 8 et la page dossier de santé (Mon Espace Santé en France, conseils généraux ailleurs).
- **Écran « Ça ne va pas »** (accueil, menu, raccourci de l’icône) : mes stratégies dans l’ordre, les personnes à appeler en un toucher, ma boîte à outils et les numéros d’urgence. Si le plan est protégé, option (Réglages) pour l’ouvrir sans le code : seule une copie de ces éléments est alors lisible sans code, jamais les photos, vidéos ou sons.
- **Synthèse d’une page** (PDF) pour les urgences : personnes à prévenir, soins à éviter et alternatives, soins souhaités, ce qui aide, signes de crise.
- **Versions signées** : copie du contenu à chaque signature (10 au plus), et page des changements depuis la dernière version signée.
- **Préparer mon entretien** : notes privées « à aborder avec mon soignant » dans chaque étape (hors du plan), récapitulatif, affichage en grand.
- **Rappel de relecture** : date au choix (6 mois après la signature par défaut), titre modifiable (possiblement discret), ajout direct dans Google Agenda ou Outlook, ou fichier .ics (ouvert directement par le Calendrier sur iPhone). La date choisie est gardée et affichée à l’accueil.
- **Pour les professionnel·les** : le PCC en bref, ce que disent les études, accompagner la démarche, affiche A4 avec QR code (PDF).
- **Lecture et voix** : questions en « facile à lire et à comprendre » (FALC / easy read), taille du texte, lecture à voix haute avec une voix installée sur l’appareil, dictée désactivée par défaut (« sur ce téléphone uniquement », ou en ligne après avertissement).
- **Rédaction guidée sans induire les réponses** : pour chaque question, un conseil de rédaction et une saisie libre « avec mes mots » en premier. Des **exemples à cocher** n’apparaissent qu’en touchant le bouton « Exemples ».
- **Priorités** : stratégies et personnes ressources se classent par ordre de priorité (moi-même → entourage → professionnel·les → services de garde), comme le demande le PCC.
- **Cohérence** : rappel si des soins à éviter sont indiqués sans alternative (champ indispensable selon le PCC).
- **Démarche respectée** : remplir d’abord seul·e à la première personne, puis décision partagée, signature, diffusion, relecture au moins tous les 6 mois (rappel de date).
- **Boîte à outils** (étape 7, partie 1, et menu) : photos, vidéos, sons, messages vocaux et vidéos enregistrés dans l’application (caméra avant ou arrière, 3 minutes maximum), citations (avec 25 exemples sur demande : phrases-repères rédigées pour Mon PCC et auteurs du domaine public, traductions reformulées) et liens qui aident à aller mieux. Fichiers stockés sur l’appareil (IndexedDB), chiffrés avec le code si le plan est protégé ; seuls les titres et liens figurent dans le plan imprimé ou envoyé.
- **Exercices de [Ma boussole bien-être](https://github.com/rodtrip2/ma-boussole-bien-etre)** (boîte à outils, bouton « 🧘 Exercice ») : respiration, respiration guidée, ancrage 5-4-3-2-1, relaxation musculaire progressive, visualisation, autocompassion, feuilles sur la rivière, sons apaisants, bulles, fidget spinner. Ouverts en plein écran dans Mon PCC (cadre, même site) ; Ma boussole détecte ce « mode intégré » et masque sa navigation. Pas de copie de code (Ma boussole est sous GPL-3). Réglages › « Exercices hors connexion » : télécharge pages, textes et sons français (≈ 20 Mo) via le service worker de Ma boussole (`js/exercises.js`).
- **Organisation de la boîte à outils** : albums photo (grille + visionneuse plein écran avec balayage), trois tailles d’affichage par élément (petit, moyen, grand) en grille, dossiers repliables (création, renommage, suppression sans perte de contenu) ; réglages en mode modification ✏️, que l’on quitte avec le bouton flottant « ✓ Terminé » (aussi dans les listes des étapes). Chaque type d’ajout a son bouton, y compris « 🔗 Lien » et « ❝ Citation », qui ouvrent une petite fenêtre.
- **Lecteurs intégrés** (boîte à outils) : les liens YouTube, Vimeo, Dailymotion, Spotify, Deezer, SoundCloud, Apple Music / Podcasts, TikTok, Instagram et les fichiers audio/vidéo directs se lisent dans l’application. Rien n’est chargé avant que la personne touche « Lire ici » (avertissement, option « ne plus me demander ») ; versions sans cookies / dnt quand elles existent. Titre prérempli via oEmbed à l’ajout du lien. Domaines limités par la CSP (`js/embed.js`).
- **Contacts du téléphone** (Android/Chrome) : aux étapes Partenaires, À qui demander de l’aide et Démarches, bouton « Choisir dans mes contacts » après information et accord. Seuls les contacts cochés sont transmis (API Contact Picker) ; le bouton n’apparaît pas sur les appareils non compatibles (iPhone, ordinateur) ni dans Brave, qui expose l’API sans la faire fonctionner ([brave-browser#18908](https://github.com/brave/brave-browser/issues/18908)) ; un message invite alors à utiliser Chrome.
- **Signature sur l’écran** : la personne et chaque partenaire peuvent signer au doigt sur le smartphone (ou à la main sur la version imprimée). Alerte si le plan est modifié après les signatures.
- **Imprimer, enregistrer, envoyer** : impression séparée de l’export ; **PDF généré sur l’appareil** (enregistré ou envoyé via le menu de partage du téléphone), **protégeable par un code** (chiffrement PDF standard AES-256, ISO 32000-2, demandé à l’ouverture par tous les lecteurs PDF récents). Code recommandé à l’enregistrement ; pour l’envoi, PDF sans code par défaut avec conseils de canaux sûrs, code en option accompagné d’un rappel des risques (illisible en crise sans le code, non intégrable au dossier). Envoi en texte possible, signalé comme non protégé.
- **Ressources** (menu et encadré d’urgence), **par pays** : lignes d’écoute et sites fiables classés par besoin (urgence, écoute, jeunes, monde agricole, proches, addictions, violences, information et soins), avec appel ou SMS direct, lien et ajout du numéro au plan (étape 8). Données bilingues dans `js/resources.js`, vérifiées sur les sites officiels (France : 26 octobre 2026 ; autres pays : 28 octobre 2026) : à revérifier régulièrement.
- **Ajouter à Mon Espace Santé** (page Mon plan et menu) : PDF sans code à déposer soi-même (Documents › Ajouter un document), étapes guidées, conseil d’autoriser l’accès en cas d’urgence, pistes en cas d’hospitalisation (DPI relié au DMP, remise à l’équipe, MSSanté par le soignant). Aucune connexion directe : Mon PCC n’est pas référencé au catalogue Mon Espace Santé.
- **Carte de crise** (même page) : carte 85 × 55 mm pour le portefeuille (« J’ai un plan de crise conjoint », où le trouver, personne à prévenir, soignant référent), sans information de santé ; image ou PDF à imprimer.
- **Installation** : bandeau proposé sur smartphone (« Plus tard » = 30 jours, « Ne plus proposer » = définitif, réactivable dans les Réglages), aussi accessible depuis le menu.
- **Partager l’application** (menu) : lien, QR code en plein écran, carte JPG et planche A4 de 10 cartes 85 × 55 mm en PDF, générés sur l’appareil. Seule l’adresse de l’application est partagée, jamais le plan.
- **Hors connexion** une fois installée.
- **Accessibilité** : grandes zones tactiles, mode sombre, navigation clavier, lecteurs d’écran.

## Confidentialité (RGPD)

- Aucune donnée collectée : pas de compte, de serveur, de base de données, de cookie, de mesure d’audience ni de ressource externe (polices et icônes embarquées). Seule exception, choisie par la personne : les vidéos et musiques qu’elle décide de lire dans la boîte à outils, et la demande de leur titre à l’ajout du lien.
- Le plan est enregistré **uniquement dans le navigateur de l’appareil** (`localStorage`).
- **Chiffrement facultatif** par code personnel (PBKDF2-SHA-256 250 000 itérations + AES-GCM 256 bits, via Web Crypto), verrouillage automatique après 5 minutes en arrière-plan.
- Effacement complet et sauvegarde/restauration depuis les Réglages.
- Avertissement avant tout envoi (données de santé).
- Politique de sécurité du contenu stricte (`default-src 'self'`), `no-referrer`.

L’éditeur n’ayant jamais accès aux données, il n’est pas responsable de traitement. Seul l’hébergeur (GitHub Pages) voit les données techniques de connexion lors du téléchargement des fichiers.

## Publier sur GitHub Pages

1. Créer un dépôt public `mon-pcc` sur GitHub.
2. Y déposer le contenu de ce dossier (à la racine du dépôt).
3. *Settings › Pages* : source « Deploy from a branch », branche `main`, dossier `/ (root)`.
4. L’application est disponible à `https://rodtrip2.github.io/mon-pcc/`.

Aucune compilation : HTML, CSS et JavaScript natifs. Pour tester en local : `python3 -m http.server` puis http://localhost:8000.

À chaque mise à jour des fichiers, incrémenter `CACHE` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

**Tests** : `tests/run_tests.py` (Playwright, Chromium en taille téléphone, français et anglais) vérifie les parcours principaux et l’absence d’erreur JavaScript. Ils tournent automatiquement sur GitHub à chaque envoi (`.github/workflows/tests.yml`). En local : `pip install playwright pypdf && python -m playwright install chromium`, puis `python3 -m http.server 8765` et `python3 tests/run_tests.py`.

## Structure

```
index.html              page unique
css/style.css           styles (clair/sombre, impression)
js/data.js              trame PCC adulte, conseils, exemples ; choix de version  ← contenu à relire
js/data-ado.js          trame PCC ado, conseils, exemples  ← contenu à relire
js/data-en.js           trame adulte en anglais (formulaire officiel anglais)  ← contenu à relire
js/data-ado-en.js       trame ado en anglais (traduction non officielle)  ← contenu à relire
js/i18n.js              langue (fr/en) et pays
js/summary.js           synthèse d’une page (PDF)
js/voice.js             lecture à voix haute et dictée
tests/run_tests.py      tests de bout en bout
js/app.js               interface et navigation
js/storage.js           stockage local et chiffrement
js/pdf.js               écriture PDF et chiffrement AES-256
js/planpdf.js           mise en page du plan en PDF
js/crisiscard.js        carte de crise (image et PDF)
js/resources.js         ressources d’aide (numéros, horaires, sites)
js/exercises.js         exercices de Ma boussole bien-être, préparation hors connexion
js/embed.js             lecteurs intégrés et titres des liens (oEmbed)
js/share.js             carte, QR code, planche PDF
js/early.js             capture de l’invitation à installer
js/vendor/qrcode.js     générateur de QR code (MIT)
js/media.js             fichiers de la boîte à outils (IndexedDB)
js/export.js            mise en forme, impression, texte, document autonome
sw.js                   hors connexion
manifest.webmanifest    installation (manifest-en.webmanifest en anglais)
icons/                  icônes
```

## Sources et droits d’auteur

Les questions reprennent le **Support Plan de Crise Conjoint uniformisé et validé** (et sa version anglaise officielle, *Validated Joint Crisis Plan Support*) :
Ferrari, P., Suter, C., Martino, P. (2026). https://plandecriseconjoint.ch/
© Haute École de la Santé La Source, Lausanne — licence **CC BY-NC-SA**.

Les étapes de la démarche s’appuient sur la FAQ du site et sur le *Guide pour l’implantation du PCC* (Ferrari, Martino, Suter, 2025).

**Modifications apportées** : découpage en étapes, conseils de rédaction, suggestions et exemples rédigés pour Mon PCC, numéros d’urgence adaptés à la France, mise en page numérique.

Mon PCC est un projet **indépendant, gratuit et non commercial**, non affilié à la Haute École de la Santé La Source ni aux auteur·es du PCC, qui ne l’ont pas validé.

## Crédits

Conception et réalisation : **Roddy Ricart**.
Code source : https://github.com/rodtrip2/mon-pcc — suggestions et signalements via les [tickets GitHub](https://github.com/rodtrip2/mon-pcc/issues).

## Licence

Composant tiers : `js/vendor/qrcode.js` — QR Code Generator, © Kazuhiko Arase, licence MIT. Le badge `icons/cc-by-nc-sa.svg` est une marque de Creative Commons, utilisée selon sa politique des marques pour indiquer la licence.


Conformément à la clause « partage dans les mêmes conditions » du PCC, l’ensemble de ce projet est diffusé sous licence
[Creative Commons Attribution – Pas d’utilisation commerciale – Partage dans les mêmes conditions 4.0 International (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr). Voir [LICENSE](LICENSE).

## Avertissement

Mon PCC ne remplace ni l’accompagnement par un·e professionnel·le, ni un avis médical, et n’est pas un dispositif médical.
En cas d’urgence : **15** ou **112**. Prévention du suicide : **3114** (24 h/24, France).
