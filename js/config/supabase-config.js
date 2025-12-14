/**
 * Supabase 配置文件
 * 
 * 重要提示：
 * 1. 这个文件包含你的 Supabase 项目信息
 * 2. anon key 是公开的，可以安全地放在前端代码中
 * 3. 所有数据都通过行级安全策略（RLS）保护
 */

const SUPABASE_CONFIG = {
    // 你的 Supabase 项目 URL
    url: 'https://sflbywafjqusukjtozzd.supabase.co',
    
    // 你的 Supabase anon public key
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbGJ5d2FmanF1c3VranRvenpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2OTMyNjAsImV4cCI6MjA4MTI2OTI2MH0.36KQxhS-7zbcqa7uPXikS_8HMKBSGkzbWb3P-SGljRo'
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}
