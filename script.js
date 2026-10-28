// --- ПОДКЛЮЧЕНИЕ SUPABASE ---
const SUPABASE_URL = 'https://llqlrjfqlzorfyecrtay.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yqhRKQRL_nk41fCRrFpFhA_jQIEthvh'; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    const targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) targetTab.classList.add('active');
    
    if (tabName === 'sent') renderHistory();
    if (tabName === 'inbox') renderInbox();
    if (tabName === 'mydisk') renderMyDisk();
    if (tabName === 'friends') renderFriends();
    if (tabName === 'stories') renderStories();
    if (tabName === 'account') checkUser();
}

// --- РАБОТА С ФАЙЛОМ ---
const fileInput = document.getElementById('fileInput');
const fileDetails = document.getElementById('fileDetails');
if (fileInput) {
    fileInput.addEventListener('change', function(e) {
        selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 50 * 1024 * 1024) {
                alert("Файл слишком большой! Максимум 50 МБ.");
                selectedFile = null; fileInput.value = ''; if(fileDetails) fileDetails.style.display = 'none'; return;
            }
            let size = (selectedFile.size / (1024 * 1024)).toFixed(2);
            if(fileDetails) {
                fileDetails.style.display = 'block';
                fileDetails.innerHTML = `<strong>Файл:</strong> ${selectedFile.name}<br><strong>Размер:</strong> ${size} МБ`;
            }
        }
    });
}

// --- РЕГИСТРАЦИЯ / ВХОД ---
async function registerUser() {
    const name = document.getElementById('regName').value.trim();
    const surname = document.getElementById('regSurname').value.trim();
    const nickname = document.getElementById('regNickname').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const age = document.getElementById('regAge').value;
    const email = document.getElementById('regEmail').value.trim();

    if (!name || !surname || !nickname || !age || !password || !email) { alert("Заполните ВСЕ поля!"); return; }
    const engRegex = /^[a-zA-Z0-9_]+$/;
    if (!engRegex.test(nickname)) { alert("Никнейм только на английском!"); return; }

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });
    if (authError) { alert("Ошибка регистрации: " + authError.message); return; }

    // По умолчанию ставим обычный серый цвет (без градиента)
    const { error: profileError } = await supabaseClient.from('profiles').insert([{ 
        id: authData.user.id, name, surname, nickname, age, email, avatar: null, nick_changes: 0, status: 'online',
        color1: '#333333', color2: '#444444', color3: '#222222', text_color: 'white', nickname_font: 'inherit', 
        name_font: 'inherit', name_color: 'inherit', avatar_frame: 'none', badges: 'none' // Бейджики по умолчанию выключены
    }]);

    if (profileError) { alert("Ошибка профиля: " + profileError.message); return; }
    alert("Регистрация успешна! Теперь войдите.");
}

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

