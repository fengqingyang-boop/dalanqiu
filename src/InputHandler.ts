import * as THREE from 'three'
import Player from './Player'

class InputHandler {
  private domElement: HTMLElement
  private player: Player

  private keys: { [key: string]: boolean } = {}
  private pointerLocked: boolean = false
  private lastMoveDirection: THREE.Vector3 = new THREE.Vector3()
  private moveSpeed: number = 0
  private isMoving: boolean = false

  constructor(
    domElement: HTMLElement,
    _camera: THREE.PerspectiveCamera,
    player: Player
  ) {
    this.domElement = domElement
    this.player = player

    this.setupEventListeners()
  }

  private setupEventListeners() {
    // 键盘事件
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true
      if (e.key === ' ') {
        e.preventDefault()
      }
    })

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false
    })

    // 鼠标移动 - 指针锁定时控制视角
    document.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) {
        const deltaX = e.movementX || (e as any).mozMovementX || (e as any).webkitMovementX || 0
        const deltaY = e.movementY || (e as any).mozMovementY || (e as any).webkitMovementY || 0
        this.player.rotateCamera(deltaX, deltaY)
      }
    })

    // 点击游戏区域进入指针锁定
    this.domElement.addEventListener('click', () => {
      if (!this.pointerLocked) {
        this.domElement.requestPointerLock()
      }
    })

    // 指针锁定状态变化
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.domElement
    })
  }

  isKeyPressed(key: string): boolean {
    return this.keys[key.toLowerCase()] === true
  }

  isPointerLocked(): boolean {
    return this.pointerLocked
  }

  getLastMoveDirection(): THREE.Vector3 {
    return this.lastMoveDirection.clone()
  }

  getMoveSpeed(): number {
    return this.moveSpeed
  }

  isPlayerMoving(): boolean {
    return this.isMoving
  }

  update(dt: number) {
    let moveX = 0
    let moveZ = 0

    if (this.isKeyPressed('w')) moveZ -= 1
    if (this.isKeyPressed('s')) moveZ += 1
    if (this.isKeyPressed('a')) moveX -= 1
    if (this.isKeyPressed('d')) moveX += 1

    this.isMoving = moveX !== 0 || moveZ !== 0

    if (this.isMoving) {
      const direction = new THREE.Vector3(moveX, 0, moveZ)
      direction.normalize()

      this.lastMoveDirection = direction.clone()
      this.moveSpeed = 8

      const rotationY = this.player.getRotationY()
      const cos = Math.cos(rotationY)
      const sin = Math.sin(rotationY)

      const rotatedX = direction.x * cos - direction.z * sin
      const rotatedZ = direction.x * sin + direction.z * cos

      const worldDirection = new THREE.Vector3(rotatedX, 0, rotatedZ)
      this.player.move(worldDirection, dt)
    } else {
      this.moveSpeed = 0
    }
  }
}

export default InputHandler
