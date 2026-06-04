import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types'

const electronAPI: ElectronAPI = {
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }): void => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options)
  },
  setBounds: (x: number, y: number, w: number, h: number): void => {
    ipcRenderer.send('set-bounds', x, y, w, h)
  },
  getScreenSize: (): Promise<{ x: number; y: number; width: number; height: number }> => {
    return ipcRenderer.invoke('get-screen-size')
  },
  close: (): void => {
    ipcRenderer.send('close-app')
  }
}

contextBridge.exposeInMainWorld('petAPI', electronAPI)
