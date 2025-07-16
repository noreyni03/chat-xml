<?php
header('Content-Type: application/json');
$dataFile = 'database.xml';

// Vérifie quelle action est demandée
$action = $_POST['action'] ?? $_GET['action'] ?? null;

if (!$action) {
    echo json_encode(['status' => 'error', 'message' => 'Aucune action spécifiée']);
    exit;
}

// Routeur simple pour appeler la bonne fonction
switch ($action) {
    case 'login':
        login($_POST['email'], $_POST['password']);
        break;
    case 'register':
        registerUser();
        break;
    case 'getConversations':
        getConversations($_GET['userId']);
        break;
    case 'getMessages':
        getMessages($_GET['userId'], $_GET['contactId']);
        break;
    case 'sendMessage':
        sendMessage($_POST['fromId'], $_POST['toId'], $_POST['content']);
        break;
    case 'createGroup':
        createGroup($_POST['adminId'], $_POST['groupName'], $_POST['memberIds']);
        break;
    case 'getGroups':
        getGroups($_GET['userId']);
        break;
    case 'addGroupMember':
        addGroupMember($_POST['groupId'], $_POST['memberId']);
        break;
    case 'removeGroupMember':
        removeGroupMember($_POST['groupId'], $_POST['memberId']);
        break;
    case 'sendGroupMessage':
        sendGroupMessage($_POST['fromId'], $_POST['groupId'], $_POST['content']);
        break;
    case 'uploadFile':
        uploadFile();
        break;
    case 'updatePassword':
        updatePassword($_POST['userId'], $_POST['newPassword']);
        break;
    case 'updateDisplayName':
        updateDisplayName($_POST['userId'], $_POST['displayName']);
        break;
    case 'updateAvatar':
        updateAvatar();
        break;
    case 'updateMessageStatus':
        updateMessageStatus($_POST['messageId'], $_POST['status']);
        break;
    case 'typing':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            typingSet();
        } else {
            typingGet();
        }
        break;
    case 'searchUsers':
        searchUsers($_GET['query'], $_GET['userId']);
        break;
    case 'addContact':
        addContact($_POST['userId'], $_POST['contactId']);
        break;
    case 'removeContact':
        removeContact($_POST['userId'], $_POST['contactId']);
        break;
    case 'findUserByEmail':
        findUserByEmail($_GET['email'], $_GET['userId']);
        break;
    case 'addGlobalContact':
        addGlobalContact($_POST['nom'], $_POST['numero']);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Action non valide']);
        break;
}

/**
 * Gère la connexion utilisateur.
 * @param string $email
 * @param string $password
 */
