/**
 * 密码管理器 - 合并版本（支持直接打开HTML文件）
 */

// ==================== 工具函数 ====================

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function createCredential(input) {
    const now = Date.now();
    return {
        id: generateUUID(),
        siteName: input.siteName.trim(),
        username: input.username.trim(),
        password: input.password,
        notes: input.notes?.trim() || '',
        createdAt: now,
        updatedAt: now
    };
}

function validateCredentialInput(input) {
    const errors = [];
    if (!input.siteName || input.siteName.trim() === '') {
        errors.push('网站名称不能为空');
    }
    if (!input.username || input.username.trim() === '') {
        errors.push('账号不能为空');
    }
    if (!input.password || input.password === '') {
        errors.push('密码不能为空');
    }
    return { valid: errors.length === 0, errors };
}

function serializeCredentials(credentials) {
    return JSON.stringify({ version: 1, credentials: credentials });
}

function deserializeCredentials(json) {
    try {
        const data = JSON.parse(json);
        if (data.version === 1 && Array.isArray(data.credentials)) {
            return data.credentials;
        }
        if (Array.isArray(data)) return data;
        return [];
    } catch (e) {
        return [];
    }
}

function maskPassword(length = 8) {
    return '•'.repeat(length);
}

function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }
}

// ==================== 加密服务 ====================

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

function generateIV() {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encrypt(data, key) {
    const encoder = new TextEncoder();
    const iv = generateIV();
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(data)
    );
    return {
        ciphertext: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv)
    };
}

async function decrypt(encryptedData, key) {
    const decoder = new TextDecoder();
    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = base64ToArrayBuffer(encryptedData.iv);
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
    );
    return decoder.decode(decrypted);
}

// ==================== 存储服务 ====================

const STORAGE_KEYS = {
    MASTER: 'pm_master',
    DATA: 'pm_data'
};

function saveCredentialsToStorage(encryptedCredentials) {
    localStorage.setItem(STORAGE_KEYS.DATA, encryptedCredentials);
}

function loadCredentialsFromStorage() {
    return localStorage.getItem(STORAGE_KEYS.DATA);
}

function saveMasterPasswordData(data) {
    localStorage.setItem(STORAGE_KEYS.MASTER, JSON.stringify(data));
}

function loadMasterPasswordData() {
    const data = localStorage.getItem(STORAGE_KEYS.MASTER);
    return data ? JSON.parse(data) : null;
}

// ==================== 认证服务 ====================

let encryptionKey = null;
let currentSalt = null;

