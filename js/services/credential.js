/**
 * CredentialService - 凭证服务
 * 提供凭证的增删改查功能
 */

import { encrypt, decrypt } from './crypto.js';
import { saveCredentials, loadCredentials } from './storage.js';
import { getEncryptionKey } from './auth.js';
import { 
    createCredential, 
    validateCredentialInput, 
    serializeCredentials, 
    deserializeCredentials 
} from '../utils/helpers.js';

// 内存中的凭证列表缓存
let credentialsCache = [];

/**
 * 加载并解密所有凭证
 * @returns {Promise<Credential[]>}
 */
export async function loadAll() {
    const key = getEncryptionKey();
    if (!key) {
        throw new Error('未解锁，无法加载凭证');
    }
    
    const encryptedData = loadCredentials();
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
        console.error('解密凭证失败:', e);
        credentialsCache = [];
        return [];
    }
}

/**
 * 保存凭证列表（加密后存储）
 * @returns {Promise<void>}
 */
async function saveAll() {
    const key = getEncryptionKey();
    if (!key) {
        throw new Error('未解锁，无法保存凭证');
    }
    
    const json = serializeCredentials(credentialsCache);
    const encryptedData = await encrypt(json, key);
    saveCredentials(JSON.stringify(encryptedData));
}

/**
 * 获取所有凭证
 * @returns {Credential[]}
 */
export function getAll() {
    return [...credentialsCache];
}

/**
 * 添加新凭证
 * @param {{siteName: string, username: string, password: string, notes?: string}} input 
 * @returns {Promise<Credential>}
 */
export async function add(input) {
    // 验证输入
    const validation = validateCredentialInput(input);
    if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
    }
    
    // 创建凭证
    const credential = createCredential(input);
    
    // 添加到缓存
    credentialsCache.push(credential);
    
    // 保存到存储
    await saveAll();
    
    return credential;
}

/**
 * 更新凭证
 * @param {string} id 凭证ID
 * @param {{siteName: string, username: string, password: string, notes?: string}} input 
 * @returns {Promise<Credential>}
 */
export async function update(id, input) {
    // 验证输入
    const validation = validateCredentialInput(input);
    if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
    }
    
    // 查找凭证
    const index = credentialsCache.findIndex(c => c.id === id);
    if (index === -1) {
        throw new Error('凭证不存在');
    }
    
    // 更新凭证（保持ID和创建时间不变）
    const updatedCredential = {
        ...credentialsCache[index],
        siteName: input.siteName.trim(),
        username: input.username.trim(),
        password: input.password,
        notes: input.notes?.trim() || '',
        updatedAt: Date.now()
    };
    
    credentialsCache[index] = updatedCredential;
    
    // 保存到存储
    await saveAll();
    
    return updatedCredential;
}

/**
 * 删除凭证
 * @param {string} id 凭证ID
 * @returns {Promise<void>}
 */
export async function remove(id) {
    const index = credentialsCache.findIndex(c => c.id === id);
    if (index === -1) {
        throw new Error('凭证不存在');
    }
    
    credentialsCache.splice(index, 1);
    
    // 保存到存储
    await saveAll();
}

/**
 * 搜索凭证
 * @param {string} query 搜索关键词
 * @returns {Credential[]}
 */
export function search(query) {
    if (!query || query.trim() === '') {
        return getAll();
    }
    
    const lowerQuery = query.toLowerCase().trim();
    return credentialsCache.filter(c => 
        c.siteName.toLowerCase().includes(lowerQuery) ||
        c.username.toLowerCase().includes(lowerQuery)
    );
}

/**
 * 根据ID获取凭证
 * @param {string} id 
 * @returns {Credential|undefined}
 */
export function getById(id) {
    return credentialsCache.find(c => c.id === id);
}

/**
 * 清除缓存
 */
export function clearCache() {
    credentialsCache = [];
}

// 导出CredentialService对象
export const CredentialService = {
    loadAll,
    getAll,
    add,
    update,
    remove,
    search,
    getById,
    clearCache
};

export default CredentialService;
