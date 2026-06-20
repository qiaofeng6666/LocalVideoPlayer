@echo off
<<<<<<< HEAD
cd /d "D:\Program Files\LocalVideoPlayer" || (
    echo 无法切换到目标目录！
    pause
    exit /b 1
)

if not exist "app.js" (
    echo app.js 不存在！
    pause
    exit /b 1
)

call pm2 start app.js
if errorlevel 1 (
    echo pm2 启动失败！
    pause
    exit /b 1
)

call pm2 save
pause
=======
cd /d "D:\app"
pm2 start app.js
pm2 startup
pm2 save
>>>>>>> 0684f618c09bd91af0c698ff2916a04faed7d69e