// --- ПРОВЕРКА СЕССИИ ---
async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const profile = JSON.parse(localStorage.getItem('lgs_profile'));
    
    const authForms = document.getElementById('authForms');
    const profileBox = document.getElementById('profileBox');

    if (session && profile) {
        if(authForms) authForms.style.display = 'none';
        if(profileBox) profileBox.style.display = 'block';
        
        const nameEl = document.getElementById('profileName');
        if(nameEl) {
            nameEl.innerText = `${profile.surname} ${profile.name} ${profile.patronymic || ''}`;
            nameEl.style.fontFamily = profile.name_font || 'inherit';
            nameEl.style.color = profile.name_color || 'inherit';
        }
        
        const nickEl = document.getElementById('profileNickname');
        if(nickEl) {
            nickEl.innerText = `@${profile.nickname}`;
            nickEl.style.fontFamily = profile.nickname_font || 'inherit';
        }
        
        const avatarDiv = document.getElementById('profileAvatar');
        if (avatarDiv) {
            if (profile.avatar) {
                avatarDiv.style.backgroundImage = `url(${profile.avatar})`; avatarDiv.innerText = ''; 
            } else {
                avatarDiv.style.backgroundImage = 'none'; avatarDiv.innerText = profile.name.charAt(0).toUpperCase(); 
            }
        }

        // Показываем зеленую точку онлайна
        const statusDot = document.getElementById('profileStatusDot');
        if(statusDot) statusDot.style.display = 'block';
        
        // Меняем крылья (только если ангельская рамка)
        const wings = document.getElementById('myProfileWings');
        if(wings) {
            if (profile.avatar_frame === 'angel') {
                wings.style.display = 'flex';
                wings.innerText = '🕊️';
            } else {
                wings.style.display = 'none'; // Прячем крылья, если рамка другая
            }
        }

        // ПРИМЕНЯЕМ ГРАДИЕНТ (или серый по умолчанию)
        const header = document.getElementById('myProfileHeader');
        if(header) {
            header.style.background = `linear-gradient(135deg, ${profile.color1 || '#333'}, ${profile.color2 || '#444'}, ${profile.color3 || '#222'})`;
            header.style.color = profile.text_color === 'black' ? '#1a1a1a' : '#ffffff';
        }

        // БЕЙДЖИКИ
        const badgesContainer = document.getElementById('myProfileBadges');
        if(badgesContainer) {
            if (!profile.badges || profile.badges === 'none') {
                badgesContainer.style.display = 'none';
            } else {
                badgesContainer.style.display = 'flex';
                const badgeArray = profile.badges.split(',');
                badgesContainer.innerHTML = badgeArray.map(b => `<span>${b}</span>`).join('');
            }
        }

        if(document.getElementById('editColor1')) {
            document.getElementById('editColor1').value = profile.color1 || '#333333';
            document.getElementById('editColor2').value = profile.color2 || '#444444';
            document.getElementById('editColor3').value = profile.color3 || '#222222';
            document.getElementById('editTextColor').value = profile.text_color || 'white';
            if(document.getElementById('editNameFont')) document.getElementById('editNameFont').value = profile.name_font || 'inherit';
            if(document.getElementById('editNameColor')) document.getElementById('editNameColor').value = profile.name_color || '#ffffff';
            if(document.getElementById('editAvatarFrame')) document.getElementById('editAvatarFrame').value = profile.avatar_frame || 'none';
            if(document.getElementById('editBadges')) document.getElementById('editBadges').value = profile.badges || 'none';
        }
        if(document.getElementById('nickChangeLeft')) document.getElementById('nickChangeLeft').innerText = 2 - (profile.nick_changes || 0);
        
        checkInbox();
        await supabaseClient.from('profiles').update({ is_online: true }).eq('id', profile.id);
        window.addEventListener('beforeunload', async () => {
            await supabaseClient.from('profiles').update({ is_online: false, last_seen: new Date() }).eq('id', profile.id);
        });
    } else {
        if(authForms) authForms.style.display = 'flex';
        if(profileBox) profileBox.style.display = 'none';
    }
}

