import plugin from '../../../lib/plugins/plugin.js'
import sshClient from '../components/ssh.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件的目录
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 获取插件根目录
const pluginRoot = path.resolve(__dirname, '..')

/**
 * QQ登录二维码获取器
 * 用于获取和发送远程服务器上的QQ登录二维码
 */
export class QQLogin extends plugin {
  constructor() {
    super({
      name: 'Napcat扫码登录',
      dsc: '获取并发送远程服务器上的QQ登录二维码',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#napcat扫码登录$',
          fnc: 'getQRCode'
        }
      ]
    })
  }

  /**
   * 获取并发送二维码
   * @param {*} e 消息事件
   */
  async getQRCode(e) {
    // 检查SSH连接
    if (!sshClient.isConnected) {
      const connected = await sshClient.connect()
      if (!connected) {
        await e.reply('SSH连接失败，无法获取二维码')
        return false
      }
    }

    await e.reply('正在获取登录二维码，请稍候...')

    // 使用时间戳避免缓存问题
    const timestamp = Date.now()
    const localSavePath = path.join(pluginRoot, 'data', `qrcode_${timestamp}.png`)

    try {
      const result = await sshClient.getQQQRCode('default', localSavePath)
      
      if (!result.success) {
        await e.reply(`获取二维码失败：${result.message}`)
        return false
      }
      
      // 检查文件是否存在
      if (!fs.existsSync(localSavePath)) {
        await e.reply('二维码文件下载成功但未找到，请联系管理员检查')
        return false
      }
      
      // 发送图片消息
      await e.reply(segment.image(`file://${localSavePath}`))
      await e.reply('二维码获取成功，请使用QQ扫码登录\n二维码有效期较短，请尽快扫码')
      
      // 发送成功后立即删除文件
      try {
        fs.unlinkSync(localSavePath)
        console.log(`已删除临时二维码文件：${localSavePath}`)
      } catch (error) {
        console.error(`删除临时二维码文件失败：${error.message}`)
      }
      
      return true
    } catch (error) {
      console.error('获取二维码过程中出错：', error)
      await e.reply(`获取二维码失败：${error.message}`)
      
      // 出错时也尝试清理文件
      if (fs.existsSync(localSavePath)) {
        try {
          fs.unlinkSync(localSavePath)
        } catch (err) {
          // 忽略删除失败的错误
        }
      }
      
      return false
    }
  }
} 