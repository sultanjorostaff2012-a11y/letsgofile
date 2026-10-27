// --- ТЕМНАЯ ТЕМА ---
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('lgs_theme', isDark ? 'dark' : 'light');
    document.getElementById('themeBtn').innerText = isDark ? 'Светлая тема' : 'Тёмная тема';
}

if (localStorage.getItem('lgs_theme') === 'dark') {
    document.body.classList.add('dark-theme');
    document.getElementById('themeBtn').innerText = 'Светлая тема';
}

// --- ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ---
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    
    if (tabName === 'sent') renderHistory();
    if (tabName === 'inbox') renderInbox();
    if (tabName === 'mydisk') renderMyDisk();
    if (tabName === 'account') checkUser();
}

// --- РАБОТА С ФАЙЛОМ ---
const fileInput = document.getElementById('fileInput');
const fileDetails = document.getElementById('fileDetails');
let selectedFile = null;
let fileDataBase64 = null;

fileInput.addEventListener('change', function(e) {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = function(event) { fileDataBase64 = event.target.result; };
        reader.readAsDataURL(selectedFile);
        let size = (selectedFile.size / (1024 * 1024)).toFixed(2);
        fileDetails.style.display = 'block';
        fileDetails.innerHTML = `<strong>Файл:</strong> ${selectedFile.name}<br><strong>Размер:</strong> ${size} МБ`;
    }
});

// --- БАЗА ПОЛЬЗОВАТЕЛЕЙ ---
function getUsers() { return JSON.parse(localStorage.getItem('lgs_users')) || []; }
function saveUsers(users) { localStorage.setItem('lgs_users', JSON.stringify(users)); }

// --- РЕГИСТРАЦИЯ / ВХОД ---
function registerUser() {
    const name = document.getElementById('regName').value.trim();
    const surname = document.getElementById('regSurname').value.trim();
    const patronymic = document.getElementById('regPatronymic').value.trim();
    const nickname = document.getElementById('regNickname').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const age = document.getElementById('regAge').value;
    const email = document.getElementById('regEmail').value.trim();

    if (!name || !surname || !nickname || !age || !password) { alert("Заполните обязательные поля!"); return; }

    const engRegex = /^[a-zA-Z0-9_]+$/;
    if (!engRegex.test(nickname)) { alert("Никнейм только на английском!"); return; }

    let users = getUsers();
    if (users.find(u => u.nickname === nickname)) { alert("Никнейм занят!"); return; }

    const newUser = { name, surname, patronymic, nickname, password, age, email, avatar: null, nickChanges: 0 };
    users.push(newUser);
    saveUsers(users);
    alert("Регистрация успешна!");
    document.getElementById('loginNickname').value = nickname;
}

function loginUser() {
    const nickname = document.getElementById('loginNickname').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    
    const engRegex = /^[a-zA-Z0-9_]+$/;
    if (!engRegex.test(nickname)) { alert("Никнейм только на английском!"); return; }

    let users = getUsers();
    const user = users.find(u => u.nickname === nickname);

    if (user) {
        if (user.password === password) {
            localStorage.setItem('lgs_currentUser', JSON.stringify(user));
            checkUser();
        } else { alert("Неверный пароль!"); }
    } else { alert("Пользователь не найден!"); }
}

function checkUser() {
    const user = JSON.parse(localStorage.getItem('lgs_currentUser'));
    const authForms = document.getElementById('authForms');
    const profileBox = document.getElementById('profileBox');

    if (user) {
        authForms.style.display = 'none';
        profileBox.style.display = 'block';
        document.getElementById('profileName').innerText = `${user.surname} ${user.name}`;
        document.getElementById('profileNickname').innerText = `@${user.nickname}`;
        document.getElementById('profileAge').innerText = `Возраст: ${user.age}`;
        
        const avatarDiv = document.getElementById('profileAvatar');
        if (user.avatar) {
            if (user.avatar.length < 5) {
                avatarDiv.style.backgroundImage = 'none';
                avatarDiv.innerText = user.avatar; 
            } else {
                avatarDiv.style.backgroundImage = `url(${user.avatar})`;
                avatarDiv.innerText = ''; 
            }
        } else {
            avatarDiv.style.backgroundImage = 'none';
            avatarDiv.innerText = user.name.charAt(0).toUpperCase(); 
        }
        
        document.getElementById('nickChangeLeft').innerText = 2 - (user.nickChanges || 0);
        checkInbox();
    } else {
        authForms.style.display = 'flex';
        profileBox.style.display = 'none';
    }
}