// --- НАСТРОЙКИ ---
function toggleSettings() {
    const box = document.getElementById('settingsBox');
    if(box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

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

async function saveSettings() {
    let profile = JSON.parse(localStorage.getItem('lgs_profile'));
    if (!profile) return;
    
    const newName = document.getElementById('editName').value.trim();
    const newSurname = document.getElementById('editSurname').value.trim();
    const newPatronymic = document.getElementById('editPatronymic').value.trim();
    const newBio = document.getElementById('editBio').value.trim();
    const newNickname = document.getElementById('editNickname').value.trim().toLowerCase();
    
    const nFont = document.getElementById('editNameFont').value;
    const nColor = document.getElementById('editNameColor').value;
    const c1 = document.getElementById('editColor1').value;
    const c2 = document.getElementById('editColor2').value;
    const c3 = document.getElementById('editColor3').value;
    const tColor = document.getElementById('editTextColor').value;
    const aFrame = document.getElementById('editAvatarFrame').value;
    const bBadges = document.getElementById('editBadges').value;

    let updateData = {
        name_font: nFont, name_color: nColor,
        color1: c1, color2: c2, color3: c3, text_color: tColor,
        avatar_frame: aFrame, badges: bBadges
    };

    if (newName) updateData.name = newName;
    if (newSurname) updateData.surname = newSurname;
    if (newPatronymic) updateData.patronymic = newPatronymic;
    if (newBio) updateData.bio = newBio;

    if (newNickname && newNickname !== profile.nickname) {
        const engRegex = /^[a-zA-Z0-9_]+$/;
        if (!engRegex.test(newNickname)) { alert("Никнейм только на английском!"); return; }
        
        if (profile.nick_changes >= 2) {
            alert("Вы уже использовали все 2 попытки смены никнейма!"); 
            return;
        }
        
        const { data: existing } = await supabaseClient.from('profiles').select('id').eq('nickname', newNickname).maybeSingle();
        if (existing) { alert("Этот никнейм уже занят!"); return; }

        updateData.nickname = newNickname;
        updateData.nick_changes = (profile.nick_changes || 0) + 1;
    }

    const { error } = await supabaseClient.from('profiles').update(updateData).eq('id', profile.id);
    if (error) { alert("Ошибка сохранения: " + error.message); return; }
    
    profile = { ...profile, ...updateData };
    localStorage.setItem('lgs_profile', JSON.stringify(profile));
    alert("Настройки сохранены!");
    checkUser();
}

async function changePassword() {
    const newPassword = document.getElementById('newPassword').value;
    if (newPassword.length < 6) { alert("Пароль должен быть минимум 6 символов!"); return; }
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) { alert("Ошибка: " + error.message); }
    else { alert("Пароль успешно изменен!"); document.getElementById('newPassword').value = ''; }
}

// --- ОТПРАВКА ФАЙЛА ---
async function sendFile() {
    if (!selectedFile) { alert("Выберите файл!"); return; }
    const recipientNick = document.getElementById('recipientInput').value.trim().toLowerCase();
    if (!recipientNick) { alert("Введите никнейм!"); return; }
    const { data: recData, error: recError } = await supabaseClient.from('profiles').select('id').eq('nickname', recipientNick).maybeSingle();
    if (recError || !recData) { alert("Пользователь не найден!"); return; }
    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${Date.now()}_${recipientNick}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage.from('files').upload(fileName, selectedFile);
    if (uploadError) { alert("Ошибка загрузки: " + uploadError.message); return; }
    const { data: urlData } = supabaseClient.storage.from('files').getPublicUrl(fileName);
    const { data: { user } } = await supabaseClient.auth.getUser();
    const topic = document.getElementById('customTopicInput').value || "Без темы";
    const { error: msgError } = await supabaseClient.from('messages').insert([{
        sender_id: user.id, recipient_id: recData.id, file_name: selectedFile.name,
        file_url: urlData.publicUrl, file_size: (selectedFile.size / (1024 * 1024)).toFixed(2),
        message: document.getElementById('messageInput').value, topic: topic
    }]);
    if (msgError) { alert("Ошибка отправки: " + msgError.message); return; }
    alert("Файл успешно отправлен!");
    selectedFile = null; if(fileInput) fileInput.value = ''; if(fileDetails) fileDetails.style.display = 'none';
    document.getElementById('messageInput').value = ''; document.getElementById('customTopicInput').value = '';
}

// --- ВХОДЯЩИЕ ---
async function checkInbox() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const { data } = await supabaseClient.from('messages').select('id').eq('recipient_id', user.id);
    const badge = document.getElementById('inboxBadge');
    if (badge) { data && data.length > 0 ? (badge.style.display = 'inline-block', badge.innerText = data.length) : badge.style.display = 'none'; }
}

