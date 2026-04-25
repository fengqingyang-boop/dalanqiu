import * as THREE from 'three'
import Player from './Player'

class InputHandler {
  private domElement: HTMLElement
  private camera: THREE.PerspectiveCamera
  private player: Player

  private keys: { [key: string]: boolean } = {}
  private mouseLocked: boolean = false
  private lastMouseX: number = 0
  private lastMouseY: number = 0

  constructor(
    domElement: HTMLElement,
    camera: THREE.PerspectiveCamera,
    player: Player
  ) {
    this.domElement = domElement
    this.camera = camera
    this.player = player

    this.setupEventListeners()
  }

  private setupEventListeners() {
    // 键盘事件
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true
    })

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false
    })

    // 鼠标移动（只有在锁定时使用）
    document.addEventListener('mousemove', (e) => {
      if (this.mouseLocked) {
        const deltaX = e.movementX || (e as any).mozMovementX || (e as any).webkitMovementX || 0
        const deltaY = e.movementY || (e as any).mozMovementY || (e as any).webkitMovementY || 0
        
        this.player.rotateCamera(deltaX, deltaY)
      }
    })

    // 指针锁定变更
    document.addEventListener('pointerlockchange', () => {
      this.mouseLocked = document.pointerLockElement === this.domElement
    })
  }

  lockMouse() {
    if (!this.mouseLocked) {
      this.domElement.requestPointerLock()
    }
  }

  unlockMouse() {
    if (this.mouseLocked) {
      document.exitPointerLock()
    }
  }

  isKeyPressed(key: string): boolean {
    return this.keys[key.toLowerCase()] === true
  }

  update(dt: number) {
    // 计算移动方向
    let moveX = 0
    let moveZ = 0

    if (this.isKeyPressed('w')) moveZ -= 1
    if (this.isKeyPressed('s')) moveZ += 1
    if (this.isKeyPressed('a')) moveX -= 1
    if (this.isKeyPressed('d')) moveX += 1

    // 如果有移动
    if (moveX !== 0 || moveZ !== 0) {
      // 标准化方向向量
      const direction = new THREE.Vector3(moveX, 0, moveZ)
      direction.normalize()

      // 根据玩家旋转方向调整移动方向
      const rotationY = this.player.getRotationY()
      
      const cos = Math.cos(rotationY)
      const sin = Math.sin(rotationY)

      const rotatedX = direction.x * cos - direction.z * sin
      const rotatedZ = direction.x * sin + direction.z * cos

      const worldDirection = new THREE.Vector3(rotatedX, 0, rotatedZ)

      // 移动玩家
      this.player.move(worldDirection, dt)
    }
  }
}

export default InputHandler
