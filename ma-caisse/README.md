# MA CAISSE V1.4 — Solution Numérique de Gestion de Commerce

**Porteur du projet : GASTON N3**  
**Date : Septembre 2026**  
**Version : 1.4**

---

## 1. Présentation du Projet

**MA CAISSE** est une application web moderne, légère et autonome de gestion commerciale destinée aux commerçants indépendants, petites boutiques, grossistes et entrepreneurs.

Elle permet de centraliser en un seul endroit :
- Le tableau de bord financier avec indicateurs clés (Solde, Chiffre d'affaires, Coût d'achat, Bénéfice brut, Charges d'exploitation, Bénéfice estimé, Taux de marge).
- La tenue de caisse (enregistrement des entrées et dépenses avec catégorisation).
- L'historique et le journal de trésorerie avec filtres et recherche.
- La gestion du catalogue de produits et des seuils d'alerte de stock.
- La caisse rapide (POS) avec décrémentation automatique du stock et contrôle strict anti-stock négatif.
- Le suivi des clients, des ventes à crédit et le recouvrement partiel ou total des dettes.
- La génération de graphiques interactifs (ventes, dépenses, top produits, répartition stock).
- L'exportation des données au format tableur Excel (.csv avec UTF-8 BOM).
- L'édition de rapports d'activité imprimables ou enregistrables en PDF (A4).
- La sauvegarde et restauration complète des données au format JSON.

---

## 2. Structure du Projet

```text
ma-caisse/
├── index.html         # Interface HTML5 complète, sémantique et responsive
├── manifest.json      # Manifeste PWA pour installation sur écran d'accueil
├── sw.js              # Service Worker pour fonctionnement 100% hors connexion
├── logo.svg           # Identité visuelle vectorielle
├── README.md          # Guide complet d'installation et de test
├── css/
│   └── style.css      # Design moderne SaaS, palette #4F46E5, responsive et styles d'impression
├── js/
│   ├── store.js       # Gestionnaire d'état, persistance LocalStorage et logique de calcul
│   ├── charts.js      # Moteur de graphiques SVG légers et interactifs
│   ├── exports.js     # Générateur d'exports Excel/CSV, PDF imprimable et sauvegardes JSON
│   └── app.js         # Contrôleur UI, modales, toasts, POS et validation
├── assets/
│   ├── logo.svg
│   ├── icon-192.png
│   └── icon-512.png
└── icons/
    ├── icon-192.png   # Icône PWA 192x192
    └── icon-512.png   # Icône PWA 512x512
```

---

## 3. Guide d'Installation et d'Utilisation

### Option A : Utilisation Locale Directe
1. Ouvrez simplement le fichier `index.html` dans n'importe quel navigateur moderne (Chrome, Edge, Firefox, Safari).
2. Au premier lancement, l'assistant de configuration vous invite à renseigner le nom de votre commerce, votre numéro et votre devise.
3. Vous pouvez également cliquer sur **"Charger les données de démonstration"** dans *Paramètres* pour explorer immédiatement toutes les fonctionnalités avec des produits (Riz, Huile, Sucre, Boissons, Savon) et des ventes de test.

### Option B : Déploiement en PWA (HTTPS)
Pour bénéficier des fonctionnalités PWA avancées (installation comme application autonome sur smartphone Android ou iPhone, et mise en cache automatique Service Worker) :
1. Téléversez le contenu du dossier `ma-caisse/` sur n'importe quel hébergement statique sécurisé (ex: Vercel, Netlify, GitHub Pages, Firebase Hosting, Cloudflare Pages ou serveur Apache/Nginx avec certificat SSL/TLS).
2. Vérifiez que `manifest.json` et `sw.js` sont servis avec les types MIME appropriés.
3. Sur **Android / Chrome** : Le bouton « 📲 Installer » apparaîtra dans la barre supérieure, ou utilisez le menu du navigateur → *Installer l'application*.
4. Sur **iPhone / Safari** : Touchez le bouton de partage (carré avec flèche) puis sélectionnez *Sur l'écran d'accueil*.

---

## 4. Règles de Gestion Commerciale

- **Règle 1 (Contrôle du stock) :** Une vente ne peut jamais dépasser la quantité disponible en stock. Tout dépassement est bloqué avec le message : *"Stock insuffisant. Quantité disponible : X"*.
- **Règle 2 (Décrémentation) :** Toute vente validée diminue immédiatement le stock du produit.
- **Règle 3 (Lien vente & trésorerie) :** Le montant encaissé lors de la vente génère automatiquement une opération financière d'entrée dans le journal de caisse.
- **Règle 4 (Formule du bénéfice produit) :** `(Prix de vente - Prix d'achat) × Quantité vendue`.
- **Règle 5 (Bénéfice brut) :** `Chiffre d'affaires - Coût d'achat des produits vendus`.
- **Règle 6 (Bénéfice estimé) :** `Bénéfice brut - Charges d'exploitation`.
- **Règle 7 (Alerte stock faible) :** Un produit passe en alerte dès que `Stock actuel ≤ Stock minimum`.
- **Règle 8 (Gestion des créances clients) :** Lorsqu'une vente est accordée à crédit ou partiellement payée, le solde restant est affecté à la dette du client. Lors d'un remboursement, la dette est diminuée et une entrée d'argent est enregistrée. La dette ne peut jamais être négative.
- **Règle 9 (Sauvegarde locale) :** Les données sont conservées en continu dans le `localStorage` du navigateur.

---

## 5. Cahier de Recette & Tests Fonctionnels (T01 - T20)

| Réf | Scénario | Résultat Attendu | Statut |
|---|---|---|---|
| **T01** | Première ouverture | Assistant de configuration affiché si aucune boutique n'est configurée | Conforme |
| **T02** | Créer un produit | Produit enregistré avec prix d'achat, prix de vente et seuils | Conforme |
| **T03** | Vendre une quantité disponible | Vente validée, stock diminué, recette enregistrée | Conforme |
| **T04** | Vendre au-delà du stock | Vente bloquée avec notification explicite de stock insuffisant | Conforme |
| **T05** | Calcul du bénéfice | Bénéfice brut et unitaire calculés selon les formules exactes | Conforme |
| **T06** | Alerte stock faible | Badge et alerte affichés quand stock ≤ stock minimum | Conforme |
| **T07** | Ajouter un client | Client créé et disponible dans le sélecteur de vente | Conforme |
| **T08** | Vente à crédit / dette | Dette affectée au client et suivie dans le tableau des dettes | Conforme |
| **T09** | Enregistrer un paiement dette | Dette diminuée et entrée financière enregistrée | Conforme |
| **T10** | Réapprovisionnement stock | Stock augmenté + dépense optionnelle créée | Conforme |
| **T11** | Filtrer l'historique | Filtres par type, catégorie et recherche textuelle | Conforme |
| **T12** | Exportation Excel (.csv) | Fichier UTF-8 avec séparateurs généré et téléchargé | Conforme |
| **T13** | Impression Rapport PDF | Mise en page A4 professionnelle prête à l'impression | Conforme |
| **T14** | Sauvegarde JSON | Fichier JSON horodaté complet exporté | Conforme |
| **T15** | Restauration JSON | Données rechargées avec validation de schéma | Conforme |
| **T16** | Ticket de caisse | Reçu détaillé généré à chaque vente avec option d'impression | Conforme |
| **T17** | Mode hors connexion | Application opérationnelle sans réseau via le Service Worker | Conforme |
| **T18** | Recherche globale | Recherche instantanée produits, clients, ventes (Ctrl+K) | Conforme |
| **T19** | Responsive Design | Interface adaptée de 390px (mobile) à 1920px (grand écran) | Conforme |
| **T20** | Persistance après actualisation | Toutes les données sont préservées au rechargement de page | Conforme |

---

*Projet réalisé sous l'égide de GASTON N3 — Version 1.4*
