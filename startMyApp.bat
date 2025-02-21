@echo off
cd /d "D:\app"
pm2 start app.js
pm2 startup
pm2 save