/**
 * 工具函数
 */

/**
 * 生成UUID v4
 * @returns {string} UUID字符串
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 创建新的凭证对象
 * @param {{siteName: string, username: string, password: string, notes?: string}} input 
 * @returns {Credential}
 */
export function createCredential(input) {
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

/**
 * 验证凭证输入是否有效
 * @param {{siteName: string, username: string, password: string}} input 
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateCredentialInput(input) {
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
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * 序列化凭证列表为JSON字符串
 * @param {Credential[]} credentials 
 * @returns {string}
 */
export function serializeCredentials(credentials) {
    const data = {
        version: 1,
        credentials: credentials
    };
    return JSON.stringify(data);
}

/**
 * 反序列化JSON字符串为凭证列表
 * @param {string} json 
 * @returns {Credential[]}
 */
export function deserializeCredentials(json) {
    try {
        const data = JSON.parse(json);
        if (data.version === 1 && Array.isArray(data.credentials)) {
            return data.credentials;
        }
        // 兼容旧格式
        if (Array.isArray(data)) {
            return data;
        }
        return [];
    } catch (e) {
        return [];
    }
}

/**
 * 生成密码掩码
 * @param {number} length 掩码长度
 * @returns {string}
 */
export function maskPassword(length = 8) {
    return '•'.repeat(length);
}

/**
 * 显示提示消息
 * @param {string} message 
 * @param {number} duration 显示时长（毫秒）
 */
export function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }
}

export default {
    generateUUID,
    createCredential,
    validateCredentialInput,
    serializeCredentials,
    deserializeCredentials,
    maskPassword,
    showToast
};
