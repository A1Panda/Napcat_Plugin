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

  // 查看 napcat 日志
  async napcatLog(e) {
    const match = e.msg.match(/^#napcat日志\s+(\d+)$/)
    if (!match || !match[1]) {
      e.reply('请指定要查看日志的 QQ 号，例如: #napcat日志 123456789')
      return true
    }
    
    const qq = match[1]
    e.reply(`正在获取 QQ ${qq} 的 napcat 日志，将显示最近几秒的日志...`)
    
    try {
      // 获取部分实时日志，只运行 5 秒
      const result = await sshClient.getPartialLog(qq, 5000)
      
      if (result.success) {
        if (result.stdout.trim() && result.stdout.trim() !== '命令已取消，以下是部分日志：') {
          // 如果日志太长，只显示最后几行
          const logs = result.stdout.split('\n')
          const lastLogs = logs.length > 30 ? logs.slice(-30).join('\n') : result.stdout
          e.reply(`QQ ${qq} 的 napcat 日志 (最近几秒的日志，最多显示30行):\n${lastLogs}`)
        } else {
          e.reply(`QQ ${qq} 的 napcat 在最近几秒内没有产生日志，可能该 QQ 的 napcat 未运行`)
          
          // 尝试检查 napcat 状态
          const statusResult = await sshClient.napcatStatus(qq)
          if (statusResult.success) {
            e.reply(`QQ ${qq} 的 napcat 状态:\n${statusResult.stdout}`)
          }
        }
      } else {
        e.reply(`获取日志失败: ${result.stderr || result.message}`)
        
        // 尝试检查 napcat 是否运行
        e.reply('正在检查该 QQ 的 napcat 是否运行...')
        const statusResult = await sshClient.napcatStatus(qq)
        if (statusResult.success) {
          e.reply(`QQ ${qq} 的 napcat 状态:\n${statusResult.stdout}`)
        } else {
          e.reply('无法获取 napcat 状态，请确认 QQ 号是否正确')
        }
      }
    } catch (error) {
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
