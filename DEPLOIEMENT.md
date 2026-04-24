# 🚀 Guide de déploiement — Sojalim RDV
## Stack : HTML/CSS/JS + Supabase + GitHub Pages (100% gratuit)

---

## ÉTAPE 1 — Supabase (base de données)

1. Aller sur **https://supabase.com** → créer un compte gratuit
2. **New project** → nom : `sojalim-rdv` → région : **Europe West (Paris)**
3. Attendre ~2 min
4. **SQL Editor** → coller tout le contenu de `sql/schema.sql` → **Run**
5. **Project Settings > API** → copier :
   - `Project URL` → c'est `SUPABASE_URL`
   - `anon / public` key → c'est `SUPABASE_ANON_KEY`

---

## ÉTAPE 2 — Resend (emails)

1. **https://resend.com** → compte gratuit (3 000 emails/mois)
2. Créer une nouvelle API Key → copier la clé complète `re_XXXXXXXX`
3. Vérifier votre adresse email dans Resend (pour les tests sans domaine)

---

## ÉTAPE 3 — Configurer les fichiers JS

Ouvrir `js/config.js` et remplacer :

```js
const SUPABASE_URL      = 'https://VOTRE_PROJET.supabase.co';
const SUPABASE_ANON_KEY = 'votre_cle_anon_publique_ici';
const RESEND_API_KEY    = 'votre_cle_resend_ici';
const APP_URL           = 'https://VOTRE_USER.github.io/sojalim';
```

Remplacer `VOTRE_USER` par votre nom d'utilisateur GitHub.

---

## ÉTAPE 4 — GitHub Pages

1. Créer un compte sur **https://github.com**
2. **New repository** → nom : `sojalim` → Public
3. Uploader tous les fichiers (glisser-déposer ou git push)
4. **Settings > Pages** → Source : `main` branch → `/` (root) → **Save**
5. Votre site est disponible à : `https://VOTRE_USER.github.io/sojalim`

---

## ÉTAPE 5 — Première connexion

URL : `https://VOTRE_USER.github.io/sojalim/index.html`

```
👑 Admin     : admin@sojalim.fr    / Admin2024!
🚛 Transport : demo@transports.fr  / Demo2024!
```

**⚠️ Changer les mots de passe immédiatement après la première connexion !**

---

## Fonctionnement des rôles

### 👑 Admin (équipe Sojalim)
- Tableau de bord, planning, calendrier, recherche
- Gestion de tous les comptes
- Inviter des transporteurs par email
- Approuver/refuser les nouveaux comptes
- Fermetures exceptionnelles, statistiques, paramètres

### 🚛 Transporteur
- Prendre des RDV de chargement
- Voir ses propres RDV (+ ceux de ses chauffeurs)
- **Inviter ses chauffeurs** → onglet "Mes Chauffeurs"
- Gérer ses chauffeurs (activer/désactiver)

### 🚗 Chauffeur (rattaché à un transporteur)
- Prendre des RDV au nom de son transporteur
- Voir ses propres RDV
- Modifier son profil

---

## Structure des fichiers

```
sojalim/
├── index.html          ← Page d'accueil bilingue FR/ES + login/register
├── dashboard.html      ← Espace transporteur/chauffeur
├── admin.html          ← Interface admin complète
├── manifest.json       ← PWA (bouton "Installer l'app")
├── css/
│   └── app.css         ← Tous les styles
├── js/
│   ├── config.js       ← ⚠️ CONFIGURATION — modifier ici
│   ├── auth.js         ← Authentification + sessions
│   ├── email.js        ← Emails via Resend
│   └── rdv.js          ← Logique rendez-vous
├── sql/
│   └── schema.sql      ← Schéma base de données Supabase
└── img/                ← Icônes PWA (ajouter icon-192.png et icon-512.png)
```

---

## Coûts

| Service | Plan | Prix |
|---------|------|------|
| GitHub Pages | Free | 0 €/mois |
| Supabase | Free | 0 €/mois |
| Resend | Free | 0 €/mois |
| **Total** | | **0 €/mois** |

---

## En cas de problème

**Erreur CORS Supabase** : vérifier que la clé utilisée est bien `anon/public` (pas `service_role`)

**Mot de passe incorrect** : les mots de passe sont hashés en bcrypt via la fonction SQL `check_password`. Vérifier que le schéma SQL a bien été exécuté entièrement.

**Emails non reçus** : vérifier la clé Resend + regarder les spams. Sans domaine, seul votre email vérifié peut recevoir.

**Page blanche** : ouvrir la console du navigateur (F12) → onglet Console → identifier l'erreur JS.
