import plugin from '../../../lib/plugins/plugin.js'
import sshClient from '../components/ssh.js'
import { segment } from 'oicq'

// 继承 YunzaiBot 的插件类
export class NapcatManager extends plugin {
  constructor() {
    super({
      name: 'napcat-管理',
      dsc: '管理 napcat 服务',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#napcat测试$',
          fnc: 'testSSHConnection',
          permission: 'master'  // 只允许主人使用
        },
        {
          reg: '^#napcat状态(\\s+\\d+)?$',
          fnc: 'napcatStatus',
          permission: 'master'  // 只允许主人使用
        },
        {
          reg: '^#napcat启动\\s+(\\d+)$',
          fnc: 'napcatStart',
          permission: 'master'  // 只允许主人使用
        },
        {
          reg: '^#napcat停止(\\s+\\d+)?$',
          fnc: 'napcatStop',
          permission: 'master'  // 只允许主人使用
        },
        {
          reg: '^#napcat重启\\s+(\\d+)$',
          fnc: 'napcatRestart',
          permission: 'master'  // 只允许主人使用
        },
        {
          reg: '^#napcat日志\\s+(\\d+)$',
          fnc: 'napcatLog',
          permission: 'master'  // 只允许主人使用
        },
        {
          reg: '^#napcat更新$',
          fnc: 'napcatUpdate',
          permission: 'master'  // 只允许主人使用
        },
        {
          reg: '^#napcat帮助$',
          fnc: 'napcatHelp',
          permission: 'master'  // 只允许主人使用
        }
      ]
    })
  }

  // 检查是否为主人
  async checkMaster(e) {
    if (!e.isMaster) {
      // 使用 segment.at 艾特用户
      await e.reply([
        segment.at(e.user_id),
        ' 抱歉，只有主人才能使用 napcat 管理功能'
      ])
      return false
    }
    return true
  }

  // 测试 SSH 连接
  async testSSHConnection(e) {
    // 检查权限
    if (!await this.checkMaster(e)) return true
    
    e.reply('正在测试 SSH 连接...')
    
    try {
      const connected = await sshClient.connect()
      if (connected) {
        e.reply('SSH 连接成功！')
        
        // 执行简单命令测试
        const result = await sshClient.executeCommand('echo "测试成功"')
        if (result.success) {
          e.reply(`命令执行结果: ${result.stdout}`)
        } else {
          e.reply(`命令执行失败: ${result.stderr || result.message}`)
        }
        
        // 断开连接
        await sshClient.disconnect()
      } else {
        e.reply('SSH 连接失败，请检查配置文件')
      }
    } catch (error) {
      e.reply(`测试过程中出错: ${error.message}`)
      console.error(error)
    }
    
    return true
  }

  // 查看 napcat 状态
  async napcatStatus(e) {
    // 检查权限
    if (!await this.checkMaster(e)) return true
    
    const match = e.msg.match(/^#napcat状态\s*(\d+)?$/)
    const qq = match && match[1] ? match[1].trim() : ''
    
    e.reply(`正在查询${qq ? `QQ ${qq}的` : '所有'} napcat 状态...`)
    
    try {
      const result = await sshClient.napcatStatus(qq)
      if (result.success) {
        // 格式化输出结果
        const output = result.stdout || '没有运行中的 napcat 实例'
        e.reply(output)
      } else {
        e.reply(`查询失败: ${result.stderr || result.message}`)
      }
    } catch (error) {
      e.reply(`执行命令出错: ${error.message}`)
      console.error(error)
    }
    
    return true
  }

  // 启动 napcat
  async napcatStart(e) {
    // 检查权限
    if (!await this.checkMaster(e)) return true
    
    const match = e.msg.match(/^#napcat启动\s+(\d+)$/)
    if (!match || !match[1]) {
      e.reply('请指定要启动的 QQ 号，例如: #napcat启动 123456789')
      return true
    }
    
    const qq = match[1]
    e.reply(`正在启动 QQ ${qq} 的 napcat...`)
    
    try {
      const result = await sshClient.napcatStart(qq)
      if (result.success) {
        e.reply(`QQ ${qq} 的 napcat 启动成功！\n${result.stdout}`)
      } else {
        e.reply(`启动失败: ${result.stderr || result.message}`)
      }
    } catch (error) {
      e.reply(`执行命令出错: ${error.message}`)
      console.error(error)
    }
    
    return true
  }

  // 停止 napcat
  async napcatStop(e) {
    // 检查权限
    if (!await this.checkMaster(e)) return true
    
    const match = e.msg.match(/^#napcat停止\s*(\d+)?$/)
    const qq = match && match[1] ? match[1].trim() : ''
    
    e.reply(`正在停止${qq ? `QQ ${qq}的` : '所有'} napcat...`)
    
    try {
      const result = await sshClient.napcatStop(qq)
      if (result.success) {
        e.reply(`${qq ? `QQ ${qq}的` : '所有'} napcat 已停止\n${result.stdout}`)
      } else {
        e.reply(`停止失败: ${result.stderr || result.message}`)
      }
    } catch (error) {
      e.reply(`执行命令出错: ${error.message}`)
      console.error(error)
    }
    
    return true
  }

  // 重启 napcat
  async napcatRestart(e) {
    // 检查权限
    if (!await this.checkMaster(e)) return true
    
    const match = e.msg.match(/^#napcat重启\s+(\d+)$/)
    if (!match || !match[1]) {
      e.reply('请指定要重启的 QQ 号，例如: #napcat重启 123456789')
      return true
    }
    
    const qq = match[1]
    e.reply(`正在重启 QQ ${qq} 的 napcat...`)
    
    try {
      const result = await sshClient.napcatRestart(qq)
      if (result.success) {
        e.reply(`QQ ${qq} 的 napcat 重启成功！\n${result.stdout}`)
      } else {
        e.reply(`重启失败: ${result.stderr || result.message}`)
      }
    } catch (error) {
      e.reply(`执行命令出错: ${error.message}`)
      console.error(error)
    }
    
    return true
  }

  // 查看 napcat 日志（缓存 60 秒后以聊天记录形式发送）
  async napcatLog(e) {
    // 检查权限
    if (!await this.checkMaster(e)) return true
    
    const match = e.msg.match(/^#napcat日志\s+(\d+)$/)
    if (!match || !match[1]) {
      e.reply('请指定要查看日志的 QQ 号，例如: #napcat日志 123456789')
      return true
    }
    
    const qq = match[1]
    await e.reply(`正在连接到 QQ ${qq} 的 napcat 日志，将缓存 60 秒后发送完整日志...`)
    
    try {
      // 设置总超时时间为 60 秒
      const totalTimeoutMs = 60000
      // 记录开始时间
      const startTime = Date.now()
      // 完整日志缓存
      let fullLogBuffer = []
      // 是否已经停止日志流
      let stopped = false
      // 是否收到过日志
      let hasReceivedLog = false
      
      // 创建一个函数来清理资源并结束连接
      const cleanup = async () => {
        if (stopped) return
        stopped = true
        
        // 停止日志流
        sshClient.stopLogStream()
        
        // 断开 SSH 连接
        await sshClient.disconnect()
        console.log(`已断开 QQ ${qq} 的日志 SSH 连接`)
      }
      
      // 设置总超时定时器
      const timeoutTimer = setTimeout(async () => {
        if (!stopped) {
          await cleanup()
          
          // 发送完整日志
          if (fullLogBuffer.length > 0) {
            hasReceivedLog = true
            
            // 处理日志，将其格式化为聊天记录形式
            const formattedLogs = this.formatLogsAsChatHistory(fullLogBuffer.join(''), qq)
            
            // 发送格式化后的日志
            await e.reply(`QQ ${qq} 的 napcat 日志（收集时长 ${totalTimeoutMs/1000} 秒）：`)
            
            // 分段发送，避免消息过长
            const maxLength = 1500 // 每段最大长度
            for (let i = 0; i < formattedLogs.length; i += maxLength) {
              const segment = formattedLogs.substring(i, i + maxLength)
              if (segment.trim()) {
                await e.reply(segment)
                // 添加短暂延迟，避免消息发送过快
                await new Promise(resolve => setTimeout(resolve, 300))
              }
            }
          }
          
          // 如果没有收到日志，检查 napcat 状态
          if (!hasReceivedLog) {
            await e.reply(`QQ ${qq} 在 ${totalTimeoutMs/1000} 秒内没有产生日志，可能该 QQ 的 napcat 未运行`)
            
            // 重新连接以检查状态
            await sshClient.connect()
            
            // 尝试检查 napcat 状态
            const statusResult = await sshClient.napcatStatus(qq)
            if (statusResult.success) {
              await e.reply(`QQ ${qq} 的 napcat 状态:\n${statusResult.stdout}`)
            }
            
            // 再次断开连接
            await sshClient.disconnect()
          }
        }
      }, totalTimeoutMs)
      
      // 确保连接已建立
      await sshClient.connect()
      
      // 启动日志流
      sshClient.getLogStream(
        qq,
        // 日志数据回调
        (logData) => {
          // 将新的日志数据添加到完整缓冲区
          fullLogBuffer.push(logData)
          hasReceivedLog = true
        },
        // 错误回调
        async (errorData) => {
          await e.reply(`日志获取出错: ${errorData}`)
          await cleanup()
          clearTimeout(timeoutTimer)
        },
        // 结束回调
        async (code) => {
          if (!stopped) {
            await cleanup()
            clearTimeout(timeoutTimer)
            
            // 如果日志流提前结束，发送已收集的日志
            if (fullLogBuffer.length > 0) {
              // 处理日志，将其格式化为聊天记录形式
              const formattedLogs = this.formatLogsAsChatHistory(fullLogBuffer.join(''), qq)
              
              // 发送格式化后的日志
              await e.reply(`QQ ${qq} 的 napcat 日志（日志流已结束，退出码: ${code}）：`)
              
              // 分段发送，避免消息过长
              const maxLength = 1500 // 每段最大长度
              for (let i = 0; i < formattedLogs.length; i += maxLength) {
                const segment = formattedLogs.substring(i, i + maxLength)
                if (segment.trim()) {
                  await e.reply(segment)
                  // 添加短暂延迟，避免消息发送过快
                  await new Promise(resolve => setTimeout(resolve, 300))
                }
              }
            } else {
              await e.reply(`QQ ${qq} 的日志流已结束（退出码: ${code}），但未收集到任何日志`)
            }
          }
        }
      )
      
      // 注册用户取消命令
      this.setContext('napcatLog', {
        qq,
        timeout: 60000, // 60秒后自动取消
        cancelCmd: '#取消日志',
        callback: async () => {
          if (!stopped) {
            clearTimeout(timeoutTimer)
            await cleanup()
            
            // 如果用户取消，发送已收集的日志
            if (fullLogBuffer.length > 0) {
              // 处理日志，将其格式化为聊天记录形式
              const formattedLogs = this.formatLogsAsChatHistory(fullLogBuffer.join(''), qq)
              
              // 发送格式化后的日志
              await e.reply(`QQ ${qq} 的 napcat 日志（手动取消，已收集 ${Math.floor((Date.now() - startTime) / 1000)} 秒）：`)
              
              // 分段发送，避免消息过长
              const maxLength = 1500 // 每段最大长度
              for (let i = 0; i < formattedLogs.length; i += maxLength) {
                const segment = formattedLogs.substring(i, i + maxLength)
                if (segment.trim()) {
                  await e.reply(segment)
                  // 添加短暂延迟，避免消息发送过快
                  await new Promise(resolve => setTimeout(resolve, 300))
                }
              }
            } else {
              await e.reply(`已手动取消 QQ ${qq} 的日志查看，未收集到任何日志`)
            }
          }
        }
      })
      
    } catch (error) {
      // 确保出错时也断开连接
      try {
        await sshClient.stopLogStream()
        await sshClient.disconnect()
      } catch (disconnectError) {
        console.error(`断开连接出错: ${disconnectError.message}`)
      }
      
      e.reply(`执行命令出错: ${error.message}`)
      console.error(error)
    }
    
    return true
  }

  // 将日志格式化为聊天记录形式
  formatLogsAsChatHistory(logText, qq) {
    // 分割日志行
    const lines = logText.split('\n')
    
    // 过滤空行并格式化
    const formattedLines = lines
      .filter(line => line.trim())
      .map(line => {
        // 尝试提取时间戳
        const timestampMatch = line.match(/^\[([\d\-\s:]+)\]/)
        if (timestampMatch) {
          const timestamp = timestampMatch[1]
          const content = line.substring(timestampMatch[0].length).trim()
          return `[${timestamp}] ${content}`
        }
        return line
      })
    
    // 如果日志行太多，只保留最后 300 行
    const maxLines = 300
    const truncatedLines = formattedLines.length > maxLines 
      ? formattedLines.slice(-maxLines) 
      : formattedLines
    
    // 如果进行了截断，添加提示信息
    if (formattedLines.length > maxLines) {
      truncatedLines.unshift(`[系统提示] 日志过长，已截取最后 ${maxLines} 行（总共 ${formattedLines.length} 行）`)
    }
    
    // 添加日志头部信息
    truncatedLines.unshift(`===== QQ ${qq} 的 Napcat 日志 =====`)
    
    // 合并为文本
    return truncatedLines.join('\n')
  }

  // 更新 napcat
  async napcatUpdate(e) {
    // 检查权限
    if (!await this.checkMaster(e)) return true
    
    e.reply('正在更新 napcat...')
    
    try {
      const result = await sshClient.napcatUpdate()
      if (result.success) {
        e.reply(`napcat 更新成功！\n${result.stdout}`)
      } else {
        e.reply(`更新失败: ${result.stderr || result.message}`)
      }
    } catch (error) {
      e.reply(`执行命令出错: ${error.message}`)
      console.error(error)
    }
    
    return true
  }

  // 获取 napcat 帮助
  async napcatHelp(e) {
    // 检查权限
    if (!await this.checkMaster(e)) return true
    
    e.reply('正在获取 napcat 帮助信息...')
    
    try {
      const result = await sshClient.napcatHelp()
      if (result.success) {
        e.reply(`napcat 帮助信息:\n${result.stdout}`)
      } else {
        e.reply(`获取帮助失败: ${result.stderr || result.message}`)
      }
    } catch (error) {
      e.reply(`执行命令出错: ${error.message}`)
      console.error(error)
    }
    
    return true
  }
}