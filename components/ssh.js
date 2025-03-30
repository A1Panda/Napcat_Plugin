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
    this.currentLogStream = null
    this.sftp = null
    
    // 加载配置
    this.loadConfig()
  }
  
  // 创建默认配置文件
  createDefaultConfig() {
    try {
      const configDir = path.join(pluginRoot, 'config')
      const configPath = path.join(configDir, 'ssh_config.json')
      
      // 确保配置目录存在
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }
      
      // 默认配置内容
      const defaultConfig = {
        host: 'localhost',
        port: 22,
        username: 'root',
        password: '',
        // 如果需要使用私钥认证，取消下面的注释并设置私钥路径
        // privateKeyPath: 'config/id_rsa',
        // passphrase: '',  // 如果私钥有密码，请设置
        
        // 连接超时设置（毫秒）
        connectTimeout: 10000,
        
        // 其他设置
        keepaliveInterval: 60000  // 心跳包间隔（毫秒）
      }
      
      // 写入配置文件
      fs.writeFileSync(
        configPath, 
        JSON.stringify(defaultConfig, null, 2), 
        'utf8'
      )
      
      console.log(`已创建默认 SSH 配置文件: ${configPath}`)
      return defaultConfig
    } catch (error) {
      console.error('创建默认配置文件失败:', error)
      return {
        host: 'localhost',
        port: 22,
        username: 'root',
        password: ''
      }
    }
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
        console.log('SSH 配置文件不存在，将创建默认配置文件')
        this.config = this.createDefaultConfig()
      }
    } catch (error) {
      console.error('加载 SSH 配置失败:', error)
      console.log('将使用默认配置')
      this.config = this.createDefaultConfig()
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
  
  // 获取 SFTP 连接
  async getSFTP() {
    if (!this.isConnected) {
      const connected = await this.connect()
      if (!connected) {
        throw new Error('SSH 连接失败，无法创建 SFTP 连接')
      }
    }
    
    if (this.sftp) {
      return this.sftp
    }
    
    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(new Error(`创建 SFTP 连接失败: ${err.message}`))
          return
        }
        
        this.sftp = sftp
        resolve(this.sftp)
      })
    })
  }
  
  // 下载文件
  async downloadFile(remotePath, localPath) {
    try {
      const sftp = await this.getSFTP()
      
      return new Promise((resolve, reject) => {
        const readStream = sftp.createReadStream(remotePath)
        const writeStream = fs.createWriteStream(localPath)
        
        readStream.on('error', (err) => {
          reject(new Error(`读取远程文件失败: ${err.message}`))
        })
        
        writeStream.on('error', (err) => {
          reject(new Error(`写入本地文件失败: ${err.message}`))
        })
        
        writeStream.on('finish', () => {
          resolve({
            success: true,
            message: '文件下载成功',
            localPath
          })
        })
        
        readStream.pipe(writeStream)
      })
    } catch (error) {
      return {
        success: false,
        message: `文件下载失败: ${error.message}`,
        error
      }
    }
  }
  
  // 上传文件
  async uploadFile(localPath, remotePath) {
    try {
      const sftp = await this.getSFTP()
      
      return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(localPath)
        const writeStream = sftp.createWriteStream(remotePath)
        
        readStream.on('error', (err) => {
          reject(new Error(`读取本地文件失败: ${err.message}`))
        })
        
        writeStream.on('error', (err) => {
          reject(new Error(`写入远程文件失败: ${err.message}`))
        })
        
        writeStream.on('close', () => {
          resolve({
            success: true,
            message: '文件上传成功',
            remotePath
          })
        })
        
        readStream.pipe(writeStream)
      })
    } catch (error) {
      return {
        success: false,
        message: `文件上传失败: ${error.message}`,
        error
      }
    }
  }
  
  // 检查文件是否存在
  async fileExists(remotePath) {
    try {
      const sftp = await this.getSFTP()
      
      return new Promise((resolve) => {
        sftp.stat(remotePath, (err) => {
          if (err) {
            resolve(false)
          } else {
            resolve(true)
          }
        })
      })
    } catch (error) {
      console.error('检查文件存在性失败:', error)
      return false
    }
  }
  
  // 获取 QQ 登录二维码
  async getQQQRCode(qq, localSavePath) {
    const remotePath = '/opt/QQ/resources/app/app_launcher/napcat/cache/qrcode.png'
    
    // 检查远程文件是否存在
    const exists = await this.fileExists(remotePath)
    if (!exists) {
      return {
        success: false,
        message: '远程二维码文件不存在，请确认路径是否正确或 QQ 是否已生成二维码'
      }
    }
    
    // 如果没有指定保存路径，则使用默认路径
    if (!localSavePath) {
      localSavePath = path.join(pluginRoot, 'data', `qrcode_${qq}.png`)
    }
    
    // 确保目标目录存在
    const dir = path.dirname(localSavePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    // 下载文件
    return this.downloadFile(remotePath, localSavePath)
  }
}

// 创建单例实例
const sshClient = new SSHClient()
export default sshClient
