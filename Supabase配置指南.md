# 🚀 Supabase 多用户密码管理器 - 配置指南

## 📝 目录
1. [注册 Supabase 账号](#步骤1注册-supabase-账号)
2. [创建项目](#步骤2创建-supabase-项目)
3. [配置数据库](#步骤3配置数据库)
4. [获取 API 密钥](#步骤4获取-api-密钥)
5. [配置代码](#步骤5配置代码)
6. [测试功能](#步骤6测试功能)

---

## 步骤1：注册 Supabase 账号

### 1.1 访问 Supabase 官网

打开浏览器，访问：
```
https://supabase.com
```

### 1.2 点击注册

1. 点击右上角的 **"Start your project"** 或 **"Sign Up"** 按钮
2. 你可以选择以下任一方式注册：
   - ✅ **使用 GitHub 账号**（推荐，最快）
   - 使用 Google 账号
   - 使用邮箱注册

### 1.3 使用 GitHub 账号注册（推荐）

1. 点击 **"Continue with GitHub"**
2. 如果已登录 GitHub，会自动跳转
3. 点击 **"Authorize Supabase"** 授权
4. 完成！你现在有了 Supabase 账号

---

## 步骤2：创建 Supabase 项目

### 2.1 创建新项目

1. 登录后，你会看到 Supabase 控制台
2. 点击 **"New Project"**（新建项目）按钮

### 2.2 填写项目信息

填写以下信息：

| 字段 | 填写内容 | 说明 |
|------|---------|------|
| **Name** | `password-manager` | 项目名称（可以随意取） |
| **Database Password** | 设置一个强密码 | ⚠️ **重要**：请记住这个密码！ |
| **Region** | `Northeast Asia (Tokyo)` | 选择离你最近的区域（东京） |
| **Pricing Plan** | `Free` | 选择免费计划 |

### 2.3 创建项目

1. 点击 **"Create new project"** 按钮
2. 等待 1-2 分钟，Supabase 会自动创建数据库
3. 看到 "Project is ready" 就表示创建成功了！

---

## 步骤3：配置数据库

### 3.1 打开 SQL 编辑器

1. 在左侧菜单中，点击 **"SQL Editor"**（SQL 编辑器）
2. 点击 **"New query"**（新建查询）

### 3.2 创建数据表

复制以下 SQL 代码，粘贴到编辑器中：

```sql
-- 创建凭证表
CREATE TABLE credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  site_name TEXT NOT NULL,
  username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 创建索引（提高查询速度）
CREATE INDEX credentials_user_id_idx ON credentials(user_id);

-- 启用行级安全策略（RLS）
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- 创建安全策略：用户只能看到自己的数据
CREATE POLICY "Users can view their own credentials"
  ON credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials"
  ON credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials"
  ON credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials"
  ON credentials FOR DELETE
  USING (auth.uid() = user_id);
```

### 3.3 运行 SQL

1. 点击右下角的 **"Run"**（运行）按钮
2. 看到 "Success. No rows returned" 就表示成功了！

---

## 步骤4：获取 API 密钥

### 4.1 打开项目设置

1. 点击左侧菜单底部的 **"Project Settings"**（项目设置）齿轮图标
2. 点击左侧的 **"API"** 选项

### 4.2 复制 API 信息

你会看到以下信息，**请复制保存**：

| 信息 | 说明 | 示例 |
|------|------|------|
| **Project URL** | 项目地址 | `https://xxxxx.supabase.co` |
| **anon public** | 公开密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

⚠️ **重要**：
- 复制 **"Project URL"** 下面的网址
- 复制 **"anon" "public"** 下面的密钥（很长的一串字符）

### 4.3 保存到记事本

打开记事本，保存这两个信息：
```
Project URL: https://sflbywafjqusukjtozzd.supabase.co
API Key: sb_publishable_b3c4JHA9cksQzoZml1XTyw_DqC8OcnF
```

---

## 步骤5：配置代码

### 5.1 等待我更新代码

我会帮你：
1. 创建配置文件
2. 添加 Supabase 客户端
3. 实现用户注册/登录功能
4. 实现自动数据同步

### 5.2 你需要做的

当我创建好配置文件后，你需要：
1. 打开 `supabase-config.js` 文件
2. 把你的 **Project URL** 和 **API Key** 粘贴进去
3. 保存文件

---

## 步骤6：测试功能

### 6.1 本地测试

1. 打开 `index.html` 文件
2. 注册一个新账号
3. 添加几个密码凭证
4. 退出登录，重新登录
5. 检查数据是否还在

### 6.2 跨设备测试

1. 在电脑上登录你的账号
2. 添加一些密码
3. 在手机上打开网站
4. 用同一个账号登录
5. 检查是否能看到电脑上添加的密码

---

## ✅ 完成检查清单

在继续之前，请确认你已经完成：

- [ ] 注册了 Supabase 账号
- [ ] 创建了新项目
- [ ] 运行了 SQL 创建数据表
- [ ] 复制保存了 Project URL
- [ ] 复制保存了 API Key

---

## 🆘 常见问题

### Q: 忘记了数据库密码怎么办？
A: 数据库密码只在创建项目时使用一次，后续不需要。如果需要直接连接数据库，可以在项目设置中重置。

### Q: 免费版有什么限制？
A: 免费版限制：
- 500MB 数据库存储（足够存储数万条密码）
- 1GB 文件存储
- 50,000 月活跃用户
- 对个人使用完全足够！

### Q: 数据安全吗？
A: 非常安全！
- 密码在浏览器中加密后才上传
- Supabase 只存储加密后的数据
- 使用行级安全策略，用户只能访问自己的数据

### Q: 可以导出数据吗？
A: 可以！我会保留导出功能，你随时可以导出所有数据。

---

## 📞 需要帮助？

如果遇到任何问题：
1. 截图发给我
2. 告诉我在哪一步遇到问题
3. 我会立即帮你解决！

---

**准备好了吗？让我们开始吧！** 🚀

请先完成步骤 1-4，然后告诉我你的进度！