// --- НАСТРОЙКИ ---
function toggleSettings() {
    const box = document.getElementById('settingsBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

function setPresetAvatar(emoji) {
    let currentUser = JSON.parse(localStorage.getItem('lgs_currentUser'));
    currentUser.avatar = emoji; 
    localStorage.setItem('lgs_currentUser', JSON.stringify(currentUser));

    let users = getUsers();
    const index = users.findIndex(u => u.nickname === currentUser.nickname);
    if (index !== -1) { users[index].avatar = emoji; saveUsers(users); }
    checkUser();
    alert("Аватарка обновлена!");
}

function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        let currentUser = JSON.parse(localStorage.getItem('lgs_currentUser'));
        currentUser.avatar = base64Image;
        localStorage.setItem('lgs_currentUser', JSON.stringify(currentUser));
        let users = getUsers();
        const index = users.findIndex(u => u.nickname === currentUser.nickname);
        if (index !== -1) { users[index].avatar = base64Image; saveUsers(users); }
        checkUser();
        alert("Аватарка обновлена!");
    };
    reader.readAsDataURL(file);
}

function saveSettings() {
    let currentUser = JSON.parse(localStorage.getItem('lgs_currentUser'));
    let users = getUsers();
    let userIndex = users.findIndex(u => u.nickname === currentUser.nickname);

    const newName = document.getElementById('editName').value.trim();
    const newSurname = document.getElementById('editSurname').value.trim();
    const newAge = document.getElementById('editAge').value;
    const newNickname = document.getElementById('editNickname').value.trim().toLowerCase();

    if (newName) currentUser.name = newName;
    if (newSurname) currentUser.surname = newSurname;
    if (newAge) currentUser.age = newAge;

    if (newNickname && newNickname !== currentUser.nickname) {
        const engRegex = /^[a-zA-Z0-9_]+$/;
        if (!engRegex.test(newNickname)) { alert("Никнейм только на английском!"); return; }
        if (currentUser.nickChanges >= 2) { alert("Вы использовали все 2 попытки!"); return; }
        if (users.find(u => u.nickname === newNickname)) { alert("Никнейм занят!"); return; }
        
        currentUser.nickname = newNickname;
        currentUser.nickChanges = (currentUser.nickChanges || 0) + 1;
    }

    users[userIndex] = currentUser;
    saveUsers(users);
    localStorage.setItem('lgs_currentUser', JSON.stringify(currentUser));
    alert("Настройки сохранены!");
    document.getElementById('editName').value = '';
    document.getElementById('editSurname').value = '';
    document.getElementById('editAge').value = '';
    document.getElementById('editNickname').value = '';
    checkUser();
}

function logoutConfirm() {
    if (confirm("Вы точно хотите выйти из аккаунта?")) {
        localStorage.removeItem('lgs_currentUser');
        checkUser();
    }
}

