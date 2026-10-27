// --- ПОДКЛЮЧЕНИЕ SUPABASE ---
const SUPABASE_URL = 'https://ilqlrjfqlzorfyectay.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yqhRKQRL_nk41fCRrFpFhA_jQIEthvh'; // Вставь сюда полный ключ, если он обрезан
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- ПЕРЕМЕННЫЕ ---
let selectedFile = null;

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

fileInput.addEventListener('change', function(e) {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        let size = (selectedFile.size / (1024 * 1024)).toFixed(2);
        fileDetails.style.display = 'block';
        fileDetails.innerHTML = `<strong>Файл:</strong> ${selectedFile.name}<br><strong>Размер:</strong> ${size} МБ`;
    }
});

// --- РЕГИСТРАЦИЯ ---
async function registerUser() {
    const name = document.getElementById('regName').value.trim();
    const surname = document.getElementById('regSurname').value.trim();
    const nickname = document.getElementById('regNickname').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const age = document.getElementById('regAge').value;
    const email = document.getElementById('regEmail').value.trim();

    if (!name || !surname || !nickname || !age || !password || !email) { 
        alert("Заполните ВСЕ поля! Почта обязательна."); return; 
    }

    const engRegex = /^[a-zA-Z0-9_]+$/;
    if (!engRegex.test(nickname)) { alert("Никнейм только на английском!"); return; }

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });
    if (authError) { alert("Ошибка регистрации: " + authError.message); return; }

    const { error: profileError } = await supabaseClient.from('profiles').insert([{ 
        id: authData.user.id, name, surname, nickname, age, email, avatar: null 
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
}

async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const profile = JSON.parse(localStorage.getItem('lgs_profile'));
    
    const authForms = document.getElementById('authForms');
    const profileBox = document.getElementById('profileBox');
    if (session && profile) {
        authForms.style.display = 'none';
        profileBox.style.display = 'block';
        document.getElementById('profileName').innerText = `${profile.surname} ${profile.name}`;
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
        checkInbox();
    } else {
        authForms.style.display = 'flex';
        profileBox.style.display = 'none';
    }
}

// --- ОТПРАВКА ФАЙЛА ---
async function sendFile() {
    if (!selectedFile) { alert("Выберите файл!"); return; }
    const recipientNick = document.getElementById('recipientInput').value.trim().toLowerCase();
    if (!recipientNick) { alert("Введите никнейм!"); return; }

    const { data: recData, error: recError } = await supabaseClient.from('profiles').select('id').eq('nickname', recipientNick).single();
    if (recError || !recData) { alert("Пользователь не найден!"); return; }

    // Загружаем файл
    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${Date.now()}_${recipientNick}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage.from('files').upload(fileName, selectedFile);
    if (uploadError) { alert("Ошибка загрузки: " + uploadError.message); return; }

    // Получаем ссылку
    const { data: urlData } = supabaseClient.storage.from('files').getPublicUrl(fileName);
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    const topic = document.getElementById('customTopicInput').value || document.querySelector('input[name="topic"]:checked')?.value || "Без темы";
    
    // Сохраняем в БД
    const { error: msgError } = await supabaseClient.from('messages').insert([{
        sender_id: user.id, recipient_id: recData.id, file_name: selectedFile.name,
        file_url: urlData.publicUrl, file_size: (selectedFile.size / (1024 * 1024)).toFixed(2),
        message: document.getElementById('messageInput').value, topic: topic
    }]);

    if (msgError) { alert("Ошибка отправки: " + msgError.message); return; }
    alert("Файл успешно отправлен!");
    
    selectedFile = null; fileInput.value = ''; fileDetails.style.display = 'none';
    document.getElementById('messageInput').value = ''; document.getElementById('customTopicInput').value = '';
    document.querySelectorAll('input[name="topic"]').forEach(r => r.checked = false);
}

// --- ВХОДЯЩИЕ ---
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
                <div class="inbox-avatar-large" style="${m.sender.avatar ? `background-image: url(${m.sender.avatar})` : ''}">
                    ${!m.sender.avatar ? m.sender.name.charAt(0) : ''}
                </div>
                <div class="inbox-user-info">
                    <h3>@${m.sender.nickname}</h3>
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
            </div>
        </div>
    `).join('');
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
        await supabaseClient.auth.signOut();
        localStorage.removeItem('lgs_profile');
        checkUser();
    }
}

// Инициализация
checkUser();