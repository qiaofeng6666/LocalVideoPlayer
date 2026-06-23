const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// ================== 空闲超时配置 ==================
// 单位：分钟，默认 10 分钟；设置为 0 可禁用自动关闭
const IDLE_TIMEOUT_MINUTES = parseInt(process.env.IDLE_TIMEOUT_MINUTES) || 10;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES > 0 ? IDLE_TIMEOUT_MINUTES * 60 * 1000 : 0;

// ================== 视频目录配置 ==================
const VIDEO_1_FOLDER_PATH = path.resolve('D:/videos');
const VIDEO_2_FOLDER_PATH = path.resolve('D:/videos2');

// ================== 静态资源 ==================
app.use(express.static(path.join(__dirname, 'public')));

// ================== SQLite 初始化 ==================
const DB_PATH = path.join(__dirname, 'traffic.db');
const db = new sqlite3.Database(DB_PATH);

// 创建总表（历史累计流量）
db.run(`
    CREATE TABLE IF NOT EXISTS ip_traffic (
        ip TEXT PRIMARY KEY,
        total_bytes INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('❌ 创建总表失败:', err.message);
    } else {
        console.log('✅ 总表已就绪');
    }
});

// 创建日表（按日期统计）
db.run(`
    CREATE TABLE IF NOT EXISTS ip_traffic_daily (
        ip TEXT,
        date TEXT,   -- 格式 YYYY-MM-DD
        total_bytes INTEGER DEFAULT 0,
        PRIMARY KEY (ip, date)
    )
`, (err) => {
    if (err) {
        console.error('❌ 创建日表失败:', err.message);
    } else {
        console.log('✅ 日表已就绪');
    }
});

// ================== 空闲计时器管理 ==================
let server = null;               // HTTP 服务器实例
let idleTimer = null;           // 空闲超时定时器
let isShuttingDown = false;     // 防止重复关闭

function resetIdleTimer() {
    if (IDLE_TIMEOUT_MS === 0) return; // 禁用自动关闭
    if (isShuttingDown) return;        // 已关闭中不再重置
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        console.log(`⏰ 服务器空闲超过 ${IDLE_TIMEOUT_MINUTES} 分钟，开始自动关闭...`);
        gracefulShutdown();
    }, IDLE_TIMEOUT_MS);
}

function gracefulShutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }

    // 停止接收新连接
    if (server) {
        server.close(() => {
            console.log('✅ HTTP 服务器已关闭');
            // 关闭数据库连接
            db.close((err) => {
                if (err) {
                    console.error('❌ 关闭数据库失败:', err.message);
                } else {
                    console.log('✅ 数据库连接已关闭');
                }
                // 正常退出进程
                process.exit(0);
            });
        });

        // 如果服务器无法在指定时间内关闭，强制退出
        const forceExitTimeout = setTimeout(() => {
            console.error('⚠️ 强制退出进程（关闭超时）');
            process.exit(1);
        }, 5000); // 5 秒超时
        forceExitTimeout.unref(); // 避免阻止进程退出
    } else {
        // 如果没有 server，直接退出
        process.exit(0);
    }
}

// ================== IP 流量统计中间件（双写：总表 + 日表） ==================
app.use((req, res, next) => {
    // 只统计视频请求（可根据需要调整）
    if (req.path.startsWith('/videos') || req.path.startsWith('/videos2')) {
        // 获取客户端真实 IP
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const clientIp = (ip.split(',')[0] || ip).trim();

        // 保存原始 end 方法
        const originalEnd = res.end;
        let contentLength = 0;

        // 拦截 setHeader 获取 Content-Length
        const originalSetHeader = res.setHeader;
        res.setHeader = function(name, value) {
            if (name.toLowerCase() === 'content-length') {
                contentLength = parseInt(value, 10);
            }
            return originalSetHeader.call(this, name, value);
        };

        // 重写 end 方法
        res.end = function(chunk, encoding, callback) {
            // 如果没拿到 Content-Length，尝试从 chunk 计算
            if (!contentLength && chunk) {
                contentLength = Buffer.byteLength(chunk);
            }

            if (contentLength > 0) {
                // 1) 更新总表
                db.run(
                    `INSERT INTO ip_traffic (ip, total_bytes) 
                     VALUES (?, ?) 
                     ON CONFLICT(ip) DO UPDATE SET 
                        total_bytes = total_bytes + excluded.total_bytes,
                        updated_at = CURRENT_TIMESTAMP`,
                    [clientIp, contentLength],
                    (err) => {
                        if (err) console.error('总表更新失败:', err.message);
                    }
                );

                // 2) 更新日表
                db.run(
                    `INSERT INTO ip_traffic_daily (ip, date, total_bytes) 
                     VALUES (?, date('now'), ?) 
                     ON CONFLICT(ip, date) DO UPDATE SET 
                        total_bytes = total_bytes + excluded.total_bytes`,
                    [clientIp, contentLength],
                    (err) => {
                        if (err) console.error('日表更新失败:', err.message);
                    }
                );
            }

            // 调用原始 end
            return originalEnd.call(this, chunk, encoding, callback);
        };
    }
    next();
});

// ================== 全局中间件：重置空闲计时器（所有请求都会触发） ==================
app.use((req, res, next) => {
    resetIdleTimer();
    next();
});

// ================== 工具函数：递归获取目录下所有文件 ==================
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

// ================== API 路由：视频列表 ==================
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

// ================== API 路由：IP 流量统计 ==================

// 1. 获取历史累计流量（所有时间）
app.get('/api/traffic/ip', (req, res) => {
    db.all(
        `SELECT ip, total_bytes, updated_at FROM ip_traffic ORDER BY total_bytes DESC`,
        (err, rows) => {
            if (err) {
                console.error('查询总表失败:', err.message);
                res.status(500).json({ error: '数据库查询失败' });
                return;
            }
            const data = rows.map(row => ({
                ip: row.ip,
                bytes: row.total_bytes,
                MB: (row.total_bytes / 1024 / 1024).toFixed(2),
                GB: (row.total_bytes / 1024 / 1024 / 1024).toFixed(4),
                updated_at: row.updated_at
            }));
            res.json({ totalIPs: data.length, data });
        }
    );
});

// 2. 获取今日每个 IP 的流量（用于前端弹窗和展示）
app.get('/api/traffic/ip/today', (req, res) => {
    db.all(
        `SELECT ip, total_bytes FROM ip_traffic_daily WHERE date = date('now') ORDER BY total_bytes DESC`,
        (err, rows) => {
            if (err) {
                console.error('查询今日流量失败:', err.message);
                res.status(500).json({ error: '数据库查询失败' });
                return;
            }
            const data = rows.map(row => ({
                ip: row.ip,
                bytes: row.total_bytes,
                MB: (row.total_bytes / 1024 / 1024).toFixed(2),
                GB: (row.total_bytes / 1024 / 1024 / 1024).toFixed(4)
            }));
            res.json({ data });
        }
    );
});

// 3. （可选）重置所有统计
app.post('/api/traffic/reset', (req, res) => {
    db.run('DELETE FROM ip_traffic', (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        db.run('DELETE FROM ip_traffic_daily', (err2) => {
            if (err2) {
                res.status(500).json({ error: err2.message });
                return;
            }
            res.json({ message: '所有 IP 流量统计已重置' });
        });
    });
});

// ================== 静态视频文件服务 ==================
app.use('/videos', express.static(VIDEO_1_FOLDER_PATH, {
    setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.mp4') {
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

app.use('/videos2', express.static(VIDEO_2_FOLDER_PATH, {
    setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.mp4') {
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// ================== 根路由：返回流量监控页面 ==================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'traffic.html'));
});

// ================== 启动 HTTP 服务器 ==================
server = app.listen(PORT, () => {
    console.log(`✅ HTTP 服务器运行在: http://localhost:${PORT}`);
    console.log(`📁 视频目录1 (videos): ${VIDEO_1_FOLDER_PATH}`);
    console.log(`📁 视频目录2 (videos2): ${VIDEO_2_FOLDER_PATH}`);
    console.log(`📊 流量统计页面: http://localhost:${PORT}/`);
    if (IDLE_TIMEOUT_MS > 0) {
        console.log(`⏰ 空闲超时自动关闭已启用：${IDLE_TIMEOUT_MINUTES} 分钟`);
        resetIdleTimer(); // 启动计时器
    } else {
        console.log('ℹ️ 空闲超时自动关闭已禁用');
    }
});

// ================== 可选 HTTPS 支持（注释保留） ==================
// try {
//     const https = require('https');
//     const options = {
//         key: fs.readFileSync('./certs/private.key'),
//         cert: fs.readFileSync('./certs/certificate.crt')
//     };
//     https.createServer(options, app).listen(3443, () => {
//         console.log('🔐 HTTPS 服务器运行在 https://localhost:3443');
//     });
// } catch (err) {
//     console.log('ℹ️ 未启用 HTTPS（证书文件不存在或路径错误），仅提供 HTTP 服务');
// }