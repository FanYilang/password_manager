/**
 * StorageService - 存储服务
 * 提供localStorage读写操作
 */

// 存储键名
const STORAGE_KEYS = {
    MASTER_PASSWORD: 'pm_master',
    CREDENTIALS: 'pm_data'
};

/**
 * 保存加密后的凭证数据
 * @param {string} encryptedCredentials JSON字符串格式的加密凭证数据
 */
export function saveCredentials(encryptedCredentials) {
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, encryptedCredentials);
}

/**
 * 读取加密后的凭证数据
 * @returns {string|null} 加密的凭证数据，如果不存在则返回null
 */
export function loadCredentials() {
    return localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
}

/**
 * 保存主密码验证数据
 * @param {{salt: string, verificationHash: string}} data 主密码验证数据
 */
export function saveMasterPasswordData(data) {
    localStorage.setItem(STORAGE_KEYS.MASTER_PASSWORD, JSON.stringify(data));
}

/**
 * 读取主密码验证数据
 * @returns {{salt: string, verificationHash: string}|null} 主密码验证数据
 */
export function loadMasterPasswordData() {
    const data = localStorage.getItem(STORAGE_KEYS.MASTER_PASSWORD);
    if (data) {
        return JSON.parse(data);
    }
    return null;
}

/**
 * 清除所有数据
 */
export function clearAll() {
    localStorage.removeItem(STORAGE_KEYS.MASTER_PASSWORD);
    localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
}

/**
 * 检查是否有存储的数据
 * @returns {boolean}
 */
export function hasData() {
    return localStorage.getItem(STORAGE_KEYS.MASTER_PASSWORD) !== null;
}

// 导出StorageService对象
export const StorageService = {
    saveCredentials,
    loadCredentials,
    saveMasterPasswordData,
    loadMasterPasswordData,
    clearAll,
    hasData,
    STORAGE_KEYS
};

export default StorageService;
