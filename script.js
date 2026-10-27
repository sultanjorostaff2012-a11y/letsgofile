const SUPABASE_URL = 'https://llqlrjfqlzorfyecrtay.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yqhRKQRL_nk41fCRrFpFhA_jQIEthvh'; // Вставь свой полный ключ
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedFile = null;
let presenceChannel = null; // Канал для статусов

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

// --- РАБОТА С ФАЙЛОМ (ПРОВЕРКА 50 МБ) ---
const fileInput = document.getElementById('fileInput');
const fileDetails = document.getElementById('fileDetails');
fileInput.addEventListener('change', function(e) {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        // ПРОВЕРКА РАЗМЕРА
        if (selectedFile.size > 50 * 1024 * 1024) {
            alert("Файл слишком большой! Максимум 50 МБ.");
            selectedFile = null;
            fileInput.value = '';
            fileDetails.style.display = 'none';
            return;
        }
        let size = (selectedFile.size / (1024 * 1024)).toFixed(2);
        fileDetails.style.display = 'block';
        fileDetails.innerHTML = `<strong>Файл:</strong> ${selectedFile.name}<br><strong>Размер:</strong> ${size} МБ`;
    }
});

// --- РЕГИСТРАЦИЯ ---
async function registerUser() {
    const name = document.getElementById('regName').value.trim();
    const surname = document.getElementById('regSurname').value.trim();
    const patronymic = document.getElementById('regPatronymic').value.trim();
    const nickname = document.getElementById('regNickname').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const age = document.getElementById('regAge').value;
    const email = document.getElementById('regEmail').value.trim();

    if (!name || !surname || !nickname || !age || !password || !email) { alert("Заполните ВСЕ поля!"); return; }
    const engRegex = /^[a-zA-Z0-9_]+$/;
    if (!engRegex.test(nickname)) { alert("Никнейм только на английском!"); return; }

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });
    if (authError) { alert("Ошибка регистрации: " + authError.message); return; }

    const { error: profileError } = await supabaseClient.from('profiles').insert([{ 
        id: authData.user.id, name, surname, patronymic, nickname, age, email, avatar: null, nick_changes: 0, status: 'online' 
    }]);

    if (profileError) { alert("Ошибка профиля: " + profileError.message); return; }
    alert("Регистрация успешна! Теперь войдите.");
}

// --- ВХОД ---
async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { alert("Ошибка входа: " + error.message); return; }
    await loadProfile(data.user.id);
}

async function loadProfile(userId) {
    const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    if (error) { alert("Ошибка профиля: " + error.message); return; }
    localStorage.setItem('lgs_profile', JSON.stringify(data));
    checkUser();
    initPresence(data); // Запускаем статус
}

// --- ПРОВЕРКА СЕССИИ ---
async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const profile = JSON.parse(localStorage.getItem('lgs_profile'));
    const authForms = document.getElementById('authForms');
    const profileBox = document.getElementById('profileBox');

    if (session && profile) {
        authForms.style.display = 'none';
        profileBox.style.display = 'block';
        document.getElementById('profileName').innerText = `${profile.surname} ${profile.name} ${profile.patronymic || ''}`;
        document.getElementById('profileNickname').innerText = `@${profile.nickname}`;
        document.getElementById('profileAge').innerText = `Возраст: ${profile.age}`;
        
        const avatarDiv = document.getElementById('profileAvatar');
        if (profile.avatar) {
            avatarDiv.style.backgroundImage = `url(${profile.avatar})`;
            avatarDiv.innerText = ''; 
        } else {
            avatarDiv.style.backgroundImage = 'none';
            avatarDiv.innerText = profile.name.charAt(0).toUpperCase(); 
        }
        document.getElementById('nickChangeLeft').innerText = 2 - (profile.nick_changes || 0);
        
        // Ставим выбранный статус в селект
        if(document.getElementById('editStatus')) {
            document.getElementById('editStatus').value = profile.status || 'online';
        }
        checkInbox();
    } else {
        authForms.style.display = 'flex';
        profileBox.style.display = 'none';
    }
}

