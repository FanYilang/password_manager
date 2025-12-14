/**
 * 密码管理器 - Supabase 云同步版
 */

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// 当前用户
let currentUser = null;

// 加密密钥（从用户密码派生）
let encryptionKey = null;

// DOM 元素
const elements = {
    // 认证视图
    authView: document.getElementById('auth-view'),
    mainView: document.getElementById('main-view'),
    loginPanel: document.getElementById('login-panel'),
    registerPanel: document.getElementById('register-panel'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    authError: document.getElementById('auth-error'),
    
    // 用户信息
    userAvatar: document.getElementById('user-avatar'),
    userEmail: document.getElementById('user-email'),
    btnLogout: document.getElementById('btn-logout'),
    
    // 同步状态
    syncStatus: document.getElementById('sync-status'),
    syncText: document.getElementById('sync-text'),
    
    // 主界面
    searchInput: document.getElementById('search-input'),
    btnAdd: document.getElementById('btn-add'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnExport: document.getElementById('btn-export'),
    credentialList: document.getElementById('credential-list'),
    emptyMessage: document.getElementById('empty-message'),
    noResults: document.getElementById('no-results'),
    
    // 模态框
    credentialModal: document.getElementById('credential-modal'),
    modalTitle: document.getElementById('modal-title'),
    credentialForm: document.getElementById('credential-form'),
    credentialId: document.getElementById('credential-id'),
    siteName: document.getElementById('site-name'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    notes: document.getElementById('notes'),
    togglePassword: document.getElementById('toggle-password'),
    btnCancel: document.getElementById('btn-cancel'),
    
    confirmModal: document.getElementById('confirm-modal'),
    btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),
    
    exportModal: document.getElementById('export-modal'),
    exportForm: document.getElementById('export-form'),
    exportPassword: document.getElementById('export-password'),
    btnExportCancel: document.getElementById('btn-export-cancel')
};

let deleteTargetId = null;
let clipboardTimer = null;

// ==================== 工具函数 ====================

function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }
}

function maskPassword(length = 8) {
    return '•'.repeat(length);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setSyncStatus(status, text) {
    const indicator = elements.syncStatus.querySelector('.sync-indicator');
    elements.syncStatus.className = `sync-status ${status}`;
    indicator.className = `sync-indicator ${status}`;
    elements.syncText.textContent = text;
}

// ==================== 加密功能 ====================

async function deriveKeyFromPassword(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptPassword(password, key) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(password)
    );
    
    // 组合 IV 和密文
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // 转换为 Base64
    return btoa(String.fromCharCode(...combined));
}

async function decryptPassword(encryptedData, key) {
    // 从 Base64 解码
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // 分离 IV 和密文
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

// ==================== 认证功能 ====================

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    elements.authError.textContent = '';
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // 从密码派生加密密钥
        const salt = new TextEncoder().encode(email); // 使用邮箱作为盐值
        encryptionKey = await deriveKeyFromPassword(password, salt);
        
        currentUser = data.user;
        showToast('登录成功！');
        await showMainView();
    } catch (error) {
        elements.authError.textContent = error.message || '登录失败，请检查邮箱和密码';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    
    elements.authError.textContent = '';
    
    if (password !== confirm) {
        elements.authError.textContent = '两次输入的密码不一致';
        return;
    }
    
    if (password.length < 6) {
        elements.authError.textContent = '密码至少需要6位';
        return;
    }
    
    try {
        console.log('开始注册...', { email });
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        
        console.log('注册响应:', { data, error });
        
        if (error) throw error;
        
        // 检查是否需要邮箱验证
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            elements.authError.textContent = '⚠️ 该邮箱已被注册，请直接登录';
            elements.authError.style.color = 'var(--danger-color)';
            setTimeout(() => {
                document.querySelector('[data-tab="login"]').click();
                document.getElementById('login-email').value = email;
            }, 2000);
            return;
        }
        
        // 检查是否需要邮箱确认
        if (data.user && !data.session) {
            showToast('注册成功！请查收邮箱验证邮件');
            elements.authError.textContent = '✅ 注册成功！请查收邮箱验证邮件，验证后即可登录';
            elements.authError.style.color = 'var(--success-color)';
        } else {
            // 如果关闭了邮箱验证，直接登录
            showToast('注册成功！');
            elements.authError.textContent = '✅ 注册成功！正在自动登录...';
            elements.authError.style.color = 'var(--success-color)';
            
            // 自动登录
            setTimeout(async () => {
                const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (!loginError && loginData.user) {
                    const salt = new TextEncoder().encode(email);
                    encryptionKey = await deriveKeyFromPassword(password, salt);
                    currentUser = loginData.user;
                    await showMainView();
                }
            }, 1000);
        }
        
        // 切换到登录面板
        setTimeout(() => {
            if (!data.session) {
                document.querySelector('[data-tab="login"]').click();
                document.getElementById('login-email').value = email;
            }
        }, 2000);
    } catch (error) {
        console.error('注册错误:', error);
        elements.authError.textContent = '注册失败: ' + (error.message || '未知错误');
        elements.authError.style.color = 'var(--danger-color)';
    }
}

