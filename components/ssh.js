import { NodeSSH } from 'node-ssh'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.join(__dirname, '../config/ssh_config.json')

class SSHClient {
  constructor() {
    this.ssh = new NodeSSH()
    this.config = this.loadConfig()
    this.connected = false
  }

  loadConfig() {
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8')
        return JSON.parse(configData)
      } else {
        // 创建默认配置
        const defaultConfig = {
          host: 'localhost',
          port: 22,
          username: 'user',
          password: '',
          // 或者使用私钥
          // privateKey: '/path/to/private/key'
        }
        
        // 确保目录存在
        const configDir = path.dirname(configPath)
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true })
        }
        
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
        return defaultConfig
      }
    } catch (error) {
      console.error('加载 SSH 配置失败:', error)
      return {
        host: 'localhost',
        port: 22,
        username: 'root',
        password: ''
      }
    }
  }

  async connect() {
    if (this.connected) return true
    
    try {
      await this.ssh.connect(this.config)
      this.connected = true
      console.log('SSH 连接成功')
      return true
    } catch (error) {
      console.error('SSH 连接失败:', error)
      return false
    }
  }

  async disconnect() {
    if (!this.connected) return
    
    this.ssh.dispose()
    this.connected = false
    console.log('SSH 连接已断开')
  }

  async executeCommand(command, timeout = 30000) {
    if (!this.connected) {
      const connected = await this.connect()
      if (!connected) {
        return { success: false, message: 'SSH 连接失败' }
      }
    }

    try {
      // 创建一个带超时的 Promise
      const commandPromise = this.ssh.execCommand(command)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('命令执行超时')), timeout)
      )
      
      // 使用 Promise.race 实现超时控制
      const result = await Promise.race([commandPromise, timeoutPromise])
      
      return {
        success: result.code === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code
      }
    } catch (error) {
      console.error('执行命令失败:', error)
      return { success: false, message: `执行命令失败: ${error.message}` }
    }
  }

  // napcat 相关命令
  async napcatStart(qq) {
    return this.executeCommand(`napcat start ${qq}`)
  }

  async napcatStop(qq = '') {
    return this.executeCommand(`napcat stop ${qq}`)
  }

  async napcatRestart(qq) {
    return this.executeCommand(`napcat restart ${qq}`)
  }

  async napcatStatus(qq = '') {
    return this.executeCommand(`napcat status ${qq}`)
  }

  async napcatLog(qq) {
    return this.executeCommand(`napcat log ${qq}`)
  }

  async napcatStartup(qq) {
    return this.executeCommand(`napcat startup ${qq}`)
  }

  async napcatStartdown(qq) {
    return this.executeCommand(`napcat startdown ${qq}`)
  }

  async napcatUpdate() {
    return this.executeCommand('napcat update')
  }

  async napcatRebuild() {
    return this.executeCommand('napcat rebuild')
  }

  async napcatRemove() {
    return this.executeCommand('napcat remove')
  }

  async napcatHelp() {
    return this.executeCommand('napcat help')
  }

  async napcatOldHelp() {
    return this.executeCommand('napcat oldhelp')
  }

  // 添加一个新方法用于获取实时日志的一部分
  async getPartialLog(qq, timeout = 5000) {
    if (!this.connected) {
      const connected = await this.connect()
      if (!connected) {
        return { success: false, message: 'SSH 连接失败' }
      }
    }

    try {
      // 创建一个可以取消的命令执行
      const controller = new AbortController();
      const { signal } = controller;
      
      // 设置超时，在指定时间后取消命令执行
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);
      
      // 执行命令，但不等待它完成
      const commandPromise = this.ssh.execCommand(`napcat log ${qq}`, { signal });
      
      // 等待一段时间后取消命令
      await new Promise(resolve => setTimeout(resolve, timeout));
      
      // 清除超时定时器
      clearTimeout(timeoutId);
      
      // 尝试取消命令执行
      try {
        controller.abort();
      } catch (abortError) {
        console.log('取消命令执行:', abortError);
      }
      
      // 获取已经收集到的输出
      const result = await commandPromise.catch(error => {
        // 如果是因为我们取消了命令而失败，这是预期的
        if (error.name === 'AbortError') {
          return { stdout: '命令已取消，以下是部分日志：\n', stderr: '', code: 0 };
        }
        throw error;
      });
      
      return {
        success: true,
        stdout: result.stdout || '没有日志输出',
        stderr: result.stderr,
        code: result.code,
        partial: true
      };
    } catch (error) {
      console.error('获取部分日志失败:', error);
      return { 
        success: false, 
        message: `获取部分日志失败: ${error.message}` 
      };
    }
  }
}

// 导出单例
export default new SSHClient()
