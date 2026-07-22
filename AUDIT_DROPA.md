# Audit Dropa — Rapport complet

Date de l'audit : 2026-07-12
Branche auditée : `dropa`

---

## A. Résumé général

**État global du projet : bon, avec plusieurs failles de sécurité réelles corrigées pendant cet audit.**

Le code métier (auth, amis, drops, reveal, streak, messagerie) est globalement bien conçu et cohérent entre frontend et backend. La logique de révélation hebdomadaire est solide et correctement vérifiée côté serveur (voir section C). En revanche, l'audit a mis au jour plusieurs failles concrètes et un bug bloquant au démarrage qui auraient empêché un déploiement propre.

- **Niveau de stabilité** : correct après corrections. Le backend démarre, répond, et 60 tests automatisés passent. Le frontend compile sans erreur TypeScript et sans erreur ESLint.
- **Possibilité de lancer une bêta** : **oui, avec les corrections mineures restantes traitées** (voir section M pour la justification complète).
- **Principaux risques avant corrections** :
  1. Le backend ne démarrait pas du tout sur une installation propre (`email-validator` manquant) — **bloquant**.
  2. Fuite de l'email de n'importe quel utilisateur via `GET /api/profile/{id}` — **critique**.
  3. Traversée de répertoire sur `GET /api/media/{filename}` — **critique**.
  4. Récompenses de streak (Streak Freezes) attribuables en double sous concurrence — **majeur**.
  5. Fichiers utilisateurs (photos uploadées) committés dans l'historique Git — **majeur** (résiduel, voir section G).

Tous les points 1 à 4 ont été corrigés et vérifiés par des tests automatisés réels (pas seulement une relecture de code).

---

## B. Environnement testé

- **Système** : Windows 11 (10.0.26200), shell Git Bash / PowerShell.
- **Node.js** : v22.16.0
- **Python** : 3.13.3
- **FastAPI** : 0.139.0 (installé depuis `requirements.txt` dans un venv dédié `backend/venv`)
- **pymongo** : 4.17.0 / **motor** : 3.7.1
- **Expo** : `^55.0.17` (déclaré dans `frontend/package.json`), React Native `0.83.6`, React `19.2.0`
- **MongoDB réel** : **non disponible**. Docker Desktop est installé sur la machine mais son démon (`dockerDesktopLinuxEngine`) n'a pas pu démarrer dans cet environnement sandboxé (WSL2/Hyper-V non accessible). `mongod` n'est pas installé nativement.

### Limite importante de l'environnement de test

En l'absence de MongoDB réel, les tests automatisés (`backend/test_server.py`) tournent contre **`mongomock_motor`**, un mock in-memory qui reproduit fidèlement le langage de requête MongoDB (find, update_one avec opérateurs `$ne`/`$addToSet`/`$inc`/`$push`, index uniques, etc.). Cela m'a permis de tester réellement toute la logique métier (auth, amis, drops, reveal, streak, messagerie) via de vraies requêtes HTTP contre l'application FastAPI réelle — mais **ce n'est pas un substitut à un smoke test final contre une vraie instance MongoDB** avant la bêta (comportements spécifiques à la réplication, aux vrais index, aux timeouts réseau non couverts).

Pour la vérification manuelle en navigateur, j'ai lancé le frontend (Expo web) via le serveur de preview, et un backend réel (`backend/run_mock_server.py`, uvicorn + mongomock) exposé sur `http://127.0.0.1:8010`, pointé depuis le frontend via `EXPO_PUBLIC_BACKEND_URL`. Ceci a permis un test bout-en-bout réel (inscription → JWT → feed → écran de création → écran amis), capturé dans les logs réseau du navigateur.

**Commandes exécutées :**
```
python -m venv backend/venv
backend/venv/Scripts/python.exe -m pip install -r backend/requirements.txt
backend/venv/Scripts/python.exe -m pip install mongomock mongomock_motor httpx pytest-asyncio freezegun email-validator
backend/venv/Scripts/python.exe -m pytest backend/test_server.py -v
cd frontend && npx tsc --noEmit
cd frontend && npx eslint .
npm --prefix frontend run web   (via l'outil de preview)
```

**Variables d'environnement nécessaires en production (backend/.env, non commité) :**
`MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL_ENDPOINT`.
Aucun de ces secrets n'est présent en dur dans le code ; aucun fichier `.env` n'est suivi par Git (vérifié via `git grep` et `.gitignore`).

**Tests explicitement impossibles à réaliser dans cet environnement :**
- Connexion à une vraie instance MongoDB (Docker indisponible).
- Upload réel vers ImageKit (pas de clés de test fournies ; le code bascule automatiquement en stockage local/base64 en leur absence, ce qui a été testé).
- Prise de photo/vidéo caméra réelle, permissions push sur appareil physique, réception de notification en arrière-plan (nécessite un appareil iOS/Android réel).
- Build Android (`.apk`/`.aab`) ou iOS (`.ipa`) — nécessite EAS Build / Xcode, non disponible ici.
- Changement d'heure été/hiver en conditions réelles (simulé via `freezegun`, voir section C).

---

## C. Ce qui fonctionne correctement

