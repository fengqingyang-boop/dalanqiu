import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import Player from './Player'
import Basketball from './Basketball'
import Hoop from './Hoop'
import SceneManager from './SceneManager'
import InputHandler from './InputHandler'
import UIController from './UIController'

const COURT_LENGTH = 28
const COURT_WIDTH = 15
const COURT_HEIGHT = 0.1

class Game {
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private clock!: THREE.Clock
  private player!: Player
  private basketball!: Basketball
  private hoop!: Hoop
  private sceneManager!: SceneManager
  private inputHandler!: InputHandler
  private uiController!: UIController
  
  private physicsWorld!: RAPIER.World
  private rapierInitialized = false
  
  private gameState: 'idle' | 'aiming' | 'shooting' | 'dunking' | 'playing' = 'playing'
  private power: number = 0
  private powerDirection: number = 1
  private aimAngle: number = 0
  private aimVertical: number = 0
  
  private score: number = 0
  private lastScoreTime: number = 0
  private canDunk: boolean = false
  private ballInHand: boolean = true
  private scoreDisplay: HTMLElement | null = null
  private powerBarContainer: HTMLElement | null = null
  private powerBar: HTMLElement | null = null
  private dunkHint: HTMLElement | null = null
  private aimIndicator: HTMLElement | null = null

  public initRAPIER: typeof RAPIER | null = null

  constructor() {}

  async init() {
    await this.initPhysics()
    this.initThree()
    this.initGameObjects()
    this.initControls()
    this.setupEventListeners()
  }

  private async initPhysics() {
    const RAP = await import('@dimforge/rapier3d-compat')
    await RAP.init()
    this.initRAPIER = RAP
    
    const gravity = { x: 0.0, y: -9.81, z: 0.0 }
    this.physicsWorld = new RAP.World(gravity)
    this.rapierInitialized = true
  }