function login($email, $password) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $user = $xml->xpath("//user[@email='$email']");

    if (count($user) > 0 && (string)$user[0]->password == $password) {
        echo json_encode([
            'status' => 'success',
            'userId' => (string)$user[0]['id'],
            'email' => (string)$user[0]['email']
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Email ou mot de passe incorrect']);
    }
}

/**
 * Récupère la liste des contacts/conversations d'un utilisateur.
 * @param string $userId
 */
function getConversations($userId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $user = $xml->xpath("//user[@id='$userId']")[0];
    $contacts = [];
    $contactIds = [];
    // 1. Contacts existants
    foreach ($user->contacts->contactId as $contactId) {
        $contactInfo = $xml->xpath("//user[@id='$contactId']")[0];
        $contacts[] = [
            'id' => (string)$contactInfo['id'],
            'email' => (string)$contactInfo['email'],
            'displayName' => (string)($contactInfo->displayName ?? ''),
            'avatar' => (string)($contactInfo->avatar ?? ''),
            'isContact' => true
        ];
        $contactIds[] = (string)$contactInfo['id'];
    }
    // 2. Utilisateurs ayant envoyé un message à l'utilisateur (hors contacts)
    $messages = $xml->xpath("//message[@to='$userId']");
    foreach ($messages as $msg) {
        $fromId = (string)$msg['from'];
        if ($fromId === $userId) continue;
        if (in_array($fromId, $contactIds)) continue;
        // Vérifier que l'utilisateur existe
        $fromUser = $xml->xpath("//user[@id='$fromId']");
        if ($fromUser && count($fromUser) > 0) {
            $fromUser = $fromUser[0];
            // Éviter les doublons
            if (!in_array($fromId, array_column($contacts, 'id'))) {
                $contacts[] = [
                    'id' => (string)$fromUser['id'],
                    'email' => (string)$fromUser['email'],
                    'displayName' => (string)($fromUser->displayName ?? ''),
                    'avatar' => (string)($fromUser->avatar ?? ''),
                    'isContact' => false
                ];
            }
        }
    }
    echo json_encode(['status' => 'success', 'conversations' => $contacts]);
}

/**
 * Récupère les messages entre deux utilisateurs ou d'un groupe.
 * @param string $userId
 * @param string $contactId
 */
function getMessages($userId, $contactId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $isGroup = false;
    $group = null;
    foreach ($xml->groups->group as $g) {
        if ((string)$g['id'] === $contactId) {
            $isGroup = true;
            $group = $g;
            break;
        }
    }
    $messages = [];
    if ($isGroup) {
        $isMember = false;
        foreach ($group->members->memberId as $mid) {
            if ((string)$mid == $userId) {
                $isMember = true;
                break;
            }
        }
        if (!$isMember) {
            echo json_encode(['status' => 'error', 'message' => 'Vous n\'êtes pas membre de ce groupe']);
            return;
        }
        $messages = $xml->xpath("//message[@to='$contactId']");
    } else {
        $messages = $xml->xpath("//message[(@from='$userId' and @to='$contactId') or (@from='$contactId' and @to='$userId')]");
    }
    $messageArray = [];
    foreach ($messages as $msg) {
        // Pour les groupes : delivered si au moins un membre a consulté, read si au moins un membre a lu (non individualisé)
        if ((string)$msg['to'] === $contactId && (string)$msg['from'] !== $userId && (string)$msg['status'] !== 'read') {
            $msg['status'] = 'delivered';
        }
        $messageArray[] = [
            'id' => (string)$msg['id'],
            'from' => (string)$msg['from'],
            'to' => (string)$msg['to'],
            'content' => (string)$msg->content,
            'timestamp' => (string)$msg->timestamp,
            'status' => (string)$msg['status'],
            'file' => isset($msg->file) ? (string)$msg->file : null
        ];
    }
    $xml->asXML($dataFile);
    usort($messageArray, fn($a, $b) => strcmp($a['timestamp'], $b['timestamp']));
    echo json_encode(['status' => 'success', 'messages' => $messageArray]);
}

/**
 * Envoie un message privé entre deux utilisateurs.
 * @param string $fromId
 * @param string $toId
 * @param string $content
 */
function sendMessage($fromId, $toId, $content) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);

    $newMessage = $xml->messages->addChild('message');
    $newMessage->addAttribute('id', 'msg' . time() . rand(100, 999));
    $newMessage->addAttribute('from', $fromId);
    $newMessage->addAttribute('to', $toId);
    $newMessage->addAttribute('status', 'sent');
    $newMessage->addChild('content', htmlspecialchars($content));
    if (isset($_POST['fileUrl']) && $_POST['fileUrl']) {
        $newMessage->addChild('file', $_POST['fileUrl']);
    }
    $newMessage->addChild('timestamp', gmdate('c'));

    // Sauvegarder le fichier XML
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success', 'message' => 'Message envoyé']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la sauvegarde du message']);
    }
}

/**
 * Crée un groupe de discussion.
 * @param string $adminId
 * @param string $groupName
 * @param array|string $memberIds
 */
function createGroup($adminId, $groupName, $memberIds) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $groups = $xml->groups;
    $groupId = 'group' . time() . rand(100, 999);
    $newGroup = $groups->addChild('group');
    $newGroup->addAttribute('id', $groupId);
    $newGroup->addAttribute('admin', $adminId);
    $newGroup->addChild('name', htmlspecialchars($groupName));
    $members = $newGroup->addChild('members');
    $ids = is_array($memberIds) ? $memberIds : explode(',', $memberIds);
    foreach ($ids as $id) {
        $members->addChild('memberId', $id);
    }
    $members->addChild('memberId', $adminId); // L'admin est aussi membre
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success', 'groupId' => $groupId]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la création du groupe']);
    }
}

/**
 * Récupère la liste des groupes d'un utilisateur.
 * @param string $userId
 */
function getGroups($userId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $groups = $xml->xpath("//group[members/memberId='$userId']");
    $result = [];
    foreach ($groups as $group) {
        $members = [];
        foreach ($group->members->memberId as $mid) {
            $members[] = (string)$mid;
        }
        $result[] = [
            'id' => (string)$group['id'],
            'name' => (string)$group->name,
            'admin' => (string)$group['admin'],
            'members' => $members
        ];
    }
    echo json_encode(['status' => 'success', 'groups' => $result]);
}

/**
 * Ajoute un membre à un groupe.
 * @param string $groupId
 * @param string $memberId
 */
