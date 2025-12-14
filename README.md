# 🔐 密码管理器

一个安全、简洁的密码管理器，支持云同步和跨设备访问。

## ✨ 特性

- 🔒 **端到端加密** - 使用 AES-256-GCM 加密，密码在本地加密后才上传
- ☁️ **云同步** - 基于 Supabase，多设备实时同步
- 👥 **多用户系统** - 邮箱注册登录，每个用户独立数据空间
- 📱 **跨设备访问** - 通过 GitHub Pages 在手机和电脑上访问
- 💾 **导入导出** - 支持加密备份和恢复
- 🔍 **快速搜索** - 实时搜索网站和账号
- 🎨 **响应式设计** - 完美适配各种屏幕尺寸

## 📦 两个版本

| 版本 | 文件 | 说明 |
|------|------|------|
| **云同步版**（默认） | `index.html` | 需要注册登录，数据自动云同步 |
| **本地版** | `index-local.html` | 纯本地存储，无需网络 |

## 🚀 快速开始

### 在线访问

```
https://fanyilang.github.io/password_manager/
```

### 本地使用

1. 克隆仓库：
```bash
git clone https://github.com/FanYilang/password_manager.git
cd password_manager
```

2. 直接打开 `index.html` 文件即可使用

## 📖 使用说明

### 云同步版（推荐）

1. 打开网站，点击"注册"
2. 输入邮箱和密码完成注册
3. 登录后即可添加密码凭证
4. 数据自动同步到云端，换设备登录同一账号即可

### 本地版

1. 打开 `index-local.html`
2. 设置主密码
3. 数据存储在浏览器本地
4. 跨设备需要手动导出/导入

## 🔧 部署到 GitHub Pages

1. 进入 GitHub 仓库 → `Settings` → `Pages`
2. Source 选择 `main` 分支
3. 点击 `Save`
4. 等待几分钟，访问 `https://你的用户名.github.io/password_manager/`

## 📱 移动端使用

1. 在手机浏览器中访问 GitHub Pages 地址
2. 添加到主屏幕：
   - **iOS Safari**：分享 → 添加到主屏幕
   - **Android Chrome**：菜单 → 添加到主屏幕

## 🔐 安全说明

- ✅ 所有密码在浏览器中加密后才上传
- ✅ 使用 PBKDF2（100,000 次迭代）派生加密密钥
- ✅ 云端只存储加密后的数据
- ✅ 行级安全策略，用户只能访问自己的数据

## 🛠️ 技术栈

- Supabase（后端服务、用户认证、数据库）
- Web Crypto API（加密）
- 响应式 CSS
- 原生 JavaScript

## 📄 许可证

MIT License