// --- НАСТРОЙКИ (СОХРАНЕНИЕ СТАТУСА) ---
function toggleSettings() {
    const box = document.getElementById('settingsBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function saveSettings() {
    let profile = JSON.parse(localStorage.getItem('lgs_profile'));
    if (!profile) return;

    const newName = document.getElementById('editName').value.trim();
    const newSurname = document.getElementById('editSurname').value.trim();
    const newAge = document.getElementById('editAge').value;
    const newNickname = document.getElementById('editNickname').value.trim().toLowerCase();
    const newBio = document.getElementById('editBio').value.trim();
    const newStatus = document.getElementById('editStatus').value;

    let updateData = {};
    if (newName) updateData.name = newName;
    if (newSurname) updateData.surname = newSurname;
    if (newAge) updateData.age = newAge;
    if (newBio) updateData.bio = newBio;
    if (newStatus) updateData.status = newStatus; // Сохраняем статус

    if (newNickname && newNickname !== profile.nickname) {
        const engRegex = /^[a-zA-Z0-9_]+$/;
        if (!engRegex.test(newNickname)) { alert("Никнейм только на английском!"); return; }
        if (profile.nick_changes >= 2) { alert("Вы использовали все 2 попытки!"); return; }
        const { data: existing } = await supabaseClient.from('profiles').select('id').eq('nickname', newNickname);
        if (existing && existing.length > 0) { alert("Никнейм занят!"); return; }
        updateData.nickname = newNickname;
        updateData.nick_changes = (profile.nick_changes || 0) + 1;
    }

    if (Object.keys(updateData).length === 0) { alert("Вы ничего не изменили."); return; }

    const { error } = await supabaseClient.from('profiles').update(updateData).eq('id', profile.id);
    if (error) { alert("Ошибка сохранения: " + error.message); return; }

    profile = { ...profile, ...updateData };
    localStorage.setItem('lgs_profile', JSON.stringify(profile));
    
    alert("Настройки сохранены!");
    checkUser();
    // Обновляем статус в реальном времени
    if(presenceChannel) {
        await presenceChannel.track({ user_id: profile.id, nickname: profile.nickname, status: newStatus });
    }
}

// --- ЗАГРУЗКА АВАТАРКИ ---
async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { error } = await supabaseClient.from('profiles').update({ avatar: base64Image }).eq('id', user.id);
        if (error) { alert("Ошибка: " + error.message); return; }
        let profile = JSON.parse(localStorage.getItem('lgs_profile'));
        profile.avatar = base64Image;
        localStorage.setItem('lgs_profile', JSON.stringify(profile));
        checkUser();
        alert("Аватарка обновлена!");
    };
    reader.readAsDataURL(file);
}