function addGroupMember($groupId, $memberId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $group = $xml->xpath("//group[@id='$groupId']")[0];
    if (!$group) {
        echo json_encode(['status' => 'error', 'message' => 'Groupe introuvable']);
        return;
    }
    // Vérifier que le membre existe dans <users>
    $user = $xml->xpath("//user[@id='$memberId']");
    if (!$user || count($user) === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Ce membre n\'existe pas (il doit être un utilisateur inscrit).']);
        return;
    }
    $group->members->addChild('memberId', $memberId);
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de l\'ajout du membre']);
    }
}

/**
 * Retire un membre d'un groupe.
 * @param string $groupId
 * @param string $memberId
 */
function removeGroupMember($groupId, $memberId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $group = $xml->xpath("//group[@id='$groupId']")[0];
    if (!$group) {
        echo json_encode(['status' => 'error', 'message' => 'Groupe introuvable']);
        return;
    }
    foreach ($group->members->memberId as $i => $mid) {
        if ((string)$mid == $memberId) {
            unset($group->members->memberId[$i]);
        }
    }
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors du retrait du membre']);
    }
}

/**
 * Envoie un message dans un groupe.
 * @param string $fromId
 * @param string $groupId
 * @param string $content
 */
function sendGroupMessage($fromId, $groupId, $content) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $newMessage = $xml->messages->addChild('message');
    $newMessage->addAttribute('id', 'msg' . time() . rand(100, 999));
    $newMessage->addAttribute('from', $fromId);
    $newMessage->addAttribute('to', $groupId); // Le destinataire est l'id du groupe
    $newMessage->addAttribute('status', 'sent');
    $newMessage->addChild('content', htmlspecialchars($content));
    if (isset($_POST['fileUrl']) && $_POST['fileUrl']) {
        $newMessage->addChild('file', $_POST['fileUrl']);
    }
    $newMessage->addChild('timestamp', gmdate('c'));
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success', 'message' => 'Message de groupe envoyé']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la sauvegarde du message']);
    }
}

/**
 * Gère l'upload de fichiers (images, docs, etc).
 */
function uploadFile() {
    $uploadDir = 'uploads/';
    $allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'text/plain'
    ];
    $maxSize = 5 * 1024 * 1024; // 5 Mo
    if (!file_exists($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            echo json_encode(['status' => 'error', 'message' => 'Impossible de créer le dossier d\'upload']);
            return;
        }
    }
    if (!isset($_FILES['file'])) {
        echo json_encode(['status' => 'error', 'message' => 'Aucun fichier envoyé']);
        return;
    }
    $file = $_FILES['file'];
    if ($file['size'] > $maxSize) {
        echo json_encode(['status' => 'error', 'message' => 'Fichier trop volumineux (max 5 Mo)']);
        return;
    }
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mime, $allowedTypes)) {
        echo json_encode(['status' => 'error', 'message' => 'Type de fichier non autorisé']);
        return;
    }
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $ext = strtolower(preg_replace('/[^a-z0-9]/i', '', $ext));
    $filename = uniqid('file_') . '.' . $ext;
    $target = $uploadDir . $filename;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de l\'upload']);
        return;
    }
    // Protection : pas d'exécution de fichiers uploadés
    chmod($target, 0644);
    echo json_encode(['status' => 'success', 'fileUrl' => $target]);
}

/**
 * Met à jour le mot de passe d'un utilisateur.
 * @param string $userId
 * @param string $newPassword
 */
function updatePassword($userId, $newPassword) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $user = $xml->xpath("//user[@id='$userId']")[0];
    if (!$user) {
        echo json_encode(['status' => 'error', 'message' => 'Utilisateur introuvable']);
        return;
    }
    $user->password = $newPassword;
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la mise à jour']);
    }
}
function updateDisplayName($userId, $displayName) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $user = $xml->xpath("//user[@id='$userId']")[0];
    if (!$user) {
        echo json_encode(['status' => 'error', 'message' => 'Utilisateur introuvable']);
        return;
    }
    $user->displayName = $displayName;
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la mise à jour']);
    }
}
function updateAvatar() {
    global $dataFile;
    $userId = $_POST['userId'];
    if (!isset($_FILES['avatar'])) {
        echo json_encode(['status' => 'error', 'message' => 'Aucun fichier envoyé']);
        return;
    }
    $uploadDir = 'uploads/avatars/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    $file = $_FILES['avatar'];
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('avatar_') . '.' . $ext;
    $target = $uploadDir . $filename;
    if (move_uploaded_file($file['tmp_name'], $target)) {
        $xml = simplexml_load_file($dataFile);
        $user = $xml->xpath("//user[@id='$userId']")[0];
        if (!$user) {
            echo json_encode(['status' => 'error', 'message' => 'Utilisateur introuvable']);
            return;
        }
        $user->avatar = $target;
        if ($xml->asXML($dataFile)) {
            echo json_encode(['status' => 'success', 'avatarUrl' => $target]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la mise à jour']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de l\'upload']);
    }
}
/**
 * Met à jour le statut d'un message (lu, reçu, etc).
 * @param string $messageId
 * @param string $status
 */
