# Mon PCC

**Préparer son plan de crise conjoint, pas à pas, sur son téléphone. Gratuit, sans compte, sans serveur.**

Mon PCC est une application web installable (PWA) qui guide la rédaction d’un
[Plan de Crise Conjoint](https://plandecriseconjoint.ch/) (PCC) : une forme de
déclaration anticipée en santé mentale, construite par la personne concernée avec
un·e professionnel·le qui l’accompagne et, si elle le souhaite, ses proches.

## Fonctionnalités

- **Trame officielle** : les 14 étapes suivent, dans l’ordre, les questions du support PCC version adulte (V6, 2026).
- **Rédaction guidée sans induire les réponses** : pour chaque question, un conseil de rédaction et une saisie libre « avec mes mots » en premier. Des **exemples à cocher** n’apparaissent qu’en touchant le bouton « Exemples ».
- **Priorités** : stratégies et personnes ressources se classent par ordre de priorité (moi-même → entourage → professionnel·les → services de garde), comme le demande le PCC.
- **Cohérence** : rappel si des soins à éviter sont indiqués sans alternative (champ indispensable selon le PCC).
- **Démarche respectée** : remplir d’abord seul·e à la première personne, puis décision partagée, signature, diffusion, relecture au moins tous les 6 mois (rappel de date).
- **Boîte à outils** (étape 7, partie 1, et menu) : photos, vidéos, sons, messages vocaux enregistrés dans l’application et liens qui aident à aller mieux. Fichiers stockés sur l’appareil (IndexedDB), chiffrés avec le code si le plan est protégé ; seuls les titres et liens figurent dans le plan imprimé ou envoyé.
- **Contacts du téléphone** (Android/Chrome) : aux étapes Partenaires, À qui demander de l’aide et Démarches, bouton « Choisir dans mes contacts » après information et accord. Seuls les contacts cochés sont transmis (API Contact Picker) ; le bouton n’apparaît pas sur les appareils non compatibles (iPhone, ordinateur) ni dans Brave, qui expose l’API sans la faire fonctionner ([brave-browser#18908](https://github.com/brave/brave-browser/issues/18908)) ; un message invite alors à utiliser Chrome.
- **Signature sur l’écran** : la personne et chaque partenaire peuvent signer au doigt sur le smartphone (ou à la main sur la version imprimée). Alerte si le plan est modifié après les signatures.
- **Partage au choix de la personne** : impression / PDF avec cadres de signature, envoi d’un document lisible partout (HTML autonome), ou envoi en texte via le menu de partage du téléphone.
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
4. L’application est disponible à `https://<utilisateur>.github.io/mon-pcc/`.

Aucune compilation : HTML, CSS et JavaScript natifs. Pour tester en local : `python3 -m http.server` puis http://localhost:8000.

À chaque mise à jour des fichiers, incrémenter `CACHE` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

## Structure

```
index.html              page unique
css/style.css           styles (clair/sombre, impression)
js/data.js              trame PCC, conseils et suggestions  ← contenu à relire
js/app.js               interface et navigation
js/storage.js           stockage local et chiffrement
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

## Licence

Conformément à la clause « partage dans les mêmes conditions » du PCC, l’ensemble de ce projet est diffusé sous licence
[Creative Commons Attribution – Pas d’utilisation commerciale – Partage dans les mêmes conditions 4.0 International (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr). Voir [LICENSE](LICENSE).

## Avertissement

Mon PCC ne remplace ni l’accompagnement par un·e professionnel·le, ni un avis médical, et n’est pas un dispositif médical.
En cas d’urgence : **15** ou **112**. Prévention du suicide : **3114** (24 h/24, France).