async function handleLogout() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        encryptionKey = null;
        showAuthView();
        showToast('已退出登录');
    } catch (error) {
        showToast('退出失败: ' + error.message);
    }
}

// ==================== 视图切换 ====================

function showAuthView() {
    elements.authView.style.display = 'block';
    elements.mainView.style.display = 'none';
    elements.authError.textContent = '';
    elements.authError.style.color = 'var(--danger-color)';
}

async function showMainView() {
    elements.authView.style.display = 'none';
    elements.mainView.style.display = 'block';
    
    // 显示用户信息
    elements.userEmail.textContent = currentUser.email;
    elements.userAvatar.textContent = currentUser.email[0].toUpperCase();
    
    // 加载凭证
    await loadCredentials();
}

// ==================== 凭证管理 ====================

async function loadCredentials() {
    try {
        setSyncStatus('syncing', '同步中...');
        
        const { data, error } = await supabase
            .from('credentials')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // 解密密码
        const credentials = await Promise.all(data.map(async (cred) => {
            try {
                const decryptedPassword = await decryptPassword(cred.encrypted_password, encryptionKey);
                return {
                    ...cred,
                    password: decryptedPassword
                };
            } catch (e) {
                console.error('解密失败:', e);
                return {
                    ...cred,
                    password: '[解密失败]'
                };
            }
        }));
        
        renderCredentialList(credentials);
        setSyncStatus('synced', '已同步');
    } catch (error) {
        showToast('加载失败: ' + error.message);
        setSyncStatus('', '同步失败');
    }
}

function renderCredentialList(credentials) {
    const isSearching = elements.searchInput.value.trim() !== '';
    
    elements.credentialList.innerHTML = '';
    
    if (credentials.length === 0) {
        elements.credentialList.style.display = 'none';
        if (isSearching) {
            elements.emptyMessage.style.display = 'none';
            elements.noResults.style.display = 'block';
        } else {
            elements.emptyMessage.style.display = 'block';
            elements.noResults.style.display = 'none';
        }
        return;
    }
    
    elements.credentialList.style.display = 'flex';
    elements.emptyMessage.style.display = 'none';
    elements.noResults.style.display = 'none';
    
    credentials.forEach(credential => {
        const item = createCredentialItem(credential);
        elements.credentialList.appendChild(item);
    });
}

function createCredentialItem(credential) {
    const item = document.createElement('div');
    item.className = 'credential-item';
    item.dataset.id = credential.id;
    
    item.innerHTML = `
        <div class="credential-header">
            <span class="credential-site">${escapeHtml(credential.site_name)}</span>
            <div class="credential-actions">
                <button class="btn-icon btn-edit" title="编辑">✏️</button>
                <button class="btn-icon btn-delete" title="删除">🗑️</button>
            </div>
        </div>
        <div class="credential-username">${escapeHtml(credential.username)}</div>
        <div class="credential-password">
            <span class="password-display">${maskPassword()}</span>
            <button class="btn-icon btn-show" title="显示密码">👁</button>
            <button class="btn-icon btn-copy" title="复制密码">📋</button>
        </div>
    `;
    
    item.querySelector('.btn-edit').addEventListener('click', () => openEditModal(credential));
    item.querySelector('.btn-delete').addEventListener('click', () => openDeleteConfirm(credential.id));
    item.querySelector('.btn-show').addEventListener('click', (e) => togglePasswordVisibility(e, credential));
    item.querySelector('.btn-copy').addEventListener('click', () => copyPassword(credential.password));
    
    return item;
}

