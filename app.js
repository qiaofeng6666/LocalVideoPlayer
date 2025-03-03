const express = require('express');
const fs = require('fs').promises; // 使用 promises 版本的 fs 模块
const path = require('path');
const app = express();
const port = 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 视频文件夹路径
const videoFolderPath = 'D:\\Program Files\\Telegram Desktop\\videos'; // 注意路径中的双反斜杠
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