/**
 * 密码管理器 - 主应用入口
 */

import { AuthService } from './services/auth.js';
import { CredentialService } from './services/credential.js';
import { maskPassword, showToast } from './utils/helpers.js';

// DOM元素引用
const elements = {
    // 视图
    authView: document.getElementById('auth-view'),
    mainView: document.getElementById('main-view'),
    
    // 认证相关
    authSetup: document.getElementById('auth-setup'),
    authLogin: document.getElementById('auth-login'),
    authError: document.getElementById('auth-error'),
    newMasterPassword: document.getElementById('new-master-password'),
    confirmMasterPassword: document.getElementById('confirm-master-password'),
    masterPassword: document.getElementById('master-password'),
    btnSetup: document.getElementById('btn-setup'),
    btnUnlock: document.getElementById('btn-unlock'),
    btnLock: document.getElementById('btn-lock'),
    
    // 主界面
    searchInput: document.getElementById('search-input'),
    btnAdd: document.getElementById('btn-add'),
    credentialList: document.getElementById('credential-list'),
    emptyMessage: document.getElementById('empty-message'),
    noResults: document.getElementById('no-results'),
    
    // 凭证模态框
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
    
    // 确认对话框
    confirmModal: document.getElementById('confirm-modal'),
    btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete')
};

// 当前要删除的凭证ID
let deleteTargetId = null;

// 剪贴板清除定时器
let clipboardTimer = null;

/**
 * 初始化应用
 */
async function init() {
    // 检查是否已设置主密码
    if (AuthService.isInitialized()) {
        showLoginView();
    } else {
        showSetupView();
    }
    
    // 绑定事件
    bindEvents();
}

/**
 * 显示设置主密码视图
 */
function showSetupView() {
    elements.authView.style.display = 'block';
    elements.mainView.style.display = 'none';
    elements.authSetup.style.display = 'flex';
    elements.authLogin.style.display = 'none';
    elements.authError.textContent = '';
}

/**
 * 显示登录视图
 */
function showLoginView() {
    elements.authView.style.display = 'block';
    elements.mainView.style.display = 'none';
    elements.authSetup.style.display = 'none';
    elements.authLogin.style.display = 'flex';
    elements.authError.textContent = '';
    elements.masterPassword.value = '';
    elements.masterPassword.focus();
}

/**
 * 显示主视图
 */
async function showMainView() {
    elements.authView.style.display = 'none';
    elements.mainView.style.display = 'block';
    
    // 加载凭证
    await loadCredentials();
}

/**
 * 加载并显示凭证列表
 */
async function loadCredentials() {
    try {
        await CredentialService.loadAll();
        renderCredentialList();
    } catch (e) {
        showToast('加载凭证失败: ' + e.message);
    }
}

/**
 * 渲染凭证列表
 * @param {Credential[]} credentials 可选，指定要渲染的凭证列表
 */
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

/**
 * 创建凭证列表项DOM元素
 * @param {Credential} credential 
 * @returns {HTMLElement}
 */
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
    
    // 绑定按钮事件
    item.querySelector('.btn-edit').addEventListener('click', () => openEditModal(credential.id));
    item.querySelector('.btn-delete').addEventListener('click', () => openDeleteConfirm(credential.id));
    item.querySelector('.btn-show').addEventListener('click', (e) => togglePasswordVisibility(e, credential.id));
    item.querySelector('.btn-copy').addEventListener('click', () => copyPassword(credential.id));
    
    return item;
}

/**
 * HTML转义
 * @param {string} text 
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 切换密码显示/隐藏
 * @param {Event} e 
 * @param {string} id 
 */
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

/**
 * 复制密码到剪贴板
 * @param {string} id 
 */
async function copyPassword(id) {
    const credential = CredentialService.getById(id);
    if (!credential) return;
    
    try {
        await navigator.clipboard.writeText(credential.password);
        showToast('密码已复制到剪贴板');
        
        // 清除之前的定时器
        if (clipboardTimer) {
            clearTimeout(clipboardTimer);
        }
        
        // 30秒后清除剪贴板
        clipboardTimer = setTimeout(async () => {
            try {
                await navigator.clipboard.writeText('');
                showToast('剪贴板已清除');
            } catch (e) {
                // 忽略清除失败
            }
        }, 30000);
    } catch (e) {
        showToast('复制失败，请手动复制');
    }
}

/**
 * 打开添加凭证模态框
 */
function openAddModal() {
    elements.modalTitle.textContent = '添加凭证';
    elements.credentialId.value = '';
    elements.credentialForm.reset();
    elements.password.type = 'password';
    elements.togglePassword.textContent = '👁';
    elements.credentialModal.style.display = 'flex';
    elements.siteName.focus();
}

/**
 * 打开编辑凭证模态框
 * @param {string} id 
 */
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

/**
 * 关闭凭证模态框
 */
function closeCredentialModal() {
    elements.credentialModal.style.display = 'none';
    elements.credentialForm.reset();
}

/**
 * 打开删除确认对话框
 * @param {string} id 
 */
function openDeleteConfirm(id) {
    deleteTargetId = id;
    elements.confirmModal.style.display = 'flex';
}

/**
 * 关闭删除确认对话框
 */
function closeDeleteConfirm() {
    deleteTargetId = null;
    elements.confirmModal.style.display = 'none';
}

/**
 * 绑定事件处理器
 */
function bindEvents() {
    // 设置主密码
    elements.btnSetup.addEventListener('click', handleSetup);
    elements.confirmMasterPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSetup();
    });
    
    // 解锁
    elements.btnUnlock.addEventListener('click', handleUnlock);
    elements.masterPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUnlock();
    });
    
    // 锁定
    elements.btnLock.addEventListener('click', handleLock);
    
    // 搜索
    elements.searchInput.addEventListener('input', handleSearch);
    
    // 添加凭证
    elements.btnAdd.addEventListener('click', openAddModal);
    
    // 凭证表单
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
    
    // 删除确认
    elements.btnConfirmCancel.addEventListener('click', closeDeleteConfirm);
    elements.btnConfirmDelete.addEventListener('click', handleDelete);
    
    // 点击模态框背景关闭
    elements.credentialModal.addEventListener('click', (e) => {
        if (e.target === elements.credentialModal) closeCredentialModal();
    });
    elements.confirmModal.addEventListener('click', (e) => {
        if (e.target === elements.confirmModal) closeDeleteConfirm();
    });
}

/**
 * 处理设置主密码
 */
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

/**
 * 处理解锁
 */
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

/**
 * 处理锁定
 */
function handleLock() {
    AuthService.lock();
    CredentialService.clearCache();
    showLoginView();
    showToast('已锁定');
}

/**
 * 处理搜索
 */
function handleSearch() {
    const query = elements.searchInput.value;
    const results = CredentialService.search(query);
    renderCredentialList(results);
}

/**
 * 处理凭证表单提交
 * @param {Event} e 
 */
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

/**
 * 处理删除
 */
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

// 启动应用
init();
