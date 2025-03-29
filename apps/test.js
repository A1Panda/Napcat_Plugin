import plugin from '../../../lib/plugins/plugin.js'
import sshClient from '../components/ssh.js'

// 继承 YunzaiBot 的插件类
export class NapcatTest extends plugin {
  constructor() {
    super({
      name: 'napcat-测试',
      dsc: '测试 napcat 命令',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#napcat测试$',
          fnc: 'testSSHConnection'
        },
        {
          reg: '^#napcat状态(\\s+\\d+)?$',
          fnc: 'napcatStatus'
        },
        {
          reg: '^#napcat启动\\s+(\\d+)$',
          fnc: 'napcatStart'
        },
        {
          reg: '^#napcat停止(\\s+\\d+)?$',
          fnc: 'napcatStop'
        },
        {
          reg: '^#napcat重启\\s+(\\d+)$',
          fnc: 'napcatRestart'
        },
        {
          reg: '^#napcat日志\\s+(\\d+)$',
          fnc: 'napcatLog'
        },
        {
          reg: '^#napcat更新$',
          fnc: 'napcatUpdate'
        },
        {
          reg: '^#napcat帮助$',
          fnc: 'napcatHelp'
        }
      ]
    })
  }

  // 测试 SSH 连接
  async testSSHConnection(e) {
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

  // 查看 napcat 日志（使用实时日志流）
  async napcatLog(e) {
    const match = e.msg.match(/^#napcat日志\s+(\d+)$/)
    if (!match || !match[1]) {
      e.reply('请指定要查看日志的 QQ 号，例如: #napcat日志 123456789')
      return true
    }
    
    const qq = match[1]
    await e.reply(`正在连接到 QQ ${qq} 的 napcat 日志终端，将持续显示 60 秒...`)
    
    try {
      // 设置总超时时间为 60 秒
      const totalTimeoutMs = 60000
      // 记录开始时间
      const startTime = Date.now()
      // 是否已经发送过日志
      let hasSentLog = false
      // 上次发送消息的时间
      let lastSendTime = 0
      // 日志缓冲区
      let logBuffer = []
      // 是否已经停止日志流
      let stopped = false
      
      // 创建一个函数来发送缓冲区中的日志
      const sendBufferedLogs = async () => {
        if (logBuffer.length === 0) return
        
        const now = Date.now()
        const elapsedTime = Math.floor((now - startTime) / 1000)
        const remainingTime = Math.floor((totalTimeoutMs - (now - startTime)) / 1000)
        
        await e.reply(`QQ ${qq} 的实时日志终端 (已运行 ${elapsedTime} 秒，剩余 ${remainingTime} 秒):\n${logBuffer.join('')}`)
        
        // 清空缓冲区并更新发送时间
        logBuffer = []
        lastSendTime = now
        hasSentLog = true
      }
      
      // 创建一个函数来清理资源并结束连接
      const cleanup = async () => {
        if (stopped) return
        stopped = true
        
        // 清除定时器
        clearInterval(bufferTimer)
        clearTimeout(timeoutTimer)
        
        // 停止日志流
        sshClient.stopLogStream()
        
        // 发送剩余的日志
        if (logBuffer.length > 0) {
          await sendBufferedLogs()
        }
        
        // 断开 SSH 连接
        await sshClient.disconnect()
        console.log(`已断开 QQ ${qq} 的日志 SSH 连接`)
      }
      
      // 设置定时发送日志的定时器
      const bufferTimer = setInterval(async () => {
        if (logBuffer.length > 0 && Date.now() - lastSendTime > 3000) {
          await sendBufferedLogs()
        }
      }, 1000)
      
      // 设置总超时定时器
      const timeoutTimer = setTimeout(async () => {
        if (!stopped) {
          await cleanup()
          
          // 发送日志结束通知
          if (hasSentLog) {
            await e.reply(`QQ ${qq} 的实时日志终端已关闭，总时长 ${totalTimeoutMs/1000} 秒`)
          } else {
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
          // 将新的日志数据添加到缓冲区
          logBuffer.push(logData)
          
          // 如果缓冲区太大，立即发送
          if (logBuffer.join('').length > 1000) {
            sendBufferedLogs()
          }
        },
        // 错误回调
        async (errorData) => {
          await e.reply(`日志获取出错: ${errorData}`)
          await cleanup()
        },
        // 结束回调
        async (code) => {
          if (!stopped) {
            await cleanup()
            await e.reply(`QQ ${qq} 的日志流已结束，退出码: ${code}`)
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
            await cleanup()
            await e.reply(`已手动取消 QQ ${qq} 的日志查看`)
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

  // 更新 napcat
  async napcatUpdate(e) {
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