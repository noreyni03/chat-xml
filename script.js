document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
    const loginContainer = document.getElementById('login-container');
    const chatContainer = document.getElementById('chat-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const conversationsList = document.getElementById('conversations-list');
    const messagesArea = document.getElementById('messages-area');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const chatHeader = document.getElementById('chat-header');
    const userProfile = document.getElementById('user-profile');
    
    // État de l'application
    let currentUser = null;
    let currentContact = null;
    let messagePollingInterval = null;

    // --- CONNEXION ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('email', email);
        formData.append('password', password);

        const response = await fetch('api.php', { method: 'POST', body: formData });
        const result = await response.json();

        if (result.status === 'success') {
            currentUser = { id: result.userId, email: result.email };
            loginContainer.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            startChatSession();
        } else {
            loginError.textContent = result.message;
        }
    });

    // --- SESSION DE CHAT ---
    async function startChatSession() {
        userProfile.textContent = `Connecté en tant que: ${currentUser.email}`;
        await loadConversations();
    }

    async function loadConversations() {
        const response = await fetch(`api.php?action=getConversations&userId=${currentUser.id}`);
        const result = await response.json();

        if (result.status === 'success') {
            conversationsList.innerHTML = '';
            result.conversations.forEach(contact => {
                const li = document.createElement('li');
                li.textContent = contact.email;
                li.dataset.contactId = contact.id;
                li.dataset.contactEmail = contact.email;
                li.addEventListener('click', () => openConversation(contact));
                conversationsList.appendChild(li);
            });
        }
    }

    function openConversation(contact) {
        currentContact = contact;

        // Mettre en surbrillance la conversation active
        document.querySelectorAll('#conversations-list li').forEach(li => {
            li.classList.toggle('active', li.dataset.contactId === contact.id);
        });
        
        chatHeader.textContent = `Conversation avec ${contact.email}`;
        messageInput.disabled = false;
        
        // Charger les messages et démarrer le rafraîchissement
        loadMessages();
        if (messagePollingInterval) clearInterval(messagePollingInterval);
        messagePollingInterval = setInterval(loadMessages, 3000); // Rafraîchit toutes les 3 secondes
    }

    async function loadMessages() {
        if (!currentContact) return;

        const response = await fetch(`api.php?action=getMessages&userId=${currentUser.id}&contactId=${currentContact.id}`);
        const result = await response.json();

        if (result.status === 'success') {
            messagesArea.innerHTML = '';
            result.messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message');
                messageDiv.textContent = msg.content;
                // Appliquer la classe 'sent' ou 'received'
                if (msg.from === currentUser.id) {
                    messageDiv.classList.add('sent');
                } else {
                    messageDiv.classList.add('received');
                }
                messagesArea.appendChild(messageDiv);
            });
            messagesArea.scrollTop = messagesArea.scrollHeight; // Scroll vers le bas
        }
    }

    // --- ENVOI DE MESSAGES ---
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!messageInput.value.trim() || !currentContact) return;

        const formData = new FormData();
        formData.append('action', 'sendMessage');
        formData.append('fromId', currentUser.id);
        formData.append('toId', currentContact.id);
        formData.append('content', messageInput.value);

        const response = await fetch('api.php', { method: 'POST', body: formData });
        const result = await response.json();

        if (result.status === 'success') {
            messageInput.value = '';
            await loadMessages(); // Recharger immédiatement les messages
        } else {
            alert('Erreur: ' + result.message);
        }
    });
});