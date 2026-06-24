const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const app = express();
const PORT = 3001;

app.use(express.json());

// 全局标志：是否锁定（已执行且全部成功）
let hasExecuted = false;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'server_index.html'));
});

app.post('/run', (req, res) => {
    // 若已锁定，直接拒绝重复执行
    if (hasExecuted) {
        console.log('收到重复请求，已忽略（当前锁定中）。');
        return res.json({
            success: false,
            message: '任务已在执行中，请勿重复调用。'
        });
    }
    
    // 立即锁定，防止并发
    hasExecuted = true;
    console.log('收到“我要看片”请求，开始执行预定义任务...');

    // 注意：路径包含空格，用双引号括起来（已在字符串中）
    const commands = [
        '"D:\\Program Files\\LocalVideoPlayer\\startapp_auto.bat"',
        '"D:\\Program Files\\Tailscale\\tailscale-ipn.exe"',
    ];

    // 将每个命令包装成 Promise，使用 exec 执行
    const execPromises = commands.map((cmd, index) => {
        return new Promise((resolve, reject) => {
            exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`命令 ${index+1} (${cmd}) 执行失败:`, error.message);
                    reject(error);
                } else {
                    console.log(`命令 ${index+1} (${cmd}) 执行成功:`, stdout || '(无输出)');
                    resolve({ stdout, stderr });
                }
            });
        });
    });

    // 后台异步等待所有命令完成，不阻塞响应
    Promise.allSettled(execPromises)
        .then(results => {
            const hasError = results.some(result => result.status === 'rejected');
            if (hasError) {
                console.log('部分命令执行失败，重置锁定，允许重试。');
                hasExecuted = false; // 解锁，允许再次调用
            } else {
                console.log('所有命令执行成功，保持锁定。');
                // hasExecuted 保持 true
            }
        })
        .catch(err => {
            // 意外错误，也解锁以保证可用性
            console.error('处理命令结果时发生异常:', err);
            hasExecuted = false;
        });

    // 立即返回，不阻塞
    res.json({
        success: true,
        message: '已开始执行任务，请查看服务端日志。若全部成功则锁定，否则可再次尝试。'
    });
});

app.listen(PORT, () => {
    console.log(`🎬 看片神器已启动！`);
    console.log(`📍 访问地址: http://localhost:${PORT}`);
    console.log(`ℹ️  /run 仅首次有效，若执行失败则自动解锁允许重试。`);
});