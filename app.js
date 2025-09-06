const express = require('express');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ 1. 使用 path.resolve 确保路径正确
const VIDEO_FOLDER_PATH = path.resolve('D:/videos'); // 可以写成 D:\\videos 或使用 /
const ANIME_FOLDER_PATH = path.resolve('D:/Program Files/Telegram Desktop/anime');

// ✅ 2. 设置静态资源目录（public 用于前端页面）
app.use(express.static(path.join(__dirname, 'public')));

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
        const allFiles = await getVideoFiles(VIDEO_FOLDER_PATH);

        // 过滤出视频文件（这里假设只支持 mp4 格式）
        const supportedFormats = ['.mp4', '.mov', '.avi'];
        const videoFilePaths = allFiles.filter(file => supportedFormats.includes(path.extname(file).toLowerCase()));

        // 返回相对路径，以便前端可以直接访问
        const relativePaths = videoFilePaths.map(file => path.relative(VIDEO_FOLDER_PATH, file)).map(p => `/videos/${p.split(path.sep).join('/')}`);

        res.json(relativePaths);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '无法读取文件夹' });
    }
});

// 获取视频文件列表的 API
app.get('/api/anime', async (req, res) => {
    try {
        const allFiles = await getVideoFiles(ANIME_FOLDER_PATH);

        // 过滤出视频文件（这里假设只支持 mp4 格式）
        const supportedFormats = ['.mp4', '.mov', '.avi'];
        const videoFilePaths = allFiles.filter(file => supportedFormats.includes(path.extname(file).toLowerCase()));

        // 返回相对路径，以便前端可以直接访问
        const relativePaths = videoFilePaths.map(file => path.relative(ANIME_FOLDER_PATH, file)).map(p => `/anime/${p.split(path.sep).join('/')}`);

        res.json(relativePaths);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '无法读取文件夹' });
    }
});

// ✅ 5. 提供视频文件服务（express.static 支持 Range 请求）
app.use('/videos', express.static(VIDEO_FOLDER_PATH, {
    setHeaders: (res, filePath) => {
        // 可选：设置缓存
        if (path.extname(filePath) === '.mp4') {
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

app.use('/anime', express.static(ANIME_FOLDER_PATH));

// ✅ 6. 根路由（可选：返回一个简单的页面）
app.get('/', (req, res) => {
    res.send(`
        <h1>视频服务器已启动</h1>
        <ul>
            <li><a href="/api/videos">查看 /videos 视频列表</a></li>
            <li><a href="/api/anime">查看 /anime 视频列表</a></li>
        </ul>
    `);
});

// ✅ 7. 启动 HTTP 服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 服务器运行在: http://localhost:${PORT}`);
    console.log(`📁 视频目录: ${VIDEO_FOLDER_PATH}`);
    console.log(`📁 动漫目录: ${ANIME_FOLDER_PATH}`);
});

// 🔐 可选：启用 HTTPS（需要证书）
/*
const options = {
    key: fs.readFileSync('path/to/private.key'),
    cert: fs.readFileSync('path/to/certificate.crt')
};

https.createServer(options, app).listen(3443, () => {
    console.log('HTTPS 服务器运行在 https://localhost:3443');
});
*/