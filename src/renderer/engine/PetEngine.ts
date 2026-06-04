import type { ElectronAPI, PetPosition, ScreenBounds } from '../../shared/types'
import { PET_CONFIG } from '../../shared/constants'
import { SPRITES, EXTRA_SPRITES, PET_PALETTE } from '../sprites'
import type { SpriteFrame } from '../../shared/types'

const WINDOW_SIZE = PET_CONFIG.windowSize
const SPRITE_SIZE = 16
const SCALE = PET_CONFIG.spriteScale
const DRAW_SIZE = SPRITE_SIZE * SCALE // 64px

interface PetStateHandler {
  enter: () => void
  update: (dt: number) => void
  exit: () => void
}

export class PetEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private petAPI: ElectronAPI

  // 动画帧
  private currentFrames: SpriteFrame[] | null = null
  private currentFrame: SpriteFrame | null = null
  private frameIndex: number = 0
  private frameTimer: number = 0
  private frameRate: number = 200

  // 宠物状态
  private position: PetPosition = { x: WINDOW_SIZE / 2 - DRAW_SIZE / 2, y: WINDOW_SIZE / 2 - DRAW_SIZE / 2 }
  private targetPosition: PetPosition | null = null
  private currentState: string = 'IDLE'
  private stateTime: number = 0
  private facingRight: boolean = true

  // 鼠标状态
  private mouseLocalX: number = 0
  private mouseLocalY: number = 0
  private isMouseOnPet: boolean = false
  private isIgnoreMode: boolean = true
  private lastClickTime: number = 0
  private clickCount: number = 0

  // 拖拽状态
  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private dragOffsetX: number = 0
  private dragOffsetY: number = 0
  private dragThreshold: number = 5 // 移动超过 5px 才判定为拖拽

  // 窗口/屏幕
  private screenBounds: ScreenBounds = { x: 0, y: 0, width: 1920, height: 1080 }
  private windowX: number = 0
  private windowY: number = 0

  // 交互计时
  private lastInteractionTime: number = Date.now()

  // 零食
  private treat: PetPosition | null = null
  private treatBounce: number = 0

  // 睡觉粒子（Zzz + 小星星）
  private zzzParticles: Array<{ x: number; y: number; opacity: number; size: number; char: string }> = []
  private starParticles: Array<{ x: number; y: number; opacity: number; size: number; angle: number }> = []

  // 状态处理
  private states: Record<string, PetStateHandler> = {
    IDLE: {
      enter: () => {
        this.frameRate = 200
        this.setSprites(SPRITES.idle)
        this.stateTime = this.randomRange(PET_CONFIG.idleDuration[0], PET_CONFIG.idleDuration[1])
      },
      update: (dt) => {
        this.stateTime -= dt
        // 有零食 → 走过去吃
        if (this.treat) {
          this.setState('TREAT')
          return
        }
        if (Date.now() - this.lastInteractionTime > PET_CONFIG.sleepTimeout) {
          this.setState('SLEEP')
          return
        }
        if (this.stateTime <= 0) {
          // 随机选择下一个动作
          const roll = Math.random()
          if (roll < 0.4) {
            this.setState('WANDER')
          } else if (roll < 0.55) {
            this.setState('SCRATCH')
          } else if (roll < 0.7) {
            this.setState('YAWN')
          } else if (roll < 0.85) {
            this.setState('LOOK')
          } else {
            this.setState('SIT')
          }
        }
      },
      exit: () => {}
    },
    WANDER: {
      enter: () => {
        this.frameRate = 150
        this.setSprites(SPRITES.walk)
        const margin = DRAW_SIZE
        this.targetPosition = {
          x: this.randomRange(margin, WINDOW_SIZE - margin * 2),
          y: this.randomRange(margin, WINDOW_SIZE - margin * 2)
        }
      },
      update: (dt) => {
        if (this.treat) { this.setState('TREAT'); return }
        if (!this.targetPosition) { this.setState('IDLE'); return }
        const dx = this.targetPosition.x - this.position.x
        const dy = this.targetPosition.y - this.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 5) {
          this.setState('SIT')
          return
        }

        if (this.isMouseNear(80)) {
          this.setState('DODGE')
          return
        }

        const speed = PET_CONFIG.walkSpeed * (dt / 1000)
        this.position.x += (dx / dist) * speed
        this.position.y += (dy / dist) * speed
        this.facingRight = dx > 0
      },
      exit: () => {
        this.targetPosition = null
      }
    },
    SIT: {
      enter: () => {
        this.frameRate = 200
        this.setSprites(SPRITES.sit)
        this.stateTime = this.randomRange(2000, 4000)
      },
      update: (dt) => {
        this.stateTime -= dt
        if (this.stateTime <= 0) this.setState('IDLE')
      },
      exit: () => {}
    },
    SLEEP: {
      enter: () => {
        this.frameRate = 400
        this.setSprites(SPRITES.sleep)
        this.zzzParticles = []
        this.starParticles = []
        this.stateTime = 15000 // 睡15秒就醒
      },
      update: (dt) => {
        this.stateTime -= dt

        // 生成 Zzz 粒子
        if (Math.random() < 0.04) {
          const chars = ['Z', 'z', 'Z', 'Z']
          this.zzzParticles.push({
            x: this.position.x + DRAW_SIZE * 0.8,
            y: this.position.y + 5,
            opacity: 1,
            size: 14 + Math.random() * 8,
            char: chars[Math.floor(Math.random() * chars.length)]
          })
        }

        // 生成小星星
        if (Math.random() < 0.02) {
          this.starParticles.push({
            x: this.position.x + Math.random() * DRAW_SIZE,
            y: this.position.y - 5 - Math.random() * 20,
            opacity: 1,
            size: 3 + Math.random() * 3,
            angle: Math.random() * Math.PI * 2
          })
        }

        // 更新 Zzz
        this.zzzParticles = this.zzzParticles.filter(p => {
          p.y -= 0.8
          p.x += 0.4
          p.opacity -= 0.012
          p.size += 0.1
          return p.opacity > 0
        })

        // 更新星星
        this.starParticles = this.starParticles.filter(p => {
          p.y -= 0.3
          p.angle += 0.05
          p.opacity -= 0.01
          return p.opacity > 0
        })

        if (this.stateTime <= 0) this.setState('IDLE')
      },
      exit: () => { this.zzzParticles = []; this.starParticles = []; this.lastInteractionTime = Date.now() }
    },
    PETTED: {
      enter: () => {
        this.frameRate = 150
        this.setSprites(SPRITES.happy)
        this.stateTime = 1000
      },
      update: (dt) => {
        this.stateTime -= dt
        if (this.stateTime <= 0) this.setState('HAPPY')
      },
      exit: () => {}
    },
    HAPPY: {
      enter: () => {
        this.frameRate = 200
        this.setSprites(SPRITES.happy)
        this.stateTime = 3000
      },
      update: (dt) => {
        this.stateTime -= dt
        if (this.stateTime <= 0) this.setState('IDLE')
      },
      exit: () => {}
    },
    ANGRY: {
      enter: () => {
        this.frameRate = 100
        this.setSprites(SPRITES.angry)
        this.stateTime = 2000
        const escapeDir = this.facingRight ? -1 : 1
        this.targetPosition = {
          x: Math.max(0, Math.min(WINDOW_SIZE - DRAW_SIZE, this.position.x + escapeDir * 60)),
          y: this.position.y
        }
      },
      update: (dt) => {
        this.stateTime -= dt
        if (this.targetPosition) {
          const dx = this.targetPosition.x - this.position.x
          if (Math.abs(dx) > 2) {
            this.position.x += Math.sign(dx) * 80 * (dt / 1000)
          }
        }
        if (this.stateTime <= 0) this.setState('IDLE')
      },
      exit: () => { this.targetPosition = null }
    },
    DODGE: {
      enter: () => {
        this.frameRate = 100
        this.setSprites(SPRITES.dodge)
        this.stateTime = 500
        const petCenterX = this.position.x + DRAW_SIZE / 2
        const petCenterY = this.position.y + DRAW_SIZE / 2
        const escapeX = petCenterX - this.mouseLocalX
        const escapeY = petCenterY - this.mouseLocalY
        const dist = Math.sqrt(escapeX * escapeX + escapeY * escapeY) || 1
        this.targetPosition = {
          x: Math.max(0, Math.min(WINDOW_SIZE - DRAW_SIZE, this.position.x + (escapeX / dist) * 80)),
          y: Math.max(0, Math.min(WINDOW_SIZE - DRAW_SIZE, this.position.y + (escapeY / dist) * 80))
        }
      },
      update: (dt) => {
        this.stateTime -= dt
        if (this.targetPosition) {
          const dx = this.targetPosition.x - this.position.x
          const dy = this.targetPosition.y - this.position.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 3) {
            const speed = PET_CONFIG.dodgeSpeed * (dt / 1000)
            this.position.x += (dx / dist) * speed
            this.position.y += (dy / dist) * speed
          }
        }
        if (this.stateTime <= 0) this.setState('IDLE')
      },
      exit: () => { this.targetPosition = null }
    },
    TREAT: {
      enter: () => {
        this.frameRate = 150
        this.setSprites(SPRITES.walk)
        // 目标是零食位置，偏移到零食旁边
        if (this.treat) {
          this.targetPosition = {
            x: this.treat.x - DRAW_SIZE / 2 + 4,
            y: this.treat.y - DRAW_SIZE + 4
          }
        }
      },
      update: (dt) => {
        if (!this.treat || !this.targetPosition) { this.setState('IDLE'); return }
        const dx = this.targetPosition.x - this.position.x
        const dy = this.targetPosition.y - this.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        this.facingRight = dx > 0

        if (dist < 5) {
          this.setState('EAT')
          return
        }

        const speed = PET_CONFIG.walkSpeed * 1.2 * (dt / 1000)
        this.position.x += (dx / dist) * speed
        this.position.y += (dy / dist) * speed
      },
      exit: () => { this.targetPosition = null }
    },
    EAT: {
      enter: () => {
        this.frameRate = 200
        this.setSprites(SPRITES.sit) // 吃东西时坐下
        this.stateTime = 2000
      },
      update: (dt) => {
        this.stateTime -= dt
        // 零食逐渐消失
        if (this.treat) {
          this.treatBounce += dt * 0.005
        }
        if (this.stateTime <= 0) {
          this.treat = null
          this.treatBounce = 0
          this.setState('HAPPY')
        }
      },
      exit: () => {
        this.treat = null
        this.treatBounce = 0
      }
    },
    // ---- 待机小动作 ----
    SCRATCH: {
      enter: () => {
        this.frameRate = 200
        this.setSprites(EXTRA_SPRITES.scratch)
        this.stateTime = 2000
      },
      update: (dt) => {
        this.stateTime -= dt
        if (this.treat) { this.setState('TREAT'); return }
        if (this.stateTime <= 0) this.setState('IDLE')
      },
      exit: () => {}
    },
    YAWN: {
      enter: () => {
        this.frameRate = 300
        this.setSprites(EXTRA_SPRITES.yawn)
        this.stateTime = 2500
      },
      update: (dt) => {
        this.stateTime -= dt
        if (this.treat) { this.setState('TREAT'); return }
        if (this.stateTime <= 0) this.setState('IDLE')
      },
      exit: () => {}
    },
    LOOK: {
      enter: () => {
        this.frameRate = 400
        this.setSprites(EXTRA_SPRITES.look)
        this.stateTime = 3000
      },
      update: (dt) => {
        this.stateTime -= dt
        if (this.treat) { this.setState('TREAT'); return }
        if (this.isMouseNear(80)) { this.setState('DODGE'); return }
        if (this.stateTime <= 0) this.setState('IDLE')
      },
      exit: () => {}
    }
  }

  constructor(canvas: HTMLCanvasElement, petAPI: ElectronAPI) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.petAPI = petAPI

    canvas.width = WINDOW_SIZE
    canvas.height = WINDOW_SIZE
    this.ctx.imageSmoothingEnabled = false

    // 初始化
    this.initScreen()
    this.states.IDLE.enter()
    this.setupInput()
  }

  start(): void {
    let lastTime = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(now - lastTime, 50) // 限制最大 dt 防止跳帧
      lastTime = now
      this.update(dt)
      this.render()
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  // ---- 初始化 ----

  private async initScreen(): Promise<void> {
    this.screenBounds = await this.petAPI.getScreenSize()
    // 窗口居中
    this.windowX = Math.floor((this.screenBounds.width - WINDOW_SIZE) / 2)
    this.windowY = Math.floor((this.screenBounds.height - WINDOW_SIZE) / 2)
    this.syncWindow()
  }

  // ---- 更新 ----

  private update(dt: number): void {
    // 拖拽中：不执行状态逻辑，宠物跟随鼠标
    if (this.isDragging) {
      // 计算鼠标在屏幕上的新位置 = 窗口位置 + 鼠标在窗口内的坐标
      const mouseScreenX = this.windowX + this.mouseLocalX
      const mouseScreenY = this.windowY + this.mouseLocalY
      // 窗口跟随鼠标（宠物居中）
      this.windowX = mouseScreenX - this.dragOffsetX
      this.windowY = mouseScreenY - this.dragOffsetY
      // 限制在屏幕内
      this.windowX = Math.max(this.screenBounds.x,
        Math.min(this.screenBounds.x + this.screenBounds.width - WINDOW_SIZE, this.windowX))
      this.windowY = Math.max(this.screenBounds.y,
        Math.min(this.screenBounds.y + this.screenBounds.height - WINDOW_SIZE, this.windowY))
      // 宠物始终在窗口中心
      this.position.x = (WINDOW_SIZE - DRAW_SIZE) / 2
      this.position.y = (WINDOW_SIZE - DRAW_SIZE) / 2
      this.syncWindow()
      return
    }

    // 动画帧
    this.frameTimer += dt
    if (this.frameTimer >= this.frameRate) {
      this.frameTimer -= this.frameRate
      if (this.currentFrames && this.currentFrames.length > 0) {
        this.frameIndex = (this.frameIndex + 1) % this.currentFrames.length
        this.currentFrame = this.currentFrames[this.frameIndex]
      }
    }

    // 状态更新
    this.states[this.currentState]?.update(dt)

    // 边缘检测
    this.checkEdgeClipping()

    // 同步窗口位置
    this.syncWindow()
  }

  // ---- 边缘爬行 ----

  private checkEdgeClipping(): void {
    const threshold = 10
    // 宠物走到窗口左边缘 → 窗口左移
    if (this.position.x < threshold) {
      const newX = this.windowX - WINDOW_SIZE / 2
      if (newX >= this.screenBounds.x) {
        this.windowX = newX
        this.position.x += WINDOW_SIZE / 2
      }
    }

    // 宠物走到窗口右边缘 → 窗口右移
    if (this.position.x > WINDOW_SIZE - DRAW_SIZE - threshold) {
      const newX = this.windowX + WINDOW_SIZE / 2
      if (newX + WINDOW_SIZE <= this.screenBounds.x + this.screenBounds.width) {
        this.windowX = newX
        this.position.x -= WINDOW_SIZE / 2
      }
    }

    // 宠物走到窗口上边缘 → 窗口上移
    if (this.position.y < threshold) {
      const newY = this.windowY - WINDOW_SIZE / 2
      if (newY >= this.screenBounds.y) {
        this.windowY = newY
        this.position.y += WINDOW_SIZE / 2
      }
    }

    // 宠物走到窗口下边缘 → 窗口下移
    if (this.position.y > WINDOW_SIZE - DRAW_SIZE - threshold) {
      const newY = this.windowY + WINDOW_SIZE / 2
      if (newY + WINDOW_SIZE <= this.screenBounds.y + this.screenBounds.height) {
        this.windowY = newY
        this.position.y -= WINDOW_SIZE / 2
      }
    }

    // 限制宠物在窗口内
    this.position.x = Math.max(0, Math.min(WINDOW_SIZE - DRAW_SIZE, this.position.x))
    this.position.y = Math.max(0, Math.min(WINDOW_SIZE - DRAW_SIZE, this.position.y))
  }

  private syncWindow(): void {
    this.petAPI.setBounds(this.windowX, this.windowY, WINDOW_SIZE, WINDOW_SIZE)
  }

  // ---- 渲染 ----

  private render(): void {
    this.ctx.clearRect(0, 0, WINDOW_SIZE, WINDOW_SIZE)
    if (!this.currentFrame) return

    // 阴影（拖拽时不显示）
    if (!this.isDragging) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.15)'
      this.ctx.beginPath()
      this.ctx.ellipse(
        this.position.x + DRAW_SIZE / 2,
        this.position.y + DRAW_SIZE + 2,
        DRAW_SIZE / 2.5, 4, 0, 0, Math.PI * 2
      )
      this.ctx.fill()
    }

    // 猫咪（拖拽时用受惊表情）
    const sprite = this.isDragging ? SPRITES.dodge[0] : this.currentFrame
    this.drawSprite(sprite, this.position.x, this.position.y, this.facingRight)

    // 零食
    if (this.treat) {
      this.drawTreat(this.treat.x, this.treat.y)
    }

    // ZZZ
    if (this.currentState === 'SLEEP') this.drawZzz()
  }

  private drawSprite(frame: SpriteFrame, x: number, y: number, flipX: boolean): void {
    const { data, width, height } = frame
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const colorIdx = data[row][col]
        if (colorIdx === 0) continue
        const color = PET_PALETTE[colorIdx]
        if (!color || color === 'transparent') continue
        this.ctx.fillStyle = color
        const drawCol = flipX ? (width - 1 - col) : col
        this.ctx.fillRect(x + drawCol * SCALE, y + row * SCALE, SCALE, SCALE)
      }
    }
  }

  private drawZzz(): void {
    // 绘制 Zzz 文字
    for (const p of this.zzzParticles) {
      this.ctx.globalAlpha = p.opacity
      this.ctx.font = `bold ${p.size}px monospace`
      this.ctx.fillStyle = '#7eb8da'
      this.ctx.fillText(p.char, p.x, p.y)
    }

    // 绘制小星星 ✦
    for (const s of this.starParticles) {
      this.ctx.globalAlpha = s.opacity
      this.ctx.fillStyle = '#ffe066'
      this.ctx.font = `${s.size}px serif`
      this.ctx.fillText('✦', s.x, s.y)
    }

    this.ctx.globalAlpha = 1
  }

  private drawTreat(x: number, y: number): void {
    // 吃东西时零食缩小消失
    const progress = this.currentState === 'EAT'
      ? Math.max(0, this.stateTime / 2000)
      : 1
    const bounce = Math.sin(this.treatBounce) * 3
    const size = 8 * progress
    const alpha = progress

    this.ctx.globalAlpha = alpha
    // 小鱼干 - 鱼身
    this.ctx.fillStyle = '#f5a623'
    this.ctx.fillRect(x - size / 2, y - size / 2 + bounce, size, size * 0.6)
    // 鱼尾
    this.ctx.beginPath()
    this.ctx.moveTo(x - size / 2 - 4, y + bounce)
    this.ctx.lineTo(x - size / 2, y - size / 2 + bounce)
    this.ctx.lineTo(x - size / 2, y + size * 0.6 - size / 2 + bounce)
    this.ctx.closePath()
    this.ctx.fill()
    // 鱼眼
    this.ctx.fillStyle = '#333'
    this.ctx.fillRect(x + size / 4 - 1, y - 1 + bounce, 2, 2)
    this.ctx.globalAlpha = 1
  }

  // ---- 状态管理 ----

  private setState(state: string): void {
    if (this.currentState === state) return // 防止重复切换
    this.states[this.currentState]?.exit()
    this.currentState = state
    this.stateTime = 0
    this.frameTimer = 0
    this.frameIndex = 0
    this.states[this.currentState]?.enter()
  }

  private setSprites(frames: SpriteFrame[]): void {
    this.currentFrames = frames
    this.frameIndex = 0
    this.currentFrame = frames[0]
    this.frameTimer = 0
  }

  // ---- 输入处理 ----

  private setupInput(): void {
    // 鼠标移动：拖拽中移动窗口，否则检测悬停
    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseLocalX = e.clientX
      this.mouseLocalY = e.clientY

      // 拖拽中移动窗口
      if (this.isDragging) return

      // 扩大响应范围：宠物周围 20px 内都能接收点击
      const padding = 20
      const onPet =
        e.clientX >= this.position.x - padding && e.clientX <= this.position.x + DRAW_SIZE + padding &&
        e.clientY >= this.position.y - padding && e.clientY <= this.position.y + DRAW_SIZE + padding

      if (onPet && !this.isIgnoreMode) {
        // 已经在接收，不重复设置
      } else if (onPet && this.isIgnoreMode) {
        this.petAPI.setIgnoreMouseEvents(false)
        this.isIgnoreMode = false
      } else if (!onPet && !this.isIgnoreMode) {
        this.petAPI.setIgnoreMouseEvents(true, { forward: true })
        this.isIgnoreMode = true
      }

      this.isMouseOnPet = onPet
    })

    // 鼠标按下：记录拖拽起点
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.isMouseOnPet) return
      this.lastInteractionTime = Date.now()

      // 记录点击位置相对于宠物中心的偏移
      this.dragOffsetX = e.clientX
      this.dragOffsetY = e.clientY
      this.dragStartX = e.clientX
      this.dragStartY = e.clientY
    })

    // 右键放置零食：在宠物面前随机位置
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      if (this.isDragging) return

      // 在宠物前方 40-80px 范围内随机放零食
      const dir = this.facingRight ? 1 : -1
      const offsetX = dir * this.randomRange(40, 80)
      const offsetY = this.randomRange(-20, 20)
      const tx = Math.max(DRAW_SIZE / 2, Math.min(WINDOW_SIZE - DRAW_SIZE / 2,
        this.position.x + DRAW_SIZE / 2 + offsetX))
      const ty = Math.max(DRAW_SIZE / 2, Math.min(WINDOW_SIZE - DRAW_SIZE / 2,
        this.position.y + DRAW_SIZE / 2 + offsetY))

      this.treat = { x: tx, y: ty }
      this.treatBounce = 0

      // 如果宠物在闲逛或坐着，立即去吃
      if (this.currentState === 'IDLE' || this.currentState === 'SIT' || this.currentState === 'WANDER') {
        this.setState('TREAT')
      }
    })

    // 全局鼠标移动：检测是否开始拖拽
    window.addEventListener('mousemove', (e) => {
      if (this.dragStartX === 0 && this.dragStartY === 0) return

      const dx = e.clientX - this.dragStartX
      const dy = e.clientY - this.dragStartY
      if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) {
        // 开始拖拽
        this.isDragging = true
        this.petAPI.setIgnoreMouseEvents(false) // 拖拽期间接收所有事件
      }
    })

    // 全局鼠标释放：结束拖拽或触发点击
    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        // 结束拖拽，宠物坐下
        this.isDragging = false
        this.setState('SIT')
        this.petAPI.setIgnoreMouseEvents(true, { forward: true })
        this.isIgnoreMode = true
      } else if (this.dragStartX !== 0 || this.dragStartY !== 0) {
        // 没有拖拽 → 这是一次点击
        this.handleClick()
      }
      this.dragStartX = 0
      this.dragStartY = 0
    })

    this.petAPI.setIgnoreMouseEvents(true, { forward: true })
  }

  private handleClick(): void {
    const now = Date.now()
    if (now - this.lastClickTime < 500) {
      this.clickCount++
    } else {
      this.clickCount = 1
    }
    this.lastClickTime = now

    if (this.clickCount >= 3 && this.currentState === 'HAPPY') {
      this.setState('ANGRY')
      this.clickCount = 0
      return
    }

    if (this.currentState === 'SLEEP') {
      this.setState('ANGRY')
      return
    }

    if (this.currentState !== 'ANGRY' && this.currentState !== 'DODGE') {
      this.setState('PETTED')
    }
  }

  private isMouseNear(radius: number): boolean {
    const cx = this.position.x + DRAW_SIZE / 2
    const cy = this.position.y + DRAW_SIZE / 2
    const dx = this.mouseLocalX - cx
    const dy = this.mouseLocalY - cy
    return Math.sqrt(dx * dx + dy * dy) < radius
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min)
  }
}