async function renderInbox() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const { data, error } = await supabaseClient.from('messages').select(`*, sender:sender_id (nickname, name, surname, avatar, nickname_font, avatar_frame)`).eq('recipient_id', user.id).order('created_at', { ascending: false });
    const list = document.getElementById('inboxList');
    if (!list) return;
    if (error) { list.innerHTML = '<p>Ошибка загрузки.</p>'; return; }
    if (data.length === 0) { list.innerHTML = '<p>Пусто.</p>'; return; }

    list.innerHTML = data.map(m => {
        const fontStyle = m.sender.nickname_font ? `font-family: ${m.sender.nickname_font};` : '';
        const frameClass = m.sender.avatar_frame ? `frame-${m.sender.avatar_frame}` : '';
        return `
        <div class="inbox-card-full">
        <div class="inbox-header" style="cursor: pointer;" onclick="openProfile('${m.sender.nickname}')">
                <div class="inbox-avatar-large ${frameClass}" style="${m.sender.avatar ? `background-image: url(${m.sender.avatar})` : ''}">
                    ${!m.sender.avatar ? m.sender.name.charAt(0) : ''}
                </div>
                <div class="inbox-user-info">
                    <h3 style="${fontStyle}">@${m.sender.nickname}</h3>
                    <p>${m.sender.surname} ${m.sender.name}</p>
                </div>
            </div>
            <div class="inbox-body">
                <p><strong>Файл:</strong> ${m.file_name} (${m.file_size} МБ)</p>
                <p><strong>Сообщение:</strong> ${m.message || 'Нет'}</p>
            </div>
            <div class="inbox-actions" style="display:flex; gap:10px; margin-top:10px;">
                <a href="${m.file_url}" target="_blank" style="background-color: var(--primary-color); color: white; padding: 10px; text-decoration: none; border-radius: 5px; text-align: center; flex: 1;">Скачать</a>
            </div>
        </div>
    `}).join('');
}

// --- МОДАЛЬНОЕ ОКНО ПРОФИЛЯ ---
async function openProfile(nickname) {
    const { data, error } = await supabaseClient.from('profiles').select('*').eq('nickname', nickname).maybeSingle();
    if (error || !data) { alert("Профиль не найден"); return; }

    const modalName = document.getElementById('modalName');
    modalName.innerText = `${data.surname} ${data.name} ${data.patronymic || ''}`;
    modalName.style.fontFamily = data.name_font || 'inherit';
    modalName.style.color = data.name_color || 'inherit';

    const modalNick = document.getElementById('modalNickname');
    modalNick.innerText = `@${data.nickname}`;
    modalNick.style.fontFamily = data.nickname_font || 'inherit';
    
    document.getElementById('modalBio').innerText = data.bio || "Пользователь не добавил описание.";

    const avatarDiv = document.getElementById('modalAvatar');
    if (data.avatar) { avatarDiv.style.backgroundImage = `url(${data.avatar})`; avatarDiv.innerText = ''; }
    else { avatarDiv.style.backgroundImage = 'none'; avatarDiv.innerText = data.name.charAt(0).toUpperCase(); }
    
    // Зеленая точка в чужом профиле
    const modalStatusDot = document.getElementById('modalStatusDot');
    if (modalStatusDot) modalStatusDot.style.display = data.is_online ? 'block' : 'none';

    // Крылья (только для ангельской рамки)
    const modalWings = document.getElementById('modalWings');
    if(modalWings) {
        if (data.avatar_frame === 'angel') {
            modalWings.style.display = 'flex';
            modalWings.innerText = '🕊️';
        } else {
            modalWings.style.display = 'none';
        }
    }

    // ПРИМЕНЯЕМ ЦВЕТА
    const modal = document.getElementById('modalContent');
    modal.style.background = `linear-gradient(135deg, ${data.color1 || '#333'}, ${data.color2 || '#444'}, ${data.color3 || '#222'})`;
    modal.style.color = data.text_color === 'black' ? '#1a1a1a' : '#ffffff';

    // БЕЙДЖИКИ ЧУЖОГО ПРОФИЛЯ
    const modalBadges = document.getElementById('modalBadges');
    if(modalBadges) {
        if (!data.badges || data.badges === 'none') {
            modalBadges.style.display = 'none';
        } else {
            modalBadges.style.display = 'flex';
            const badgeArray = data.badges.split(',');
            modalBadges.innerHTML = badgeArray.map(b => `<span>${b}</span>`).join('');
        }
    }

    document.getElementById('profileModal').style.display = 'flex';
}

function closeProfile() { document.getElementById('profileModal').style.display = 'none'; }

