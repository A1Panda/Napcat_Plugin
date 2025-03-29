import plugin from '../../../lib/plugins/plugin.js'
import userDataManager from '../components/data.js'

// 继承 YunzaiBot 的插件类
export class BindAccount extends plugin {
  constructor() {
    super({
      name: '账号绑定',
      dsc: '绑定用户QQ与机器人QQ',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#绑定机器人.*$',
          fnc: 'bindBot'
        },
        {
          reg: '^#解绑机器人.*$',
          fnc: 'unbindBot'
        },
        {
          reg: '^#我的机器人$',
          fnc: 'listBots'
        }
      ]
    })
    
    this.bindKey = 'bindInfo' // 用于存储绑定信息的键名
  }

  // 初始化绑定信息
  async initUserData(e) {
    const userId = e.user_id
    
    // 检查用户是否已经绑定
    if (!userDataManager.hasUserData(userId)) {
      // 如果没有绑定记录，初始化一个空的绑定信息
      userDataManager.setUserData(userId, {
        [this.bindKey]: {
          userQQ: userId,
          botQQList: []
        }
      })
    }
    return userDataManager.getUserData(userId)
  }

  // 绑定机器人QQ
  async bindBot(e) {
    // 获取命令参数，预期格式：#绑定机器人 123456789
    const botQQ = e.msg.replace(/#绑定机器人/g, '').trim()
    
    if (!botQQ || !/^\d+$/.test(botQQ)) {
      await e.reply('请输入正确的QQ号，格式：#绑定机器人 123456789')
      return false
    }
    
    // 获取用户当前的绑定信息
    const userData = await this.initUserData(e)
    const bindInfo = userData[this.bindKey]
    
    // 检查是否已经绑定过该机器人
    if (bindInfo.botQQList.includes(botQQ)) {
      await e.reply('你已经绑定过这个机器人QQ了哦~')
      return false
    }
    
    // 添加新的机器人QQ到列表中
    bindInfo.botQQList.push(botQQ)
    
    // 更新用户数据
    userDataManager.setUserData(e.user_id, {
      ...userData,
      [this.bindKey]: bindInfo
    })
    
    await e.reply(`成功绑定机器人QQ：${botQQ}`)
    return true
  }
  
  // 解绑机器人QQ
  async unbindBot(e) {
    // 获取命令参数，预期格式：#解绑机器人 123456789
    const botQQ = e.msg.replace(/#解绑机器人/g, '').trim()
    
    if (!botQQ) {
      await e.reply('请输入要解绑的机器人QQ号，格式：#解绑机器人 123456789')
      return false
    }
    
    // 获取用户当前的绑定信息
    const userData = await this.initUserData(e)
    const bindInfo = userData[this.bindKey]
    
    // 检查是否绑定过该机器人
    const index = bindInfo.botQQList.indexOf(botQQ)
    if (index === -1) {
      await e.reply('你还没有绑定过这个机器人QQ哦~')
      return false
    }
    
    // 从列表中移除该机器人QQ
    bindInfo.botQQList.splice(index, 1)
    
    // 更新用户数据
    userDataManager.setUserData(e.user_id, {
      ...userData,
      [this.bindKey]: bindInfo
    })
    
    await e.reply(`成功解绑机器人QQ：${botQQ}`)
    return true
  }
  
  // 查看已绑定的机器人列表
  async listBots(e) {
    // 获取用户当前的绑定信息
    const userData = await this.initUserData(e)
    const bindInfo = userData[this.bindKey]
    
    if (!bindInfo.botQQList || bindInfo.botQQList.length === 0) {
      await e.reply('你还没有绑定任何机器人QQ哦~')
      return false
    }
    
    const botList = bindInfo.botQQList.join('\n')
    await e.reply(`你已绑定的机器人QQ列表：\n${botList}`)
    return true
  }
  
  // 检查用户是否绑定了特定的机器人QQ（静态方法，供其他插件调用）
  static checkBindStatus(userQQ, botQQ) {
    if (!userQQ || !botQQ) return false
    
    // 获取用户数据
    const userData = userDataManager.getUserData(userQQ)
    if (!userData || !userData.bindInfo) return false
    
    // 检查是否绑定了指定的机器人QQ
    return userData.bindInfo.botQQList.includes(botQQ)
  }
}

// 创建并导出插件实例
export default new BindAccount()
