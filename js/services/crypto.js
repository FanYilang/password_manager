/**
 * CryptoService - 加密服务
 * 提供PBKDF2密钥派生和AES-256-GCM加密/解密功能
 */

// PBKDF2迭代次数
const PBKDF2_ITERATIONS = 100000;
// 盐值长度（字节）
const SALT_LENGTH = 16;
// IV长度（字节）
const IV_LENGTH = 12;

/**
 * 生成随机盐值
 * @returns {Uint8Array} 随机盐值
 */
export function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * 生成随机初始化向量
 * @returns {Uint8Array} 随机IV
 */
export function generateIV() {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * 将Uint8Array转换为Base64字符串
 * @param {Uint8Array} bytes 
 * @returns {string}
 */
export function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * 将Base64字符串转换为Uint8Array
 * @param {string} base64 
 * @returns {Uint8Array}
 */
export function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * 使用PBKDF2从主密码派生加密密钥
 * @param {string} password 主密码
 * @param {Uint8Array} salt 盐值
 * @returns {Promise<CryptoKey>} 派生的加密密钥
 */
export async function deriveKey(password, salt) {
    // 将密码转换为密钥材料
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );
    
    // 使用PBKDF2派生AES-256密钥
    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        {
            name: 'AES-GCM',
            length: 256
        },
        false,
        ['encrypt', 'decrypt']
    );
    
    return derivedKey;
}

/**
 * 使用AES-256-GCM加密数据
 * @param {string} data 要加密的数据
 * @param {CryptoKey} key 加密密钥
 * @returns {Promise<{ciphertext: string, iv: string}>} 加密结果
 */
export async function encrypt(data, key) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const iv = generateIV();
    
    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        dataBuffer
    );
    
    return {
        ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
        iv: bytesToBase64(iv)
    };
}

/**
 * 使用AES-256-GCM解密数据
 * @param {{ciphertext: string, iv: string}} encryptedData 加密数据
 * @param {CryptoKey} key 解密密钥
 * @returns {Promise<string>} 解密后的数据
 */
export async function decrypt(encryptedData, key) {
    const ciphertextBytes = base64ToBytes(encryptedData.ciphertext);
    const ivBytes = base64ToBytes(encryptedData.iv);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: ivBytes
        },
        key,
        ciphertextBytes
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}

// 导出CryptoService对象
export const CryptoService = {
    generateSalt,
    generateIV,
    deriveKey,
    encrypt,
    decrypt,
    bytesToBase64,
    base64ToBytes
};

export default CryptoService;