function togglePasswordVisibility(e, credential) {
    const btn = e.target;
    const passwordDisplay = btn.parentElement.querySelector('.password-display');
    
    if (passwordDisplay.dataset.visible === 'true') {
        passwordDisplay.textContent = maskPassword();
        passwordDisplay.dataset.visible = 'false';
        btn.textContent = '👁';
    } else {
        passwordDisplay.textContent = credential.password;
        passwordDisplay.dataset.visible = 'true';
        btn.textContent = '🙈';
    }
}

async function copyPassword(password) {
    try {
        await navigator.clipboard.writeText(password);
        showToast('密码已复制到剪贴板');
        
        if (clipboardTimer) clearTimeout(clipboardTimer);
        
        clipboardTimer = setTimeout(async () => {
            try {
                await navigator.clipboard.writeText('');
                showToast('剪贴板已清除');
            } catch (e) {}
        }, 30000);
    } catch (e) {
        showToast('复制失败，请手动复制');
    }
}

// ==================== 模态框操作 ====================

function openAddModal() {
    elements.modalTitle.textContent = '添加凭证';
    elements.credentialId.value = '';
    elements.credentialForm.reset();
    elements.password.type = 'password';
    elements.togglePassword.textContent = '👁';
    elements.credentialModal.style.display = 'flex';
    elements.siteName.focus();
}

function openEditModal(credential) {
    elements.modalTitle.textContent = '编辑凭证';
    elements.credentialId.value = credential.id;
    elements.siteName.value = credential.site_name;
    elements.username.value = credential.username;
    elements.password.value = credential.password;
    elements.notes.value = credential.notes || '';
    elements.password.type = 'password';
    elements.togglePassword.textContent = '👁';
    elements.credentialModal.style.display = 'flex';
}

function closeCredentialModal() {
    elements.credentialModal.style.display = 'none';
    elements.credentialForm.reset();
}

function openDeleteConfirm(id) {
    deleteTargetId = id;
    elements.confirmModal.style.display = 'flex';
}

function closeDeleteConfirm() {
    deleteTargetId = null;
    elements.confirmModal.style.display = 'none';
}

