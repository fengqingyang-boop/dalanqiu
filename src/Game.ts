import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'
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

    this.sceneManager = new SceneManager(this.scene, this.physicsWorld, RAP)
    this.sceneManager.createCourt()

    const hoopPosition = new THREE.Vector3(0, 0, -COURT_LENGTH / 2 + 1)
    this.hoop = new Hoop(this.scene, this.physicsWorld, RAP, hoopPosition)

    this.basketball = new Basketball(this.scene, this.physicsWorld, RAP)

    this.player = new Player(this.scene, this.physicsWorld, RAP, this.camera)

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

    this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e))
    window.addEventListener('mouseup', (e) => this.onMouseUp(e))
    window.addEventListener('mousemove', (e) => this.onMouseMove(e))

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
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button !== 0 || this.gameState !== 'aiming') return
    
    this.shootBall()
    
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

  private onKeyUp(_e: KeyboardEvent) {}

  private dribbleBall() {
    if (!this.basketball || !this.player) return
    
    const handPos = this.player.getHandPosition()
    
    this.ballInHand = false
    this.player.playDribbleAnimation()
    
    this.basketball.setPosition(new THREE.Vector3(handPos.x, handPos.y - 0.2, handPos.z))
    this.basketball.dribbleForceUp()
    
    setTimeout(() => {
      this.checkAutoPickup()
    }, 800)
  }

  private checkAutoPickup() {
    if (this.ballInHand || !this.basketball || !this.player) return
    
    const ballPos = this.basketball.getPosition()
    const ballVel = this.basketball.getVelocity()
    const speed = Math.sqrt(ballVel.x * ballVel.x + ballVel.y * ballVel.y + ballVel.z * ballVel.z)
    
    if (ballVel.y < 0 && ballPos.y < 1.5) {
      setTimeout(() => {
        this.ballInHand = true
        this.player.resetAnimation()
      }, 200)
    } else if (speed < 2) {
      this.ballInHand = true
      this.player.resetAnimation()
    } else {
      setTimeout(() => {
        this.checkAutoPickup()
      }, 200)
    }
  }

  private shootBall() {
    if (!this.ballInHand || !this.basketball || !this.player) return

    this.gameState = 'shooting'
    this.ballInHand = false
    this.player.playShootAnimation()

    const minPower = 8
    const maxPower = 25
    const shootPower = minPower + (this.power / 100) * (maxPower - minPower)

    const cameraDirection = new THREE.Vector3()
    this.camera.getWorldDirection(cameraDirection)
    cameraDirection.y = 0
    cameraDirection.normalize()

    const rotationMatrix = new THREE.Matrix4()
    rotationMatrix.makeRotationY(this.aimAngle)
    cameraDirection.applyMatrix4(rotationMatrix)

    const baseVertical = 0.4 + this.aimVertical
    const direction = new THREE.Vector3(
      cameraDirection.x,
      baseVertical,
      cameraDirection.z
    ).normalize()

    const velocity = direction.multiplyScalar(shootPower)
    
    if (this.inputHandler.isPlayerMoving()) {
      const moveDir = this.inputHandler.getLastMoveDirection()
      const rotationY = this.player.getRotationY()
      const cos = Math.cos(rotationY)
      const sin = Math.sin(rotationY)
      const worldMoveDir = new THREE.Vector3(
        moveDir.x * cos - moveDir.z * sin,
        0,
        moveDir.x * sin + moveDir.z * cos
      )
      velocity.add(worldMoveDir.multiplyScalar(3))
    }
    
    velocity.x += (Math.random() - 0.5) * 0.5
    velocity.z += (Math.random() - 0.5) * 0.5

    this.basketball.shoot(velocity, this.player.getHandPosition())

    setTimeout(() => {
      this.gameState = 'playing'
      this.player.resetAnimation()
    }, 500)

    setTimeout(() => {
      this.checkForScore()
    }, 2000)
  }

  private performDunk() {
    if (!this.canDunk || !this.ballInHand || !this.player || !this.basketball || !this.hoop) return

    this.gameState = 'dunking'
    this.ballInHand = false
    this.canDunk = false
    this.player.playDunkAnimation()

    if (this.dunkHint) {
      this.dunkHint.style.display = 'none'
    }

    const hoopPos = this.hoop.getRimCenter()
    const dunkPosition = new THREE.Vector3(hoopPos.x, hoopPos.y - 0.5, hoopPos.z)
    this.basketball.dunk(dunkPosition)

    this.addScore(2)

    setTimeout(() => {
      this.gameState = 'playing'
      this.player.resetAnimation()
    }, 1000)
  }

  private checkForScore() {
    if (this.basketball && this.hoop) {
      const ballPos = this.basketball.getPosition()
      const rimCenter = this.hoop.getRimCenter()
      
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

    this.physicsWorld.timestep = dt
    this.physicsWorld.step()

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

    this.inputHandler.update(dt)
    this.updatePowerBar()
    this.checkDunkRange()
    this.updateBallInHand()
    this.checkBallPickup()
    this.updatePhysics(dt)
    this.render()
  }
}

export default Game
