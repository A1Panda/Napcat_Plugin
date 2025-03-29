import plugin from '../../../lib/plugins/plugin.js'
import sshClient from '../components/ssh.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件的目录
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 获取插件根目录
const pluginRoot = path.resolve(__dirname, '..')

// 调试工具类
export class NapcatDebug extends plugin {
  constructor() {
    super({
      name: 'napcat-调试',
      dsc: '调试 napcat SSH 连接',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#napcat调试$',
          fnc: 'showDebugHelp'
        },
        {
          reg: '^#napcat连接状态$',
          fnc: 'checkSSHConnection'
        },
        {
          reg: '^#napcat执行命令\\s+(.+)$',
          fnc: 'executeCommand'
        },
        {
          reg: '^#napcat原始日志\\s+(\\d+)$',
          fnc: 'getRawLog'
        },
        {
          reg: '^#napcat配置$',
          fnc: 'showConfig'
        },
        {
          reg: '^#napcat保存日志\\s+(\\d+)$',
          fnc: 'saveLogToFile'
        }
      ]
    })
  }

  // 显示调试帮助信息
  async showDebugHelp(e) {
    const helpText = `
===== Napcat 调试工具 =====
#napcat调试 - 显示此帮助信息
#napcat连接状态 - 检查 SSH 连接状态
#napcat执行命令 [命令] - 执行自定义 SSH 命令
#napcat原始日志 [QQ号] - 获取指定QQ的原始日志数据
#napcat配置 - 显示当前 SSH 配置信息
#napcat保存日志 [QQ号] - 将指定QQ的日志保存到文件
===========================
`.trim()
    
    await e.reply(helpText)
    return true
  }

  // 检查 SSH 连接状态
  async checkSSHConnection(e) {
    await e.reply('正在检查 SSH 连接状态...')
    
    try {
      const startTime = Date.now()
      const connected = await sshClient.connect()
      const endTime = Date.now()
      const connectionTime = endTime - startTime
      
      if (connected) {
        await e.reply(`SSH 连接成功！连接耗时: ${connectionTime}ms\n连接信息: ${JSON.stringify(sshClient.getConnectionInfo(), null, 2)}`)
        
        // 获取服务器信息
        const sysInfoResult = await sshClient.executeCommand('uname -a && uptime')
        if (sysInfoResult.success) {
          await e.reply(`服务器信息:\n${sysInfoResult.stdout}`)
        }
        
        // 断开连接
        await sshClient.disconnect()
        await e.reply('SSH 连接已断开')
      } else {
        await e.reply('SSH 连接失败，请检查配置文件')
      }
    } catch (error) {
      await e.reply(`SSH 连接出错: ${error.message}\n${error.stack}`)
      console.error(error)
    }
    
    return true
  }

  // 执行自定义 SSH 命令
  async executeCommand(e) {
    const command = e.msg.replace(/^#napcat执行命令\s+/, '').trim()
    
    if (!command) {
      await e.reply('请输入要执行的命令')
      return false
    }
    
    await e.reply(`正在执行命令: ${command}`)
    
    try {
      const startTime = Date.now()
      const result = await sshClient.executeCommand(command)
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      if (result.success) {
        await e.reply(`命令执行成功！耗时: ${executionTime}ms\n输出:\n${result.stdout || '(无输出)'}`)
      } else {
        await e.reply(`命令执行失败！耗时: ${executionTime}ms\n错误:\n${result.stderr || result.message || '未知错误'}`)
      }
      
      // 显示完整的结果对象（用于调试）
      await e.reply(`完整结果对象:\n${JSON.stringify(result, null, 2)}`)
    } catch (error) {
      await e.reply(`执行命令出错: ${error.message}\n${error.stack}`)
      console.error(error)
    }
    
    return true
  }

  // 获取原始日志数据
  async getRawLog(e) {
    const match = e.msg.match(/^#napcat原始日志\s+(\d+)$/)
    if (!match || !match[1]) {
      await e.reply('请指定要查看日志的 QQ 号，例如: #napcat原始日志 123456789')
      return true
    }
    
    const qq = match[1]
    await e.reply(`正在获取 QQ ${qq} 的原始日志数据...`)
    
    try {
      // 获取原始日志，设置较短的超时时间
      const result = await sshClient.getPartialLog(qq, 3000)
      
      if (result.success) {
        // 显示原始日志数据的摘要
        const logLines = result.stdout.split('\n')
        const logSummary = `
日志获取成功！
总行数: ${logLines.length}
前5行: 
${logLines.slice(0, 5).join('\n')}

后5行:
${logLines.slice(-5).join('\n')}
`.trim()
        
        await e.reply(logSummary)
        
        // 显示完整的结果对象（用于调试）
        const resultObj = {
          success: result.success,
          stdout_length: result.stdout ? result.stdout.length : 0,
          stderr_length: result.stderr ? result.stderr.length : 0,
          code: result.code
        }
        
        await e.reply(`结果对象摘要:\n${JSON.stringify(resultObj, null, 2)}`)
      } else {
        await e.reply(`获取日志失败: ${result.stderr || result.message}`)
      }
    } catch (error) {
      await e.reply(`获取日志出错: ${error.message}\n${error.stack}`)
      console.error(error)
    }
    
    return true
  }

  // 显示当前 SSH 配置
  async showConfig(e) {
    try {
      // 读取 SSH 配置文件
      const configPath = path.join(pluginRoot, 'config/ssh_config.json')
      
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8')
        const config = JSON.parse(configContent)
        
        // 隐藏敏感信息
        if (config.password) {
          config.password = '******'
        }
        if (config.privateKey) {
          config.privateKey = '******'
        }
        
        await e.reply(`当前 SSH 配置:\n${JSON.stringify(config, null, 2)}`)
      } else {
        await e.reply('SSH 配置文件不存在')
      }
    } catch (error) {
      await e.reply(`读取配置出错: ${error.message}`)
      console.error(error)
    }
    
    return true
  }

  // 将日志保存到文件
  async saveLogToFile(e) {
    const match = e.msg.match(/^#napcat保存日志\s+(\d+)$/)
    if (!match || !match[1]) {
      await e.reply('请指定要保存日志的 QQ 号，例如: #napcat保存日志 123456789')
      return true
    }
    
    const qq = match[1]
    await e.reply(`正在获取并保存 QQ ${qq} 的日志...`)
    
    try {
      // 获取日志
      const result = await sshClient.getPartialLog(qq, 5000)
      
      if (result.success) {
        // 创建日志目录
        const logDir = path.join(pluginRoot, 'logs')
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true })
        }
        
        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const logFile = path.join(logDir, `napcat_${qq}_${timestamp}.log`)
        
        // 写入日志文件
        fs.writeFileSync(logFile, result.stdout, 'utf8')
        
        await e.reply(`日志已保存到文件: ${logFile}\n总共 ${result.stdout.split('\n').length} 行`)
      } else {
        await e.reply(`获取日志失败: ${result.stderr || result.message}`)
      }
    } catch (error) {
      await e.reply(`保存日志出错: ${error.message}`)
      console.error(error)
    }
    
    return true
  }
}

// 导出插件实例
export default new NapcatDebug() 