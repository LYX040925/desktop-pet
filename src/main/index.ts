import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 320,
    height: 320,
    x: Math.floor((width - 320) / 2),
    y: Math.floor((height - 320) / 2),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // IPC Handlers
  ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean, options?: { forward?: boolean }) => {
    mainWindow?.setIgnoreMouseEvents(ignore, options)
  })

  ipcMain.on('set-bounds', (_event, x: number, y: number, w: number, h: number) => {
    mainWindow?.setBounds({ x, y, width: w, height: h })
  })

  ipcMain.handle('get-screen-size', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    return { x: 0, y: 0, width, height }
  })

  ipcMain.on('close-app', () => {
    mainWindow?.close()
  })

  // 加载渲染进程
  const isDev = !!process.env['ELECTRON_RENDERER_URL']
  if (isDev) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---- App Lifecycle ----

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
