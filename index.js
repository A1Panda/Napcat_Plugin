import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 获取当前文件的目录
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ASCII 艺术标题
const ASCII_LOGO = `
███╗   ██╗ █████╗ ██████╗  ██████╗ █████╗ ████████╗
████╗  ██║██╔══██╗██╔══██╗██╔════╝██╔══██╗╚══██╔══╝
██╔██╗ ██║███████║██████╔╝██║     ███████║   ██║   
██║╚██╗██║██╔══██║██╔═══╝ ██║     ██╔══██║   ██║   
██║ ╚████║██║  ██║██║     ╚██████╗██║  ██║   ██║   
╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝      ╚═════╝╚═╝  ╚═╝   ╚═╝   
`

// 在控制台打印插件标题
logger.mark(logger.green(ASCII_LOGO))

// 记录开始时间
const startTime = process.hrtime()

// 插件信息
export const plugin = {
  name: 'napcat-plugin',
  dsc: 'Napcat 管理插件',
  event: 'message',
  priority: 5000,
  rule: []
}

// 获取 apps 目录下所有的 JS 文件
const appsDir = path.join(__dirname, 'apps')
const appFiles = fs.readdirSync(appsDir).filter(file => file.endsWith('.js'))

// 记录加载的插件
for (const file of appFiles) {
  const appName = path.basename(file, '.js')
  logger.mark(logger.green(`[napcat-plugin] 加载插件: ${appName}`))
}

// 显示启动信息
function showStartupInfo(loadTime) {
  logger.mark(logger.green('[napcat-plugin]------Napcat 管理器------'))
  logger.mark(logger.green(`[napcat-plugin] Napcat 管理插件载入成功~`))
  logger.mark(logger.green(`[napcat-plugin] 插件加载耗时: ${loadTime}ms`))
  logger.mark(logger.green(`[napcat-plugin] 已加载 ${appFiles.length} 个子插件`))
  logger.mark(logger.green(`[napcat-plugin] 欢迎使用 Napcat 管理插件！`))
  logger.mark(logger.green('[napcat-plugin]-------------------------'))
}

// 计算并显示加载时间
const endTime = process.hrtime(startTime)
const loadTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)
showStartupInfo(loadTime)

// 使用静态导入替代动态导入
// 由于 ES 模块不支持动态导出，我们需要使用静态导入
// 这意味着我们需要手动列出所有插件

// 导出所有插件（开放）
export * from './apps/napcatmanager.js'
//export * from './apps/bind.js'
//export * from './apps/debug.js'

// 如果将来添加了新插件，需要在这里手动添加新的导出语句
// 例如: export * from './apps/new-plugin.js'
