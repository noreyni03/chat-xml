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
    case 'getConversations':
        getConversations($_GET['userId']);
        break;
    case 'getMessages':
        getMessages($_GET['userId'], $_GET['contactId']);
        break;
    case 'sendMessage':
        sendMessage($_POST['fromId'], $_POST['toId'], $_POST['content']);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Action non valide']);
        break;
}

// Fonction pour se connecter
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

// Fonction pour récupérer les contacts (conversations) d'un utilisateur
function getConversations($userId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    $user = $xml->xpath("//user[@id='$userId']")[0];
    $contacts = [];

    foreach ($user->contacts->contactId as $contactId) {
        $contactInfo = $xml->xpath("//user[@id='$contactId']")[0];
        $contacts[] = [
            'id' => (string)$contactInfo['id'],
            'email' => (string)$contactInfo['email']
        ];
    }
    echo json_encode(['status' => 'success', 'conversations' => $contacts]);
}

// Fonction pour récupérer les messages entre deux utilisateurs
function getMessages($userId, $contactId) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);
    // XPath pour trouver les messages entre les deux utilisateurs, dans les deux sens
    $messages = $xml->xpath("//message[(@from='$userId' and @to='$contactId') or (@from='$contactId' and @to='$userId')]");
    
    $messageArray = [];
    foreach ($messages as $msg) {
        $messageArray[] = [
            'id' => (string)$msg['id'],
            'from' => (string)$msg['from'],
            'to' => (string)$msg['to'],
            'content' => (string)$msg->content,
            'timestamp' => (string)$msg->timestamp
        ];
    }

    // Trier les messages par timestamp
    usort($messageArray, fn($a, $b) => strcmp($a['timestamp'], $b['timestamp']));

    echo json_encode(['status' => 'success', 'messages' => $messageArray]);
}

// Fonction pour envoyer un message
function sendMessage($fromId, $toId, $content) {
    global $dataFile;
    $xml = simplexml_load_file($dataFile);

    $newMessage = $xml->messages->addChild('message');
    $newMessage->addAttribute('id', 'msg' . time() . rand(100, 999));
    $newMessage->addAttribute('from', $fromId);
    $newMessage->addAttribute('to', $toId);
    $newMessage->addChild('content', htmlspecialchars($content));
    $newMessage->addChild('timestamp', gmdate('c'));

    // Sauvegarder le fichier XML
    if ($xml->asXML($dataFile)) {
        echo json_encode(['status' => 'success', 'message' => 'Message envoyé']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la sauvegarde du message']);
    }
}
?>