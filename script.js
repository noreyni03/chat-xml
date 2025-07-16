document.addEventListener("DOMContentLoaded", () => {
    // Éléments du DOM
    const loginContainer = document.getElementById("login-container")
    const chatContainer = document.getElementById("chat-container")
    const loginForm = document.getElementById("login-form")
    const loginError = document.getElementById("login-error")
    const conversationsList = document.getElementById("conversations-list")
    const messagesArea = document.getElementById("messages-area")
    const messageForm = document.getElementById("message-form")
    const messageInput = document.getElementById("message-input")
    const chatHeader = document.getElementById("chat-header")
    const chatTitle = document.getElementById("chat-title")
    const chatSubtitle = document.getElementById("chat-subtitle")
    const chatAvatar = document.getElementById("chat-avatar")
    const userProfile = document.getElementById("user-profile")
    const groupsList = document.getElementById("groups-list")
    const createGroupBtn = document.getElementById("create-group-btn")
    const createGroupModal = document.getElementById("create-group-modal")
    const createGroupForm = document.getElementById("create-group-form")
    const groupNameInput = document.getElementById("group-name")
    const membersCheckboxes = document.getElementById("members-checkboxes")
    const closeGroupModal = document.getElementById("close-group-modal")
    const fileInput = document.getElementById("file-input")
    const profileAvatar = document.getElementById("profile-avatar")
    const profileName = document.getElementById("profile-name")
    const editProfileBtn = document.getElementById("edit-profile-btn")
    const profileModal = document.getElementById("profile-modal")
    const closeProfileModal = document.getElementById("close-profile-modal")
    const profileForm = document.getElementById("profile-form")
    const modalAvatar = document.getElementById("modal-avatar")
    const avatarInput = document.getElementById("avatar-input")
    const displayNameInput = document.getElementById("display-name-input")
    const emailInput = document.getElementById("email-input")
    const passwordInput = document.getElementById("password-input")
    const searchForm = document.getElementById("search-form")
    const searchInput = document.getElementById("search-input")
    const searchArea = document.getElementById("search-area")
    const searchToggleBtn = document.getElementById("search-toggle-btn")
    const messageInputArea = document.getElementById("message-input-area")
  
    let lastLoadedMessages = []
  
    // État de l'application
    let currentUser = null
    let currentContact = null
    let messagePollingInterval = null
    let currentGroup = null
    let allUsers = []
    let typingTimeout = null
    let typingPollingInterval = null
    let isTyping = false
  
    // Gestion des onglets de la sidebar
    const tabBtns = document.querySelectorAll(".tab-btn")
    const tabContents = document.querySelectorAll(".tab-content")
  
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTab = btn.dataset.tab
  
        // Mettre à jour les boutons
        tabBtns.forEach((b) => b.classList.remove("active"))
        btn.classList.add("active")
  
        // Mettre à jour le contenu
        tabContents.forEach((content) => {
          content.classList.remove("active")
        })
        document.getElementById(`${targetTab}-section`).classList.add("active")
      })
    })
  
    // Toggle search area
    searchToggleBtn.addEventListener("click", () => {
      searchArea.classList.toggle("hidden")
      if (!searchArea.classList.contains("hidden")) {
        searchInput.focus()
      }
    })
  
    // --- CONNEXION ---
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      const email = document.getElementById("email").value
      const password = document.getElementById("password").value
  
      const formData = new FormData()
      formData.append("action", "login")
      formData.append("email", email)
      formData.append("password", password)
  
      try {
        const response = await fetch("api.php", { method: "POST", body: formData })
        const result = await response.json()
  
        if (result.status === "success") {
          currentUser = { id: result.userId, email: result.email }
          loginContainer.classList.add("hidden")
          chatContainer.classList.remove("hidden")
          startChatSession()
        } else {
          loginError.textContent = result.message
        }
      } catch (error) {
        loginError.textContent = "Erreur de connexion"
      }
    })
  
    // --- INSCRIPTION UTILISATEUR ---
    const showRegisterBtn = document.getElementById("show-register-btn")
    const registerModal = document.getElementById("register-modal")
    const closeRegisterModal = document.getElementById("close-register-modal")
    const registerForm = document.getElementById("register-form")
    const registerError = document.getElementById("register-error")
  
    showRegisterBtn.addEventListener("click", () => {
      registerModal.classList.remove("hidden")
      registerError.textContent = ""
    })
  
    closeRegisterModal.addEventListener("click", () => {
      registerModal.classList.add("hidden")
    })
  
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      registerError.textContent = ""
  
      const displayName = document.getElementById("register-displayName").value.trim()
      const email = document.getElementById("register-email").value.trim()
      const password = document.getElementById("register-password").value
      const avatarFile = document.getElementById("register-avatar").files[0]
  
      const formData = new FormData()
      formData.append("action", "register")
      formData.append("displayName", displayName)
      formData.append("email", email)
      formData.append("password", password)
  
      try {
        const resp = await fetch("api.php", { method: "POST", body: formData })
        const result = await resp.json()
  
        if (result.status === "success") {
          // Si avatar fourni, upload
          if (avatarFile) {
            const avatarData = new FormData()
            avatarData.append("action", "updateAvatar")
            avatarData.append("userId", result.userId)
            avatarData.append("avatar", avatarFile)
            await fetch("api.php", { method: "POST", body: avatarData })
          }
  
          // Connexion automatique
          document.getElementById("email").value = email
          document.getElementById("password").value = password
          registerModal.classList.add("hidden")
          loginForm.dispatchEvent(new Event("submit"))
        } else {
          registerError.textContent = result.message
        }
      } catch (error) {
        registerError.textContent = "Erreur lors de l'inscription"
      }
    })
  
    // --- SESSION DE CHAT ---
    /**
     * Démarre la session de chat après connexion :
     * - Charge le profil utilisateur, les conversations, les groupes et les utilisateurs.
     * - Affiche le message de bienvenue.
     */
    async function startChatSession() {
      const user = await fetchUserProfile()
      updateProfileSidebar(user)
      await loadConversations()
      await loadGroups()
      await fetchAllUsers()
  
      // Afficher le message de bienvenue
      showWelcomeMessage()
    }
  
    /**
     * Affiche le message de bienvenue dans la zone de messages.
     */
    function showWelcomeMessage() {
      messagesArea.innerHTML = `
              <div class="welcome-message">
                  <div class="welcome-icon">💬</div>
                  <h2>Bienvenue sur Signal</h2>
                  <p>Sélectionnez une conversation pour commencer à discuter</p>
              </div>
          `
    }
  
    /**
     * Charge la liste des conversations (contacts) de l'utilisateur courant et les affiche dans la sidebar.
     */
    async function loadConversations() {
      try {
        const response = await fetch(`api.php?action=getConversations&userId=${currentUser.id}`)
        const result = await response.json()
  
        if (result.status === "success") {
          allContacts = result.conversations || []
          renderConversationsList(allContacts)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des conversations:", error)
      }
    }
  
    /**
     * Affiche la liste des contacts/conversations dans la sidebar.
     * @param {Array} contacts - Liste des contacts à afficher
     */
    function renderConversationsList(contacts) {
      conversationsList.innerHTML = ""
  
      if (contacts.length === 0) {
        conversationsList.innerHTML = `
                  <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                      Aucune conversation
                  </div>
              `
        return
      }
  
      contacts.forEach((contact) => {
        const contactDiv = document.createElement("div")
        contactDiv.className = "conversation-item"
        contactDiv.dataset.contactId = contact.id
  
        const avatar = document.createElement("div")
        avatar.className = "avatar"
        avatar.textContent = getInitials(contact.email)
  
        const info = document.createElement("div")
        info.style.flex = "1"
        info.style.minWidth = "0"
  
        const name = document.createElement("div")
        name.style.fontWeight = "500"
        name.style.marginBottom = "4px"
        name.style.whiteSpace = "nowrap"
        name.style.overflow = "hidden"
        name.style.textOverflow = "ellipsis"
        name.textContent = contact.displayName || contact.email
  
        const status = document.createElement("div")
        status.style.fontSize = "12px"
        status.style.color = "var(--text-secondary)"
        status.style.whiteSpace = "nowrap"
        status.style.overflow = "hidden"
        status.style.textOverflow = "ellipsis"
        status.textContent = contact.lastMessage || "Aucun message"
  
        info.appendChild(name)
        info.appendChild(status)
  
        contactDiv.appendChild(avatar)
        contactDiv.appendChild(info)
  
        // Boutons d'action
        if (contact.isContact) {
          const removeBtn = document.createElement("button")
          removeBtn.textContent = "×"
          removeBtn.className = "remove-contact-btn"
          removeBtn.title = "Supprimer le contact"
          removeBtn.onclick = async (e) => {
            e.stopPropagation()
            await removeContact(contact.id)
            await loadConversations()
          }
          contactDiv.appendChild(removeBtn)
        } else {
          const addBtn = document.createElement("button")
          addBtn.textContent = "+"
          addBtn.className = "add-contact-btn"
          addBtn.title = "Ajouter aux contacts"
          addBtn.onclick = async (e) => {
            e.stopPropagation()
            await addContact(contact.id)
            await loadConversations()
          }
          contactDiv.appendChild(addBtn)
        }
  
        contactDiv.addEventListener("click", () => openConversation(contact))
        conversationsList.appendChild(contactDiv)
      })
    }
  
    /**
     * Retourne les initiales à partir d'un email (2 premières lettres).
     * @param {string} email
     * @returns {string}
     */
    function getInitials(email) {
      return email.substring(0, 2).toUpperCase()
    }
  
    // --- INDICATEUR "EST EN TRAIN D'ÉCRIRE..." ---
    messageInput.addEventListener("input", () => {
      if (!currentContact && !currentGroup) return
  
      if (!isTyping) {
        isTyping = true
        sendTypingSignal()
      }
  
      clearTimeout(typingTimeout)
      typingTimeout = setTimeout(() => {
        isTyping = false
        sendTypingSignal(false)
      }, 1500)
    })
  
    /**
     * Envoie le signal "est en train d'écrire..." au backend.
     * @param {boolean} typing - true si l'utilisateur écrit, false sinon
     */
    async function sendTypingSignal(typing = true) {
      const formData = new FormData()
      formData.append("action", "typing")
      formData.append("fromId", currentUser.id)
      if (currentContact) formData.append("toId", currentContact.id)
      if (currentGroup) formData.append("groupId", currentGroup.id)
      formData.append("typing", typing ? "1" : "0")
  
      try {
        await fetch("api.php", { method: "POST", body: formData })
      } catch (error) {
        console.error("Erreur lors de l'envoi du signal de frappe:", error)
      }
    }
  
    /**
     * Vérifie si l'autre utilisateur/groupe est en train d'écrire et met à jour le sous-titre du chat.
     */
    async function pollTyping() {
      if (!currentContact && !currentGroup) return
  
      let url = "api.php?action=typing"
      if (currentContact) url += `&fromId=${currentContact.id}&toId=${currentUser.id}`
      if (currentGroup) url += `&groupId=${currentGroup.id}&fromId=${currentUser.id}`
  
      try {
        const resp = await fetch(url)
        const result = await resp.json()
  
        if (result.typing) {
          chatSubtitle.textContent = "est en train d'écrire..."
        } else {
          // Restaurer le sous-titre normal
          if (currentContact) {
            chatSubtitle.textContent = currentContact.lastSeen || "Hors ligne"
          } else if (currentGroup) {
            const memberCount = currentGroup.members?.length || 0
            chatSubtitle.textContent = `${memberCount} membres`
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de la frappe:", error)
      }
    }
  
    /**
     * Lance le polling régulier pour l'indicateur "est en train d'écrire...".
     */
    function startTypingPolling() {
      if (typingPollingInterval) clearInterval(typingPollingInterval)
      typingPollingInterval = setInterval(pollTyping, 2000)
    }
  
    /**
     * Ouvre une conversation avec un contact (affiche les messages, met à jour l'en-tête, etc).
     * @param {Object} contact
     */
    function openConversation(contact) {
      currentContact = contact
      currentGroup = null
  
      // Mettre en surbrillance la conversation active
      document.querySelectorAll(".conversation-item").forEach((item) => {
        item.classList.remove("active")
      })
      document.querySelector(`[data-contact-id="${contact.id}"]`)?.classList.add("active")
  
      // Mettre à jour l'en-tête du chat
      chatHeader.style.display = "flex"
      chatTitle.textContent = contact.displayName || contact.email
      chatSubtitle.textContent = contact.lastSeen || "Hors ligne"
      chatAvatar.textContent = getInitials(contact.email)
      chatAvatar.className = "avatar"
  
      // Masquer le bouton paramètres de groupe
      document.getElementById("group-settings-btn").style.display = "none"
  
      // Afficher la zone de saisie
      messageInputArea.style.display = "block"
      messageInput.disabled = false
  
      // Charger les messages et démarrer le rafraîchissement
      loadMessages()
      if (messagePollingInterval) clearInterval(messagePollingInterval)
      messagePollingInterval = setInterval(loadMessages, 3000)
      startTypingPolling()
    }
  
    /**
     * Charge les messages de la conversation courante (contact).
     */
    async function loadMessages() {
      if (!currentContact) return
  
      try {
        const response = await fetch(`api.php?action=getMessages&userId=${currentUser.id}&contactId=${currentContact.id}`)
        const result = await response.json()
  
        if (result.status === "success") {
          lastLoadedMessages = result.messages || []
          renderMessagesFiltered(searchInput.value.trim())
          messagesArea.scrollTop = messagesArea.scrollHeight
  
          // Marquer comme lus les messages reçus non lus
          const unreadIds = lastLoadedMessages
            .filter((msg) => msg.from !== currentUser.id && msg.status !== "read")
            .map((msg) => msg.id)
  
          for (const id of unreadIds) {
            await fetch("api.php", {
              method: "POST",
              body: new URLSearchParams({ action: "updateMessageStatus", messageId: id, status: "read" }),
            })
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des messages:", error)
      }
    }
  
    // --- GROUPES ---
    /**
     * Charge la liste des groupes de l'utilisateur courant et les affiche dans la sidebar.
     */
    async function loadGroups() {
      try {
        const response = await fetch(`api.php?action=getGroups&userId=${currentUser.id}`);
        const result = await response.json();
        groupsList.innerHTML = '';
        if (result.status === 'success' && result.groups) {
          result.groups.forEach(group => {
            const li = document.createElement('li');
            li.className = 'conversation-item';
            li.dataset.groupId = group.id;

            const avatar = document.createElement('div');
            avatar.className = 'avatar group';
            avatar.textContent = getInitials(group.name);

            const info = document.createElement('div');
            info.style.flex = '1';
            info.style.minWidth = '0';

            const name = document.createElement('div');
            name.style.fontWeight = '500';
            name.style.marginBottom = '4px';
            name.textContent = group.name;

            const memberCount = document.createElement('div');
            memberCount.style.fontSize = '12px';
            memberCount.style.color = 'var(--text-secondary)';
            memberCount.textContent = `${group.members.length} membre${group.members.length > 1 ? 's' : ''}`;

            info.appendChild(name);
            info.appendChild(memberCount);

            li.appendChild(avatar);
            li.appendChild(info);

            li.addEventListener('click', () => openGroupConversation(group));
            groupsList.appendChild(li);
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des groupes:', error);
      }
    }
  
    /**
     * Ouvre une conversation de groupe (affiche les messages, met à jour l'en-tête, etc).
     * @param {Object} group
     */
    function openGroupConversation(group) {
      currentGroup = group
      currentContact = null
  
      // Mettre en surbrillance le groupe actif
      document.querySelectorAll("#groups-list li").forEach((li) => {
        li.classList.remove("active")
      })
      document.querySelector(`[data-group-id="${group.id}"]`)?.classList.add("active")
  
      document.querySelectorAll(".conversation-item").forEach((item) => {
        item.classList.remove("active")
      })
  
      // Mettre à jour l'en-tête du chat
      chatHeader.style.display = "flex"
      chatTitle.textContent = group.name
      chatSubtitle.textContent = `${group.members?.length || 0} membres`
      chatAvatar.textContent = getInitials(group.name)
      chatAvatar.className = "avatar group"
  
      // Afficher le bouton paramètres de groupe
      document.getElementById("group-settings-btn").style.display = "flex"
  
      // Afficher la zone de saisie
      messageInputArea.style.display = "block"
      messageInput.disabled = false
  
      loadGroupMessages()
      if (messagePollingInterval) clearInterval(messagePollingInterval)
      messagePollingInterval = setInterval(loadGroupMessages, 3000)
      startTypingPolling()
    }
  
    /**
     * Charge les messages du groupe courant.
     */
    async function loadGroupMessages() {
      if (!currentGroup) return
  
      try {
        const response = await fetch(`api.php?action=getMessages&userId=${currentUser.id}&contactId=${currentGroup.id}`)
        const result = await response.json()
  
        if (result.status === "success") {
          lastLoadedMessages = result.messages || []
          renderMessagesFiltered(searchInput.value.trim())
          messagesArea.scrollTop = messagesArea.scrollHeight
  
          // Marquer comme lus les messages reçus non lus
          const unreadIds = lastLoadedMessages
            .filter((msg) => msg.from !== currentUser.id && msg.status !== "read")
            .map((msg) => msg.id)
  
          for (const id of unreadIds) {
            await fetch("api.php", {
              method: "POST",
              body: new URLSearchParams({ action: "updateMessageStatus", messageId: id, status: "read" }),
            })
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des messages de groupe:", error)
      }
    }
  
    // --- CRÉATION DE GROUPE ---
    createGroupBtn.addEventListener("click", async () => {
      await renderMembersCheckboxes()
      createGroupModal.classList.remove("hidden")
    })
  
    closeGroupModal.addEventListener("click", () => {
      createGroupModal.classList.add("hidden")
    })
  
    /**
     * Récupère tous les utilisateurs du XML (hors utilisateur courant).
     */
    async function fetchAllUsers() {
      try {
        const response = await fetch("database.xml")
        const text = await response.text()
        const parser = new DOMParser()
        const xml = parser.parseFromString(text, "application/xml")
  
        allUsers = Array.from(xml.querySelectorAll("user"))
          .map((u) => ({
            id: u.getAttribute("id"),
            email: u.getAttribute("email"),
            displayName: u.querySelector("displayName")?.textContent || "",
          }))
          .filter((u) => u.id !== currentUser.id)
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error)
        allUsers = []
      }
    }
  
    /**
     * Affiche les cases à cocher pour sélectionner les membres lors de la création d'un groupe.
     */
    async function renderMembersCheckboxes() {
      await fetchAllUsers()
      membersCheckboxes.innerHTML = ""
  
      allUsers.forEach((user) => {
        const label = document.createElement("label")
        const checkbox = document.createElement("input")
        checkbox.type = "checkbox"
        checkbox.value = user.id
  
        label.appendChild(checkbox)
        label.appendChild(document.createTextNode(" " + (user.displayName || user.email)))
        membersCheckboxes.appendChild(label)
      })
    }
  
    /**
     * Gère la soumission du formulaire de création de groupe.
     */
    createGroupForm.addEventListener("submit", async (e) => {
      e.preventDefault()
  
      const name = groupNameInput.value.trim()
      const memberIds = Array.from(membersCheckboxes.querySelectorAll("input[type=checkbox]:checked")).map(
        (cb) => cb.value,
      )
  
      if (!name || memberIds.length === 0) {
        alert("Veuillez saisir un nom de groupe et sélectionner au moins un membre")
        return
      }
  
      const formData = new FormData()
      formData.append("action", "createGroup")
      formData.append("adminId", currentUser.id)
      formData.append("groupName", name)
      formData.append("memberIds", memberIds.join(","))
  
      try {
        const response = await fetch("api.php", { method: "POST", body: formData })
        const result = await response.json()
  
        if (result.status === "success") {
          createGroupModal.classList.add("hidden")
          groupNameInput.value = ""
          await loadGroups()
        } else {
          alert("Erreur: " + result.message)
        }
      } catch (error) {
        alert("Erreur lors de la création du groupe")
      }
    })
  
    // --- ENVOI DE MESSAGES ---
    // --- Aperçu image + légende façon WhatsApp (modale) ---
    const imageModal = document.getElementById("image-modal")
    const modalImagePreview = document.getElementById("modal-image-preview")
    const modalImageCaption = document.getElementById("modal-image-caption")
    const sendImageBtn = document.getElementById("send-image-btn")
    const cancelImageBtn = document.getElementById("cancel-image-btn")
    const closeImageModal = document.getElementById("close-image-modal")

    // Désactiver l’ancien aperçu inline
    const imagePreviewContainer = document.getElementById("image-preview-container")
    if (imagePreviewContainer) imagePreviewContainer.style.display = "none"

    let selectedImageFile = null
    const modalFileInfo = document.getElementById("modal-file-info")
    const modalFileIcon = document.getElementById("modal-file-icon")
    const modalFileName = document.getElementById("modal-file-name")

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0]
      if (!file) {
        selectedImageFile = null
        modalImagePreview.style.display = "none"
        modalFileInfo.style.display = "none"
        modalImagePreview.src = ""
        modalImageCaption.value = ""
        imageModal.classList.add("hidden")
        return
      }
      selectedImageFile = file
      const isImage = file.type.startsWith("image/")
      if (isImage) {
        const reader = new FileReader()
        reader.onload = (e) => {
          modalImagePreview.src = e.target.result
          modalImagePreview.style.display = "block"
          modalFileInfo.style.display = "none"
          modalImageCaption.value = ""
          imageModal.classList.remove("hidden")
        }
        reader.readAsDataURL(file)
      } else {
        // Afficher icône + nom de fichier
        modalImagePreview.style.display = "none"
        // Choix icône selon extension
        const ext = file.name.split('.').pop().toLowerCase()
        let icon = "📄"
        if (["pdf"].includes(ext)) icon = "📄"
        if (["doc","docx"].includes(ext)) icon = "📝"
        if (["xls","xlsx"].includes(ext)) icon = "📊"
        if (["ppt","pptx"].includes(ext)) icon = "📈"
        if (["zip","rar","7z"].includes(ext)) icon = "🗜️"
        if (["mp3","wav"].includes(ext)) icon = "🎵"
        if (["mp4","avi","mov","mkv"].includes(ext)) icon = "🎬"
        modalFileIcon.textContent = icon
        modalFileName.textContent = file.name
        modalFileInfo.style.display = "flex"
        modalImageCaption.value = ""
        imageModal.classList.remove("hidden")
      }
    })

    function closeImageModalFn() {
      imageModal.classList.add("hidden")
      modalImagePreview.src = ""
      modalImagePreview.style.display = "none"
      modalFileInfo.style.display = "none"
      modalFileName.textContent = ""
      modalImageCaption.value = ""
      fileInput.value = ""
      selectedImageFile = null
    }
    cancelImageBtn.onclick = closeImageModalFn
    closeImageModal.onclick = closeImageModalFn

    sendImageBtn.onclick = async (e) => {
      e.preventDefault()
      if (!selectedImageFile) return
      let fileUrl = ""
      let caption = modalImageCaption.value.trim()
      const fileData = new FormData()
      fileData.append("action", "uploadFile")
      fileData.append("file", selectedImageFile)
      try {
        const uploadResp = await fetch("api.php?action=uploadFile", { method: "POST", body: fileData })
        const uploadResult = await uploadResp.json()
        if (uploadResult.status === "success") {
          fileUrl = uploadResult.fileUrl
        } else {
          alert("Erreur lors de l'upload du fichier : " + uploadResult.message)
          return
        }
      } catch (error) {
        alert("Erreur lors de l'upload du fichier")
        return
      }
      // Envoi du message image + légende
      const formData = new FormData()
      if (currentContact) {
        formData.append("action", "sendMessage")
        formData.append("fromId", currentUser.id)
        formData.append("toId", currentContact.id)
        formData.append("content", caption)
        if (fileUrl) formData.append("fileUrl", fileUrl)
        try {
          const response = await fetch("api.php", { method: "POST", body: formData })
          const result = await response.json()
          if (result.status === "success") {
            messageInput.value = ""
            fileInput.value = ""
            closeImageModalFn()
            await loadMessages()
          } else {
            alert("Erreur: " + result.message)
          }
        } catch (error) {
          alert("Erreur lors de l'envoi du message")
        }
      } else if (currentGroup) {
        formData.append("action", "sendGroupMessage")
        formData.append("fromId", currentUser.id)
        formData.append("groupId", currentGroup.id)
        formData.append("content", caption)
        if (fileUrl) formData.append("fileUrl", fileUrl)
        try {
          const response = await fetch("api.php", { method: "POST", body: formData })
          const result = await response.json()
          if (result.status === "success") {
            messageInput.value = ""
            fileInput.value = ""
            closeImageModalFn()
            await loadGroupMessages()
          } else {
            alert("Erreur: " + result.message)
          }
        } catch (error) {
          alert("Erreur lors de l'envoi du message de groupe")
        }
      }
    }
  
    // Affichage des fichiers dans les messages
    /**
     * Affiche le contenu d'un message (texte, image, fichier, légende).
     * @param {Object} msg - Message à afficher
     * @returns {HTMLElement}
     */
    function renderMessageContent(msg) {
      const container = document.createElement("div")

      if (msg.content) {
        // Si c'est une image avec légende, afficher la légende sous l'image
        if (msg.file && ["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(msg.file.split(".").pop().toLowerCase())) {
          // On affiche la légende après l'image
        } else {
          const textNode = document.createElement("div")
          textNode.textContent = msg.content
          container.appendChild(textNode)
        }
      }

      if (msg.file) {
        const ext = msg.file.split(".").pop().toLowerCase()
        if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext)) {
          const img = document.createElement("img")
          img.src = msg.file
          img.style.maxWidth = "200px"
          img.style.borderRadius = "8px"
          img.style.marginTop = "8px"
          img.style.display = "block"
          container.appendChild(img)
          // Afficher la légende sous l'image si présente
          if (msg.content) {
            const captionDiv = document.createElement("div")
            captionDiv.textContent = msg.content
            captionDiv.style.fontStyle = "italic"
            captionDiv.style.color = "var(--text-secondary)"
            captionDiv.style.marginTop = "4px"
            container.appendChild(captionDiv)
          }
        } else {
          const a = document.createElement("a")
          a.href = msg.file
          a.textContent = "📎 Télécharger le fichier"
          a.target = "_blank"
          a.style.color = "inherit"
          a.style.textDecoration = "underline"
          a.style.display = "block"
          a.style.marginTop = "8px"
          container.appendChild(a)
        }
      }

      return container
    }
  
    // Ajout d'une fonction pour afficher l'icône de statut
    /**
     * Retourne l'icône de statut d'un message (envoyé, reçu, lu).
     * @param {string} status
     * @returns {string}
     */
    function getStatusIcon(status) {
      if (status === "read") return "👁️"
      if (status === "delivered") return "✓✓"
      return "✓"
    }
  
    // Affichage du profil dans la sidebar
    /**
     * Met à jour l'affichage du profil utilisateur dans la sidebar.
     * @param {Object} user
     */
    function updateProfileSidebar(user) {
      profileAvatar.src =
        user.avatar && user.avatar !== ""
          ? user.avatar
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=2090ea&color=fff`
      profileName.textContent = user.displayName && user.displayName !== "" ? user.displayName : user.email
    }
  
    // Chargement du profil utilisateur depuis le XML
    /**
     * Récupère le profil utilisateur courant depuis le XML.
     * @returns {Promise<Object>}
     */
    async function fetchUserProfile() {
      try {
        const response = await fetch("database.xml")
        const text = await response.text()
        const parser = new DOMParser()
        const xml = parser.parseFromString(text, "application/xml")
  
        const user = Array.from(xml.querySelectorAll("user")).find((u) => u.getAttribute("id") === currentUser.id)
  
        return {
          id: user.getAttribute("id"),
          email: user.getAttribute("email"),
          displayName: user.querySelector("displayName") ? user.querySelector("displayName").textContent : "",
          avatar: user.querySelector("avatar") ? user.querySelector("avatar").textContent : "",
        }
      } catch (error) {
        console.error("Erreur lors du chargement du profil:", error)
        return {
          id: currentUser.id,
          email: currentUser.email,
          displayName: "",
          avatar: "",
        }
      }
    }
  
    // Ouvrir le modal de profil
    editProfileBtn.addEventListener("click", async () => {
      const user = await fetchUserProfile()
      modalAvatar.src =
        user.avatar && user.avatar !== ""
          ? user.avatar
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=2090ea&color=fff`
      displayNameInput.value = user.displayName
      emailInput.value = user.email
      passwordInput.value = ""
      profileModal.classList.remove("hidden")
    })
  
    closeProfileModal.addEventListener("click", () => {
      profileModal.classList.add("hidden")
    })
  
    // Mise à jour du profil
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault()
  
      try {
        // Nom d'affichage
        const displayName = displayNameInput.value.trim()
        if (displayName !== "") {
          const formData = new FormData()
          formData.append("action", "updateDisplayName")
          formData.append("userId", currentUser.id)
          formData.append("displayName", displayName)
          await fetch("api.php", { method: "POST", body: formData })
        }
  
        // Mot de passe
        const newPassword = passwordInput.value.trim()
        if (newPassword !== "") {
          const formData = new FormData()
          formData.append("action", "updatePassword")
          formData.append("userId", currentUser.id)
          formData.append("newPassword", newPassword)
          await fetch("api.php", { method: "POST", body: formData })
        }
  
        // Avatar
        if (avatarInput.files[0]) {
          const formData = new FormData()
          formData.append("action", "updateAvatar")
          formData.append("userId", currentUser.id)
          formData.append("avatar", avatarInput.files[0])
          await fetch("api.php", { method: "POST", body: formData })
        }
  
        // Rafraîchir l'affichage
        setTimeout(async () => {
          const user = await fetchUserProfile()
          updateProfileSidebar(user)
        }, 500)
  
        profileModal.classList.add("hidden")
      } catch (error) {
        alert("Erreur lors de la mise à jour du profil")
      }
    })
  
    // --- NOTIFICATIONS PUSH ---
    const lastMessageIds = new Set()
  
    async function requestNotificationPermission() {
      if ("Notification" in window && Notification.permission !== "granted") {
        await Notification.requestPermission()
      }
    }
  
    function showNotification(title, body) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body })
      }
    }
  
    // --- RECHERCHE DE MESSAGES ---
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault()
      renderMessagesFiltered(searchInput.value.trim())
    })
  
    searchInput.addEventListener("input", () => {
      if (searchInput.value.trim() === "") {
        renderMessagesFiltered("")
      }
    })
  
    function renderMessagesFiltered(query) {
      messagesArea.innerHTML = ""
  
      let filtered = lastLoadedMessages
      if (query) {
        const q = query.toLowerCase()
        filtered = filtered.filter(
          (msg) =>
            (msg.content && msg.content.toLowerCase().includes(q)) || (msg.file && msg.file.toLowerCase().includes(q)),
        )
      }
  
      if (filtered.length === 0 && query) {
        messagesArea.innerHTML = `
                  <div style="text-align: center; color: var(--text-secondary); margin-top: 50px;">
                      Aucun message trouvé pour "${query}"
                  </div>
              `
        return
      }
  
      filtered.forEach((msg) => {
        const messageDiv = document.createElement("div")
        messageDiv.classList.add("message")
        messageDiv.appendChild(renderMessageContent(msg))
  
        if (msg.from === currentUser.id) {
          messageDiv.classList.add("sent")
          const statusSpan = document.createElement("span")
          statusSpan.className = "msg-status"
          statusSpan.textContent = " " + getStatusIcon(msg.status)
          messageDiv.appendChild(statusSpan)
        } else {
          messageDiv.classList.add("received")
        }
  
        messagesArea.appendChild(messageDiv)
      })
  
      messagesArea.scrollTop = messagesArea.scrollHeight
    }
  
    // --- RECHERCHE DANS LA SIDEBAR ---
    const sidebarSearchInput = document.getElementById("sidebar-search-input")
    let allContacts = []
  
    sidebarSearchInput.addEventListener("input", async () => {
      const q = sidebarSearchInput.value.trim().toLowerCase()
  
      if (!q) {
        renderConversationsList(allContacts)
        return
      }
  
      // Filtrer les contacts existants
      const filteredContacts = allContacts.filter(
        (c) => c.email.toLowerCase().includes(q) || (c.displayName && c.displayName.toLowerCase().includes(q)),
      )
  
      // Recherche globale d'utilisateurs
      try {
        const resp = await fetch(`api.php?action=searchUsers&query=${encodeURIComponent(q)}&userId=${currentUser.id}`)
        const result = await resp.json()
  
        let allResults = [...filteredContacts]
  
        if (result.status === "success" && result.users.length > 0) {
          const contactIds = allContacts.map((c) => c.id)
          const newUsers = result.users.filter((u) => !contactIds.includes(u.id))
          allResults = [...allResults, ...newUsers]
        }
  
        renderConversationsList(allResults)
      } catch (error) {
        renderConversationsList(filteredContacts)
      }
    })
  
    async function addContact(contactId) {
      const formData = new FormData()
      formData.append("action", "addContact")
      formData.append("userId", currentUser.id)
      formData.append("contactId", contactId)
  
      try {
        await fetch("api.php", { method: "POST", body: formData })
      } catch (error) {
        console.error("Erreur lors de l'ajout du contact:", error)
      }
    }
  
    async function removeContact(contactId) {
      const formData = new FormData()
      formData.append("action", "removeContact")
      formData.append("userId", currentUser.id)
      formData.append("contactId", contactId)
  
      try {
        await fetch("api.php", { method: "POST", body: formData })
      } catch (error) {
        console.error("Erreur lors de la suppression du contact:", error)
      }
    }
  
    // --- AJOUT DE CONTACT GLOBAL ---
    const addContactBtn = document.getElementById("add-contact-btn")
    const addContactModal = document.getElementById("add-contact-modal")
    const closeAddContactModal = document.getElementById("close-add-contact-modal")
    const addContactForm = document.getElementById("add-contact-form")
    const addContactResult = document.getElementById("add-contact-result")
  
    addContactBtn.addEventListener("click", () => {
      addContactModal.classList.remove("hidden")
      addContactResult.textContent = ""
      addContactForm.reset()
    })
  
    closeAddContactModal.addEventListener("click", () => {
      addContactModal.classList.add("hidden")
    })
  
    addContactForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      addContactResult.textContent = ""
  
      const nom = document.getElementById("add-contact-name").value.trim()
      const numero = document.getElementById("add-contact-email").value.trim()
  
      if (!nom || !numero) {
        addContactResult.textContent = "Veuillez remplir tous les champs."
        return
      }
  
      const formData = new FormData()
      formData.append("action", "addGlobalContact")
      formData.append("nom", nom)
      formData.append("numero", numero)
      formData.append("userId", currentUser.id) // Ajout de l’ID utilisateur courant
  
      try {
        const resp = await fetch("api.php", { method: "POST", body: formData })
        const result = await resp.json()
  
        if (result.status === "success") {
          addContactModal.classList.add("hidden")
          await loadConversations()
        } else {
          addContactResult.textContent = result.message
        }
      } catch (error) {
        addContactResult.textContent = "Erreur lors de l'ajout du contact"
      }
    })
  
    // --- PARAMÈTRES DE GROUPE ---
    const groupSettingsBtn = document.getElementById("group-settings-btn")
    const groupSettingsModal = document.getElementById("group-settings-modal")
    const closeGroupSettingsModal = document.getElementById("close-group-settings-modal")
    const groupMembersList = document.getElementById("group-members-list")
    const addGroupMemberBtn = document.getElementById("add-group-member-btn")
    const deleteGroupBtn = document.getElementById("delete-group-btn")
  
    groupSettingsBtn.addEventListener("click", openGroupSettingsModal)
    closeGroupSettingsModal.addEventListener("click", () => {
      groupSettingsModal.classList.add("hidden")
    })
  
    /**
     * Gère l'ouverture de la modale de gestion du groupe (affiche membres, infos, etc).
     */
    async function openGroupSettingsModal() {
      if (!currentGroup) return

      // Rafraîchir la liste des utilisateurs pour l’ajout de membres
      await fetchAllUsers()

      // Mettre à jour les informations du groupe
      document.getElementById("modal-group-avatar").textContent = getInitials(currentGroup.name)
      document.getElementById("modal-group-name").textContent = currentGroup.name
      document.getElementById("modal-group-members-count").textContent = `${currentGroup.members?.length || 0} membres`

      await renderGroupMembersList()

      // Afficher le bouton suppression seulement si admin
      if (currentGroup.admin === currentUser.id) {
        deleteGroupBtn.style.display = "block"
      } else {
        deleteGroupBtn.style.display = "none"
      }

      groupSettingsModal.classList.remove("hidden")
    }
  
    /**
     * Affiche la liste des membres du groupe courant dans la modale.
     */
    async function renderGroupMembersList() {
      if (!currentGroup) return
  
      try {
        const response = await fetch("database.xml")
        const text = await response.text()
        const parser = new DOMParser()
        const xml = parser.parseFromString(text, "application/xml")
  
        const group = Array.from(xml.querySelectorAll("group")).find((g) => g.getAttribute("id") === currentGroup.id)
        if (!group) return
  
        const adminId = group.getAttribute("admin")
        const members = Array.from(group.querySelectorAll("members > memberId"))
  
        groupMembersList.innerHTML = ""
  
        for (const member of members) {
          const userId = member.textContent
          const user = Array.from(xml.querySelectorAll("user")).find((u) => u.getAttribute("id") === userId)
          const email = user ? user.getAttribute("email") : userId
          const displayName = user?.querySelector("displayName")?.textContent || ""
  
          const memberDiv = document.createElement("div")
          memberDiv.className = "member-item"
  
          const avatar = document.createElement("div")
          avatar.className = "avatar"
          avatar.textContent = getInitials(email)
  
          const info = document.createElement("div")
          info.className = "member-info"
  
          const name = document.createElement("div")
          name.className = "member-name"
          name.textContent = displayName || email
          if (userId === currentUser.id) name.textContent += " (Vous)"
  
          const role = document.createElement("div")
          role.className = "member-role"
          if (userId === adminId) {
            role.innerHTML = '<span class="admin-badge">Admin</span>'
          } else {
            role.textContent = "Membre"
          }
  
          info.appendChild(name)
          info.appendChild(role)
  
          const actions = document.createElement("div")
          actions.className = "member-actions"
  
          if (currentUser.id === adminId && userId !== adminId && userId !== currentUser.id) {
            const removeBtn = document.createElement("button")
            removeBtn.className = "member-action-btn remove"
            removeBtn.textContent = "🗑️"
            removeBtn.title = "Retirer du groupe"
            removeBtn.onclick = async () => {
              if (confirm("Retirer ce membre du groupe ?")) {
                await removeMemberFromGroup(userId)
              }
            }
            actions.appendChild(removeBtn)
          }
  
          memberDiv.appendChild(avatar)
          memberDiv.appendChild(info)
          memberDiv.appendChild(actions)
  
          groupMembersList.appendChild(memberDiv)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des membres:", error)
      }
    }
  
    /**
     * Retire un membre du groupe courant.
     * @param {string} memberId
     */
    async function removeMemberFromGroup(memberId) {
      const formData = new FormData()
      formData.append("action", "removeGroupMember")
      formData.append("groupId", currentGroup.id)
      formData.append("memberId", memberId)
  
      try {
        const resp = await fetch("api.php", { method: "POST", body: formData })
        const result = await resp.json()
  
        if (result.status === "success") {
          await renderGroupMembersList()
          await loadGroups()
        } else {
          alert(result.message)
        }
      } catch (error) {
        alert("Erreur lors de la suppression du membre")
      }
    }
  
    /**
     * Ajoute un membre au groupe courant (prompt natif).
     */
    addGroupMemberBtn.onclick = async () => {
      if (!currentGroup) return;
      try {
        // Charger les contacts de l'utilisateur
        const response = await fetch('database.xml');
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'application/xml');
        // Contacts de l'utilisateur (structure d'origine)
        const userNode = Array.from(xml.querySelectorAll('user')).find(u => u.getAttribute('id') === currentUser.id);
        const contacts = userNode ? Array.from(userNode.querySelectorAll('contacts > contactId')).map(c => c.textContent) : [];
        // Membres du groupe
        const group = Array.from(xml.querySelectorAll('group')).find(g => g.getAttribute('id') === currentGroup.id);
        const members = group ? Array.from(group.querySelectorAll('members > memberId')).map(m => m.textContent) : [];
        // Contacts non membres
        const contactsNotInGroup = contacts.filter(cid => !members.includes(cid));
        if (contactsNotInGroup.length === 0) {
          alert('Aucun contact à ajouter.');
          return;
        }
        // Afficher une liste de sélection
        const allUsers = Array.from(xml.querySelectorAll('user'));
        const options = contactsNotInGroup.map(cid => {
          const user = allUsers.find(u => u.getAttribute('id') === cid);
          return user ? `${user.getAttribute('email')}|${cid}` : null;
        }).filter(Boolean);
        const choice = prompt('Sélectionnez un contact à ajouter :\n' + options.map(o => o.split('|')[0]).join('\n'));
        const selected = options.find(o => o.split('|')[0] === choice);
        if (!selected) return;
        const selectedId = selected.split('|')[1];
        const formData = new FormData();
        formData.append('action', 'addGroupMember');
        formData.append('groupId', currentGroup.id);
        formData.append('memberId', selectedId);
        const resp = await fetch('api.php', { method: 'POST', body: formData });
        const result = await resp.json();
        if (result.status === 'success') {
          await renderGroupMembersList();
          await loadGroups();
        } else {
          alert(result.message);
        }
      } catch (error) {
        alert("Erreur lors de l'ajout du membre");
      }
    };
  
    /**
     * Supprime le groupe courant.
     */
    deleteGroupBtn.onclick = async () => {
      if (!currentGroup) return
      if (!confirm("Supprimer ce groupe ? Cette action est irréversible.")) return
  
      const formData = new FormData()
      formData.append("action", "deleteGroup")
      formData.append("groupId", currentGroup.id)
      formData.append("userId", currentUser.id)
  
      try {
        const resp = await fetch("api.php", { method: "POST", body: formData })
        const result = await resp.json()
  
        if (result.status === "success") {
          groupSettingsModal.classList.add("hidden")
          currentGroup = null
          chatHeader.style.display = "none"
          messageInputArea.style.display = "none"
          showWelcomeMessage()
          await loadGroups()
        } else {
          alert(result.message)
        }
      } catch (error) {
        alert("Erreur lors de la suppression du groupe")
      }
    }
  
    // Fermer les modals en cliquant à l'extérieur
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        e.target.classList.add("hidden")
      }
    })
  
    // Initialiser les permissions de notification
    requestNotificationPermission()
  })
  