// --- ОТПРАВКА ФАЙЛА ---
async function sendFile() {
    if (!selectedFile) { alert("Выберите файл!"); return; }
    const recipientNick = document.getElementById('recipientInput').value.trim().toLowerCase();
    if (!recipientNick) { alert("Введите никнейм!"); return; }

    const { data: recData, error: recError } = await supabaseClient.from('profiles').select('id').eq('nickname', recipientNick).single();
    if (recError || !recData) { alert("Пользователь не найден!"); return; }

    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${Date.now()}_${recipientNick}.${fileExt}`;
    
    let progressBar = document.getElementById('uploadProgress');
    if (!progressBar) {
        progressBar = document.createElement('progress');
        progressBar.id = 'uploadProgress';
        progressBar.value = 0;
        progressBar.max = 100;
        progressBar.style.width = '100%';
        progressBar.style.marginTop = '10px';
        document.querySelector('.send-btn').parentNode.insertBefore(progressBar, document.querySelector('.send-btn'));
    }
    progressBar.style.display = 'block';

    const { error: uploadError } = await supabaseClient.storage.from('files').upload(fileName, selectedFile, {
        onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            progressBar.value = percent;
        }
    });

    if (uploadError) { progressBar.style.display = 'none'; alert("Ошибка загрузки: " + uploadError.message); return; }

    const { data: urlData } = supabaseClient.storage.from('files').getPublicUrl(fileName);
    const { data: { user } } = await supabaseClient.auth.getUser();
    const topic = document.getElementById('customTopicInput').value || document.querySelector('input[name="topic"]:checked')?.value || "Без темы";
    
    const { error: msgError } = await supabaseClient.from('messages').insert([{
        sender_id: user.id, recipient_id: recData.id, file_name: selectedFile.name,
        file_url: urlData.publicUrl, file_size: (selectedFile.size / (1024 * 1024)).toFixed(2),
        message: document.getElementById('messageInput').value, topic: topic
    }]);

    progressBar.style.display = 'none';
    if (msgError) { alert("Ошибка отправки: " + msgError.message); return; }
    alert("Файл успешно отправлен!");
    
    selectedFile = null; fileInput.value = ''; fileDetails.style.display = 'none';
    document.getElementById('messageInput').value = ''; document.getElementById('customTopicInput').value = '';
    document.querySelectorAll('input[name="topic"]').forEach(r => r.checked = false);
}

// --- PRESENCE (СТАТУСЫ ОНЛАЙН) ---
async function initPresence(profile) {
    if (presenceChannel) return; // Уже запущен

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    presenceChannel = supabaseClient.channel('online-users', {
        config: { presence: { key: profile.id } }
    });

    presenceChannel.on('presence', { event: 'sync' }, () => {
        // Можно обновлять список онлайн, если нужно
    });

    presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ 
                user_id: profile.id,
                nickname: profile.nickname, 
                status: profile.status || 'online' 
            });
        }
    });
}

// --- ВХОДЯЩИЕ ---
async function checkInbox() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const { data } = await supabaseClient.from('messages').select('id').eq('recipient_id', user.id);
    const badge = document.getElementById('inboxBadge');
    if (data && data.length > 0) {
        badge.style.display = 'inline-block';
        badge.innerText = data.length;
    } else {
        badge.style.display = 'none';
    }
}

async function renderInbox() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient.from('messages').select(`*, sender:sender_id (nickname, name, surname, avatar)`).eq('recipient_id', user.id).order('created_at', { ascending: false });

    const list = document.getElementById('inboxList');
    if (error) { list.innerHTML = '<p>Ошибка загрузки.</p>'; return; }
    if (data.length === 0) { list.innerHTML = '<p>Пусто.</p>'; return; }

    list.innerHTML = data.map(m => `
        <div class="inbox-card-full">
            <div class="inbox-header">
                <div class="inbox-avatar-large" style="cursor:pointer; ${m.sender.avatar ? `background-image: url(${m.sender.avatar})` : ''}" onclick="openProfile('${m.sender.nickname}')">
                    ${!m.sender.avatar ? m.sender.name.charAt(0) : ''}
                </div>
                <div class="inbox-user-info">
                    <h3 style="cursor:pointer; text-decoration:underline;" onclick="openProfile('${m.sender.nickname}')">@${m.sender.nickname}</h3>
                    <p>${m.sender.surname} ${m.sender.name}</p>
                </div>
            </div>
            <div class="inbox-body">
                <p><span style="background:#e67e22; color:white; padding: 2px 8px; border-radius: 10px; font-size:12px;">${m.topic}</span></p>
                <p><strong>Файл:</strong> ${m.file_name} (${m.file_size} МБ)</p>
                <p><strong>Сообщение:</strong> ${m.message || 'Нет'}</p>
            </div>
            <div class="inbox-actions">
                <a href="${m.file_url}" target="_blank" class="btn-download">Скачать</a>
                <button class="btn-delete" onclick="deleteMessage(${m.id})">Удалить</button>
            </div>
        </div>
    `).join('');
}

// --- МОДАЛКА ПРОФИЛЯ (СО СТАТУСОМ) ---
async function openProfile(nickname) {
    const { data, error } = await supabaseClient.from('profiles').select('*').eq('nickname', nickname).single();
    if (error || !data) { alert("Ошибка загрузки профиля"); return; }

    document.getElementById('modalName').innerText = `${data.surname} ${data.name}`;
    document.getElementById('modalNickname').innerText = `@${data.nickname}`;
    document.getElementById('modalAge').innerText = `Возраст: ${data.age}`;
    document.getElementById('modalBio').innerText = data.bio || "Пользователь не добавил описание.";
    
    // Статус
    let statusText = "🟢 Онлайн";
    if (data.status === 'busy') statusText = "🔴 Занят";
    if (data.status === 'dnd') statusText = "🟡 Не беспокоить";
    if (data.status === 'invisible') statusText = "⚫ Невидимка";
    document.getElementById('modalStatus').innerText = statusText;

    const date = new Date(data.created_at).toLocaleDateString('ru-RU');
    document.getElementById('modalDate').innerText = `Зарегистрирован: ${date}`;

    const avatarDiv = document.getElementById('modalAvatar');
    if (data.avatar) {
        avatarDiv.style.backgroundImage = `url(${data.avatar})`;
        avatarDiv.innerText = '';
    } else {
        avatarDiv.style.backgroundImage = 'none';
        avatarDiv.innerText = data.name.charAt(0).toUpperCase();
    }
    document.getElementById('profileModal').style.display = 'flex';
}
function closeProfile() { document.getElementById('profileModal').style.display = 'none'; }

// --- УДАЛЕНИЕ ---
async function deleteMessage(messageId) {
    if (!confirm("Вы уверены, что хотите удалить этот файл?")) return;
    const { error } = await supabaseClient.from('messages').delete().eq('id', messageId);
    if (error) { alert("Ошибка удаления: " + error.message); return; }
    renderInbox();
    alert("Файл удален!");
}

// --- ИСТОРИЯ ---
async function renderHistory() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const list = document.getElementById('historyList');
    if (!user) { list.innerHTML = '<li>Войдите!</li>'; return; }
    const { data, error } = await supabaseClient.from('messages').select(`*, recipient:recipient_id (nickname)`).eq('sender_id', user.id).order('created_at', { ascending: false });
    if (error) { list.innerHTML = '<li>Ошибка.</li>'; return; }
    if (data.length === 0) { list.innerHTML = '<li>Пусто.</li>'; return; }
    list.innerHTML = data.map(m => `<li><strong>${m.file_name}</strong> -> @${m.recipient.nickname}<br><small>${new Date(m.created_at).toLocaleString()}</small></li>`).join('');
}

// --- МОЙ ДИСК ---
async function renderMyDisk() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const list = document.getElementById('myDiskList');
    if (!user) { list.innerHTML = '<p>Войдите!</p>'; return; }
    const { data } = await supabaseClient.from('messages').select('*').eq('sender_id', user.id).eq('recipient_id', user.id).order('created_at', { ascending: false });
    if (!data || data.length === 0) { list.innerHTML = '<p>Пусто.</p>'; return; }
    list.innerHTML = data.map(m => `<p><strong>${m.file_name}</strong> <a href="${m.file_url}" target="_blank">Скачать</a></p>`).join('');
}

async function logoutConfirm() {
    if (confirm("Вы точно хотите выйти?")) {
        if(presenceChannel) await presenceChannel.unsubscribe();
        presenceChannel = null;
        await supabaseClient.auth.signOut();
        localStorage.removeItem('lgs_profile');
        checkUser();
    }
}

checkUser();