// --- ИСТОРИИ (STORIES) ---
document.getElementById('storyInput')?.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Картинка слишком большая (макс 10 МБ)"); return; }
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { alert("Войдите в аккаунт!"); return; }

    const fileExt = file.name.split('.').pop();
    const fileName = `story_${Date.now()}_${user.id}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage.from('files').upload(fileName, file);
    if (uploadError) { alert("Ошибка загрузки: " + uploadError.message); return; }

    const { data: urlData } = supabaseClient.storage.from('files').getPublicUrl(fileName);

    const { error: dbError } = await supabaseClient.from('stories').insert([{
        user_id: user.id, image_url: urlData.publicUrl
    }]);

    if (dbError) { alert("Ошибка базы: " + dbError.message); return; }
    alert("История загружена!");
    renderStories();
});

async function renderStories() {
    const feed = document.getElementById('storiesFeed');
    if (!feed) return;

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseClient
        .from('stories')
        .select(`*, author:user_id (nickname, avatar)`)
        .gte('created_at', yesterday)
        .order('id', { ascending: false });

    if (error || !data || data.length === 0) {
        feed.innerHTML = '<p>Пока нет историй за последние 24 часа.</p>';
        return;
    }

    const grouped = {};
    data.forEach(story => {
        if (!grouped[story.author.nickname]) {
            grouped[story.author.nickname] = { author: story.author, stories: [] };
        }
        grouped[story.author.nickname].stories.push(story);
    });

    feed.innerHTML = Object.values(grouped).map(group => {
        const avatarStyle = group.author.avatar ? `background-image: url(${group.author.avatar})` : '';
        const firstLetter = !group.author.avatar ? group.author.nickname.charAt(0).toUpperCase() : '';
        
        return `
            <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;" onclick="viewStory('${group.author.nickname}')">
                <div style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid #ff0050; padding: 3px; ${avatarStyle ? '' : 'background: #ccc;'}">
                    <div style="width: 100%; height: 100%; border-radius: 50%; background-size: cover; background-position: center; ${avatarStyle}; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white; background-color: #333;">
                        ${firstLetter}
                    </div>
                </div>
                <span style="font-size: 12px; margin-top: 5px;">@${group.author.nickname}</span>
            </div>
        `;
    }).join('');
}

async function viewStory(nickname) {
    const { data: userProfile } = await supabaseClient.from('profiles').select('id').eq('nickname', nickname).maybeSingle();
    if(!userProfile) return;

    const { data: storyData } = await supabaseClient
        .from('stories')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('id', { ascending: false })
        .limit(1);

    if (storyData && storyData.length > 0) {
        const story = storyData[0];
        document.getElementById('storyImage').src = story.image_url;
        document.getElementById('storyAuthor').innerText = `@${nickname}`;
        
        const viewer = document.getElementById('storyViewer');
        viewer.style.display = 'flex';
        
        const progress = document.getElementById('storyProgress');
        progress.style.width = '0%';
        setTimeout(() => { progress.style.width = '100%'; }, 100);
        
        setTimeout(() => { closeStory(); }, 5000);
    }
}

function closeStory() {
    document.getElementById('storyViewer').style.display = 'none';
    document.getElementById('storyProgress').style.width = '0%';
}

// --- ИСТОРИЯ / ДИСК ---
async function renderHistory() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const list = document.getElementById('historyList');
    if (!list) return;
    if (!user) { list.innerHTML = '<li>Войдите!</li>'; return; }
    const { data, error } = await supabaseClient.from('messages').select(`*, recipient:recipient_id (nickname)`).eq('sender_id', user.id).order('created_at', { ascending: false });
    if (error) { list.innerHTML = '<li>Ошибка.</li>'; return; }
    if (data.length === 0) { list.innerHTML = '<li>Пусто.</li>'; return; }
    list.innerHTML = data.map(m => `<li><strong>${m.file_name}</strong> -> @${m.recipient ? m.recipient.nickname : 'удален'}</li>`).join('');
}

async function renderMyDisk() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const list = document.getElementById('myDiskList');
    if (!list) return;
    if (!user) { list.innerHTML = '<p>Войдите!</p>'; return; }
    const { data } = await supabaseClient.from('messages').select('*').eq('sender_id', user.id).eq('recipient_id', user.id).order('created_at', { ascending: false });
    if (!data || data.length === 0) { list.innerHTML = '<p>Пусто.</p>'; return; }
    list.innerHTML = data.map(m => `<p><strong>${m.file_name}</strong> <a href="${m.file_url}" target="_blank">Скачать</a></p>`).join('');
}

// --- ДРУЗЬЯ ---
async function searchFriend() {
    const input = document.getElementById('friendSearchInput');
    if(!input) return;
    const nick = input.value.trim().toLowerCase();
    const resultDiv = document.getElementById('friendSearchResult');
    if (!nick || !resultDiv) return;
    const { data: userProfile } = await supabaseClient.from('profiles').select('*').eq('nickname', nick).maybeSingle();
    if (!userProfile) { resultDiv.innerHTML = '<p style="color: red;">Пользователь не найден.</p>'; return; }
    const myProfile = JSON.parse(localStorage.getItem('lgs_profile'));
    if (myProfile.id === userProfile.id) { resultDiv.innerHTML = '<p style="color: red;">Это вы.</p>'; return; }
    resultDiv.innerHTML = `
        <div style="padding: 15px; border: 1px solid var(--glass-border); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div><strong>@${userProfile.nickname}</strong> (${userProfile.name} ${userProfile.surname})</div>
            <button onclick="addFriend('${userProfile.id}')" style="width: auto; padding: 8px 15px; font-size: 14px;">Добавить</button>
        </div>
    `;
}

async function addFriend(friendId) {
    const myProfile = JSON.parse(localStorage.getItem('lgs_profile'));
    const { error } = await supabaseClient.from('friends').insert([{ user_id: myProfile.id, friend_id: friendId }]);
    if (error) { alert("Ошибка: " + error.message); return; }
    alert("Друг добавлен!");
    document.getElementById('friendSearchResult').innerHTML = '';
    renderFriends();
}

async function renderFriends() {
    const myProfile = JSON.parse(localStorage.getItem('lgs_profile'));
    const list = document.getElementById('friendsList');
    if (!list) return;
    if (!myProfile) { list.innerHTML = '<p>Войдите в аккаунт.</p>'; return; }

    const { data: friendsData, error } = await supabaseClient.from('friends').select('friend_id').eq('user_id', myProfile.id);
    if (error || !friendsData || friendsData.length === 0) { list.innerHTML = '<p>У вас пока нет друзей.</p>'; return; }

    const friendIds = friendsData.map(f => f.friend_id);
    const { data: profiles } = await supabaseClient.from('profiles').select('id, nickname, name, surname, is_online, avatar, nickname_font, avatar_frame').in('id', friendIds);

    list.innerHTML = profiles.map(p => {
        const frameClass = p.avatar_frame ? `frame-${p.avatar_frame}` : '';
        return `
        <div class="inbox-card-full" style="padding: 15px; display:flex; align-items:center; gap: 15px; cursor: pointer;" onclick="openProfile('${p.nickname}')">
            <div class="inbox-avatar-large ${frameClass}" style="${p.avatar ? `background-image: url(${p.avatar})` : ''}">
            ${!p.avatar ? p.name.charAt(0) : ''}
            </div>
            <div style="flex: 1;">
                <h3 style="margin: 0; font-family: ${p.nickname_font || 'inherit'};">@${p.nickname}</h3>
                <p style="margin: 5px 0 0 0; color: #7f8c8d;">${p.name} ${p.surname}</p>
            </div>
            <div style="font-size: 20px;">${p.is_online ? '🟢' : '⚫'}</div>
        </div>
    `}).join('');
}

// --- ВЫХОД ---
async function logoutConfirm() {
    if (confirm("Вы точно хотите выйти?")) {
        try {
            const profile = JSON.parse(localStorage.getItem('lgs_profile'));
            if(profile) {
                await supabaseClient.from('profiles').update({ is_online: false, last_seen: new Date() }).eq('id', profile.id);
            }
        } catch (e) { console.log("Ошибка при обновлении статуса", e); }
        
        await supabaseClient.auth.signOut();
        localStorage.removeItem('lgs_profile');
        window.location.reload(); 
    }
}

// Инициализация
checkUser();