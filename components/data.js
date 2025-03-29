import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件的目录
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 获取插件根目录
const pluginRoot = path.resolve(__dirname, '..')

class UserDataManager {
    constructor() {
        this.userData = new Map();
        // 将数据目录设置在插件目录下
        this.dataDir = path.join(pluginRoot, 'data/userdata'); 
        
        // 确保数据目录存在
        this.ensureDataDir();
        
        // 加载已有的用户数据
        this.loadAllUserData();
    }

    // 确保数据目录存在
    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            try {
                fs.mkdirSync(this.dataDir, { recursive: true });
                console.log(`创建用户数据目录: ${this.dataDir}`);
            } catch (error) {
                console.error(`创建用户数据目录失败: ${error.message}`);
            }
        }
    }

    // 获取用户数据文件路径
    getUserDataPath(userId) {
        return path.join(this.dataDir, `${userId}.json`);
    }

    // 加载所有用户数据
    loadAllUserData() {
        try {
            if (!fs.existsSync(this.dataDir)) return;
            
            const files = fs.readdirSync(this.dataDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const userId = file.replace('.json', '');
                    this.loadUserData(userId);
                }
            }
            console.log(`已加载 ${this.userData.size} 个用户的数据`);
        } catch (error) {
            console.error(`加载用户数据失败: ${error.message}`);
        }
    }

    // 加载单个用户数据
    loadUserData(userId) {
        try {
            const filePath = this.getUserDataPath(userId);
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                const userData = JSON.parse(data);
                this.userData.set(userId, userData);
                return userData;
            }
        } catch (error) {
            console.error(`加载用户 ${userId} 的数据失败: ${error.message}`);
        }
        return null;
    }

    // 保存用户数据到文件
    saveUserData(userId) {
        try {
            const userData = this.userData.get(userId);
            if (userData) {
                const filePath = this.getUserDataPath(userId);
                fs.writeFileSync(filePath, JSON.stringify(userData, null, 2), 'utf8');
            }
        } catch (error) {
            console.error(`保存用户 ${userId} 的数据失败: ${error.message}`);
        }
    }

    // 添加或更新用户数据
    setUserData(userId, data) {
        if (!userId) {
            throw new Error('用户ID不能为空');
        }
        this.userData.set(userId, {
            ...data,
            lastUpdated: new Date().toISOString()
        });
        
        // 保存到文件
        this.saveUserData(userId);
    }

    // 获取用户数据
    getUserData(userId) {
        if (!userId) {
            throw new Error('用户ID不能为空');
        }
        
        // 如果内存中没有，尝试从文件加载
        if (!this.userData.has(userId)) {
            const data = this.loadUserData(userId);
            if (data) return data;
        }
        
        return this.userData.get(userId);
    }

    // 删除用户数据
    deleteUserData(userId) {
        if (!userId) {
            throw new Error('用户ID不能为空');
        }
        
        // 从内存中删除
        const result = this.userData.delete(userId);
        
        // 从文件系统中删除
        try {
            const filePath = this.getUserDataPath(userId);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error(`删除用户 ${userId} 的数据文件失败: ${error.message}`);
        }
        
        return result;
    }

    // 检查用户数据是否存在
    hasUserData(userId) {
        // 检查内存
        if (this.userData.has(userId)) return true;
        
        // 检查文件系统
        const filePath = this.getUserDataPath(userId);
        return fs.existsSync(filePath);
    }

    // 获取所有用户数据
    getAllUserData() {
        return Array.from(this.userData.entries()).map(([userId, data]) => ({
            userId,
            ...data
        }));
    }

    // 批量更新用户数据
    batchUpdateUserData(updates) {
        if (!Array.isArray(updates)) {
            throw new Error('更新数据必须是数组格式');
        }

        updates.forEach(({userId, data}) => {
            this.setUserData(userId, data);
        });
    }
}

// 导出单例实例
const userDataManager = new UserDataManager();
export default userDataManager;
