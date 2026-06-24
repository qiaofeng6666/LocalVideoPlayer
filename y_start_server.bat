@echo off
chcp 65001 >nul 2>nul

cd /d "D:\Program Files\LocalVideoPlayer" || (
    echo 无法切换到目标目录
    pause
    exit /b 1
)

if not exist "server.js" (
    echo server.js 不存在
    pause
    exit /b 1
)

:: 检查 PM2 中是否存在名为 "server" 的进程（必须加 call）
call pm2 describe server >nul 2>&1
if %errorlevel% equ 0 (
    echo 应用 "server" 已在运行，无需重新启动。
) else (
    echo 启动应用 "server" ...
    call pm2 start server.js
    if errorlevel 1 (
        echo PM2 启动失败
        pause
        exit /b 1
    )
)

:: 保存进程列表（同样建议加 call）
call pm2 save

pause