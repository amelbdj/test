# Dropa

Application mobile sociale basée sur une révélation hebdomadaire des contenus : chaque utilisateur publie des "Drops" (photo ou vidéo) qui restent floutés jusqu'à la révélation collective du **dimanche à 20h00 UTC**, moment où tous les Drops de la semaine deviennent visibles pour ses amis.

## Fonctionnalités

- Inscription / connexion (JWT)
- Profil (pseudo, bio, photo)
- Recherche d'utilisateurs, demandes d'amis, liste d'amis
- Création de Drops (photo ou vidéo), floutés jusqu'à la révélation
- Likes et commentaires (activés uniquement après révélation)
- Messagerie privée entre amis
- Notifications in-app et push (Expo Notifications)
- Calendrier des Drops personnels
- Résumé hebdomadaire et classement entre amis
- Streak quotidien, Streak Freezes, récompenses aux paliers
- Dark mode / light mode / système

## Stack technique

| Composant | Techno |
|---|---|
| Frontend | React Native, Expo (SDK 54), TypeScript, Expo Router |
| State management | Zustand |
| Backend | FastAPI (Python) |
| Base de données | MongoDB |
| Authentification | JWT |
| Stockage médias | ImageKit (avec repli automatique en local/base64 si non configuré) |
| Notifications | Expo Notifications |
| Animations | React Native Reanimated |

## Structure du projet

```
backend/    API FastAPI (server.py), tests (test_server.py)
frontend/   App Expo Router (React Native + Web)
render.yaml Configuration de déploiement backend (Render)
AUDIT_DROPA.md  Rapport d'audit complet (sécurité, tests, checklist bêta)
```

## Démarrage local

### Backend

```bash
cd backend
python -m venv venv
./venv/Scripts/activate        # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
```

Créer `backend/.env` :

```
MONGO_URL=mongodb+srv://...         # instance MongoDB (Atlas ou locale)
DB_NAME=dropa_db
JWT_SECRET=une-cle-secrete-longue-et-aleatoire
IMAGEKIT_PRIVATE_KEY=               # optionnel
IMAGEKIT_PUBLIC_KEY=                # optionnel
IMAGEKIT_URL_ENDPOINT=              # optionnel
```

Lancer le serveur :

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
```

Créer `frontend/.env.local` :

```
EXPO_PUBLIC_BACKEND_URL=http://<ip-ou-domaine-du-backend>:8000
```

Lancer :

```bash
npm run web       # navigateur
npx expo start     # QR code pour Expo Go (iOS/Android)
```

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest test_server.py -v
```

La suite de tests tourne contre une base MongoDB en mémoire (`mongomock`), sans nécessiter d'instance MongoDB réelle. `run_mock_server.py` permet de lancer le vrai serveur FastAPI contre cette base en mémoire pour des tests manuels sans dépendance MongoDB.

## Déploiement

- **Backend** : `render.yaml` à la racine configure un déploiement [Render](https://render.com) (Blueprint). Variables à renseigner dans le dashboard Render : `MONGO_URL`, et optionnellement les clés ImageKit.
- **Base de données** : [MongoDB Atlas](https://www.mongodb.com/atlas) (tier gratuit suffisant pour démarrer).
- **Mobile** : publication via [EAS Update](https://docs.expo.dev/eas-update/introduction/) pour un accès permanent depuis Expo Go, sans dépendre d'un serveur de développement local.

## Audit

Un audit complet du projet (sécurité, tests fonctionnels, performances, checklist avant bêta) est disponible dans [`AUDIT_DROPA.md`](AUDIT_DROPA.md).
