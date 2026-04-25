import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'

const RIM_RADIUS = 0.23
const RIM_HEIGHT = 3.05
const RIM_THICKNESS = 0.02
const BACKBOARD_WIDTH = 1.8
const BACKBOARD_HEIGHT = 1.05
const BACKBOARD_THICKNESS = 0.03

class Hoop {
  private scene: THREE.Scene
  private physicsWorld: RAPIER.World
  private RAPIER: typeof RAPIER
  private position: THREE.Vector3

  private rimCenter: THREE.Vector3

  constructor(
    scene: THREE.Scene,
    physicsWorld: RAPIER.World,
    RAPIER: typeof RAPIER,
    position: THREE.Vector3
  ) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.RAPIER = RAPIER
    this.position = position

    // 篮筐中心在篮板前方
    this.rimCenter = new THREE.Vector3(
      position.x,
      position.y + RIM_HEIGHT,
      position.z + 0.3
    )

    this.createBackboard()
    this.createRim()
    this.createSupport()
    this.createNet()
  }

  private createBackboard() {
    // 篮板材质
    const backboardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.5
    })

    // 篮板主体
    const backboardGeometry = new THREE.BoxGeometry(
      BACKBOARD_WIDTH,
      BACKBOARD_HEIGHT,
      BACKBOARD_THICKNESS
    )
    const backboard = new THREE.Mesh(backboardGeometry, backboardMaterial)
    backboard.position.set(
      this.position.x,
      this.position.y + RIM_HEIGHT + 0.15,
      this.position.z
    )
    backboard.castShadow = true
    backboard.receiveShadow = true
    this.scene.add(backboard)

    // 篮板上的瞄准框（黑色方框）
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.8
    })
    const frameWidth = 0.59
    const frameHeight = 0.45

    // 框线
    const lineThickness = 0.01
    const lines = [
      // 上边框
      { w: frameWidth, h: lineThickness, d: BACKBOARD_THICKNESS + 0.001, pos: [0, frameHeight / 2, 0] },
      // 下边框
      { w: frameWidth, h: lineThickness, d: BACKBOARD_THICKNESS + 0.001, pos: [0, -frameHeight / 2, 0] },
      // 左边框
      { w: lineThickness, h: frameHeight, d: BACKBOARD_THICKNESS + 0.001, pos: [-frameWidth / 2, 0, 0] },
      // 右边框
      { w: lineThickness, h: frameHeight, d: BACKBOARD_THICKNESS + 0.001, pos: [frameWidth / 2, 0, 0] }
    ]

    lines.forEach(line => {
      const geometry = new THREE.BoxGeometry(line.w, line.h, line.d)
      const mesh = new THREE.Mesh(geometry, frameMaterial)
      mesh.position.set(
        this.position.x + line.pos[0],
        this.position.y + RIM_HEIGHT + 0.15 + line.pos[1],
        this.position.z
      )
      this.scene.add(mesh)
    })

    // 篮板边框（黑色边框）
    const borderMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.8
    })
    const borderThickness = 0.02

    const borders = [
      // 上边框
      { w: BACKBOARD_WIDTH + borderThickness, h: borderThickness, d: BACKBOARD_THICKNESS, pos: [0, BACKBOARD_HEIGHT / 2 + borderThickness / 2, 0] },
      // 下边框
      { w: BACKBOARD_WIDTH + borderThickness, h: borderThickness, d: BACKBOARD_THICKNESS, pos: [0, -BACKBOARD_HEIGHT / 2 - borderThickness / 2, 0] },
      // 左边框
      { w: borderThickness, h: BACKBOARD_HEIGHT, d: BACKBOARD_THICKNESS, pos: [-BACKBOARD_WIDTH / 2 - borderThickness / 2, 0, 0] },
      // 右边框
      { w: borderThickness, h: BACKBOARD_HEIGHT, d: BACKBOARD_THICKNESS, pos: [BACKBOARD_WIDTH / 2 + borderThickness / 2, 0, 0] }
    ]

    borders.forEach(border => {
      const geometry = new THREE.BoxGeometry(border.w, border.h, border.d)
      const mesh = new THREE.Mesh(geometry, borderMaterial)
      mesh.position.set(
        this.position.x + border.pos[0],
        this.position.y + RIM_HEIGHT + 0.15 + border.pos[1],
        this.position.z
      )
      this.scene.add(mesh)
    })

    // 物理篮板
    const bodyDesc = this.RAPIER.RigidBodyDesc.fixed()
    const body = this.physicsWorld.createRigidBody(bodyDesc)

    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(
      BACKBOARD_WIDTH / 2,
      BACKBOARD_HEIGHT / 2,
      BACKBOARD_THICKNESS / 2
    )
    colliderDesc.setTranslation(
      this.position.x,
      this.position.y + RIM_HEIGHT + 0.15,
      this.position.z
    )
    colliderDesc.setFriction(0.3)
    colliderDesc.setRestitution(0.6)
    this.physicsWorld.createCollider(colliderDesc, body)
  }

  private createRim() {
    // 篮圈材质（橙色）
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      roughness: 0.4,
      metalness: 0.7
    })

    // 创建圆形篮圈（使用圆环几何体）
    const rimGeometry = new THREE.TorusGeometry(RIM_RADIUS, RIM_THICKNESS, 8, 32)
    const rim = new THREE.Mesh(rimGeometry, rimMaterial)
    rim.position.set(
      this.rimCenter.x,
      this.rimCenter.y,
      this.rimCenter.z
    )
    rim.rotation.x = Math.PI / 2
    rim.castShadow = true
    this.scene.add(rim)

    // 连接篮圈和篮板的支架
    const bracketMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.6,
      metalness: 0.5
    })

    // 主支架
    const mainBracketGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8)
    const mainBracket = new THREE.Mesh(mainBracketGeometry, bracketMaterial)
    mainBracket.position.set(
      this.position.x,
      this.rimCenter.y,
      this.position.z + 0.15
    )
    mainBracket.rotation.x = Math.PI / 2
    mainBracket.castShadow = true
    this.scene.add(mainBracket)

    // 侧支架
    const sideBracketPositions = [
      { x: -RIM_RADIUS * 0.8, z: this.rimCenter.z - 0.05 },
      { x: RIM_RADIUS * 0.8, z: this.rimCenter.z - 0.05 }
    ]

    sideBracketPositions.forEach(pos => {
      const sideBracketGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8)
      const sideBracket = new THREE.Mesh(sideBracketGeometry, bracketMaterial)
      sideBracket.position.set(pos.x, this.rimCenter.y, this.position.z + 0.12)
      sideBracket.rotation.x = Math.PI / 3
      sideBracket.castShadow = true
      this.scene.add(sideBracket)
    })

    // 物理篮圈（用多个小圆柱体模拟）
    const bodyDesc = this.RAPIER.RigidBodyDesc.fixed()
    const body = this.physicsWorld.createRigidBody(bodyDesc)

    // 创建多个小碰撞体组成圆形篮圈
    const segments = 16
    const angleStep = (Math.PI * 2) / segments

    for (let i = 0; i < segments; i++) {
      const angle1 = i * angleStep
      const angle2 = (i + 1) * angleStep

      const x1 = Math.cos(angle1) * RIM_RADIUS
      const z1 = Math.sin(angle1) * RIM_RADIUS
      const x2 = Math.cos(angle2) * RIM_RADIUS
      const z2 = Math.sin(angle2) * RIM_RADIUS

      const dx = x2 - x1
      const dz = z2 - z1
      const length = Math.sqrt(dx * dx + dz * dz)

      const midX = (x1 + x2) / 2 + this.rimCenter.x
      const midZ = (z1 + z2) / 2 + this.rimCenter.z

      const colliderDesc = this.RAPIER.ColliderDesc.cylinder(
        length / 2,
        RIM_THICKNESS
      )
      colliderDesc.setTranslation(midX, this.rimCenter.y, midZ)
      colliderDesc.setFriction(0.3)
      colliderDesc.setRestitution(0.5)
      this.physicsWorld.createCollider(colliderDesc, body)
    }
  }

  private createSupport() {
    // 支架材质
    const supportMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.7,
      metalness: 0.4
    })

    // 主支柱
    const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 4, 16)
    const pole = new THREE.Mesh(poleGeometry, supportMaterial)
    pole.position.set(
      this.position.x,
      this.position.y + 2,
      this.position.z - 1
    )
    pole.castShadow = true
    this.scene.add(pole)

    // 连接篮板的横臂
    const armGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.2)
    const arm = new THREE.Mesh(armGeometry, supportMaterial)
    arm.position.set(
      this.position.x,
      this.position.y + RIM_HEIGHT + 0.5,
      this.position.z - 0.4
    )
    arm.castShadow = true
    this.scene.add(arm)
  }

  private createNet() {
    // 篮网材质（白色半透明）
    const netMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      wireframe: false
    })

    // 创建篮网（使用多个线段模拟）
    const netHeight = 0.5
    const bottomRadius = RIM_RADIUS * 0.5
    const segments = 16
    const verticalStrings = 8

    // 垂直网绳
    for (let i = 0; i < verticalStrings; i++) {
      const angle = (i / verticalStrings) * Math.PI * 2
      const topX = this.rimCenter.x + Math.cos(angle) * RIM_RADIUS
      const topZ = this.rimCenter.z + Math.sin(angle) * RIM_RADIUS
      
      const bottomX = this.rimCenter.x + Math.cos(angle) * bottomRadius
      const bottomZ = this.rimCenter.z + Math.sin(angle) * bottomRadius

      // 创建垂直绳
      const stringGeometry = new THREE.CylinderGeometry(0.002, 0.002, netHeight, 4)
      const string = new THREE.Mesh(stringGeometry, netMaterial)
      
      // 计算中点和角度
      const midY = this.rimCenter.y - netHeight / 2
      string.position.set(
        (topX + bottomX) / 2,
        midY,
        (topZ + bottomZ) / 2
      )
      
      // 倾斜角度
      const dx = bottomX - topX
      const dz = bottomZ - topZ
      const dist = Math.sqrt(dx * dx + dz * dz)
      const angleX = Math.atan2(dist, netHeight)
      
      string.rotation.x = angleX
      string.rotation.z = angle
      
      this.scene.add(string)
    }

    // 水平环
    const horizontalRings = 4
    for (let i = 0; i < horizontalRings; i++) {
      const t = (i + 1) / (horizontalRings + 1)
      const ringY = this.rimCenter.y - netHeight * t
      const ringRadius = RIM_RADIUS - (RIM_RADIUS - bottomRadius) * t

      // 创建圆环
      const ringGeometry = new THREE.TorusGeometry(ringRadius, 0.002, 4, segments)
      const ring = new THREE.Mesh(ringGeometry, netMaterial)
      ring.position.set(
        this.rimCenter.x,
        ringY,
        this.rimCenter.z
      )
      ring.rotation.x = Math.PI / 2
      this.scene.add(ring)
    }
  }

  getRimCenter(): THREE.Vector3 {
    return this.rimCenter.clone()
  }

  getRimRadius(): number {
    return RIM_RADIUS
  }
}

export default Hoop
