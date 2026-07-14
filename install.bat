@echo off
title Bingo Game - Install Dependencies

echo Installing all required npm packages...
echo.

npm install react react-dom react-router-dom socket.io-client express socket.io cors dotenv uuid concurrently tailwindcss @tailwindcss/vite

echo.
echo ======================================
echo Installation completed!
echo ======================================
pause