/**
 * SyncService - 同步服务
 * 提供凭证数据的导入导出功能
 */

import { 
    generateSalt, 
    generateIV, 
    deriveKey, 
    bytesToBase64, 
    base64ToBytes 
} from './crypto.js';
import { getAll } from './credential.js';

// 同步文件版本号
const SYNC_FILE_VERSION = '1.0';

/**
 * 验证同步文件结构
 * @param {object} data 解析后的JSON对象
 * @returns {{valid: boolean, error?: string}}
 */
export function validateSyncFileStructure(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: '文件格式无效：不是有效的JSON对象' };
    }
    
    if (typeof data.version !== 'string' || !data.version) {
        return { valid: false, error: '文件格式无效：缺少版本号' };
    }
    
    if (typeof data.exportedAt !== 'string' || !data.exportedAt) {
        return { valid: false, error: '文件格式无效：缺少导出时间' };
    }
    
    if (typeof data.salt !== 'string' || !data.salt) {
        return { valid: false, error: '文件格式无效：缺少加密盐值' };
    }
    
    if (typeof data.iv !== 'string' || !data.iv) {
        return { valid: false, error: '文件格式无效：缺少初始化向量' };
    }
    
    if (typeof data.ciphertext !== 'string' || !data.ciphertext) {
        return { valid: false, error: '文件格式无效：缺少加密数据' };
    }
    
    return { valid: true };
}


/**
 * 导出凭证为加密的同步文件
 * @param {string} masterPassword 主密码
 * @returns {Promise<Blob>} 加密的同步文件Blob
 */
export async function exportCredentials(masterPassword) {
    // 获取所有凭证
    const credentials = getAll();
    
    // 生成唯一的salt和IV
    const salt = generateSalt();
    const iv = generateIV();
    
    // 从主密码派生密钥
    const key = await deriveKey(masterPassword, salt);
    
    // 准备要加密的数据
    const payload = {
        credentials: credentials,
        exportedAt: new Date().toISOString()
    };
    const plaintext = JSON.stringify(payload);
    
    // 加密数据
    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(plaintext);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        plaintextBuffer
    );
    
    // 构建同步文件格式
    const syncFile = {
        version: SYNC_FILE_VERSION,
        exportedAt: new Date().toISOString(),
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer))
    };
    
    // 返回Blob
    const json = JSON.stringify(syncFile, null, 2);
    return new Blob([json], { type: 'application/json' });
}

/**
 * 从同步文件导入凭证
 * @param {File|Blob|string} file 同步文件
 * @param {string} masterPassword 主密码
 * @returns {Promise<{credentials: Array, exportedAt: string}>} 解密后的凭证数据
 */
export async function importCredentials(file, masterPassword) {
    // 读取文件内容
    let content;
    if (typeof file === 'string') {
        content = file;
    } else {
        content = await file.text();
    }
    
    // 解析JSON
    let syncFile;
    try {
        syncFile = JSON.parse(content);
    } catch (e) {
        throw new Error('文件格式无效：不是有效的JSON');
    }
    
    // 验证文件结构
    const validation = validateSyncFileStructure(syncFile);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    // 解码salt和iv
    const salt = base64ToBytes(syncFile.salt);
    const iv = base64ToBytes(syncFile.iv);
    const ciphertext = base64ToBytes(syncFile.ciphertext);
    
    // 从主密码派生密钥
    const key = await deriveKey(masterPassword, salt);
    
    // 解密数据
    let decryptedBuffer;
    try {
        decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );
    } catch (e) {
        throw new Error('密码错误或文件已损坏');
    }
    
    // 解析解密后的数据
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decryptedBuffer);
    
    let payload;
    try {
        payload = JSON.parse(plaintext);
    } catch (e) {
        throw new Error('解密数据格式无效');
    }
    
    if (!Array.isArray(payload.credentials)) {
        throw new Error('解密数据格式无效：缺少凭证数组');
    }
    
    return {
        credentials: payload.credentials,
        exportedAt: payload.exportedAt
    };
}

/**
 * 生成凭证的唯一键（用于重复检测）
 * @param {object} credential 凭证对象
 * @returns {string} 唯一键
 */
function getCredentialKey(credential) {
    return `${credential.siteName.toLowerCase()}|${credential.username.toLowerCase()}`;
}

/**
 * 检测导入凭证与现有凭证的重复项
 * @param {Array} imported 导入的凭证数组
 * @param {Array} existing 现有的凭证数组
 * @returns {Array} 重复的凭证数组（来自imported）
 */
export function detectConflicts(imported, existing) {
    const existingKeys = new Set(existing.map(getCredentialKey));
    return imported.filter(cred => existingKeys.has(getCredentialKey(cred)));
}

/**
 * 合并凭证
 * @param {Array} imported 导入的凭证数组
 * @param {Array} existing 现有的凭证数组
 * @param {'replace'|'skip'|'newer'} strategy 合并策略
 * @returns {{result: Array, added: number, updated: number, skipped: number}}
 */
export function mergeCredentials(imported, existing, strategy) {
    const existingMap = new Map();
    existing.forEach(cred => {
        existingMap.set(getCredentialKey(cred), cred);
    });
    
    let added = 0;
    let updated = 0;
    let skipped = 0;
    
    const result = [...existing];
    
    for (const importedCred of imported) {
        const key = getCredentialKey(importedCred);
        const existingCred = existingMap.get(key);
        
        if (!existingCred) {
            // 新凭证，直接添加
            result.push(importedCred);
            added++;
        } else {
            // 重复凭证，根据策略处理
            const existingIndex = result.findIndex(c => getCredentialKey(c) === key);
            
            switch (strategy) {
                case 'replace':
                    // 替换现有凭证
                    result[existingIndex] = { ...importedCred, id: existingCred.id };
                    updated++;
                    break;
                    
                case 'skip':
                    // 跳过，保留现有凭证
                    skipped++;
                    break;
                    
                case 'newer':
                    // 保留较新的
                    const importedTime = importedCred.updatedAt || 0;
                    const existingTime = existingCred.updatedAt || 0;
                    if (importedTime > existingTime) {
                        result[existingIndex] = { ...importedCred, id: existingCred.id };
                        updated++;
                    } else {
                        skipped++;
                    }
                    break;
            }
        }
    }
    
    return { result, added, updated, skipped };
}

// 导出SyncService对象
export const SyncService = {
    exportCredentials,
    importCredentials,
    validateSyncFileStructure,
    detectConflicts,
    mergeCredentials,
    SYNC_FILE_VERSION
};

export default SyncService;