async function handleCredentialSubmit(e) {
    e.preventDefault();
    
    const id = elements.credentialId.value;
    const siteName = elements.siteName.value.trim();
    const username = elements.username.value.trim();
    const password = elements.password.value;
    const notes = elements.notes.value.trim();
    
    try {
        setSyncStatus('syncing', '保存中...');
        
        // 加密密码
        const encryptedPassword = await encryptPassword(password, encryptionKey);
        
        if (id) {
            // 更新
            const { error } = await supabase
                .from('credentials')
                .update({
                    site_name: siteName,
                    username: username,
                    encrypted_password: encryptedPassword,
                    notes: notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);
            
            if (error) throw error;
            showToast('凭证已更新');
        } else {
            // 新增
            const { error } = await supabase
                .from('credentials')
                .insert([{
                    user_id: currentUser.id,
                    site_name: siteName,
                    username: username,
                    encrypted_password: encryptedPassword,
                    notes: notes
                }]);
            
            if (error) throw error;
            showToast('凭证已添加');
        }
        
        closeCredentialModal();
        await loadCredentials();
    } catch (error) {
        showToast('保存失败: ' + error.message);
        setSyncStatus('', '保存失败');
    }
}

async function handleDelete() {
    if (!deleteTargetId) return;
    
    try {
        setSyncStatus('syncing', '删除中...');
        
        const { error } = await supabase
            .from('credentials')
            .delete()
            .eq('id', deleteTargetId);
        
        if (error) throw error;
        
        showToast('凭证已删除');
        closeDeleteConfirm();
        await loadCredentials();
    } catch (error) {
        showToast('删除失败: ' + error.message);
        setSyncStatus('', '删除失败');
    }
}

// ==================== 搜索功能 ====================

async function handleSearch() {
    const query = elements.searchInput.value.trim().toLowerCase();
    
    try {
        const { data, error } = await supabase
            .from('credentials')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // 解密并过滤
        const credentials = await Promise.all(data.map(async (cred) => {
            const decryptedPassword = await decryptPassword(cred.encrypted_password, encryptionKey);
            return {
                ...cred,
                password: decryptedPassword
            };
        }));
        
        const filtered = query === '' ? credentials : credentials.filter(c =>
            c.site_name.toLowerCase().includes(query) ||
            c.username.toLowerCase().includes(query)
        );
        
        renderCredentialList(filtered);
    } catch (error) {
        showToast('搜索失败: ' + error.message);
    }
}

// ==================== 导出功能 ====================

function openExportModal() {
    elements.exportForm.reset();
    elements.exportModal.style.display = 'flex';
    elements.exportPassword.focus();
}

function closeExportModal() {
    elements.exportModal.style.display = 'none';
    elements.exportForm.reset();
}

async function handleExport(e) {
    e.preventDefault();
    
    const password = elements.exportPassword.value;
    
    try {
        // 获取所有凭证
        const { data, error } = await supabase
            .from('credentials')
            .select('*');
        
        if (error) throw error;
        
        // 解密密码
        const credentials = await Promise.all(data.map(async (cred) => {
            const decryptedPassword = await decryptPassword(cred.encrypted_password, encryptionKey);
            return {
                siteName: cred.site_name,
                username: cred.username,
                password: decryptedPassword,
                notes: cred.notes,
                createdAt: cred.created_at,
                updatedAt: cred.updated_at
            };
        }));
        
        // 使用导出密码加密
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const exportKey = await deriveKeyFromPassword(password, salt);
        
        const payload = JSON.stringify({
            credentials: credentials,
            exportedAt: new Date().toISOString()
        });
        
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            exportKey,
            encoder.encode(payload)
        );
        
        // 组合数据
        const exportData = {
            version: '2.0',
            salt: btoa(String.fromCharCode(...salt)),
            iv: btoa(String.fromCharCode(...iv)),
            data: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
        };
        
        // 下载文件
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `password-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        closeExportModal();
        showToast(`已导出 ${credentials.length} 个凭证`);
    } catch (error) {
        showToast('导出失败: ' + error.message);
    }
}

// ==================== 事件绑定 ====================

function bindEvents() {
    // 认证标签切换
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${targetTab}-panel`).classList.add('active');
        });
    });
    
    // 认证表单
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);
    elements.btnLogout.addEventListener('click', handleLogout);
    
    // 凭证操作
    elements.btnAdd.addEventListener('click', openAddModal);
    elements.btnRefresh.addEventListener('click', loadCredentials);
    elements.credentialForm.addEventListener('submit', handleCredentialSubmit);
    elements.btnCancel.addEventListener('click', closeCredentialModal);
    
    // 密码显示切换
    elements.togglePassword.addEventListener('click', () => {
        if (elements.password.type === 'password') {
            elements.password.type = 'text';
            elements.togglePassword.textContent = '🙈';
        } else {
            elements.password.type = 'password';
            elements.togglePassword.textContent = '👁';
        }
    });
    
    // 删除确认
    elements.btnConfirmCancel.addEventListener('click', closeDeleteConfirm);
    elements.btnConfirmDelete.addEventListener('click', handleDelete);
    
    // 搜索
    elements.searchInput.addEventListener('input', handleSearch);
    
    // 导出
    elements.btnExport.addEventListener('click', openExportModal);
    elements.exportForm.addEventListener('submit', handleExport);
    elements.btnExportCancel.addEventListener('click', closeExportModal);
    
    // 模态框背景点击关闭
    elements.credentialModal.addEventListener('click', (e) => {
        if (e.target === elements.credentialModal) closeCredentialModal();
    });
    elements.confirmModal.addEventListener('click', (e) => {
        if (e.target === elements.confirmModal) closeDeleteConfirm();
    });
    elements.exportModal.addEventListener('click', (e) => {
        if (e.target === elements.exportModal) closeExportModal();
    });
}

// ==================== 初始化 ====================

async function init() {
    // 检查用户登录状态
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        // 注意：这里无法恢复加密密钥，需要用户重新登录
        showAuthView();
        showToast('请重新登录以解密数据');
    } else {
        showAuthView();
    }
    
    // 监听认证状态变化
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            currentUser = null;
            encryptionKey = null;
            showAuthView();
        }
    });
    
    bindEvents();
}

// 启动应用
init();
