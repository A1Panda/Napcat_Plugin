<div align="center">

# Napcat 管理插件

*优雅的 Napcat 远程管理解决方案*

</div>

## 📖 介绍

Napcat 管理插件是一个基于 Yunzai-Bot 的扩展，提供了通过 QQ 机器人远程管理 Napcat 服务的能力。通过简单的指令，机器人主人可以轻松管理多个 Napcat 实例，包括启动、停止、重启、查看日志等操作。

> **⚠️ 重要提示：** 本插件仅支持 Napcat Linux 本地部署使用，不支持容器或 Docker 环境。

## ✨ 特性

- 🔐 **安全可靠** - 严格的权限控制，仅限机器人主人使用
- 🔄 **多账号管理** - 支持管理多个 QQ 账号的 Napcat 实例
- 📊 **实时监控** - 查看 Napcat 运行状态和日志
- 🚀 **远程操作** - 远程启动、停止、重启 Napcat 服务
- 📝 **日志查看** - 收集并以聊天记录形式展示日志
- 🔌 **SSH 连接** - 安全的 SSH 连接管理

## 📋 前置要求

- [Yunzai-Bot v3.0.0+](https://github.com/Le-niao/Yunzai-Bot)
- [Napcat](https://napneko.github.io/guide/napcat) 已在 Linux 服务器上安装
- SSH 服务已启用且可访问
- Node.js v14.0.0+

## 🚀 安装

1. 克隆本仓库到 Yunzai-Bot 的 plugins 目录
   ```bash
   cd Yunzai-Bot/plugins
   git clone https://github.com/A1Panda/Napcat_Plugin.git
   ```

2. 安装依赖
   ```bash
   pnpm install ssh2
   ```

3. 启动 Yunzai-Bot
   ```bash
   npm start
   ```

4. **首次启动配置**
   - 插件首次启动时会在插件根目录生成 `config/ssh_config.json` 配置文件
   - 您需要编辑此文件，填写正确的 SSH 连接信息
   - 配置完成后重启 Yunzai-Bot

## ⚙️ 配置

编辑 `config/ssh_config.json` 文件，填写您的 SSH 连接信息：

### 密码认证配置示例

```json
{
  "host": "your-server-ip",
  "port": 22,
  "username": "your-username",
  "password": "your-password"
}
```

### 密钥认证配置示例

```json
{
  "host": "your-server-ip",
  "port": 22,
  "username": "your-username",
  "privateKeyPath": "path/to/private/key",
  "passphrase": "your-passphrase-if-needed"
}
```

> **🔒 安全提示：** 建议使用密钥认证方式，更加安全。确保配置文件权限设置正确，防止未授权访问。

## 🎮 使用方法

> **🔒 注意：** 所有命令仅限机器人主人使用

### 基础命令

| 命令 | 描述 |
|------|------|
| `#napcat测试` | 测试 SSH 连接是否正常 |
| `#napcat帮助` | 显示帮助信息 |

### 状态管理

| 命令 | 描述 |
|------|------|
| `#napcat状态` | 查看所有 Napcat 实例状态 |
| `#napcat状态 123456789` | 查看指定 QQ 号的 Napcat 状态 |

### 启动与停止

| 命令 | 描述 |
|------|------|
| `#napcat启动 123456789` | 启动指定 QQ 号的 Napcat |
| `#napcat停止 123456789` | 停止指定 QQ 号的 Napcat |
| `#napcat停止` | 停止所有 Napcat 实例 |
| `#napcat重启 123456789` | 重启指定 QQ 号的 Napcat |

### 日志查看

| 命令 | 描述 |
|------|------|
| `#napcat日志 123456789` | 查看指定 QQ 号的 Napcat 日志（收集 60 秒后发送） |

### 更新

| 命令 | 描述 |
|------|------|
| `#napcat更新` | 更新 Napcat 程序 |

## ⚠️ 注意事项

1. **环境限制**
   - 本插件仅支持 Linux 本地部署的 Napcat
   - 不支持 Docker 或其他容器环境
   - 需要确保 SSH 用户有执行 Napcat 命令的权限

2. **权限控制**
   - 所有命令仅限机器人主人使用
   - 非主人用户将收到拒绝消息

3. **SSH 连接**
   - 确保 SSH 服务器允许密码认证或密钥认证
   - 防火墙需开放相应端口
   - 建议使用密钥认证以提高安全性

4. **日志查看**
   - 日志查看功能会收集 60 秒的日志后一次性发送
   - 日志以聊天记录形式展示，便于阅读
   - 日志中的 ANSI 颜色代码会被自动移除

5. **资源占用**
   - 日志功能会占用一定的网络资源
   - 长时间使用可能会影响机器人性能

## 🔍 故障排除

| 问题 | 解决方案 |
|------|----------|
| SSH 连接失败 | 检查 SSH 配置信息是否正确<br>确认服务器 SSH 服务是否正常运行<br>检查防火墙设置 |
| 命令执行失败 | 确认服务器上已安装 Napcat<br>检查 SSH 用户是否有执行 Napcat 命令的权限 |
| 日志显示问题 | 如果日志显示不完整，可能是因为日志量太大<br>尝试使用 `#napcat状态` 命令先检查状态 |
| 配置文件问题 | 确保 `config/ssh_config.json` 文件存在且格式正确<br>检查 JSON 语法是否有误 |

## 📝 更新日志

### v1.0.0 (2023-10-01)
- 初始版本发布
- 支持基本的 Napcat 管理功能
- 实现日志查看功能

## 🛣️ 开发计划

- [ ] 添加更多日志过滤选项
- [ ] 支持自定义日志查看时间
- [ ] 添加定时任务功能
- [ ] 优化日志显示格式
- [ ] 添加多服务器支持

## 📜 许可证

[MIT License](LICENSE) © 2023 Your Name 