// --- ОТПРАВКА ---
function sendFile() {
    if (!selectedFile || !fileDataBase64) { alert("Файл еще обрабатывается!"); return; }
    
    const recipientNick = document.getElementById('recipientInput').value.trim().toLowerCase();
    if (!recipientNick) { alert("Введите никнейм!"); return; }

    let users = getUsers();
    const recipient = users.find(u => u.nickname === recipientNick);
    let currentUser = JSON.parse(localStorage.getItem('lgs_currentUser'));

    if (!recipient && recipientNick !== currentUser.nickname) {
        document.getElementById('recipientStatus').innerHTML = `<span class="status-error">Пользователь не найден!</span>`;
        return;
    }

    let topic = "Без темы";
    const selectedRadio = document.querySelector('input[name="topic"]:checked');
    const customTopic = document.getElementById('customTopicInput').value.trim();
    if (customTopic) topic = customTopic; 
    else if (selectedRadio) topic = selectedRadio.value;

    let allMessages = JSON.parse(localStorage.getItem('lgs_messages')) || [];
    const now = new Date();
    
    allMessages.push({
        to: recipientNick,
        from: currentUser.nickname,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar || null,
        fileName: selectedFile.name,
        fileData: fileDataBase64,
        fileSize: (selectedFile.size / (1024 * 1024)).toFixed(2),
        message: document.getElementById('messageInput').value,
        topic: topic,
        date: now.toLocaleDateString() + ' ' + now.toLocaleTimeString()
    });
    localStorage.setItem('lgs_messages', JSON.stringify(allMessages));

    document.getElementById('recipientStatus').innerHTML = `<span class="status-success">Отправлено!</span>`;
    selectedFile = null;
    fileDataBase64 = null;
    fileInput.value = '';
    fileDetails.style.display = 'none';
    document.getElementById('messageInput').value = '';
    document.getElementById('customTopicInput').value = '';
    document.querySelectorAll('input[name="topic"]').forEach(r => r.checked = false);
    alert("Файл отправлен!");
}

// --- ОЧИСТКА ---
function clearInbox() {
    if (!confirm("Очистить все входящие файлы?")) return;
    let user = JSON.parse(localStorage.getItem('lgs_currentUser'));
    let messages = JSON.parse(localStorage.getItem('lgs_messages')) || [];
    let newMessages = messages.filter(m => m.to !== user.nickname);
    localStorage.setItem('lgs_messages', JSON.stringify(newMessages));
    renderInbox(); checkInbox();
}

function clearHistory() {
    if (!confirm("Очистить историю отправок?")) return;
    let user = JSON.parse(localStorage.getItem('lgs_currentUser'));
    let messages = JSON.parse(localStorage.getItem('lgs_messages')) || [];
    let newMessages = messages.filter(m => m.from !== user.nickname);
    localStorage.setItem('lgs_messages', JSON.stringify(newMessages));
    renderHistory();
}

// --- ВХОДЯЩИЕ ---
function checkInbox() {
    const user = JSON.parse(localStorage.getItem('lgs_currentUser'));
    if (!user) return;
    let messages = JSON.parse(localStorage.getItem('lgs_messages')) || [];
    let count = messages.filter(m => m.to === user.nickname).length;
    const badge = document.getElementById('inboxBadge');
    badge.style.display = count > 0 ? 'inline-block' : 'none';
    if (count > 0) badge.innerText = count;
}

function renderInbox() {
    const user = JSON.parse(localStorage.getItem('lgs_currentUser'));
    const list = document.getElementById('inboxList');
    if (!user) { list.innerHTML = '<p>Войдите в аккаунт!</p>'; return; }

    let messages = JSON.parse(localStorage.getItem('lgs_messages')) || [];
    let myMessages = messages.filter(m => m.to === user.nickname).reverse();

    if (myMessages.length === 0) { list.innerHTML = '<p>Пусто.</p>'; return; }

    list.innerHTML = myMessages.map((m, index) => {
        let users = JSON.parse(localStorage.getItem('lgs_users')) || [];
        let senderData = users.find(u => u.nickname === m.from);
        let avatarUrl = m.senderAvatar;
        let avatarHtml = '';
        
        if (avatarUrl) {
            if (avatarUrl.length < 5) avatarHtml = `<div class="inbox-avatar-large">${avatarUrl}</div>`;
            else avatarHtml = `<div class="inbox-avatar-large" style="background-image: url(${avatarUrl})"></div>`;
        } else {
            avatarHtml = `<div class="inbox-avatar-large">${m.senderName.charAt(0)}</div>`;
        }

        return `
        <div class="inbox-card-full">
            <div class="inbox-header">
                ${avatarHtml}
                <div class="inbox-user-info">
                    <h3>@${m.from}</h3>
                    <p>${senderData ? senderData.surname : ''} ${m.senderName}</p>
                </div>
            </div>
            <div class="inbox-body">
                <p><span style="background:#e67e22; color:white; padding: 2px 8px; border-radius: 10px; font-size:12px;">${m.topic}</span></p>
                <p><strong>Файл:</strong> ${m.fileName} (${m.fileSize} МБ)</p>
                <p><strong>Сообщение:</strong> ${m.message || 'Нет'}</p>
                <p class="inbox-date">${m.date}</p>
            </div>
            <div class="inbox-actions">
                <button class="btn-download" onclick="downloadFile(${index})">Скачать</button>
                <button class="btn-delete" onclick="deleteMessage(${index})">Удалить</button>
            </div>
        </div>`;
    }).join('');
}