| Fonctionnalité | Testé via | Résultat | Fichiers |
|---|---|---|---|
| Inscription (cas valide, email dupliqué, pseudo dupliqué, mot de passe court, pseudo court) | 5 tests pytest + 1 test navigateur réel (inscription `testeuse@example.com` → JWT reçu → redirection feed) | ✅ | `backend/server.py` (`/auth/register`), `frontend/app/(auth)/register.tsx` |
| Connexion (valide, mauvais mot de passe, email inconnu) | 3 tests pytest | ✅ | `backend/server.py` (`/auth/login`) |
| Route protégée sans token / token invalide / expiré / signature falsifiée | 4 tests pytest (JWT forgé avec `freezegun`/mauvaise clé) | ✅ | `get_current_user` |
| Mise à jour du profil (pseudo, bio, longueur bio) | 3 tests pytest | ✅ | `/profile` PUT |
| Confidentialité du profil (email non exposé à un tiers) | 2 tests pytest (ajouté après correction, voir section F) | ✅ (après fix) | `/profile/{id}` |
| Recherche d'utilisateurs + non-vulnérabilité aux métacaractères regex | 2 tests pytest | ✅ (après fix) | `/users/search` |
| Demandes d'amis (envoi, doublon, auto-demande interdite, acceptation bidirectionnelle, refus) | 5 tests pytest + navigateur réel (écran Amis, onglets Amis/Demandes/Rechercher, état vide correct) | ✅ | `/friends/*` |
| Interdiction de voir les Drops d'un non-ami | 1 test pytest | ✅ | `/drops/user/{id}` |
| Création de Drop (image base64, vidéo via media_url, refus sans média) | 3 tests pytest + navigateur réel (écran Créer un Drop, bouton "Sélectionnez un media" désactivé tant qu'aucun média n'est choisi) | ✅ | `/drops` POST |
| Feed : masquage du média avant révélation, affichage après | 1 test pytest (bascule directe de `reveal_date` en base) | ✅ | `/drops/feed` |
| Likes (bloqué avant révélation, toggle like/unlike après) | 2 tests pytest | ✅ | `/drops/{id}/like` |
| Commentaires (bloqué avant révélation, vide refusé, trop long refusé, accepté après révélation) | 4 tests pytest | ✅ (après fix pour vide/trop long) | `/drops/{id}/comments` |
| Messagerie (conversation refusée entre non-amis, envoi/ordre des messages, message vide refusé) | 3 tests pytest | ✅ | `/conversations/*` |
| **Révélation hebdomadaire — dimanche 20h00 UTC exactement** (voir détail ci-dessous) | 5 tests pytest avec `freezegun` | ✅ | `get_next_reveal_date`, `is_revealed` |
| Streak : premier Drop, jours consécutifs, plusieurs Drops le même jour (pas de double comptage), remise à zéro après un jour manqué, `max_streak` préservé après reset | 5 tests pytest | ✅ | `/drops` POST (logique de streak) |
| Milestones de streak : attribution unique, non ré-attribution, **non ré-attribution sous concurrence simulée** (`asyncio.gather`) | 3 tests pytest (dont un test de vraie concurrence) | ✅ (après fix, voir F) | `/drops` POST |
| Streak Freeze (refus si 0 disponible, utilisation si disponible) | 2 tests pytest | ✅ | `/streak/freeze` |
| Résumé hebdomadaire (aucune activité, avec un Drop) | 2 tests pytest | ✅ | `/weekly-summary` |
| Notifications (demande d'ami crée une notification, compteur non lu, marquage lu) | 1 test pytest | ✅ | `/notifications/*` |
| Sécurité média : traversée de répertoire bloquée, fichier inconnu → 404 propre | 2 tests pytest | ✅ (après fix) | `/media/{filename}` |
| Upload : type de fichier interdit rejeté (ex. `.exe`) | 1 test pytest | ✅ | `/upload/media` |
| TypeScript frontend | `npx tsc --noEmit` | ✅ 0 erreur | tout `frontend/` |
| ESLint frontend | `npx eslint .` | ✅ 0 erreur (58 avertissements mineurs restants) | tout `frontend/` |
| Rendu réel du feed, écran de création, écran Amis en navigateur | Capture d'écran + logs réseau réels via le serveur de preview | ✅ | voir section détaillée reveal ci-dessous |

### Détail : Révélation hebdomadaire (priorité de l'audit)

`get_next_reveal_date()` a été testé avec `freezegun` sur les cas limites suivants (tous ✅) :
- Lundi midi UTC → prochain dimanche 20:00:00 UTC.
- Dimanche 19:59:59 UTC → révélation le jour même à 20:00 UTC.
- Dimanche 20:00:00 UTC pile → bascule sur le dimanche **suivant** (7 jours plus tard), pas le jour même.
- Dimanche 20:00:01 UTC → idem, semaine suivante.
- Autour du changement d'heure d'été/hiver européen (`2026-10-25`) → l'heure de révélation reste **20:00 UTC fixe**, insensible au DST (c'est le design voulu : 21h/22h heure française selon la saison, documenté dans la mémoire du projet).

