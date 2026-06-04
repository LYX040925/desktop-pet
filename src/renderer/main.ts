import './styles.css'
import { PetEngine } from './engine/PetEngine'
import type { ElectronAPI } from '../shared/types'

// 获取 preload 暴露的 API
const petAPI = (window as any).petAPI as ElectronAPI

if (!petAPI) {
  console.error('petAPI not found - preload script may not have loaded')
}

const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement

if (!canvas || !petAPI) {
  document.body.innerHTML = '<div style="color:white;padding:20px;font-size:14px">Error: Canvas or petAPI not found</div>'
  throw new Error('Failed to initialize')
}

const engine = new PetEngine(canvas, petAPI)
engine.start()

console.log('Desktop Pet initialized!')
