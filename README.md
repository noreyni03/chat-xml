# Projet Chat-XML

Ceci est un projet de démonstration d'une application de chat simple. Le front-end est construit avec HTML, CSS et JavaScript, tandis que le back-end est géré par PHP. La particularité de ce projet est qu'il utilise un fichier `database.xml` en guise de base de données pour stocker les utilisateurs et les messages.

## Prérequis

Avant de commencer, assurez-vous d'avoir les éléments suivants installés et configurés sur votre machine :

-   **Un serveur web local** : XAMPP, WAMP, MAMP ou tout autre serveur supportant PHP.
-   **PHP** : Installé et activé sur le serveur.
-   **Extension `php-xml`** : Cette extension PHP doit être activée. Vous pouvez généralement l'activer depuis le panneau de configuration de votre serveur local ou en modifiant votre fichier `php.ini`.

## Installation

Suivez ces étapes pour mettre en place le projet sur votre serveur local :

1.  **Créez le dossier du projet**
    Créez un nouveau dossier nommé `chat-xml` (ou le nom de votre choix) dans le répertoire racine de votre serveur web (par exemple, `htdocs/` pour XAMPP ou `www/` pour WAMP).

2.  **Ajoutez les fichiers du projet**
    Placez les 4 fichiers suivants à l'intérieur du dossier que vous venez de créer :
    -   `index.html`
    -   `style.css`
    -   `script.js`
    -   `api.php`

3.  **Créez la base de données XML**
    Dans ce même dossier, créez un fichier vide nommé `database.xml`.

4.  **Configurez les permissions**
    **Important** : Assurez-vous que votre serveur web a les permissions nécessaires pour lire et écrire dans le fichier `database.xml`. Sans les droits d'écriture, les nouveaux messages ne pourront pas être sauvegardés.

    *Sur un environnement Linux ou macOS, vous pouvez utiliser la commande `chmod 666 database.xml` dans le terminal pour donner les droits de lecture et d'écriture.*

## Lancement du Projet

1.  Démarrez votre serveur web local (par exemple, lancez les modules Apache et MySQL depuis le panneau de contrôle de XAMPP).
2.  Ouvrez votre navigateur web.
3.  Accédez à l'URL correspondant à votre dossier. Par exemple :
    ```
    http://localhost/chat-xml/
    ```

## Utilisation de l'application

1.  **Connexion**
    Sur la page d'accueil, utilisez les identifiants présents dans le fichier `database.xml` pour vous connecter.
    -   **Exemple d'identifiants :**
        -   **Email** : `leo.gill@gmail.com`
        -   **Mot de passe** : `pass123`

2.  **Navigation**
    Une fois connecté, la liste de vos conversations s'affichera sur la gauche.

3.  **Chat**
    Cliquez sur une conversation pour afficher l'historique des messages. Vous pouvez ensuite taper un nouveau message dans le champ en bas et l'envoyer.
