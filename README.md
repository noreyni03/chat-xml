# Chat-XML

Chat-XML est une application de messagerie instantanée simple et légère. Sa particularité est d'utiliser un fichier XML comme base de données pour stocker les utilisateurs, les conversations et les messages, au lieu d'un système de gestion de base de données traditionnel (comme MySQL).

Ce projet est une démonstration pratique de la manipulation de fichiers XML avec PHP en backend et de la communication asynchrone avec JavaScript (AJAX) en frontend.

## ✨ Fonctionnalités

-   Authentification des utilisateurs.
-   Affichage de la liste des conversations disponibles.
-   Consultation des messages d'une conversation.
-   Envoi de nouveaux messages en temps réel (via AJAX).
-   Stockage de toutes les données (utilisateurs, conversations, messages) dans un unique fichier `database.xml`.

## 🛠️ Technologies Utilisées

-   **Frontend :** HTML, CSS, JavaScript (avec AJAX pour les requêtes asynchrones)
-   **Backend :** PHP (avec l'extension `php-xml` pour la manipulation du DOM XML)
-   **Base de données :** Un fichier plat `database.xml`

## 🚀 Démarrage Rapide

Suivez ces étapes pour mettre en place et lancer le projet sur votre machine locale.

### 1. Prérequis

-   Un serveur web local (XAMPP, WAMP, MAMP, etc.) avec **PHP**.
-   L'extension **`php-xml`** doit être activée dans votre configuration de PHP (`php.ini`).

### 2. Installation

1.  Ouvrez un terminal ou une invite de commandes.
2.  Naviguez jusqu'au répertoire racine de votre serveur web (par exemple, `htdocs` pour XAMPP, `www` for WAMP).
3.  Clonez ce dépôt GitHub :
    ```bash
    git clone https://github.com/noreyni03/chat-xml.git
    ```
4.  Une fois le clonage terminé, un dossier `chat-xml` sera créé avec tous les fichiers du projet.

### 3. Permissions

Assurez-vous que le serveur web a les **permissions d'écriture** sur le fichier `database.xml`. Sans cela, vous ne pourrez pas envoyer de nouveaux messages. La méthode pour changer les permissions varie selon votre système d'exploitation.

### 4. Lancement

1.  Démarrez votre serveur web local (Apache, etc.).
2.  Ouvrez votre navigateur et accédez à l'URL correspondante. Par exemple :
    ```
    http://localhost/chat-xml/
    ```

## 🕹️ Utilisation

Une fois l'application lancée, vous pouvez vous connecter en utilisant les identifiants d'un utilisateur existant dans le fichier `database.xml`.

Par exemple, utilisez les identifiants suivants :
-   **Email** : `leo.gill@gmail.com`
-   **Mot de passe** : `pass123`

Après connexion, cliquez sur une conversation dans la liste de gauche pour afficher les messages et commencer à discuter.

## 📂 Structure du Projet

```
.
├── api.php           # API backend qui interagit avec le fichier XML
├── database.xml      # Fichier de données (utilisateurs, messages)
├── index.html        # Structure principale de la page web
├── script.js         # Logique frontend (AJAX, manipulation du DOM)
└── style.css         # Feuille de style de l'application
```
