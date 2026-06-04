@echo off
:: 完全移除 ELECTRON_RUN_AS_NODE 变量（Electron 检查的是变量是否存在，设为 0 没用，必须删除）
set ELECTRON_RUN_AS_NODE=
cd /d %~dp0
npx electron-vite dev
