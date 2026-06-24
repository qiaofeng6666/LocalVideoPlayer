const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const app = express();
const PORT = 3001;

app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'server_index.html'));
});

app.post('/run', (req, res) => {
    console.log('收到“我要看片”请求，开始执行预定义任务...');

    // 注意：路径包含空格，用双引号括起来
    const commands = [
        '"D:\\Program Files\\LocalVideoPlayer\\startapp_auto.bat"',
        '"D:\\Program Files\\Tailscale\\tailscale-ipn.exe"',
    ];

    // 异步分别执行，不等待结果
    commands.forEach((cmd, index) => {
        exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
            if (error) {
                console.error(`命令 ${index+1} 执行失败:`, error.message);
            } else {
                console.log(`命令 ${index+1} 执行成功:`, stdout || '(无输出)');
            }
        });
    });

    // 立即返回，不阻塞
    res.json({
        success: true,
        message: '已开始执行所有任务，请查看服务端日志。'
    });
});

app.listen(PORT, () => {
    console.log(`🎬 看片神器已启动！`);
    console.log(`📍 访问地址: http://localhost:${PORT}`);
});