function updateMessageStatus($messageId, $status) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $msg = $xml->xpath("//message[@id='$messageId']");
    if (!$msg || count($msg) === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Message introuvable']);
        return;
    }
    // Pour les groupes : 'read' = au moins un membre a lu (non individualisé)
    $msg[0]['status'] = $status;
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la mise à jour du statut']);
    }
}

/**
 * Gère le signal "est en train d'écrire..." (set).
 */
function typingSet() {
    $file = 'typing.json';
    $data = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    // Nettoyer les entrées trop anciennes (>10s)
    $now = time();
    foreach ($data as $k => $v) {
        if ($now - $v > 10) unset($data[$k]);
    }
    $fromId = $_POST['fromId'];
    $typing = $_POST['typing'] === '1';
    if (isset($_POST['toId'])) {
        $toId = $_POST['toId'];
        $key = "u_{$fromId}_{$toId}";
    } else if (isset($_POST['groupId'])) {
        $groupId = $_POST['groupId'];
        $key = "g_{$groupId}_{$fromId}";
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Paramètres manquants']);
        return;
    }
    if ($typing) {
        $data[$key] = $now;
    } else {
        unset($data[$key]);
    }
    file_put_contents($file, json_encode($data));
    echo json_encode(['status' => 'success']);
}
/**
 * Récupère le signal "est en train d'écrire..." (get).
 */
function typingGet() {
    $file = 'typing.json';
    $data = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    // Nettoyer les entrées trop anciennes (>10s)
    $now = time();
    foreach ($data as $k => $v) {
        if ($now - $v > 10) unset($data[$k]);
    }
    $typing = false;
    if (isset($_GET['fromId']) && isset($_GET['toId'])) {
        $key = "u_{$_GET['fromId']}_{$_GET['toId']}";
        if (isset($data[$key]) && ($now - $data[$key]) < 3) {
            $typing = true;
        }
    } else if (isset($_GET['groupId']) && isset($_GET['fromId'])) {
        $key = "g_{$_GET['groupId']}_{$_GET['fromId']}";
        if (isset($data[$key]) && ($now - $data[$key]) < 3) {
            $typing = true;
        }
    }
    file_put_contents($file, json_encode($data));
    echo json_encode(['typing' => $typing]);
}

/**
 * Inscrit un nouvel utilisateur.
 */
function registerUser() {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $displayName = trim($_POST['displayName'] ?? '');
    // Validation basique
    if (!$email || !$password || !$displayName) {
        echo json_encode(['status' => 'error', 'message' => 'Tous les champs sont obligatoires']);
        return;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['status' => 'error', 'message' => 'Email invalide']);
        return;
    }
    if (strlen($password) < 4) {
        echo json_encode(['status' => 'error', 'message' => 'Mot de passe trop court (min 4 caractères)']);
        return;
    }
    // Vérifier unicité de l'email
    foreach ($xml->users->user as $u) {
        if ((string)$u['email'] === $email) {
            echo json_encode(['status' => 'error', 'message' => 'Email déjà utilisé']);
            return;
        }
    }
    $userId = 'user' . time() . rand(100, 999);
    $user = $xml->users->addChild('user');
    $user->addAttribute('id', $userId);
    $user->addAttribute('email', $email);
    $user->addChild('password', $password);
    $user->addChild('displayName', $displayName);
    $user->addChild('avatar', '');
    $user->addChild('contacts');
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success', 'userId' => $userId, 'email' => $email]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de l\'inscription']);
    }
}

/**
 * Recherche des utilisateurs par nom ou email.
 * @param string $query
 * @param string $userId
 */
function searchUsers($query, $userId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $query = strtolower(trim($query));
    $results = [];
    foreach ($xml->users->user as $u) {
        if ((string)$u['id'] === $userId) continue;
        $email = strtolower((string)$u['email']);
        $displayName = strtolower((string)($u->displayName ?? ''));
        if (strpos($email, $query) !== false || strpos($displayName, $query) !== false) {
            $results[] = [
                'id' => (string)$u['id'],
                'email' => (string)$u['email'],
                'displayName' => (string)($u->displayName ?? ''),
                'avatar' => (string)($u->avatar ?? '')
            ];
        }
    }
    echo json_encode(['status' => 'success', 'users' => $results]);
}
/**
 * Ajoute un contact à la liste personnelle d'un utilisateur.
 * @param string $userId
 * @param string $contactId
 */
