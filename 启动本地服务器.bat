@echo off
echo ========================================
echo   启动本地服务器
echo ========================================
echo.
echo 正在启动服务器，请稍候...
echo.
echo 服务器启动后，请在浏览器中访问：
echo http://localhost:8000/index-supabase.html
echo.
echo 按 Ctrl+C 可以停止服务器
echo ========================================
echo.

python -m http.server 8000

pause
