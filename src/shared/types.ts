// ---- Pixel Sprite Types ----

export type ColorPalette = Record<number, string>

export interface SpriteFrame {
  data: number[][]
  width: number
  height: number
}

export interface SpriteAnimation {
  frames: SpriteFrame[]
  frameRate: number // ms per frame
  loop: boolean
}

// ---- Pet State Types ----

export enum PetState {
  IDLE = 'IDLE',
  WANDER = 'WANDER',
  SIT = 'SIT',
  SLEEP = 'SLEEP',
  EAT = 'EAT',
  PETTED = 'PETTED',
  HAPPY = 'HAPPY',
  ANGRY = 'ANGRY',
  DODGE = 'DODGE'
}

export interface PetPosition {
  x: number
  y: number
}

export interface PetConfig {
  spriteScale: number       // 像素放大倍数 (4x)
  walkSpeed: number         // 移动速度 px/s
  dodgeSpeed: number        // 躲避速度 px/s
  idleDuration: [number, number] // 闲逛间隔 [min, max] ms
  sleepTimeout: number      // 多久无操作后睡觉 ms
  windowSize: number        // 窗口尺寸
}

// ---- Window Types ----

export interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}

// ---- Electron IPC Types ----

export interface ElectronAPI {
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => void
  setBounds: (x: number, y: number, w: number, h: number) => void
  getScreenSize: () => Promise<ScreenBounds>
  close: () => void
}
