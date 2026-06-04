import type { PetConfig } from './types'

export const PET_CONFIG: PetConfig = {
  spriteScale: 4,
  walkSpeed: 60,
  dodgeSpeed: 120,
  idleDuration: [2000, 5000],
  sleepTimeout: 15_000, // 15秒无操作就睡觉
  windowSize: 320
}
