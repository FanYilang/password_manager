# 🔐 密码管理器

一个安全、简洁的本地密码管理器，支持跨设备访问。

## ✨ 特性

- 🔒 **端到端加密** - 使用 AES-256-GCM 加密，数据完全本地化
- 📱 **跨设备访问** - 通过 GitHub Pages 在手机和电脑上访问
- 💾 **导入导出** - 支持加密备份和恢复
- 🔍 **快速搜索** - 实时搜索网站和账号
- 🎨 **响应式设计** - 完美适配各种屏幕尺寸

## 🚀 快速开始

### 在线访问

访问 GitHub Pages 部署的网站：
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

### 首次使用

1. 打开网站后，设置一个强主密码
2. 主密码用于加密所有存储的凭证
3. **重要**：请牢记主密码，忘记后无法恢复数据

### 添加凭证

1. 点击"添加新凭证"按钮
2. 填写网站名称、用户名、密码和备注
3. 点击"保存"

### 跨设备同步

由于数据存储在浏览器的 localStorage 中，不同设备间需要手动同步：

1. **导出数据**（在旧设备上）：
   - 点击"导出"按钮
   - 输入主密码
   - 下载加密的备份文件

2. **导入数据**（在新设备上）：
   - 点击"导入"按钮
   - 选择备份文件
   - 输入主密码
   - 选择冲突处理策略

## 🔧 部署到 GitHub Pages

### 方法一：通过 GitHub 网页操作

1. 进入你的 GitHub 仓库
2. 点击 `Settings` → `Pages`
3. 在 `Source` 下选择 `main` 分支
4. 点击 `Save`
5. 等待几分钟，访问 `https://你的用户名.github.io/password_manager/`

### 方法二：通过命令行

```bash
# 确保所有文件已提交
git add .
git commit -m "Initial commit"
git push origin main

# 然后在 GitHub 网页上启用 Pages（见方法一）
```

## 🔐 安全说明

- ✅ 所有数据在本地加密存储
- ✅ 主密码不会被存储或传输
- ✅ 使用 PBKDF2（100,000 次迭代）派生加密密钥
- ✅ 备份文件使用独立密钥加密
- ⚠️ 数据存储在浏览器 localStorage，清除浏览器数据会丢失凭证
- ⚠️ 建议定期导出备份

## 📱 移动端访问

1. 在手机浏览器中访问 GitHub Pages 地址
2. 可以将网站添加到主屏幕，像 App 一样使用
3. **iOS Safari**：点击分享 → 添加到主屏幕
4. **Android Chrome**：菜单 → 添加到主屏幕

## 🛠️ 技术栈

- 纯前端实现，无需后端服务器
- Web Crypto API（加密）
- LocalStorage（存储）
- 响应式 CSS
- 原生 JavaScript（无框架依赖）

## 📝 注意事项

1. **主密码安全**：主密码是唯一的安全保障，请使用强密码
2. **定期备份**：建议定期导出备份文件保存到安全位置
3. **浏览器兼容性**：需要支持 Web Crypto API 的现代浏览器
4. **隐私模式**：在隐私/无痕模式下，数据不会被持久化保存

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