  private initThree() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150)

    const container = document.getElementById('game-container')
    if (!container) throw new Error('Game container not found')

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 2, 5)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    container.appendChild(this.renderer.domElement)

    this.clock = new THREE.Clock()

    this.scoreDisplay = document.getElementById('score')
    this.powerBarContainer = document.getElementById('power-bar-container')
    this.powerBar = document.getElementById('power-bar')
    this.dunkHint = document.getElementById('dunk-hint')
    this.aimIndicator = document.getElementById('aim-indicator')
  }

  private initGameObjects() {
    if (!this.initRAPIER) return

    const RAP = this.initRAPIER

    // 场景管理（灯光、地面等）
    this.sceneManager = new SceneManager(this.scene, this.physicsWorld, RAP)
    this.sceneManager.createCourt()

    // 篮筐（设置在球场远端）
    const hoopPosition = new THREE.Vector3(0, 0, -COURT_LENGTH / 2 + 1)
    this.hoop = new Hoop(this.scene, this.physicsWorld, RAP, hoopPosition)

    // 篮球
    this.basketball = new Basketball(this.scene, this.physicsWorld, RAP)

    // 玩家
    this.player = new Player(this.scene, this.physicsWorld, RAP, this.camera)

    // UI控制器
    this.uiController = new UIController()
  }

  private initControls() {
    this.inputHandler = new InputHandler(
      this.renderer.domElement,
      this.camera,
      this.player
    )
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize())

    // 鼠标事件
    this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e))
    window.addEventListener('mouseup', (e) => this.onMouseUp(e))
    window.addEventListener('mousemove', (e) => this.onMouseMove(e))

    // 键盘事件
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button !== 0 || !this.ballInHand || this.gameState !== 'playing') return
    
    this.gameState = 'aiming'
    this.power = 0
    this.powerDirection = 1
    this.aimAngle = 0
    this.aimVertical = 0

    if (this.powerBarContainer) {
      this.powerBarContainer.style.display = 'block'
    }
    if (this.aimIndicator) {
      this.aimIndicator.style.display = 'block'
    }
    
    this.inputHandler.lockMouse()
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button !== 0 || this.gameState !== 'aiming') return
    
    this.shootBall()
    this.inputHandler.unlockMouse()
    
    if (this.powerBarContainer) {
      this.powerBarContainer.style.display = 'none'
    }
    if (this.aimIndicator) {
      this.aimIndicator.style.display = 'none'
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (this.gameState === 'aiming') {
      const sensitivity = 0.003
      this.aimAngle -= e.movementX * sensitivity
      this.aimVertical -= e.movementY * sensitivity
      
      this.aimVertical = Math.max(-0.5, Math.min(0.8, this.aimVertical))
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase()

    if (key === ' ' && this.ballInHand && this.gameState === 'playing') {
      e.preventDefault()
      this.dribbleBall()
    }

    if (key === 'q' && this.canDunk && this.ballInHand && this.gameState === 'playing') {
      this.performDunk()
    }
  }

  private onKeyUp(_e: KeyboardEvent) {
    // 可以处理按键释放的逻辑
  }

  private dribbleBall() {
    if (!this.basketball) return
    this.basketball.dribble()
  }

  private shootBall() {
    if (!this.ballInHand || !this.basketball) return

    this.gameState = 'shooting'
    this.ballInHand = false

    // 计算投篮力
    const minPower = 8
    const maxPower = 25
    const shootPower = minPower + (this.power / 100) * (maxPower - minPower)

    // 计算方向
    const cameraDirection = new THREE.Vector3()
    this.camera.getWorldDirection(cameraDirection)
    cameraDirection.y = 0
    cameraDirection.normalize()

    // 应用瞄准角度
    const rotationMatrix = new THREE.Matrix4()
    rotationMatrix.makeRotationY(this.aimAngle)
    cameraDirection.applyMatrix4(rotationMatrix)

    // 垂直角度
    const baseVertical = 0.4 + this.aimVertical
    const direction = new THREE.Vector3(
      cameraDirection.x,
      baseVertical,
      cameraDirection.z
    ).normalize()

    const velocity = direction.multiplyScalar(shootPower)
    
    // 添加一点随机偏移，增加真实感
    velocity.x += (Math.random() - 0.5) * 0.5
    velocity.z += (Math.random() - 0.5) * 0.5

    this.basketball.shoot(velocity, this.player.getPosition())

    // 重置游戏状态
    setTimeout(() => {
      this.gameState = 'playing'
    }, 500)

    // 检查是否进球
    setTimeout(() => {
      this.checkForScore()
    }, 2000)
  }

  private performDunk() {
    if (!this.canDunk || !this.ballInHand) return

    this.gameState = 'dunking'
    this.ballInHand = false
    this.canDunk = false

    if (this.dunkHint) {
      this.dunkHint.style.display = 'none'
    }

    // 扣篮动画
    const ballPos = this.basketball.getPosition()
    const hoopPos = this.hoop.getRimCenter()

    // 瞬间把球移动到篮筐并赋予向下速度
    const dunkPosition = new THREE.Vector3(hoopPos.x, hoopPos.y - 0.5, hoopPos.z)
    this.basketball.dunk(dunkPosition)

    // 得分
    this.addScore(2)

    // 恢复游戏状态
    setTimeout(() => {
      this.gameState = 'playing'
    }, 1000)
  }

  private checkForScore() {
    if (this.basketball && this.hoop) {
      const ballPos = this.basketball.getPosition()
      const rimCenter = this.hoop.getRimCenter()
      
      // 简单的进球检测：球在篮筐中心一定范围内且向下运动
      const horizontalDist = Math.sqrt(
        Math.pow(ballPos.x - rimCenter.x, 2) + 
        Math.pow(ballPos.z - rimCenter.z, 2)
      )
      
      const ballVel = this.basketball.getVelocity()
      
      if (horizontalDist < 0.5 && ballVel.y < 0 && ballPos.y > rimCenter.y - 0.5) {
        this.addScore(2)
      }
    }
  }

  private addScore(points: number) {
    const currentTime = Date.now()
    if (currentTime - this.lastScoreTime < 1000) return

    this.score += points
    this.lastScoreTime = currentTime
    
    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = this.score.toString()
      this.uiController.showScoreEffect(points)
    }
  }

  private checkDunkRange() {
    if (!this.player || !this.hoop) return

    const playerPos = this.player.getPosition()
    const rimCenter = this.hoop.getRimCenter()

    const distance = Math.sqrt(
      Math.pow(playerPos.x - rimCenter.x, 2) + 
      Math.pow(playerPos.z - rimCenter.z, 2)
    )

    const wasNear = this.canDunk
    this.canDunk = distance < 3 && this.ballInHand && this.gameState === 'playing'

    if (this.dunkHint) {
      if (this.canDunk && !wasNear) {
        this.dunkHint.style.display = 'block'
      } else if (!this.canDunk && wasNear) {
        this.dunkHint.style.display = 'none'
      }
    }
  }

  private updatePowerBar() {
    if (this.gameState !== 'aiming') return

    this.power += this.powerDirection * 2
    
    if (this.power >= 100) {
      this.power = 100
      this.powerDirection = -1
    } else if (this.power <= 0) {
      this.power = 0
      this.powerDirection = 1
    }

    if (this.powerBar) {
      this.powerBar.style.width = this.power + '%'
    }
  }

  private updateBallInHand() {
    if (this.ballInHand && this.basketball && this.player) {
      const handPos = this.player.getHandPosition()
      this.basketball.setPosition(handPos)
      this.basketball.resetVelocity()
    }
  }

  private checkBallPickup() {
    if (this.ballInHand || !this.basketball || !this.player) return

    const ballPos = this.basketball.getPosition()
    const playerPos = this.player.getPosition()

    const distance = Math.sqrt(
      Math.pow(ballPos.x - playerPos.x, 2) + 
      Math.pow(ballPos.z - playerPos.z, 2)
    )

    const ballVel = this.basketball.getVelocity()
    const speed = Math.sqrt(ballVel.x * ballVel.x + ballVel.y * ballVel.y + ballVel.z * ballVel.z)

    if (distance < 1.5 && speed < 5) {
      this.ballInHand = true
    }
  }

  private updatePhysics(dt: number) {
    if (!this.rapierInitialized) return

    // 物理世界步进
    this.physicsWorld.timestep = dt
    this.physicsWorld.step()

    // 更新物体位置
    if (this.basketball && !this.ballInHand) {
      this.basketball.update()
    }
    if (this.player) {
      this.player.update(dt)
    }
  }

  private render() {
    this.renderer.render(this.scene, this.camera)
  }

  start() {
    this.renderer.setAnimationLoop(() => this.gameLoop())
  }

  private gameLoop() {
    const dt = Math.min(this.clock.getDelta(), 0.05)

    // 更新输入
    this.inputHandler.update(dt)

    // 更新蓄力条
    this.updatePowerBar()

    // 检查扣篮范围
    this.checkDunkRange()

    // 更新持球状态
    this.updateBallInHand()

    // 检查捡球
    this.checkBallPickup()

    // 物理更新
    this.updatePhysics(dt)

    // 渲染
    this.render()
  }
}

export default Game
