# 完全移除 ELECTRON_RUN_AS_NODE 变量（设为 $null 等同于删除）
Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Set-Location $PSScriptRoot
npx electron-vite dev