// --- СКАЧИВАНИЕ И УДАЛЕНИЕ ---
function downloadFile(index) {
    const user = JSON.parse(localStorage.getItem('lgs_currentUser'));
    let messages = JSON.parse(localStorage.getItem('lgs_messages')) || [];
    let myMessages = messages.filter(m => m.to === user.nickname).reverse();

    const msg = myMessages[index];
    if (!msg || !msg.fileData) { alert("Файл не найден!"); return; }

    const a = document.createElement('a');
    a.href = msg.fileData;
    a.download = msg.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function deleteMessage(index) {
    if (!confirm("Удалить этот файл?")) return;

    const user = JSON.parse(localStorage.getItem('lgs_currentUser'));
    let messages = JSON.parse(localStorage.getItem('lgs_messages')) || [];
    let myMessages = messages.filter(m => m.to === user.nickname).reverse();
    const msgToDelete = myMessages[index];

    let allMessages = messages.filter(m => !(m.to === msgToDelete.to && m.date === msgToDelete.date && m.fileName === msgToDelete.fileName));
    localStorage.setItem('lgs_messages', JSON.stringify(allMessages));
    renderInbox();
    checkInbox();
}

// --- МОЙ ДИСК ---
function renderMyDisk() {
    const user = JSON.parse(localStorage.getItem('lgs_currentUser'));
    const list = document.getElementById('myDiskList');
    if (!user) { list.innerHTML = '<p>Войдите в аккаунт!</p>'; return; }

    let messages = JSON.parse(localStorage.getItem('lgs_messages')) || [];
    let myFiles = messages.filter(m => m.to === user.nickname && m.from === user.nickname).reverse();

    if (myFiles.length === 0) { list.innerHTML = '<p>На вашем диске пока нет файлов (отправьте файл самому себе).</p>'; return; }

    list.innerHTML = myFiles.map((m) => `
        <div class="inbox-card-full">
            <div class="inbox-body">
                <p><strong>Файл:</strong> ${m.fileName} (${m.fileSize} МБ)</p>
                <p><strong>Тема:</strong> ${m.topic}</p>
                <p><strong>Сообщение:</strong> ${m.message || 'Нет'}</p>
                <p class="inbox-date">${m.date}</p>
            </div>
        </div>
    `).join('');
}

// --- ИСТОРИЯ ОТПРАВОК ---
function renderHistory() {
    const user = JSON.parse(localStorage.getItem('lgs_currentUser'));
    if (!user) { document.getElementById('historyList').innerHTML = '<li>Войдите в аккаунт!</li>'; return; }

    let messages = JSON.parse(localStorage.getItem('lgs_messages')) || [];
    let mySent = messages.filter(m => m.from === user.nickname && m.to !== user.nickname).reverse();

    const list = document.getElementById('historyList');
    if (mySent.length === 0) { list.innerHTML = '<li>Вы еще никому не отправляли файлы.</li>'; return; }

    list.innerHTML = mySent.map(m => `
        <li>
            <span style="background:#34495e; color:white; padding: 2px 8px; border-radius: 10px; font-size:12px;">${m.topic}</span><br>
            <strong>${m.fileName}</strong> (${m.fileSize} МБ)<br>
            Кому: @${m.to}<br>
            <small>${m.date}</small>
            ${m.message ? `<br><em>Сообщение: ${m.message}</em>` : ''}
        </li>
    `).join('');
}

// Инициализация
checkUser();