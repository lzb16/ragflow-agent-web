# 管理员创建与用户权限管理设计

**日期：** 2026-04-02  
**状态：** 已批准

## 背景

当前系统中 `User.is_admin` 默认为 `False`，注册接口不支持创建管理员账号，也没有任何途径将用户提升为管理员。本设计解决"如何安全创建和管理管理员"的问题，面向小团队场景（数位固定成员需要管理员权限）。

## 方案概述

采用两层设计：
1. **环境变量引导**：解决第一个管理员的引导（bootstrap）问题
2. **管理后台用户管理**：让已有管理员可以在界面上管理团队成员权限

---

## 后端

### 1. 启动时环境变量引导

**触发时机：** 应用启动时，在 `create_db_and_tables()` 之后执行。

**环境变量：**
```
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=yourpassword
```

**逻辑：**
- 若 `ADMIN_EMAIL` 未设置，跳过。
- 若该邮箱对应用户不存在，则创建新用户并设 `is_admin=True`，用户名默认为 `admin`。
- 若该邮箱用户已存在，跳过（不覆盖，不修改）。

这确保只在首次部署时生效，不影响已有数据。

### 2. 用户管理 API

**`GET /api/admin/users`**
- 权限：`AdminDep`
- 返回所有用户列表
- 字段：`id`, `username`, `email`, `is_admin`, `created_at`
- 按注册时间降序排列

**`PATCH /api/admin/users/{user_id}/set-admin`**
- 权限：`AdminDep`
- 请求体：`{"is_admin": true | false}`
- 提升或撤销指定用户的管理员权限
- 约束：禁止操作自己（返回 `400 Cannot change your own admin status`），防止管理员意外锁死自己

---

## 前端

### 新页面：`/admin/users`

**位置：** 加入现有管理后台导航。

**内容：**
- 表格展示所有用户，列：用户名、邮箱、注册时间、管理员状态标签
- 每行操作按钮：
  - 非管理员 → "设为管理员"
  - 管理员 → "撤销管理员"
  - 当前登录用户自己的行：按钮置灰，不可操作
- 操作成功后刷新列表

**API 调用：**
- `GET /api/admin/users` — 加载用户列表
- `PATCH /api/admin/users/{id}/set-admin` — 切换权限

---

## 安全考量

- 管理员操作均需有效 JWT 且 `is_admin=true`，由 `AdminDep` 统一校验
- 环境变量中的 `ADMIN_PASSWORD` 应通过 `.env` 文件管理，不得提交到版本库
- 管理员不能修改自己的管理员状态，避免意外自我撤权

## 不在本次范围内

- 管理员邀请链接
- 权限分级（超级管理员 vs 普通管理员）
- 用户注销/封禁功能