Le verrouillage est vérifié **côté backend, pas seulement visuellement** : `GET /drops/feed` et `GET /drops/user/{id}` ne renvoient `media_data`/`media_url`/`description` que si `is_revealed(reveal_date)` est vrai côté serveur — le champ est `''`/`null` dans la réponse JSON tant que non révélé, donc un utilisateur ne peut pas contourner le flou en modifiant l'état local du client (vérifié par lecture de code + test automatisé `test_feed_hides_media_before_reveal_and_shows_after`). Le like et le commentaire sont eux aussi bloqués côté serveur avant révélation (400 renvoyé), pas seulement désactivés dans l'UI.

---

## D. Ce qui fonctionne partiellement

| Élément | Comportement actuel | Comportement attendu | Impact utilisateur | Correction |
|---|---|---|---|---|
| URL média après révélation | Une fois révélée, l'URL ImageKit du Drop n'a ni expiration ni signature (URL directe permanente) | Idéalement une URL signée à expiration pour les médias sensibles | Faible : un ami qui a déjà vu le Drop révélé pourrait partager le lien brut après coup | Non corrigé — nécessiterait de changer la stratégie ImageKit (URLs privées + signature), hors du périmètre "ne pas ajouter de fonctionnalité". Recommandation notée en section H. |
| Écran `drop/[id].tsx` | Récupère **tout le feed** (`GET /drops/feed`, jusqu'à 50 items) puis cherche le Drop par id côté client, au lieu d'un endpoint dédié `GET /drops/{id}` (qui n'existe pas) | Un appel ciblé serait plus efficace | Faible : surcoût réseau mineur, pas de bug fonctionnel (le feed inclut toujours amis + soi-même, cohérent avec les règles de confidentialité) | Non corrigé (amélioration de performance, pas un bug ; changer l'API serait un changement plus large que le périmètre de cet audit) |
| Route `frontend/app/messages.tsx` (standalone) | Coexiste avec `frontend/app/(tabs)/messages.tsx` (l'onglet réel). Aucune référence trouvée vers la route `/messages` autonome dans tout le code (recherché dans `app/` et `src/`) — semble être du code mort | Un seul écran de messagerie | Aucun (l'onglet fonctionne correctement, vérifié en navigateur réel) | Non supprimé par prudence (voir section G) |
| 58 avertissements ESLint restants (`react-hooks/exhaustive-deps`, imports inutilisés) | Le code fonctionne correctement malgré ces avertissements | Un lint totalement propre | Aucun impact utilisateur direct | Non corrigés (périmètre : uniquement les 7 erreurs bloquantes ont été traitées) |

---

## E. Ce qui ne fonctionne pas (avant corrections de cet audit)

Tous les éléments ci-dessous ont été **corrigés** pendant cet audit (voir section F pour le détail des correctifs). Ils sont documentés ici tels qu'observés **avant correction**, avec preuve de reproduction.

### E1. Le backend ne démarre pas sur une installation propre
- **Reproduction** : `pip install -r backend/requirements.txt` puis importer `server.py` (ou lancer `pytest`).
- **Résultat obtenu** : `ImportError: email-validator is not installed, run 'pip install pydantic[email]'` — crash immédiat à l'import, avant même de pouvoir démarrer uvicorn. Reproduit deux fois de façon déterministe dans un venv propre.
- **Résultat attendu** : démarrage normal.
- **Gravité** : **Bloquant**.
- **Cause** : `pydantic.EmailStr` (utilisé dans `UserCreate`/`UserLogin`) nécessite le paquet `email-validator`, absent de `requirements.txt`.
- **Fichiers** : `backend/requirements.txt`.

### E2. Fuite de l'email de n'importe quel utilisateur
- **Reproduction** : utilisateur A authentifié appelle `GET /api/profile/{id_de_B}`.
- **Résultat obtenu** : la réponse contenait `"email": "b@example.com"` — l'email complet de B, sans aucune restriction d'amitié.
- **Résultat attendu** : l'email d'un tiers ne doit jamais être exposé à un autre utilisateur.
- **Gravité** : **Critique** (fuite de donnée personnelle).
- **Cause** : `build_user_profile()` renvoie toujours `user['email']` sans distinguer "son propre profil" de "profil d'un tiers", et l'endpoint `get_profile` ne filtre pas ce champ.
- **Fichiers** : `backend/server.py` (`get_profile`, `build_user_profile`).

### E3. Traversée de répertoire sur le service de fichiers médias
- **Reproduction** : appel direct de la fonction `serve_media(".."`) ou `serve_media("../server.py")` (le endpoint HTTP normalise `..` côté client avant envoi avec certains clients, mais un client non conforme ou un proxy mal configuré pourrait transmettre le segment brut).
- **Résultat obtenu** : `MEDIA_DIR / filename` était utilisé sans aucune validation ; un nom de fichier contenant `..` pouvait sortir du dossier `media/` prévu.
- **Résultat attendu** : rejet (400) de tout nom de fichier suspect.
- **Gravité** : **Critique**.
- **Cause** : absence de validation/normalisation du paramètre `filename` avant construction du chemin.
- **Fichiers** : `backend/server.py` (`serve_media`).

### E4. Injection regex dans la recherche d'utilisateurs
- **Reproduction** : `GET /api/users/search?q=(a+)+$` (métacaractères regex catastrophiques).
- **Résultat obtenu** : la chaîne `q` était injectée telle quelle dans `{'$regex': q.lower()}` sans échappement — risque de ReDoS ou de comportement de correspondance imprévisible.
- **Résultat attendu** : traitement de `q` comme texte littéral.
- **Gravité** : **Majeur**.
- **Fichiers** : `backend/server.py` (`search_users`).