function addContact($userId, $contactId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $user = $xml->xpath("//user[@id='$userId']")[0];
    if (!$user) {
        echo json_encode(['status' => 'error', 'message' => 'Utilisateur introuvable']);
        return;
    }
    foreach ($user->contacts->contactId as $cid) {
        if ((string)$cid == $contactId) {
            echo json_encode(['status' => 'error', 'message' => 'Déjà dans vos contacts']);
            return;
        }
    }
    $user->contacts->addChild('contactId', $contactId);
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de l\'ajout']);
    }
}
/**
 * Retire un contact de la liste personnelle d'un utilisateur.
 * @param string $userId
 * @param string $contactId
 */
function removeContact($userId, $contactId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $user = $xml->xpath("//user[@id='$userId']")[0];
    if (!$user) {
        echo json_encode(['status' => 'error', 'message' => 'Utilisateur introuvable']);
        return;
    }
    foreach ($user->contacts->contactId as $i => $cid) {
        if ((string)$cid == $contactId) {
            unset($user->contacts->contactId[$i]);
        }
    }
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la suppression']);
    }
}

/**
 * Recherche un utilisateur par email.
 * @param string $email
 * @param string $userId
 */
function findUserByEmail($email, $userId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    foreach ($xml->users->user as $u) {
        if ((string)$u['email'] === $email && (string)$u['id'] !== $userId) {
            echo json_encode([
                'status' => 'success',
                'user' => [
                    'id' => (string)$u['id'],
                    'email' => (string)$u['email'],
                    'displayName' => (string)($u->displayName ?? ''),
                    'avatar' => (string)($u->avatar ?? '')
                ]
            ]);
            return;
        }
    }
    echo json_encode(['status' => 'error', 'message' => 'Utilisateur introuvable']);
}

/**
 * Ajoute un contact global (dans <contacts> et potentiellement <users>).
 * @param string $nom
 * @param string $numero
 */
function addGlobalContact($nom, $numero) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $contacts = $xml->contacts;
    $userId = $_POST['userId'] ?? null;
    $contactUserId = null;
    $userExists = false;
    // Vérifier si l'utilisateur existe déjà
    foreach ($xml->users->user as $u) {
        if ((string)$u['email'] === $numero) {
            $contactUserId = (string)$u['id'];
            $userExists = true;
            break;
        }
    }
    if (!$userExists) {
        // Créer un nouvel utilisateur
        $contactUserId = 'user' . time() . rand(100, 999);
        $newUser = $xml->users->addChild('user');
        $newUser->addAttribute('id', $contactUserId);
        $newUser->addAttribute('email', $numero);
        $newUser->addChild('password', 'contact1234');
        $newUser->addChild('displayName', htmlspecialchars($nom));
        $newUser->addChild('avatar', '');
        $newUser->addChild('contacts');
    }
    // Ajouter dans la liste des contacts personnels
    if ($userId && $contactUserId) {
        $user = $xml->xpath("//user[@id='$userId']")[0];
        $already = false;
        foreach ($user->contacts->contactId as $cid) {
            if ((string)$cid == $contactUserId) {
                $already = true;
                break;
            }
        }
        if (!$already) {
            $user->contacts->addChild('contactId', $contactUserId);
        }
    }
    // Ajouter dans <contacts> globale si pas déjà présent
    $alreadyInContacts = false;
    foreach ($contacts->contact as $c) {
        if ((string)$c->numero === $numero) {
            $alreadyInContacts = true;
            break;
        }
    }
    if (!$alreadyInContacts) {
        // Générer un id unique pour le contact global
        $maxId = 0;
        foreach ($contacts->contact as $c) {
            $id = (int)$c->id;
            if ($id > $maxId) $maxId = $id;
        }
        $newId = $maxId + 1;
        $contact = $contacts->addChild('contact');
        $contact->addChild('id', $newId);
        $contact->addChild('nom', htmlspecialchars($nom));
        $contact->addChild('numero', htmlspecialchars($numero));
    }
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success', 'userId' => $contactUserId]);
    } else {
        echo json_encode(['status' => 'error', 'message' => "Erreur lors de l'ajout du contact"]);
    }
}
?>