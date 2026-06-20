const express = require('express');
<<<<<<< HEAD
const fs = require('fs');                // 同步方法 (用于 readFileSync)
const fsp = fs.promises;                 // 异步方法 (用于 readdir 等)
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// ================== 视频目录配置 ==================
const VIDEO_1_FOLDER_PATH = path.resolve('D:/videos');
const VIDEO_2_FOLDER_PATH = path.resolve('D:/videos2');

// ================== 静态资源 ==================
app.use(express.static(path.join(__dirname, 'public')));

// ================== 工具函数 ==================
/**
 * 递归获取目录下所有文件的绝对路径
 * @param {string} dir 目录路径
 * @returns {Promise<string[]>} 文件路径数组
 */
async function getVideoFiles(dir) {
    const dirents = await fsp.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        dirents.map(async (dirent) => {
            const res = path.resolve(dir, dirent.name);
            return dirent.isDirectory() ? await getVideoFiles(res) : res;
        })
    );
    return files.flat();
}

// ================== API 路由 ==================
// 获取 D:/videos 下的视频列表
app.get('/api/videos', async (req, res) => {
    try {
        const allFiles = await getVideoFiles(VIDEO_1_FOLDER_PATH);
        const supportedFormats = ['.mp4', '.mov', '.avi'];
        const videoFilePaths = allFiles.filter(file =>
            supportedFormats.includes(path.extname(file).toLowerCase())
        );

        const relativePaths = videoFilePaths.map(file =>
            '/videos/' + path.relative(VIDEO_1_FOLDER_PATH, file).split(path.sep).join('/')
        );

        res.json(relativePaths);
    } catch (err) {
        console.error('读取 videos 目录失败:', err);
        res.status(500).json({ error: '无法读取视频文件夹' });
    }
});

// 获取 D:/videos2 下的视频列表
app.get('/api/videos2', async (req, res) => {
    try {
        const allFiles = await getVideoFiles(VIDEO_2_FOLDER_PATH);
        const supportedFormats = ['.mp4', '.mov', '.avi'];
        const videoFilePaths = allFiles.filter(file =>
            supportedFormats.includes(path.extname(file).toLowerCase())
        );

        const relativePaths = videoFilePaths.map(file =>
            '/videos2/' + path.relative(VIDEO_2_FOLDER_PATH, file).split(path.sep).join('/')
        );

        res.json(relativePaths);
    } catch (err) {
        console.error('读取 videos2 目录失败:', err);
        res.status(500).json({ error: '无法读取视频文件夹' });
    }
});

// ================== 静态视频文件服务 ==================
// 提供 /videos 路由，支持 Range 请求（拖动进度条）
app.use('/videos', express.static(VIDEO_1_FOLDER_PATH, {
    setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.mp4') {
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// 提供 /videos2 路由，同样支持 Range 请求和缓存
app.use('/videos2', express.static(VIDEO_2_FOLDER_PATH, {
    setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.mp4') {
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// ================== 根路由 ==================
app.get('/', (req, res) => {
    res.send(`
        <h1>🎬 视频服务器已启动</h1>
        <ul>
            <li><a href="/api/videos">查看 /videos 视频列表（目录1）</a></li>
            <li><a href="/api/videos2">查看 /videos2 视频列表（目录2）</a></li>
        </ul>
    `);
});

// ================== 启动 HTTP 服务器 ==================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ HTTP 服务器运行在: http://localhost:${PORT}`);
    console.log(`📁 视频目录1 (videos): ${VIDEO_1_FOLDER_PATH}`);
    console.log(`📁 视频目录2 (videos2): ${VIDEO_2_FOLDER_PATH}`);
});

// ================== 可选 HTTPS 支持 ==================
try {
    const https = require('https');
    const options = {
        key: fs.readFileSync('./certs/private.key'),   // 请替换为你的私钥路径
        cert: fs.readFileSync('./certs/certificate.crt') // 请替换为你的证书路径
    };
    https.createServer(options, app).listen(3443, () => {
        console.log('🔐 HTTPS 服务器运行在 https://localhost:3443');
    });
} catch (err) {
    console.log('ℹ️ 未启用 HTTPS（证书文件不存在或路径错误），仅提供 HTTP 服务');
}
=======
const fs = require('fs').promises; // 使用 promises 版本的 fs 模块
const https = require('https')
const http = require('http')
const path = require('path');
const app = express();
const port = 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 视频文件夹路径
const videoFolderPath = 'D:\\videos'; // 注意路径中的双反斜杠
const animeFolderPath = 'D:\\Program Files\\Telegram Desktop\\anime'; // 注意路径中的双反斜杠

// 递归获取所有视频文件
async function getVideoFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getVideoFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

// 获取视频文件列表的 API
app.get('/api/videos', async (req, res) => {
    try {
        const allFiles = await getVideoFiles(videoFolderPath);

        // 过滤出视频文件（这里假设只支持 mp4 格式）
        const supportedFormats = ['.mp4', '.mov', '.avi'];
        const videoFilePaths = allFiles.filter(file => supportedFormats.includes(path.extname(file).toLowerCase()));

        // 返回相对路径，以便前端可以直接访问
        const relativePaths = videoFilePaths.map(file => path.relative(videoFolderPath, file)).map(p => `/videos/${p.split(path.sep).join('/')}`);

        res.json(relativePaths);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '无法读取文件夹' });
    }
});

// 获取视频文件列表的 API
app.get('/api/anime', async (req, res) => {
    try {
        const allFiles = await getVideoFiles(animeFolderPath);

        // 过滤出视频文件（这里假设只支持 mp4 格式）
        const supportedFormats = ['.mp4', '.mov', '.avi'];
        const videoFilePaths = allFiles.filter(file => supportedFormats.includes(path.extname(file).toLowerCase()));

        // 返回相对路径，以便前端可以直接访问
        const relativePaths = videoFilePaths.map(file => path.relative(animeFolderPath, file)).map(p => `/anime/${p.split(path.sep).join('/')}`);

        res.json(relativePaths);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '无法读取文件夹' });
    }
});

// 提供视频文件服务
app.use('/videos', express.static(videoFolderPath));
app.use('/anime', express.static(animeFolderPath));

// 启动服务器
app.listen(port, () => {
    console.log(`服务器正在运行于 http://localhost:${port}`);
});
>>>>>>> 0684f618c09bd91af0c698ff2916a04faed7d69e