### E5. Un ID malformé provoque une erreur 500 au lieu de 400
- **Reproduction** : `GET /api/profile/not-an-object-id` (ou tout autre endpoint acceptant un id MongoDB en paramètre de chemin : demandes d'amis, drops, commentaires, conversations, messages).
- **Résultat obtenu** : `bson.errors.InvalidId` non intercepté → erreur serveur 500.
- **Résultat attendu** : 400 Bad Request propre.
- **Gravité** : **Majeur** (stabilité + risque d'information de diagnostic exposée en 500).
- **Fichiers** : `backend/server.py` (une dizaine d'endpoints).

### E6. Récompense de streak attribuable en double sous concurrence
- **Reproduction (simulée)** : deux requêtes concurrentes (`asyncio.gather`) déclenchant l'attribution du même milestone pour le même utilisateur.
- **Résultat obtenu (avant fix)** : le code lisait `awarded_milestones` une fois en mémoire (issu du token/utilisateur chargé en début de requête) puis écrivait sans condition atomique — deux requêtes simultanées pouvaient toutes les deux passer le test `not in awarded_milestones` et attribuer chacune la récompense, doublant les Streak Freezes gagnés.
- **Résultat attendu** : une récompense ne doit être attribuée qu'une seule fois, même sous concurrence.
- **Gravité** : **Majeur** (intégrité des données / abus possible).
- **Fichiers** : `backend/server.py` (`create_drop`, bloc d'attribution des milestones).

### E7. Création de Drop possible sans aucun média
- **Reproduction** : `POST /api/drops` avec `{"media_type": "image"}` (ni `media_data` ni `media_url`).
- **Résultat obtenu (avant fix)** : 200 OK, un Drop "fantôme" sans contenu était créé et apparaissait dans le feed.
- **Résultat attendu** : rejet.
- **Gravité** : **Majeur**.
- **Fichiers** : `backend/server.py` (modèle `DropCreate`).

### E8. Commentaires/messages vides ou démesurés acceptés
- **Reproduction** : `POST /api/drops/{id}/comments` avec `{"content": "   "}` ou une chaîne de 10 000 caractères.
- **Résultat obtenu (avant fix)** : accepté sans validation.
- **Résultat attendu** : rejet (contenu vide après trim, ou dépassement d'une longueur raisonnable).
- **Gravité** : **Mineur**.
- **Fichiers** : `backend/server.py` (`CommentCreate`, `MessageCreate`).

### E9. Fichiers utilisateurs committés dans Git
- **Reproduction** : `git ls-files backend/media` renvoie 3 fichiers `.jpg` réellement suivis par Git.
- **Résultat obtenu** : du contenu potentiellement uploadé par un utilisateur (chemin de repli local du système d'upload) se retrouve versionné dans l'historique du dépôt.
- **Résultat attendu** : `backend/media/` ne doit jamais être suivi par Git (seul un `.gitkeep` pour préserver le dossier).
- **Gravité** : **Majeur** (fuite de contenu utilisateur potentielle si le dépôt est partagé/public), mais résiduel — voir section G, l'historique Git existant n'a pas été réécrit.
- **Fichiers** : `backend/media/*.jpg`, absence de `backend/.gitignore`.

### E10. 7 erreurs ESLint bloquantes
- **Reproduction** : `npx eslint .` dans `frontend/`.
- **Résultat obtenu (avant fix)** : 7 erreurs `react/no-unescaped-entities` (apostrophes françaises non échappées) dans `login.tsx`, `create.tsx` (x2), `drop/[id].tsx`, `streak.tsx`, `RevealAnimation.tsx` (x2).
- **Gravité** : **Mineur**.

---

## F. Corrections effectuées

| ID | Gravité | Fichier modifié | Correction appliquée | Test ajouté/exécuté | Statut |
|---|---|---|---|---|---|
| E1 | Bloquant | `backend/requirements.txt` | Ajout de `email-validator` ; nettoyage des dépendances inutilisées (`openai`, `google-genai`, `google-generativeai`, `boto3`, `stripe`, `python-jose`, `passlib`, `websockets`, `huggingface_hub`, `litellm`, `requests` — aucune n'est importée dans `server.py`) ; création de `backend/requirements-dev.txt` pour les outils de test | Installation propre + collecte pytest réussie | ✅ Corrigé |
| E2 | Critique | `backend/server.py` (`get_profile`) | L'email est vidé (`""`) dans la réponse quand le profil consulté n'est pas celui de l'appelant | `test_get_profile_others_email_hidden`, `test_get_profile_own_email_visible` | ✅ Corrigé |
| E3 | Critique | `backend/server.py` (`serve_media`) | Rejet des noms de fichiers contenant `/`, `\`, `..`, ou dont le chemin résolu sort de `MEDIA_DIR` | `test_media_path_traversal_blocked` (4 variantes testées en appelant directement le handler) | ✅ Corrigé |
| E4 | Majeur | `backend/server.py` (`search_users`) | `re.escape(q.lower())` avant construction de la regex Mongo | `test_search_users_regex_injection_safe` | ✅ Corrigé |
| E5 | Majeur | `backend/server.py` (nouvelle fonction `parse_object_id`, appliquée à ~10 endpoints) | Capture de `InvalidId`/`TypeError` → `HTTPException(400)` au lieu d'un crash 500 | `test_get_profile_invalid_id_400_not_500`, `test_conversation_invalid_id_400` | ✅ Corrigé |
| E6 | Majeur | `backend/server.py` (bloc milestones dans `create_drop`) | `update_one` atomique avec filtre `awarded_milestones: {'$ne': jour}` — MongoDB garantit l'atomicité par document, donc une seule requête concurrente peut réussir | `test_milestone_awarded_exactly_once`, `test_milestone_race_condition_only_awards_once` (concurrence réelle simulée via `asyncio.gather`) | ✅ Corrigé |
| E7 | Majeur | `backend/server.py` (`DropCreate`, `model_validator`) | Rejet (422) si `media_data` et `media_url` sont tous deux vides | `test_create_drop_requires_media` | ✅ Corrigé |
| E8 | Mineur | `backend/server.py` (`CommentCreate`, `MessageCreate`, `UserProfileUpdate`, `UserCreate`, `DropCreate`) | Contraintes `min_length`/`max_length` + validateur anti-blanc (`content.strip()`) | `test_comment_blank_rejected`, `test_comment_too_long_rejected`, `test_message_blank_rejected`, `test_update_profile_bio_too_long_rejected`, `test_register_short_password_rejected`, `test_register_short_username_rejected` | ✅ Corrigé |
| E9 | Majeur (résiduel) | `backend/.gitignore` (nouveau), `backend/media/*.jpg` | `git rm --cached` sur les 3 fichiers (conservés sur disque, retirés du prochain commit) + `.gitignore` pour empêcher toute récidive + `.gitkeep` pour préserver le dossier | Vérification manuelle `git ls-files` | 🟡 Corrigé pour l'avenir — historique existant non nettoyé (voir section G) |
| E10 | Mineur | 4 fichiers frontend (`login.tsx`, `create.tsx`, `drop/[id].tsx`, `streak.tsx`, `RevealAnimation.tsx`) | Remplacement des apostrophes droites par `&apos;` | `npx eslint .` → 0 erreur | ✅ Corrigé |
| — | Amélioration | `backend/server.py` (nouvel événement `startup`) | Création d'index MongoDB (unicité email/username + index de performance sur drops, messages, notifications, friend_requests, conversations) | Vérifié via `create_indexes()` exécuté dans la fixture de test | ✅ Ajouté |
| — | Cohérence | `backend/server.py` (`UserCreate.password`) | Minimum aligné à 6 caractères (au lieu des 8 initialement posés par erreur) pour correspondre exactement au texte affiché par le frontend ("Min. 6 caractères") — évite un nouveau bug de désaccord frontend/backend | Détecté et corrigé pendant le test navigateur réel du formulaire d'inscription | ✅ Corrigé |

**Bilan des tests après corrections : 60/60 tests automatisés passent** (`backend/test_server.py`, exécuté avec `pytest`).

---

## G. Problèmes non corrigés

| Problème | Raison de non-correction | Risque | Solution recommandée | Dépendance externe |
|---|---|---|---|---|
| Historique Git contenant déjà 3 fichiers médias utilisateur | Réécrire l'historique Git (`git filter-repo`/BFG) est une opération destructive qui réécrit les hash de commits partagés — nécessite une décision et une fenêtre de maintenance explicites du côté utilisateur, pas prise unilatéralement pendant un audit | Faible à modéré (contenu déjà potentiellement exposé si le dépôt est/devient public) | Exécuter `git filter-repo --path backend/media --invert-paths` (ou BFG Repo-Cleaner) puis forcer la synchronisation de toutes les copies du dépôt, en coordination avec l'équipe | Aucune, mais destructif — nécessite l'accord explicite de l'utilisateur |
| Pas de test contre une vraie instance MongoDB | Docker Desktop n'a pas pu démarrer dans ce sandbox (service `dockerDesktopLinuxEngine` inaccessible) ; pas de `mongod` natif disponible | Un comportement spécifique à un vrai serveur MongoDB (latence réseau, comportement exact d'un index unique en cas de conflit, réplication) pourrait différer du mock | Lancer `docker compose up mongo` (ou équivalent) et rejouer `backend/test_server.py` en pointant `MONGO_URL` vers l'instance réelle avant la mise en bêta | Docker/MongoDB réel disponible |
| URL média ImageKit non signée/sans expiration après révélation | Changer la stratégie de stockage (fichiers privés + URL signées) est un changement d'architecture, hors périmètre "corriger sans ajouter de fonctionnalité" | Faible : un ami qui a vu le Drop révélé pourrait partager l'URL brute après coup | Activer les "signed URLs" ImageKit avec expiration si le niveau de confidentialité doit être renforcé | Configuration ImageKit (plan payant requis pour les URLs signées selon leur offre) |
| Fichier `frontend/app/messages.tsx` potentiellement mort (aucune référence trouvée) | Suppression non effectuée par prudence — pas de certitude à 100 % qu'aucun deep link externe (ancienne version de l'app déjà installée) ne pointe encore vers `/messages` | Négligeable (redondance de code, pas un bug) | Confirmer l'absence de dépendance puis supprimer le fichier dans un commit dédié | Aucune |
| 58 avertissements ESLint restants (`react-hooks/exhaustive-deps`, imports inutilisés) | Hors périmètre de cet audit (ce ne sont pas des erreurs, et les corriger tous impliquerait de nombreux changements de comportement de re-render à valider un par un) | Faible (qualité de code, pas de bug observé) | Traiter progressivement, écran par écran, avec tests de non-régression visuels | Aucune |
| Upload réel vers ImageKit non testé bout-en-bout | Pas de clés ImageKit de test fournies dans cet environnement | Le chemin de repli (stockage local / base64) fonctionne et a été testé ; le chemin ImageKit lui-même n'a pas pu être exercé avec de vraies clés | Tester manuellement avec de vraies clés ImageKit de test avant la bêta | Clés API ImageKit de test |
| Notifications push sur appareil physique, permissions refusées, deep linking réel | Nécessite un appareil iOS/Android physique ou un simulateur avec Expo Go | Comportement du hook `usePushNotifications.ts` vérifié par lecture de code uniquement (gestion de permissions, canaux Android, haptics) | Test manuel sur appareil physique avant la bêta | Appareil physique / EAS Build |
| Builds Android/iOS | Nécessite EAS Build (compte Expo) ou Xcode/Android Studio, indisponibles dans ce sandbox | — | Lancer `eas build` pour les deux plateformes avant la bêta | Compte Expo EAS |

---

## H. Sécurité

### Problèmes détectés et corrigés
- Fuite d'email d'un tiers (E2) — corrigé.
- Traversée de répertoire sur le service de médias (E3) — corrigé.
- Injection regex / ReDoS potentiel dans la recherche (E4) — corrigé.
- Erreurs 500 non gérées sur IDs malformés, pouvant exposer des détails d'implémentation (E5) — corrigé.
- Absence d'unicité au niveau base de données sur email/username, ouvrant une fenêtre de race condition à l'inscription (partie de E6/E1) — corrigé par ajout d'index uniques + gestion de `DuplicateKeyError`.
- Fichiers utilisateurs versionnés dans Git (E9) — corrigé pour l'avenir, résiduel dans l'historique (voir G).

### Vérifications effectuées sans anomalie trouvée
- **Mots de passe** : hashés avec `bcrypt` (jamais stockés en clair, jamais renvoyés dans une réponse API). ✅
- **JWT** : signé HS256, expiration à 7 jours, validé (signature falsifiée, token expiré, token invalide → tous rejetés avec 401, testé). Le secret par défaut (`dropa-super-secret-key-change-in-production`) n'est qu'un filet de sécurité de développement — **aucun `.env` n'est commité dans le dépôt** (vérifié). ⚠️ Recommandation : confirmer explicitement qu'une valeur `JWT_SECRET` forte et unique est bien positionnée dans les variables d'environnement de production (Render ou autre) avant la bêta.
- **Contrôle d'accès** : vérifié sur les endpoints clés — un non-ami ne peut pas voir les Drops d'un autre utilisateur (403, testé), ne peut pas lui envoyer de message (403, testé) ; les likes/commentaires sont bloqués avant révélation même en appelant l'API directement (testé).
- **CORS** : `allow_origins=["*"]` avec `allow_credentials=False` — configuration intentionnelle et documentée dans le code (authentification par Bearer token, pas par cookie, donc pas de risque CSRF classique). Recommandation : restreindre aux domaines connus avant la bêta publique, par défense en profondeur.
- **Clés ImageKit** : jamais exposées côté frontend (uniquement lues via variables d'environnement côté backend) ; jamais loguées.
- **Logs** : aucun mot de passe, token, ou email loggé (vérifié par recherche exhaustive de tous les appels `logger.*`).
- **Endpoints de debug** : aucun endpoint de debug/admin exposé trouvé.
- **Taille des uploads** : plafond de 50 Mo appliqué côté backend (`/upload/media`) — vérifié par lecture de code ; le test d'un fichier de 50 Mo+ réel n'a pas été exécuté (trop coûteux dans ce contexte), mais la logique (`if len(file_content) > max_size`) est simple et non ambiguë.
- **Rate limiting** : absent sur l'ensemble de l'API (aucun endpoint n'a de limitation de débit). Pas un problème bloquant pour une bêta fermée à effectif limité, mais **recommandé avant une ouverture publique** (ex. sur `/auth/login` pour limiter le bruteforce, sur `/auth/register` pour limiter le spam de comptes).

### Secrets à révoquer
Aucun secret n'a été trouvé exposé dans le code ou l'historique Git pendant cet audit (vérifié par `git grep` sur les motifs `IMAGEKIT_PRIVATE_KEY`, `SECRET_KEY`, chaînes de connexion Mongo avec identifiants, clés `sk_`). **Aucune révocation n'est donc nécessaire** sur la base de ce qui a été trouvé. Si l'utilisateur sait qu'un secret a été partagé par un autre canal (capture d'écran, message), il doit être révoqué indépendamment de cet audit.

### Recommandations avant publication
1. Confirmer un `JWT_SECRET` fort et unique en production.
2. Activer un rate limiting basique sur `/auth/login` et `/auth/register`.
3. Restreindre `allow_origins` CORS aux domaines réels de production.
4. Nettoyer l'historique Git des fichiers médias déjà committés (E9, voir section G).
5. Envisager des URLs ImageKit signées si le niveau de confidentialité des Drops doit être renforcé au-delà de la fenêtre de révélation.

---

## I. Performances

### Problèmes détectés
- **Index MongoDB manquants** sur les collections les plus interrogées (`users.email`, `users.username`, `drops.user_id`+`created_at`, `messages.conversation_id`, `notifications.user_id`+`created_at`, `friend_requests`, `conversations.participants`) — chaque requête faisait un scan complet de collection.
- **Polling messagerie** : `chat/[id].tsx` interroge `GET /conversations/{id}/messages` toutes les 5 secondes — fréquence raisonnable, pas de problème identifié.
- **`drop/[id].tsx`** récupère tout le feed (jusqu'à 50 items) pour afficher un seul Drop — surcoût mineur mais mesurable à l'échelle.
- **Base64** : le mécanisme de repli (pas d'ImageKit configuré) stocke les médias en base64 directement dans MongoDB (`media_data`), ce qui peut gonfler significativement la taille des documents et des réponses API à grande échelle. C'est un repli intentionnel documenté dans le code, pas un bug, mais à surveiller si de nombreux utilisateurs se retrouvent sans ImageKit configuré.

### Optimisations réalisées
- Ajout de 8 index MongoDB au démarrage du serveur (`create_indexes`, voir section F), incluant deux index d'unicité qui servent aussi de garde-fou d'intégrité des données.

### Optimisations encore recommandées (non réalisées, hors périmètre immédiat)
- Ajouter un endpoint `GET /api/drops/{id}` dédié pour éviter à `drop/[id].tsx` de récupérer tout le feed.
- Envisager une pagination réelle (curseur) sur `GET /drops/feed` au lieu d'une limite fixe de 50, si la base d'utilisateurs grandit.
- Réduire les 58 avertissements `react-hooks/exhaustive-deps` qui, dans certains écrans, peuvent cacher des re-renders ou re-fetches inutiles (ex. `friends.tsx`, `profile.tsx`, `calendar.tsx` re-déclenchent leur fetch via des callbacks non stabilisés).

---

## J. Résultats des tests

- **Tests backend automatisés (`backend/test_server.py`, pytest + mongomock_motor + freezegun)** :
  - **60 tests exécutés, 60 réussis, 0 échoué, 0 ignoré.**
  - Répartition : 8 tests auth, 6 tests profil, 7 tests amis, 8 tests drops, 9 tests messagerie/streak, 6 tests logique de révélation (dont gestion du DST), 3 tests sécurité média/upload, 2 tests résumé hebdomadaire, 1 test notifications, plus les tests de non-régression ajoutés après chaque correction.
  - Couverture : non mesurée avec un outil de coverage dédié (non installé), mais tous les endpoints exposés par `server.py` sont exercés par au moins un test, y compris les chemins d'erreur (401/403/404/422/400).
- **Frontend** :
  - `npx tsc --noEmit` → **0 erreur**.
  - `npx eslint .` → **0 erreur** (58 avertissements non bloquants, détaillés en section D/I).
- **Vérification manuelle en navigateur (Expo web + backend réel sur mongomock)** :
  - Écran de connexion : rendu correct, apostrophes correctement échappées après fix.
  - Inscription réelle : `POST /api/auth/register` → 200, JWT reçu, redirection automatique vers le feed.
  - Écran Feed : bannière de compte à rebours réelle avant révélation ("Prochaine révélation : Dimanche 20h — 20h45m"), état vide correct ("Aucun Drop pour le moment").
  - Écran Créer un Drop : rendu correct, bouton de validation désactivé tant qu'aucun média n'est sélectionné (cohérent avec la validation backend E7).
  - Écran Amis : rendu correct, onglets Amis/Demandes/Rechercher, état vide correct.

---

## K. Checklist fonctionnelle

| Fonctionnalité | Frontend | Backend | Base de données | Testé | Statut | Commentaire |
|---|---|---|---|---|---|---|
| Inscription / connexion | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Testé en pytest + navigateur réel |
| Session JWT | ✅ | ✅ | N/A | Oui | ✅ Fonctionnel | Expiration, falsification, absence de token tous testés |
| Profil (édition pseudo/bio/photo) | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Fuite d'email corrigée |
| Recherche d'utilisateurs | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Injection regex corrigée |
| Demandes d'amis | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Bidirectionnalité vérifiée |
| Liste d'amis | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | |
| Création de Drop (photo/vidéo) | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Validation média manquant ajoutée ; upload réel ImageKit non testable (pas de clés) |
| Floutage avant révélation | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Vérifié serveur, pas seulement visuel |
| Révélation dimanche 20h UTC | N/A | ✅ | ✅ | Oui | ✅ Fonctionnel | Cas limites + DST testés avec freezegun |
| Likes / commentaires | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Validation longueur/vide ajoutée |
| Messagerie privée | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Polling 5s, friend-only vérifié |
| Notifications in-app | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Compteur non-lu testé |
| Notifications push | ✅ | ✅ | N/A | Partiel | 🟡 Partiellement fonctionnel | Code revu, non testable sur appareil physique dans ce sandbox |
| Calendrier des Drops | ✅ | ✅ | ✅ | Non | ⚪ Non testé | Pas de scénario navigateur exécuté sur cet écran spécifique dans le temps imparti |
| Résumé hebdomadaire | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | |
| Classement entre amis | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Fait partie du résumé hebdomadaire, testé |
| Streak quotidien | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Tous les cas limites testés |
| Streak Freezes | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Race condition corrigée et testée |
| Récompenses aux milestones | ✅ | ✅ | ✅ | Oui | ✅ Fonctionnel | Double attribution corrigée |
| Dark/Light/Système | ✅ | N/A | N/A | Partiel | 🟡 Partiellement fonctionnel | Code revu (AsyncStorage/localStorage), rendu visuel du login confirmé en dark ; pas de test exhaustif light/system dans le temps imparti |
| Sons, vibrations | ✅ | N/A | N/A | Non | ⚪ Non testé | Nécessite un appareil physique |
| Deep linking | ✅ | N/A | N/A | Non | ⚪ Non testé | Code revu (`usePushNotifications.ts`), non exécuté faute de notification réelle |
| Upload média (validation type/taille) | ✅ | ✅ | N/A | Oui | ✅ Fonctionnel | Type invalide testé ; taille 50 Mo non testée en conditions réelles (coût du test) |

---

## L. Checklist avant bêta

| Item | Statut |
|---|---|
| Configuration production (`.env` séparé, non commité) | ⚠️ À faire : vérifier que Render (ou l'hébergeur choisi) a bien toutes les variables listées en section B |
| Variables d'environnement (`MONGO_URL`, `JWT_SECRET`, clés ImageKit) | ⚠️ À vérifier manuellement sur l'hébergeur — non accessible depuis ce sandbox |
| Stockage ImageKit (clés valides, quotas) | ⚠️ Non testé avec de vraies clés dans ce sandbox |
| Sécurité (voir section H) | 🟡 Corrections critiques appliquées ; rate limiting et restriction CORS encore recommandés |
| Base de données (index, unicité) | ✅ Index ajoutés et testés (voir F) ; **smoke test contre un vrai MongoDB recommandé avant le lancement** |
| Notifications (push token, permissions) | 🟡 Code revu, test réel sur appareil physique requis |
| Logs | ✅ Aucune donnée sensible trouvée dans les logs |
| Gestion des erreurs | ✅ Erreurs 500 non gérées corrigées (E5) ; validations ajoutées (E7, E8) |
| Politique de confidentialité | ⚪ Non trouvée dans le dépôt — à rédiger avant la bêta si des utilisateurs externes sont impliqués |
| Suppression de compte | ⚪ **Aucun endpoint de suppression de compte trouvé dans `server.py`** — à ajouter si requis par la conformité (RGPD) avant une bêta avec de vrais utilisateurs |
| Tests sur appareils physiques | ⚪ Non réalisés dans ce sandbox |
| Build Android | ⚪ Non réalisé (nécessite EAS Build) |
| Build iOS | ⚪ Non réalisé (nécessite EAS Build / Xcode) |

---

## M. Verdict final

### **Prêt avec corrections mineures.**

Justification :
- Le bug bloquant (E1, absence d'`email-validator`) et les deux failles critiques (E2 fuite d'email, E3 traversée de répertoire) ont été trouvés et **corrigés avec preuve automatisée** — sans cette correction, le projet n'aurait même pas pu démarrer sur un déploiement propre.
- La logique métier prioritaire de l'audit — révélation hebdomadaire et système de streak/milestones — a été testée en profondeur, y compris les cas limites (changement de semaine, DST, concurrence) et s'est révélée **solide côté serveur** (pas de simple flou visuel contournable).
- 60/60 tests automatisés passent, TypeScript et ESLint sont propres.
- Le frontend a été vérifié en conditions réelles (navigateur + backend réel) sur les parcours d'inscription, feed, création de Drop et amis, sans anomalie.

Ce qui empêche un verdict "Prêt pour bêta fermée" sans réserve :
- Absence de test contre une vraie instance MongoDB (limite d'environnement, pas un défaut du code).
- Absence d'endpoint de suppression de compte (probable exigence légale selon la juridiction des utilisateurs visés).
- Résidu de fichiers utilisateurs dans l'historique Git (E9) non nettoyé (décision volontairement laissée à l'utilisateur, opération destructive).
- Notifications push, builds natifs et upload ImageKit réel non testables dans cet environnement sandbox.

**Recommandation concrète avant l'ouverture d'une bêta fermée** : rejouer `backend/test_server.py` contre une vraie instance MongoDB, décider du sort des fichiers déjà committés dans `backend/media`, et statuer sur la nécessité d'un endpoint de suppression de compte. Une fois ces trois points tranchés, le projet est prêt pour une bêta fermée avec un nombre limité d'utilisateurs de confiance.

---

## Annexe : fichiers ajoutés pour cet audit

- `backend/test_server.py` — suite de 60 tests automatisés (à conserver et enrichir).
- `backend/requirements-dev.txt` — dépendances de test (mongomock, freezegun, etc.), séparées des dépendances de production.
- `backend/run_mock_server.py` — utilitaire pour lancer le backend réel contre une base en mémoire, utile pour développer/tester sans MongoDB local.
- `backend/.gitignore` — empêche désormais `backend/media/`, `venv/`, et les caches Python d'être committés par erreur.
