# Mon PCC

**Préparer son plan de crise conjoint, pas à pas, sur son téléphone. Gratuit, sans compte, sans serveur.**

Mon PCC est une application web installable (PWA) qui guide la rédaction d’un
[Plan de Crise Conjoint](https://plandecriseconjoint.ch/) (PCC) : une forme de
déclaration anticipée en santé mentale, construite par la personne concernée avec
un·e professionnel·le qui l’accompagne et, si elle le souhaite, ses proches.

## Fonctionnalités

- **Trame officielle** : les 14 étapes suivent, dans l’ordre, les questions du support PCC version adulte (V6, 2026).
- **Deux versions** : adulte (support PCC V6, 14 étapes) et **ado** (support PCC Ado V1 « phase test », 10 étapes : questions reformulées, rubrique « Qui informer ? Par qui ? Comment ? », sans les rubriques de soins). Choix au démarrage, changement possible à tout moment dans les Réglages : les réponses communes sont gardées, les rubriques propres à l’autre version masquées mais conservées. Exemples adaptés aux ados et à toutes les situations de vie (parents, famille d’accueil, foyer, ASE…).
- **Rédaction guidée sans induire les réponses** : pour chaque question, un conseil de rédaction et une saisie libre « avec mes mots » en premier. Des **exemples à cocher** n’apparaissent qu’en touchant le bouton « Exemples ».
- **Priorités** : stratégies et personnes ressources se classent par ordre de priorité (moi-même → entourage → professionnel·les → services de garde), comme le demande le PCC.
- **Cohérence** : rappel si des soins à éviter sont indiqués sans alternative (champ indispensable selon le PCC).
- **Démarche respectée** : remplir d’abord seul·e à la première personne, puis décision partagée, signature, diffusion, relecture au moins tous les 6 mois (rappel de date).
- **Boîte à outils** (étape 7, partie 1, et menu) : photos, vidéos, sons, messages vocaux et vidéos enregistrés dans l’application (caméra avant ou arrière, 3 minutes maximum), citations (avec exemples sur demande : phrases-repères, Épictète, Sénèque, prière de la sérénité) et liens qui aident à aller mieux. Fichiers stockés sur l’appareil (IndexedDB), chiffrés avec le code si le plan est protégé ; seuls les titres et liens figurent dans le plan imprimé ou envoyé.
- **Contacts du téléphone** (Android/Chrome) : aux étapes Partenaires, À qui demander de l’aide et Démarches, bouton « Choisir dans mes contacts » après information et accord. Seuls les contacts cochés sont transmis (API Contact Picker) ; le bouton n’apparaît pas sur les appareils non compatibles (iPhone, ordinateur) ni dans Brave, qui expose l’API sans la faire fonctionner ([brave-browser#18908](https://github.com/brave/brave-browser/issues/18908)) ; un message invite alors à utiliser Chrome.
- **Signature sur l’écran** : la personne et chaque partenaire peuvent signer au doigt sur le smartphone (ou à la main sur la version imprimée). Alerte si le plan est modifié après les signatures.
- **Imprimer, enregistrer, envoyer** : impression séparée de l’export ; **PDF généré sur l’appareil** (enregistré ou envoyé via le menu de partage du téléphone), **protégeable par un code** (chiffrement PDF standard AES-256, ISO 32000-2, demandé à l’ouverture par tous les lecteurs PDF récents). Code recommandé à l’enregistrement ; pour l’envoi, PDF sans code par défaut avec conseils de canaux sûrs, code en option accompagné d’un rappel des risques (illisible en crise sans le code, non intégrable au dossier). Envoi en texte possible, signalé comme non protégé.
- **Ressources** (menu et encadré d’urgence) : lignes d’écoute et sites fiables classés par besoin (urgence, écoute, jeunes et étudiant·es, monde agricole, proches, addictions, violences, information et soins), avec appel direct, lien et ajout du numéro au plan (étape 8). Données dans `js/resources.js`, vérifiées le 26 octobre 2026 : à revérifier régulièrement.
- **Ajouter à Mon Espace Santé** (page Mon plan et menu) : PDF sans code à déposer soi-même (Documents › Ajouter un document), étapes guidées, conseil d’autoriser l’accès en cas d’urgence, pistes en cas d’hospitalisation (DPI relié au DMP, remise à l’équipe, MSSanté par le soignant). Aucune connexion directe : Mon PCC n’est pas référencé au catalogue Mon Espace Santé.
- **Carte de crise** (même page) : carte 85 × 55 mm pour le portefeuille (« J’ai un plan de crise conjoint », où le trouver, personne à prévenir, soignant référent), sans information de santé ; image ou PDF à imprimer.
- **Installation** : bandeau proposé sur smartphone (« Plus tard » = 30 jours, « Ne plus proposer » = définitif, réactivable dans les Réglages), aussi accessible depuis le menu.
- **Partager l’application** (menu) : lien, QR code en plein écran, carte JPG et planche A4 de 10 cartes 85 × 55 mm en PDF, générés sur l’appareil. Seule l’adresse de l’application est partagée, jamais le plan.
- **Hors connexion** une fois installée.
- **Accessibilité** : grandes zones tactiles, mode sombre, navigation clavier, lecteurs d’écran.

## Confidentialité (RGPD)

- Aucune donnée collectée : pas de compte, de serveur, de base de données, de cookie, de mesure d’audience ni de ressource externe (polices et icônes embarquées).
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

## Structure

```
index.html              page unique
css/style.css           styles (clair/sombre, impression)
js/data.js              trame PCC adulte, conseils, exemples ; choix de version  ← contenu à relire
js/data-ado.js          trame PCC ado, conseils, exemples  ← contenu à relire
js/app.js               interface et navigation
js/storage.js           stockage local et chiffrement
js/pdf.js               écriture PDF et chiffrement AES-256
js/planpdf.js           mise en page du plan en PDF
js/crisiscard.js        carte de crise (image et PDF)
js/resources.js         ressources d’aide (numéros, horaires, sites)
js/share.js             carte, QR code, planche PDF
js/early.js             capture de l’invitation à installer
js/vendor/qrcode.js     générateur de QR code (MIT)
js/media.js             fichiers de la boîte à outils (IndexedDB)
js/export.js            mise en forme, impression, texte, document autonome
sw.js                   hors connexion
manifest.webmanifest    installation
icons/                  icônes
```

## Sources et droits d’auteur

Les questions reprennent le **Support Plan de Crise Conjoint uniformisé et validé** :
Ferrari, P., Suter, C., Martino, P. (2026). https://plandecriseconjoint.ch/
© Haute École de la Santé La Source, Lausanne — licence **CC BY-NC-SA**.

Les étapes de la démarche s’appuient sur la FAQ du site et sur le *Guide pour l’implantation du PCC* (Ferrari, Martino, Suter, 2025).

**Modifications apportées** : découpage en étapes, conseils de rédaction, suggestions et exemples rédigés pour Mon PCC, numéros d’urgence adaptés à la France, mise en page numérique.

Mon PCC est un projet **indépendant, gratuit et non commercial**, non affilié à la Haute École de la Santé La Source ni aux auteur·es du PCC, qui ne l’ont pas validé.

## Crédits

Conception et réalisation : **Roddy Ricart**.
Code source : https://github.com/rodtrip2/mon-pcc — suggestions et signalements via les [tickets GitHub](https://github.com/rodtrip2/mon-pcc/issues).

## Licence

Composant tiers : `js/vendor/qrcode.js` — QR Code Generator, © Kazuhiko Arase, licence MIT.


Conformément à la clause « partage dans les mêmes conditions » du PCC, l’ensemble de ce projet est diffusé sous licence
[Creative Commons Attribution – Pas d’utilisation commerciale – Partage dans les mêmes conditions 4.0 International (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr). Voir [LICENSE](LICENSE).

## Avertissement

Mon PCC ne remplace ni l’accompagnement par un·e professionnel·le, ni un avis médical, et n’est pas un dispositif médical.
En cas d’urgence : **15** ou **112**. Prévention du suicide : **3114** (24 h/24, France).
