import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'

const BALL_RADIUS = 0.12
const BALL_MASS = 0.62
const BALL_FRICTION = 0.3
const BALL_RESTITUTION = 0.85
const BALL_DENSITY = 0.62 / ((4 / 3) * Math.PI * Math.pow(BALL_RADIUS, 3))
const DRIBBLE_FORCE = 6

class Basketball {
  private scene: THREE.Scene
  private physicsWorld: RAPIER.World
  private RAPIER: typeof RAPIER

  private mesh!: THREE.Mesh
  private rigidBody!: RAPIER.RigidBody
  private collider!: RAPIER.Collider

  constructor(
    scene: THREE.Scene,
    physicsWorld: RAPIER.World,
    RAPIER: typeof RAPIER
  ) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.RAPIER = RAPIER

    this.createMesh()
    this.createPhysics()
  }

  private createMesh() {
    // 创建篮球纹理
    const texture = this.createBasketballTexture()
    
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32)
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.1
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.mesh.position.set(0, 1.5, 3)
    this.scene.add(this.mesh)
  }

  private createBasketballTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    // 篮球橙色背景
    ctx.fillStyle = '#d2691e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 添加一些纹理变化
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const radius = Math.random() * 3 + 1
      
      const alpha = Math.random() * 0.3
      ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // 篮球黑线
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 4

    // 环绕球体的黑线
    const centerY = canvas.height / 2
    
    // 赤道线
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(canvas.width, centerY)
    ctx.stroke()

    // 连接的弧线
    const arcWidth = canvas.width / 8
    
    // 左右两侧的弧线
    for (let side = 0; side < 2; side++) {
      const xOffset = side === 0 ? arcWidth * 2 : canvas.width - arcWidth * 2
      
      // 上弧线
      ctx.beginPath()
      ctx.moveTo(xOffset, 0)
      ctx.quadraticCurveTo(xOffset + arcWidth, centerY / 2, xOffset, centerY)
      ctx.stroke()

      // 下弧线
      ctx.beginPath()
      ctx.moveTo(xOffset, centerY)
      ctx.quadraticCurveTo(xOffset + arcWidth, centerY * 1.5, xOffset, canvas.height)
      ctx.stroke()
    }

    // 中间的连接弧线
    const centerX = canvas.width / 2
    
    // 左上到右下的弧线
    ctx.beginPath()
    ctx.moveTo(centerX - arcWidth, 0)
    ctx.bezierCurveTo(
      centerX, centerY * 0.3,
      centerX, centerY * 0.7,
      centerX + arcWidth, canvas.height
    )
    ctx.stroke()

    // 右上到左下的弧线
    ctx.beginPath()
    ctx.moveTo(centerX + arcWidth, 0)
    ctx.bezierCurveTo(
      centerX, centerY * 0.3,
      centerX, centerY * 0.7,
      centerX - arcWidth, canvas.height
    )
    ctx.stroke()

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }

  private createPhysics() {
    // 动态刚体
    const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
    bodyDesc.setTranslation(0, 1.5, 3)
    this.rigidBody = this.physicsWorld.createRigidBody(bodyDesc)

    // 球体碰撞体
    const colliderDesc = this.RAPIER.ColliderDesc.ball(BALL_RADIUS)
    colliderDesc.setMass(BALL_MASS)
    colliderDesc.setFriction(BALL_FRICTION)
    colliderDesc.setRestitution(BALL_RESTITUTION)
    this.collider = this.physicsWorld.createCollider(colliderDesc, this.rigidBody)
  }

  update() {
    // 同步物理位置到渲染网格
    const translation = this.rigidBody.translation()
    const rotation = this.rigidBody.rotation()

    this.mesh.position.set(translation.x, translation.y, translation.z)
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
  }

  shoot(velocity: THREE.Vector3, fromPosition: THREE.Vector3) {
    // 移动到指定位置
    this.rigidBody.setTranslation(
      { x: fromPosition.x, y: fromPosition.y, z: fromPosition.z },
      true
    )

    // 设置速度
    this.rigidBody.setLinvel(
      { x: velocity.x, y: velocity.y, z: velocity.z },
      true
    )

    // 添加一点旋转
    const angularVel = {
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10
    }
    this.rigidBody.setAngvel(angularVel, true)
  }

  dribble() {
    const currentVel = this.rigidBody.linvel()
    
    // 如果球在向下运动或静止，给予向上的力
    if (currentVel.y <= 2) {
      this.rigidBody.setLinvel(
        { x: currentVel.x, y: DRIBBLE_FORCE, z: currentVel.z },
        true
      )
      
      // 拍球时加入一点旋转
      this.rigidBody.setAngvel(
        {
          x: (Math.random() - 0.5) * 5,
          y: (Math.random() - 0.5) * 10,
          z: (Math.random() - 0.5) * 5
        },
        true
      )
    }
  }

  dunk(dunkPosition: THREE.Vector3) {
    // 扣篮：瞬间移动到篮筐并大力砸下
    this.rigidBody.setTranslation(
      { x: dunkPosition.x, y: dunkPosition.y, z: dunkPosition.z },
      true
    )

    // 向下大力扣篮
    this.rigidBody.setLinvel(
      { x: 0, y: -15, z: 0 },
      true
    )

    // 大力旋转
    this.rigidBody.setAngvel(
      {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20
      },
      true
    )
  }

  setPosition(position: THREE.Vector3) {
    this.rigidBody.setTranslation(
      { x: position.x, y: position.y, z: position.z },
      true
    )
    this.mesh.position.copy(position)
  }

  resetVelocity() {
    this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  getPosition(): THREE.Vector3 {
    const translation = this.rigidBody.translation()
    return new THREE.Vector3(translation.x, translation.y, translation.z)
  }

  getVelocity(): THREE.Vector3 {
    const linvel = this.rigidBody.linvel()
    return new THREE.Vector3(linvel.x, linvel.y, linvel.z)
  }
}

export default Basketball