const AuthService = {
    isInitialized() {
        return loadMasterPasswordData() !== null;
    },

    async initialize(masterPassword) {
        const salt = generateSalt();
        const key = await deriveKey(masterPassword, salt);
        const verificationData = await encrypt('password_manager_verification', key);
        
        saveMasterPasswordData({
            salt: arrayBufferToBase64(salt),
            verificationHash: JSON.stringify(verificationData)
        });
        
        encryptionKey = key;
        currentSalt = salt;
    },

    async unlock(masterPassword) {
        const data = loadMasterPasswordData();
        if (!data) return false;
        
        const salt = base64ToArrayBuffer(data.salt);
        const key = await deriveKey(masterPassword, salt);
        
        try {
            const verificationData = JSON.parse(data.verificationHash);
            const decrypted = await decrypt(verificationData, key);
            if (decrypted === 'password_manager_verification') {
                encryptionKey = key;
                currentSalt = salt;
                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    },

    lock() {
        encryptionKey = null;
        currentSalt = null;
    },

    getEncryptionKey() {
        return encryptionKey;
    }
};

// ==================== 凭证服务 ====================

let credentialsCache = [];

const CredentialService = {
    async loadAll() {
        const key = AuthService.getEncryptionKey();
        if (!key) throw new Error('未解锁');
        
        const encryptedData = loadCredentialsFromStorage();
        if (!encryptedData) {
            credentialsCache = [];
            return [];
        }
        
        try {
            const encryptedObj = JSON.parse(encryptedData);
            const decryptedJson = await decrypt(encryptedObj, key);
            credentialsCache = deserializeCredentials(decryptedJson);
            return credentialsCache;
        } catch (e) {
            credentialsCache = [];
            return [];
        }
    },

    async saveAll() {
        const key = AuthService.getEncryptionKey();
        if (!key) throw new Error('未解锁');
        
        const json = serializeCredentials(credentialsCache);
        const encryptedData = await encrypt(json, key);
        saveCredentialsToStorage(JSON.stringify(encryptedData));
    },

    getAll() {
        return [...credentialsCache];
    },

    async add(input) {
        const validation = validateCredentialInput(input);
        if (!validation.valid) throw new Error(validation.errors.join(', '));
        
        const credential = createCredential(input);
        credentialsCache.push(credential);
        await this.saveAll();
        return credential;
    },

    async update(id, input) {
        const validation = validateCredentialInput(input);
        if (!validation.valid) throw new Error(validation.errors.join(', '));
        
        const index = credentialsCache.findIndex(c => c.id === id);
        if (index === -1) throw new Error('凭证不存在');
        
        credentialsCache[index] = {
            ...credentialsCache[index],
            siteName: input.siteName.trim(),
            username: input.username.trim(),
            password: input.password,
            notes: input.notes?.trim() || '',
            updatedAt: Date.now()
        };
        
        await this.saveAll();
        return credentialsCache[index];
    },

    async remove(id) {
        const index = credentialsCache.findIndex(c => c.id === id);
        if (index === -1) throw new Error('凭证不存在');
        
        credentialsCache.splice(index, 1);
        await this.saveAll();
    },

    search(query) {
        if (!query || query.trim() === '') return this.getAll();
        const lowerQuery = query.toLowerCase().trim();
        return credentialsCache.filter(c => 
            c.siteName.toLowerCase().includes(lowerQuery) ||
            c.username.toLowerCase().includes(lowerQuery)
        );
    },

    getById(id) {
        return credentialsCache.find(c => c.id === id);
    },

    clearCache() {
        credentialsCache = [];
    }
};


// ==================== 主应用 ====================

const elements = {};
let deleteTargetId = null;
let clipboardTimer = null;

function initElements() {
    elements.authView = document.getElementById('auth-view');
    elements.mainView = document.getElementById('main-view');
    elements.authSetup = document.getElementById('auth-setup');
    elements.authLogin = document.getElementById('auth-login');
    elements.authError = document.getElementById('auth-error');
    elements.newMasterPassword = document.getElementById('new-master-password');
    elements.confirmMasterPassword = document.getElementById('confirm-master-password');
    elements.masterPassword = document.getElementById('master-password');
    elements.btnSetup = document.getElementById('btn-setup');
    elements.btnUnlock = document.getElementById('btn-unlock');
    elements.btnLock = document.getElementById('btn-lock');
    elements.searchInput = document.getElementById('search-input');
    elements.btnAdd = document.getElementById('btn-add');
    elements.credentialList = document.getElementById('credential-list');
    elements.emptyMessage = document.getElementById('empty-message');
    elements.noResults = document.getElementById('no-results');
    elements.credentialModal = document.getElementById('credential-modal');
    elements.modalTitle = document.getElementById('modal-title');
    elements.credentialForm = document.getElementById('credential-form');
    elements.credentialId = document.getElementById('credential-id');
    elements.siteName = document.getElementById('site-name');
    elements.username = document.getElementById('username');
    elements.password = document.getElementById('password');
    elements.notes = document.getElementById('notes');
    elements.togglePassword = document.getElementById('toggle-password');
    elements.btnCancel = document.getElementById('btn-cancel');
    elements.confirmModal = document.getElementById('confirm-modal');
    elements.btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    elements.btnConfirmDelete = document.getElementById('btn-confirm-delete');
}

function showSetupView() {
    elements.authView.style.display = 'block';
    elements.mainView.style.display = 'none';
    elements.authSetup.style.display = 'flex';
    elements.authLogin.style.display = 'none';
    elements.authError.textContent = '';
}

function showLoginView() {
    elements.authView.style.display = 'block';
    elements.mainView.style.display = 'none';
    elements.authSetup.style.display = 'none';
    elements.authLogin.style.display = 'flex';
    elements.authError.textContent = '';
    elements.masterPassword.value = '';
    elements.masterPassword.focus();
}

async function showMainView() {
    elements.authView.style.display = 'none';
    elements.mainView.style.display = 'block';
    await loadCredentials();
}

async function loadCredentials() {
    try {
        await CredentialService.loadAll();
        renderCredentialList();
    } catch (e) {
        showToast('加载凭证失败: ' + e.message);
    }
}

function renderCredentialList(credentials = null) {
    const list = credentials || CredentialService.getAll();
    const isSearching = elements.searchInput.value.trim() !== '';
    
    elements.credentialList.innerHTML = '';
    
    if (list.length === 0) {
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
    
    list.forEach(credential => {
        const item = createCredentialItem(credential);
        elements.credentialList.appendChild(item);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createCredentialItem(credential) {
    const item = document.createElement('div');
    item.className = 'credential-item';
    item.dataset.id = credential.id;
    
    item.innerHTML = `
        <div class="credential-header">
            <span class="credential-site">${escapeHtml(credential.siteName)}</span>
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
    
    item.querySelector('.btn-edit').addEventListener('click', () => openEditModal(credential.id));
    item.querySelector('.btn-delete').addEventListener('click', () => openDeleteConfirm(credential.id));
    item.querySelector('.btn-show').addEventListener('click', (e) => togglePasswordVisibility(e, credential.id));
    item.querySelector('.btn-copy').addEventListener('click', () => copyPassword(credential.id));
    
    return item;
}

function togglePasswordVisibility(e, id) {
    const credential = CredentialService.getById(id);
    if (!credential) return;
    
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

async function copyPassword(id) {
    const credential = CredentialService.getById(id);
    if (!credential) return;
    
    try {
        await navigator.clipboard.writeText(credential.password);
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

function openAddModal() {
    elements.modalTitle.textContent = '添加凭证';
    elements.credentialId.value = '';
    elements.credentialForm.reset();
    elements.password.type = 'password';
    elements.togglePassword.textContent = '👁';
    elements.credentialModal.style.display = 'flex';
    elements.siteName.focus();
}

function openEditModal(id) {
    const credential = CredentialService.getById(id);
    if (!credential) return;
    
    elements.modalTitle.textContent = '编辑凭证';
    elements.credentialId.value = id;
    elements.siteName.value = credential.siteName;
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

async function handleSetup() {
    const password = elements.newMasterPassword.value;
    const confirm = elements.confirmMasterPassword.value;
    
    if (!password) {
        elements.authError.textContent = '请输入主密码';
        return;
    }
    if (password !== confirm) {
        elements.authError.textContent = '两次输入的密码不一致';
        return;
    }
    
    try {
        await AuthService.initialize(password);
        showToast('主密码设置成功');
        await showMainView();
    } catch (e) {
        elements.authError.textContent = e.message;
    }
}

async function handleUnlock() {
    const password = elements.masterPassword.value;
    
    if (!password) {
        elements.authError.textContent = '请输入主密码';
        return;
    }
    
    try {
        const success = await AuthService.unlock(password);
        if (success) {
            await showMainView();
        } else {
            elements.authError.textContent = '主密码错误';
        }
    } catch (e) {
        elements.authError.textContent = e.message;
    }
}

function handleLock() {
    AuthService.lock();
    CredentialService.clearCache();
    showLoginView();
    showToast('已锁定');
}

function handleSearch() {
    const query = elements.searchInput.value;
    const results = CredentialService.search(query);
    renderCredentialList(results);
}

async function handleCredentialSubmit(e) {
    e.preventDefault();
    
    const id = elements.credentialId.value;
    const input = {
        siteName: elements.siteName.value,
        username: elements.username.value,
        password: elements.password.value,
        notes: elements.notes.value
    };
    
    try {
        if (id) {
            await CredentialService.update(id, input);
            showToast('凭证已更新');
        } else {
            await CredentialService.add(input);
            showToast('凭证已添加');
        }
        closeCredentialModal();
        renderCredentialList();
    } catch (e) {
        showToast('保存失败: ' + e.message);
    }
}

async function handleDelete() {
    if (!deleteTargetId) return;
    
    try {
        await CredentialService.remove(deleteTargetId);
        showToast('凭证已删除');
        closeDeleteConfirm();
        renderCredentialList();
    } catch (e) {
        showToast('删除失败: ' + e.message);
    }
}

function bindEvents() {
    elements.btnSetup.addEventListener('click', handleSetup);
    elements.confirmMasterPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSetup();
    });
    elements.btnUnlock.addEventListener('click', handleUnlock);
    elements.masterPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUnlock();
    });
    elements.btnLock.addEventListener('click', handleLock);
    elements.searchInput.addEventListener('input', handleSearch);
    elements.btnAdd.addEventListener('click', openAddModal);
    elements.credentialForm.addEventListener('submit', handleCredentialSubmit);
    elements.btnCancel.addEventListener('click', closeCredentialModal);
    elements.togglePassword.addEventListener('click', () => {
        if (elements.password.type === 'password') {
            elements.password.type = 'text';
            elements.togglePassword.textContent = '🙈';
        } else {
            elements.password.type = 'password';
            elements.togglePassword.textContent = '👁';
        }
    });
    elements.btnConfirmCancel.addEventListener('click', closeDeleteConfirm);
    elements.btnConfirmDelete.addEventListener('click', handleDelete);
    elements.credentialModal.addEventListener('click', (e) => {
        if (e.target === elements.credentialModal) closeCredentialModal();
    });
    elements.confirmModal.addEventListener('click', (e) => {
        if (e.target === elements.confirmModal) closeDeleteConfirm();
    });
}

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initElements();
    bindEvents();
    
    if (AuthService.isInitialized()) {
        showLoginView();
    } else {
        showSetupView();
    }
});
