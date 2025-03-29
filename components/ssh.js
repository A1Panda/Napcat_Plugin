import { Client } from 'ssh2'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件的目录
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 获取插件根目录
const pluginRoot = path.resolve(__dirname, '..')

class SSHClient {
  constructor() {
    this.client = null
    this.config = null
    this.isConnected = false
    this.connectionInfo = {}
    
    // 加载配置
    this.loadConfig()
  }
  
  // 加载 SSH 配置
  loadConfig() {
    try {
      const configPath = path.join(pluginRoot, 'config/ssh_config.json')
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8')
        this.config = JSON.parse(configContent)
        
        // 如果配置了私钥路径，读取私钥内容
        if (this.config.privateKeyPath) {
          const keyPath = path.resolve(pluginRoot, this.config.privateKeyPath)
          if (fs.existsSync(keyPath)) {
            this.config.privateKey = fs.readFileSync(keyPath, 'utf8')
          } else {
            console.error(`私钥文件不存在: ${keyPath}`)
          }
        }
      } else {
        console.error('SSH 配置文件不存在，请创建 config/ssh_config.json')
        this.config = {
          host: 'localhost',
          port: 22,
          username: 'root',
          password: ''
        }
      }
    } catch (error) {
      console.error('加载 SSH 配置失败:', error)
      this.config = {
        host: 'localhost',
        port: 22,
        username: 'root',
        password: ''
      }
    }
  }
  
  // 获取连接信息
  getConnectionInfo() {
    return {
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      connected: this.isConnected,
      authMethod: this.config.privateKey ? 'privateKey' : 'password'
    }
  }
  
  // 连接到 SSH 服务器
  async connect() {
    if (this.isConnected) {
      return true
    }
    
    return new Promise((resolve) => {
      this.client = new Client()
      
      this.client.on('ready', () => {
        this.isConnected = true
        console.log('SSH 连接成功')
        resolve(true)
      })
      
      this.client.on('error', (err) => {
        console.error('SSH 连接错误:', err)
        this.isConnected = false
        resolve(false)
      })
      
      this.client.on('end', () => {
        console.log('SSH 连接已关闭')
        this.isConnected = false
      })
      
      // 准备连接配置
      const connectConfig = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        readyTimeout: 10000 // 10秒超时
      }
      
      // 根据配置选择认证方式
      if (this.config.privateKey) {
        connectConfig.privateKey = this.config.privateKey
        if (this.config.passphrase) {
          connectConfig.passphrase = this.config.passphrase
        }
      } else {
        connectConfig.password = this.config.password
      }
      
      // 连接到服务器
      this.client.connect(connectConfig)
    })
  }
  
  // 断开 SSH 连接
  async disconnect() {
    if (!this.isConnected || !this.client) {
      return true
    }
    
    return new Promise((resolve) => {
      this.client.end()
      this.isConnected = false
      resolve(true)
    })
  }
  
  // 执行 SSH 命令
  async executeCommand(command) {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) {
        return {
          success: false,
          message: 'SSH 连接失败'
        }
      }
    }
    
    return new Promise((resolve) => {
      this.client.exec(command, (err, stream) => {
        if (err) {
          resolve({
            success: false,
            message: `执行命令失败: ${err.message}`,
            error: err
          })
          return
        }
        
        let stdout = ''
        let stderr = ''
        
        stream.on('data', (data) => {
          stdout += data.toString()
        })
        
        stream.stderr.on('data', (data) => {
          stderr += data.toString()
        })
        
        stream.on('close', (code) => {
          resolve({
            success: code === 0,
            stdout,
            stderr,
            code
          })
        })
      })
    })
  }
  
  // 获取部分日志（带超时）
  async getPartialLog(qq, timeoutMs = 5000) {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) {
        return {
          success: false,
          message: 'SSH 连接失败'
        }
      }
    }
    
    return new Promise((resolve) => {
      const command = `napcat log ${qq}`
      
      this.client.exec(command, (err, stream) => {
        if (err) {
          resolve({
            success: false,
            message: `执行命令失败: ${err.message}`,
            error: err
          })
          return
        }
        
        let stdout = ''
        let stderr = ''
        let timer = null
        
        // 设置超时
        timer = setTimeout(() => {
          // 发送 Ctrl+C 信号中断命令
          stream.write('\x03')
          
          // 等待一小段时间让命令完全终止
          setTimeout(() => {
            resolve({
              success: true,
              stdout: stdout || '命令已取消，以下是部分日志：',
              stderr,
              timedOut: true
            })
          }, 500)
        }, timeoutMs)
        
        stream.on('data', (data) => {
          stdout += data.toString()
        })
        
        stream.stderr.on('data', (data) => {
          stderr += data.toString()
        })
        
        stream.on('close', (code) => {
          if (timer) {
            clearTimeout(timer)
          }
          
          resolve({
            success: true, // 即使命令被中断，我们也认为它成功了
            stdout,
            stderr,
            code
          })
        })
      })
    })
  }
  
  // 获取实时日志流
  getLogStream(qq, callback, errorCallback, endCallback) {
    if (!this.isConnected) {
      this.connect().then(connected => {
        if (!connected) {
          if (errorCallback) errorCallback('SSH 连接失败')
          return
        }
        this._createLogStream(qq, callback, errorCallback, endCallback)
      })
    } else {
      this._createLogStream(qq, callback, errorCallback, endCallback)
    }
  }
  
  // 创建日志流
  _createLogStream(qq, callback, errorCallback, endCallback) {
    const command = `napcat log ${qq}`
    
    this.client.exec(command, (err, stream) => {
      if (err) {
        if (errorCallback) errorCallback(`执行命令失败: ${err.message}`)
        return
      }
      
      // 存储流的引用，以便稍后可以关闭它
      this.currentLogStream = stream
      
      stream.on('data', (data) => {
        const logData = data.toString()
        if (callback) callback(logData)
      })
      
      stream.stderr.on('data', (data) => {
        const errorData = data.toString()
        if (errorCallback) errorCallback(errorData)
      })
      
      stream.on('close', (code) => {
        this.currentLogStream = null
        if (endCallback) endCallback(code)
      })
    })
  }
  
  // 停止日志流
  stopLogStream() {
    if (this.currentLogStream) {
      // 发送 Ctrl+C 信号中断命令
      this.currentLogStream.write('\x03')
      return true
    }
    return false
  }
  
  // 查看 napcat 状态
  async napcatStatus(qq = '') {
    const command = qq ? `napcat status ${qq}` : 'napcat status'
    return this.executeCommand(command)
  }
  
  // 启动 napcat
  async napcatStart(qq) {
    if (!qq) {
      return {
        success: false,
        message: '请指定要启动的 QQ 号'
      }
    }
    
    const command = `napcat start ${qq}`
    return this.executeCommand(command)
  }
  
  // 停止 napcat
  async napcatStop(qq = '') {
    const command = qq ? `napcat stop ${qq}` : 'napcat stop'
    return this.executeCommand(command)
  }
  
  // 重启 napcat
  async napcatRestart(qq) {
    if (!qq) {
      return {
        success: false,
        message: '请指定要重启的 QQ 号'
      }
    }
    
    const command = `napcat restart ${qq}`
    return this.executeCommand(command)
  }
  
  // 更新 napcat
  async napcatUpdate() {
    const command = 'napcat update'
    return this.executeCommand(command)
  }
  
  // 获取 napcat 帮助
  async napcatHelp() {
    const command = 'napcat help'
    return this.executeCommand(command)
  }
}

// 创建单例实例
const sshClient = new SSHClient()
export default sshClient
