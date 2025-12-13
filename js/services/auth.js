/**
 * AuthService - 认证服务
 * 提供主密码验证和密钥管理功能
 */

import { deriveKey, encrypt, decrypt, generateSalt, bytesToBase64, base64ToBytes } from './crypto.js';
import { saveMasterPasswordData, loadMasterPasswordData } from './storage.js';

// 用于验证主密码的固定字符串
const VERIFICATION_STRING = 'PASSWORD_MANAGER_VERIFICATION';

// 当前会话的加密密钥（内存中）
let currentKey = null;
let currentSalt = null;

/**
 * 检查是否已设置主密码
 * @returns {boolean}
 */
export function isInitialized() {
    return loadMasterPasswordData() !== null;
}

/**
 * 首次设置主密码
 * @param {string} masterPassword 主密码
 * @returns {Promise<void>}
 */
export async function initialize(masterPassword) {
    if (isInitialized()) {
        throw new Error('主密码已设置');
    }
    
    if (!masterPassword || masterPassword.length < 1) {
        throw new Error('主密码不能为空');
    }
    
    // 生成随机盐值
    const salt = generateSalt();
    
    // 派生密钥
    const key = await deriveKey(masterPassword, salt);
    
    // 加密验证字符串
    const verificationData = await encrypt(VERIFICATION_STRING, key);
    
    // 保存盐值和验证数据
    saveMasterPasswordData({
        salt: bytesToBase64(salt),
        verificationHash: JSON.stringify(verificationData)
    });
    
    // 保存当前密钥到内存
    currentKey = key;
    currentSalt = salt;
}

/**
 * 验证主密码并解锁
 * @param {string} masterPassword 主密码
 * @returns {Promise<boolean>} 验证是否成功
 */
export async function unlock(masterPassword) {
    const data = loadMasterPasswordData();
    if (!data) {
        throw new Error('主密码未设置');
    }
    
    try {
        // 获取盐值
        const salt = base64ToBytes(data.salt);
        
        // 派生密钥
        const key = await deriveKey(masterPassword, salt);
        
        // 尝试解密验证字符串
        const verificationData = JSON.parse(data.verificationHash);
        const decrypted = await decrypt(verificationData, key);
        
        // 验证解密结果
        if (decrypted === VERIFICATION_STRING) {
            currentKey = key;
            currentSalt = salt;
            return true;
        }
        
        return false;
    } catch (e) {
        // 解密失败说明密码错误
        return false;
    }
}

/**
 * 锁定（清除内存中的密钥）
 */
export function lock() {
    currentKey = null;
    currentSalt = null;
}

/**
 * 获取当前加密密钥
 * @returns {CryptoKey|null}
 */
export function getEncryptionKey() {
    return currentKey;
}

/**
 * 检查是否已解锁
 * @returns {boolean}
 */
export function isUnlocked() {
    return currentKey !== null;
}

// 导出AuthService对象
export const AuthService = {
    isInitialized,
    initialize,
    unlock,
    lock,
    getEncryptionKey,
    isUnlocked
};

export default AuthService;
