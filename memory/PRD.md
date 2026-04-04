# Dropa - Application Sociale avec Révélation Hebdomadaire

## Vue d'ensemble
Dropa est une application sociale mobile où les utilisateurs partagent des photos/vidéos qui restent floutées jusqu'à la révélation collective chaque dimanche à 20h.

## Fonctionnalités implémentées

### Phase 1: Authentification & Profil
- [x] Inscription (email/mot de passe)
- [x] Connexion JWT
- [x] Profil utilisateur (bio, photo, streak)
- [x] Modification du profil

### Phase 2: Système d'amis
- [x] Recherche d'utilisateurs
- [x] Envoi de demandes d'amis
- [x] Acceptation/Refus de demandes
- [x] Liste d'amis
- [x] Suppression d'amis

### Phase 3: Drops & Révélation
- [x] Création de Drop (photo + description)
- [x] Système de floutage avant révélation
- [x] Révélation automatique dimanche 20h UTC
- [x] Feed des Drops des amis

### Phase 4: Interactions
- [x] Système de likes
- [x] Commentaires sur les Drops révélés
- [x] Système de streak (🔥)

### Phase 5: Messagerie
- [x] Conversations privées entre amis
- [x] Envoi de messages
- [x] Polling pour nouvelles messages (5s)

### Phase 6: Notifications & UI
- [x] Notifications in-app
- [x] Dark/Light mode
- [x] Thème automatique (système)

## Stack technique
- Frontend: Expo + React Native + TypeScript
- Backend: FastAPI + Python
- Base de données: MongoDB
- Authentification: JWT
- Stockage médias: Base64 dans MongoDB

## API Endpoints

### Auth
- POST /api/auth/register - Inscription
- POST /api/auth/login - Connexion
- GET /api/auth/me - Profil courant

### Profile
- PUT /api/profile - Modifier profil
- GET /api/profile/{user_id} - Voir profil

### Friends
- GET /api/users/search?q=query - Recherche
- POST /api/friends/request/{user_id} - Demande d'ami
- GET /api/friends/requests - Demandes reçues
- POST /api/friends/accept/{request_id} - Accepter
- POST /api/friends/reject/{request_id} - Refuser
- GET /api/friends - Liste d'amis
- DELETE /api/friends/{friend_id} - Supprimer

### Drops
- POST /api/drops - Créer Drop
- GET /api/drops/feed - Feed
- GET /api/drops/user/{user_id} - Drops d'un utilisateur
- POST /api/drops/{drop_id}/like - Like/Unlike

### Comments
- GET /api/drops/{drop_id}/comments - Liste commentaires
- POST /api/drops/{drop_id}/comments - Ajouter commentaire

### Messages
- GET /api/conversations - Liste conversations
- POST /api/conversations/{friend_id} - Créer/obtenir conversation
- GET /api/conversations/{id}/messages - Messages
- POST /api/conversations/{id}/messages - Envoyer message

### Notifications
- GET /api/notifications - Liste notifications
- POST /api/notifications/read - Marquer comme lues
- GET /api/notifications/unread-count - Compteur non lus

### Reveal
- GET /api/reveal/status - Statut de la révélation
