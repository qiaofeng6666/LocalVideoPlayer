<<<<<<< HEAD
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 视频文件夹路径
const videoFolderPath = 'D:\\Program Files\\Telegram Desktop\\videos'; // 注意路径中的双反斜杠

// 获取视频文件列表的 API
app.get('/api/videos', (req, res) => {
    fs.readdir(videoFolderPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: '无法读取文件夹' });
        }

        // 过滤出视频文件（这里假设只支持 mp4 格式）
        const supportedFormats = ['.mp4', '.mov', '.avi'];
        const videoFiles = files.filter(file => supportedFormats.includes(path.extname(file).toLowerCase()));
        
        // 返回文件路径，以便前端可以直接访问
        const videoFilePaths = videoFiles.map(file => `/videos/${file}`);
        
        res.json(videoFilePaths);
    });
});

// 提供视频文件服务
app.use('/videos', express.static(videoFolderPath));

// 启动服务器
app.listen(port, () => {
    console.log(`服务器正在运行于 http://localhost:${port}`);
=======
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 视频文件夹路径
const videoFolderPath = 'D:\\Program Files\\Telegram Desktop\\videos'; // 注意路径中的双反斜杠

// 获取视频文件列表的 API
app.get('/api/videos', (req, res) => {
    fs.readdir(videoFolderPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: '无法读取文件夹' });
        }

        // 过滤出视频文件（这里假设只支持 mp4 格式）
        const supportedFormats = ['.mp4', '.mov', '.avi'];
        const videoFiles = files.filter(file => supportedFormats.includes(path.extname(file).toLowerCase()));
        
        // 返回文件路径，以便前端可以直接访问
        const videoFilePaths = videoFiles.map(file => `/videos/${file}`);
        
        res.json(videoFilePaths);
    });
});

// 提供视频文件服务
app.use('/videos', express.static(videoFolderPath));

// 启动服务器
app.listen(port, () => {
    console.log(`服务器正在运行于 http://localhost:${port}`);
>>>>>>> 3ffc43c9356f8ada481788029bffb7f2ddd5a5fa
});