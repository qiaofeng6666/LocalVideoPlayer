const express = require('express');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpeg_static = require('ffmpeg-static');
const ffmpegPath = require('ffmpeg-static').path;
console.log('FFmpeg Path:', ffmpegPath);

// 设置 FFmpeg 可执行文件的路径（假设路径包含空格）
ffmpeg.setFfmpegPath("D:\\Program Files\\ffmpeg-7.1-full_build\\bin\\ffmpeg.exe");

// 初始化应用和设置端口
const app = express();
const port = 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 视频文件夹路径
const videoFolderPath = 'D:/Program Files/Telegram Desktop/videos'; // 使用正斜杠或双反斜杠
const thumbnailFolderPath = path.join(__dirname, 'public', 'thumbnails'); // 缩略图存储目录

// 确保缩略图存储目录存在
if (!fs.existsSync(thumbnailFolderPath)) {
    fs.mkdirSync(thumbnailFolderPath, { recursive: true });
}

// 获取视频文件列表的 API
app.get('/api/videos', (req, res) => {
    fs.readdir(videoFolderPath, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: '无法读取文件夹' });

        const supportedFormats = ['.mp4', '.mov', '.avi'];
        const videoFiles = files.filter(file => file.isFile() && supportedFormats.includes(path.extname(file.name).toLowerCase()));

        // 对每个视频文件生成缩略图（如果不存在）
        Promise.all(videoFiles.map(file => new Promise((resolve, reject) => {
            const videoPath = path.join(videoFolderPath, file.name);
            const thumbnailPath = path.join(thumbnailFolderPath, `${path.basename(file.name, path.extname(file.name))}.jpg`);

            // 检查缩略图是否存在
            if (fs.existsSync(thumbnailPath)) {
                console.log(`缩略图已存在：${thumbnailPath}`);
                return resolve({
                    name: file.name,
                    thumbnail: `/thumbnails/${path.basename(file.name, path.extname(file.name))}.jpg`
                });
            }

            // 设置ffmpeg路径
            ffmpeg.setFfmpegPath(ffmpeg_static.path);

            // 提取缩略图
            ffmpeg(videoPath)
                .screenshots({
                    count: 1,
                    folder: thumbnailFolderPath,
                    filename: `${path.basename(file.name, path.extname(file.name))}.jpg`,
                    timemarks: [0] // 截取第0秒即开始时的帧
                })
                .on('end', () => resolve({
                    name: file.name,
                    thumbnail: `/thumbnails/${path.basename(file.name, path.extname(file.name))}.jpg`
                }))
                .on('error', err => reject(err));
        }))).then(results => res.json(results)).catch(err => res.status(500).json({ error: err.message }));
    });
});

// 提供视频文件服务
app.use('/videos', express.static(videoFolderPath));

// 启动服务器
app.listen(port, () => {
    console.log(`服务器正在运行于 http://localhost:${port}`);
});