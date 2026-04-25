import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'

const COURT_LENGTH = 28
const COURT_WIDTH = 15
const COURT_HEIGHT = 0.1

class SceneManager {
  private scene: THREE.Scene
  private physicsWorld: RAPIER.World
  private RAPIER: typeof RAPIER

  constructor(scene: THREE.Scene, physicsWorld: RAPIER.World, RAPIER: typeof RAPIER) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.RAPIER = RAPIER
  }

  createCourt() {
    this.createFloor()
    this.createCourtLines()
    this.createLights()
    this.createWalls()
    this.createStadium()
  }

  private createFloor() {
    // 视觉地板
    const floorGeometry = new THREE.BoxGeometry(COURT_WIDTH, COURT_HEIGHT, COURT_LENGTH)
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xd2691e,
      roughness: 0.8,
      metalness: 0.1
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.position.y = -COURT_HEIGHT / 2
    floor.receiveShadow = true
    this.scene.add(floor)

    // 物理地板
    const floorBodyDesc = this.RAPIER.RigidBodyDesc.fixed()
    const floorBody = this.physicsWorld.createRigidBody(floorBodyDesc)
    
    const floorColliderDesc = this.RAPIER.ColliderDesc.cuboid(
      COURT_WIDTH / 2,
      COURT_HEIGHT / 2,
      COURT_LENGTH / 2
    )
    floorColliderDesc.setTranslation(0, -COURT_HEIGHT / 2, 0)
    floorColliderDesc.setFriction(0.8)
    floorColliderDesc.setRestitution(0.2)
    this.physicsWorld.createCollider(floorColliderDesc, floorBody)
  }

  private createCourtLines() {
    // 场地线颜色
    const lineColor = 0xffffff
    const lineMaterial = new THREE.MeshBasicMaterial({ color: lineColor })

    // 边界线
    this.createRectangle(COURT_WIDTH - 0.1, COURT_LENGTH - 0.1, lineMaterial, 0.002)

    // 中线
    this.createLine(
      new THREE.Vector3(-COURT_WIDTH / 2 + 0.05, 0.003, 0),
      new THREE.Vector3(COURT_WIDTH / 2 - 0.05, 0.003, 0),
      lineMaterial
    )

    // 中圈
    this.createCircle(1.8, lineMaterial, 0.002, new THREE.Vector3(0, 0.003, 0))

    // 三秒区（矩形区域）
    const keyWidth = 4.9
    const keyLength = 5.8
    this.createRectangleOutline(
      keyWidth,
      keyLength,
      lineMaterial,
      0.002,
      new THREE.Vector3(0, 0.003, -COURT_LENGTH / 2 + keyLength / 2 + 1.5)
    )

    // 罚球线
    this.createLine(
      new THREE.Vector3(-keyWidth / 2, 0.003, -COURT_LENGTH / 2 + keyLength + 1.5),
      new THREE.Vector3(keyWidth / 2, 0.003, -COURT_LENGTH / 2 + keyLength + 1.5),
      lineMaterial
    )

    // 罚球圈
    this.createCircle(1.8, lineMaterial, 0.002, new THREE.Vector3(0, 0.003, -COURT_LENGTH / 2 + keyLength + 1.5))

    // 三分线（简化）
    this.createThreePointLine(
      new THREE.Vector3(0, 0.003, -COURT_LENGTH / 2 + 1.5),
      7.24,
      lineMaterial,
      0.002
    )
  }

  private createRectangle(width: number, depth: number, material: THREE.MeshBasicMaterial, yOffset: number) {
    const geometry = new THREE.PlaneGeometry(width, depth)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = yOffset
    this.scene.add(mesh)
  }

  private createRectangleOutline(
    width: number,
    depth: number,
    material: THREE.MeshBasicMaterial,
    yOffset: number,
    position: THREE.Vector3
  ) {
    const lineWidth = 0.05
    const halfW = width / 2
    const halfD = depth / 2

    // 四条边
    const edges = [
      { pos: new THREE.Vector3(0, yOffset, halfD), w: width, d: lineWidth },
      { pos: new THREE.Vector3(0, yOffset, -halfD), w: width, d: lineWidth },
      { pos: new THREE.Vector3(halfW, yOffset, 0), w: lineWidth, d: depth },
      { pos: new THREE.Vector3(-halfW, yOffset, 0), w: lineWidth, d: depth }
    ]

    edges.forEach(edge => {
      const geometry = new THREE.PlaneGeometry(edge.w, edge.d)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.copy(edge.pos).add(position)
      this.scene.add(mesh)
    })
  }

  private createLine(start: THREE.Vector3, end: THREE.Vector3, material: THREE.MeshBasicMaterial) {
    const dx = end.x - start.x
    const dz = end.z - start.z
    const length = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dx, dz)

    const geometry = new THREE.PlaneGeometry(0.05, length)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(start).add(end).multiplyScalar(0.5)
    mesh.rotation.x = -Math.PI / 2
    mesh.rotation.z = angle
    this.scene.add(mesh)
  }

  private createCircle(radius: number, material: THREE.MeshBasicMaterial, yOffset: number, position: THREE.Vector3) {
    const segments = 64
    const angleStep = (Math.PI * 2) / segments
    const lineWidth = 0.05

    for (let i = 0; i < segments; i++) {
      const angle1 = i * angleStep
      const angle2 = (i + 1) * angleStep

      const x1 = Math.cos(angle1) * radius
      const z1 = Math.sin(angle1) * radius
      const x2 = Math.cos(angle2) * radius
      const z2 = Math.sin(angle2) * radius

      const dx = x2 - x1
      const dz = z2 - z1
      const length = Math.sqrt(dx * dx + dz * dz)
      const angle = Math.atan2(dx, dz)

      const geometry = new THREE.PlaneGeometry(lineWidth, length)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set((x1 + x2) / 2 + position.x, yOffset, (z1 + z2) / 2 + position.z)
      mesh.rotation.x = -Math.PI / 2
      mesh.rotation.z = angle
      this.scene.add(mesh)
    }
  }

  private createThreePointLine(center: THREE.Vector3, radius: number, material: THREE.MeshBasicMaterial, yOffset: number) {
    const segments = 64
    // 三分线是半圆，从 π/4 到 3π/4
    const startAngle = Math.PI / 4
    const endAngle = 3 * Math.PI / 4
    const angleStep = (endAngle - startAngle) / segments
    const lineWidth = 0.05

    for (let i = 0; i < segments; i++) {
      const angle1 = startAngle + i * angleStep
      const angle2 = startAngle + (i + 1) * angleStep

      const x1 = Math.cos(angle1) * radius
      const z1 = Math.sin(angle1) * radius
      const x2 = Math.cos(angle2) * radius
      const z2 = Math.sin(angle2) * radius

      const dx = x2 - x1
      const dz = z2 - z1
      const length = Math.sqrt(dx * dx + dz * dz)
      const angle = Math.atan2(dx, dz)

      const geometry = new THREE.PlaneGeometry(lineWidth, length)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set((x1 + x2) / 2 + center.x, yOffset, (z1 + z2) / 2 + center.z)
      mesh.rotation.x = -Math.PI / 2
      mesh.rotation.z = angle
      this.scene.add(mesh)
    }
  }

  private createLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    // 主方向光（模拟体育馆灯光）
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
    mainLight.position.set(10, 20, 5)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 100
    mainLight.shadow.camera.left = -30
    mainLight.shadow.camera.right = 30
    mainLight.shadow.camera.top = 30
    mainLight.shadow.camera.bottom = -30
    this.scene.add(mainLight)

    // 补充灯光（多个聚光灯模拟体育馆顶棚灯）
    const lightPositions = [
      { x: -8, z: -8 },
      { x: 8, z: -8 },
      { x: -8, z: 8 },
      { x: 8, z: 8 },
      { x: 0, z: 0 }
    ]

    lightPositions.forEach(pos => {
      const spotLight = new THREE.SpotLight(0xfff8dc, 0.8)
      spotLight.position.set(pos.x, 15, pos.z)
      spotLight.angle = Math.PI / 4
      spotLight.penumbra = 0.2
      spotLight.distance = 30
      spotLight.decay = 0.5
      spotLight.castShadow = true
      spotLight.shadow.mapSize.width = 1024
      spotLight.shadow.mapSize.height = 1024
      this.scene.add(spotLight)
    })
  }

  private createWalls() {
    // 简单的边界墙，防止球飞出
    const wallHeight = 5
    const wallThickness = 0.5
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.1
    })

    // 四边墙
    const walls = [
      // 前墙
      { pos: new THREE.Vector3(0, wallHeight / 2, COURT_LENGTH / 2 + wallThickness / 2), w: COURT_WIDTH + 2, h: wallHeight, d: wallThickness },
      // 后墙
      { pos: new THREE.Vector3(0, wallHeight / 2, -COURT_LENGTH / 2 - wallThickness / 2), w: COURT_WIDTH + 2, h: wallHeight, d: wallThickness },
      // 左墙
      { pos: new THREE.Vector3(-COURT_WIDTH / 2 - wallThickness / 2, wallHeight / 2, 0), w: wallThickness, h: wallHeight, d: COURT_LENGTH + 2 },
      // 右墙
      { pos: new THREE.Vector3(COURT_WIDTH / 2 + wallThickness / 2, wallHeight / 2, 0), w: wallThickness, h: wallHeight, d: COURT_LENGTH + 2 }
    ]

    walls.forEach(wall => {
      // 视觉网格
      const geometry = new THREE.BoxGeometry(wall.w, wall.h, wall.d)
      const mesh = new THREE.Mesh(geometry, wallMaterial)
      mesh.position.copy(wall.pos)
      this.scene.add(mesh)

      // 物理碰撞
      const bodyDesc = this.RAPIER.RigidBodyDesc.fixed()
      const body = this.physicsWorld.createRigidBody(bodyDesc)
      
      const colliderDesc = this.RAPIER.ColliderDesc.cuboid(
        wall.w / 2,
        wall.h / 2,
        wall.d / 2
      )
      colliderDesc.setTranslation(wall.pos.x, wall.pos.y, wall.pos.z)
      colliderDesc.setFriction(0.5)
      colliderDesc.setRestitution(0.7)
      this.physicsWorld.createCollider(colliderDesc, body)
    })
  }

  private createStadium() {
    // 添加背景（观众席简化版）
    const stadiumRadius = 50
    const stadiumHeight = 20

    // 使用圆柱体贴图
    const geometry = new THREE.CylinderGeometry(
      stadiumRadius,
      stadiumRadius,
      stadiumHeight,
      64,
      1,
      true
    )

    const material = new THREE.MeshStandardMaterial({
      color: 0x2c1810,
      side: THREE.BackSide,
      roughness: 0.9
    })

    const stadium = new THREE.Mesh(geometry, material)
    stadium.position.y = stadiumHeight / 2
    this.scene.add(stadium)

    // 添加顶棚
    const roofGeometry = new THREE.CylinderGeometry(
      stadiumRadius + 2,
      stadiumRadius,
      3,
      64
    )
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9
    })
    const roof = new THREE.Mesh(roofGeometry, roofMaterial)
    roof.position.y = stadiumHeight + 1.5
    this.scene.add(roof)
  }
}

export default SceneManager
