@echo off
chcp 65001 >nul 2>nul

echo 正在停止视频服务器...

:: 检查 PM2 中是否存在名为 "app" 的进程（必须加 call）
call pm2 describe app >nul 2>&1
if %errorlevel% equ 0 (
    echo 找到进程 "app"，正在停止...
    call pm2 delete app
    if errorlevel 1 (
        echo 停止失败，请检查 PM2 状态。
        pause
        exit /b 1
    )
    echo ✅ 进程 "app" 已停止。
) else (
    echo 未找到进程 "app"，服务可能未运行。
)

:: 保存当前进程列表（停止后保存，确保下次开机自启时不会自动拉起）
call pm2 save

pause