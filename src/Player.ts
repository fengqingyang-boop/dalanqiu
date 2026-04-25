import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'

const PLAYER_HEIGHT = 1.9
const PLAYER_RADIUS = 0.35
const PLAYER_MASS = 80
const MOVE_SPEED = 8
const CAMERA_DISTANCE = 4
const CAMERA_HEIGHT_OFFSET = 1.5
const CAMERA_LOOK_AT_HEIGHT = 1.2

class Player {
  private scene: THREE.Scene
  private physicsWorld: RAPIER.World
  private RAPIER: typeof RAPIER
  private camera: THREE.PerspectiveCamera

  private mesh!: THREE.Group
  private rigidBody!: RAPIER.RigidBody

  private rotationY: number = 0
  private cameraPitch: number = 0.2

  constructor(
    scene: THREE.Scene,
    physicsWorld: RAPIER.World,
    RAPIER: typeof RAPIER,
    camera: THREE.PerspectiveCamera
  ) {
    this.scene = scene
    this.physicsWorld = physicsWorld
    this.RAPIER = RAPIER
    this.camera = camera

    this.createMesh()
    this.createPhysics()
  }

  private createMesh() {
    this.mesh = new THREE.Group()

    // 身体
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      roughness: 0.7,
      metalness: 0.1
    })

    // 躯干
    const torsoHeight = PLAYER_HEIGHT * 0.4
    const torsoRadius = 0.25
    const torsoGeometry = new THREE.CapsuleGeometry(torsoRadius, torsoHeight, 4, 8)
    const torso = new THREE.Mesh(torsoGeometry, bodyMaterial)
    torso.position.y = PLAYER_HEIGHT * 0.45
    torso.castShadow = true
    torso.receiveShadow = true
    this.mesh.add(torso)

    // 头部
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdbcb4,
      roughness: 0.8
    })
    const headGeometry = new THREE.SphereGeometry(0.18, 16, 16)
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = PLAYER_HEIGHT * 0.8
    head.castShadow = true
    this.mesh.add(head)

    // 帽子/头发（简化为黑色）
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9
    })
    const hairGeometry = new THREE.SphereGeometry(0.19, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    const hair = new THREE.Mesh(hairGeometry, hairMaterial)
    hair.position.y = PLAYER_HEIGHT * 0.82
    hair.castShadow = true
    this.mesh.add(hair)

    // 眼睛指示方向（红色小点）
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const eyeGeometry = new THREE.SphereGeometry(0.02, 8, 8)
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.05, PLAYER_HEIGHT * 0.82, 0.15)
    this.mesh.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.05, PLAYER_HEIGHT * 0.82, 0.15)
    this.mesh.add(rightEye)

    // 短裤
    const shortsMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.7
    })
    const shortsGeometry = new THREE.CylinderGeometry(0.25, 0.28, 0.25, 16)
    const shorts = new THREE.Mesh(shortsGeometry, shortsMaterial)
    shorts.position.y = PLAYER_HEIGHT * 0.3
    shorts.castShadow = true
    this.mesh.add(shorts)

    // 腿部（简化为两个胶囊）
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdbcb4,
      roughness: 0.8
    })
    const legGeometry = new THREE.CapsuleGeometry(0.08, 0.45, 4, 8)

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial)
    leftLeg.position.set(-0.1, 0.45, 0)
    leftLeg.castShadow = true
    this.mesh.add(leftLeg)

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial)
    rightLeg.position.set(0.1, 0.45, 0)
    rightLeg.castShadow = true
    this.mesh.add(rightLeg)

    // 手臂（简化）
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdbcb4,
      roughness: 0.8
    })
    const armGeometry = new THREE.CapsuleGeometry(0.06, 0.5, 4, 8)

    const leftArm = new THREE.Mesh(armGeometry, armMaterial)
    leftArm.position.set(-0.35, PLAYER_HEIGHT * 0.55, 0)
    leftArm.rotation.z = 0.3
    leftArm.castShadow = true
    this.mesh.add(leftArm)

    const rightArm = new THREE.Mesh(armGeometry, armMaterial)
    rightArm.position.set(0.35, PLAYER_HEIGHT * 0.55, 0)
    rightArm.rotation.z = -0.3
    rightArm.castShadow = true
    this.mesh.add(rightArm)

    // 设置初始位置
    this.mesh.position.set(0, 0, 3)
    this.scene.add(this.mesh)
  }

  private createPhysics() {
    // 运动学刚体（玩家直接控制）
    const bodyDesc = this.RAPIER.RigidBodyDesc.kinematicPositionBased()
    bodyDesc.setTranslation(0, PLAYER_HEIGHT / 2, 3)
    this.rigidBody = this.physicsWorld.createRigidBody(bodyDesc)

    // 胶囊碰撞体
    const colliderDesc = this.RAPIER.ColliderDesc.capsule(
      PLAYER_HEIGHT / 2 - PLAYER_RADIUS,
      PLAYER_RADIUS
    )
    colliderDesc.setMass(PLAYER_MASS)
    colliderDesc.setFriction(0.5)
    colliderDesc.setRestitution(0.1)
    this.physicsWorld.createCollider(colliderDesc, this.rigidBody)
  }

  move(direction: THREE.Vector3, dt: number) {
    // 获取当前位置
    const translation = this.rigidBody.translation()
    const currentPos = new THREE.Vector3(translation.x, translation.y, translation.z)

    // 计算移动距离
    const moveDistance = MOVE_SPEED * dt
    const moveDelta = direction.clone().multiplyScalar(moveDistance)

    // 计算新位置
    const newPos = currentPos.add(moveDelta)

    // 限制在场地内
    const courtHalfW = 7.5 - PLAYER_RADIUS
    const courtHalfL = 14 - PLAYER_RADIUS
    newPos.x = Math.max(-courtHalfW, Math.min(courtHalfW, newPos.x))
    newPos.z = Math.max(-courtHalfL, Math.min(courtHalfL, newPos.z))

    // 设置运动学刚体位置
    this.rigidBody.setNextKinematicTranslation({
      x: newPos.x,
      y: PLAYER_HEIGHT / 2,
      z: newPos.z
    })

    // 如果有移动方向，更新朝向
    if (direction.length() > 0.01) {
      const angle = Math.atan2(direction.x, direction.z)
      this.rotationY = angle
    }
  }

  rotateCamera(deltaX: number, deltaY: number) {
    const sensitivity = 0.002
    this.rotationY += deltaX * sensitivity
    this.cameraPitch += deltaY * sensitivity

    // 限制俯仰角
    this.cameraPitch = Math.max(-0.5, Math.min(1.2, this.cameraPitch))
  }

  updateCamera() {
    const translation = this.rigidBody.translation()
    const playerPos = new THREE.Vector3(translation.x, translation.y, translation.z)

    // 计算相机位置（第三人称跟随，像NBA2K）
    const cameraOffset = new THREE.Vector3(
      Math.sin(this.rotationY) * CAMERA_DISTANCE,
      CAMERA_HEIGHT_OFFSET + Math.sin(this.cameraPitch) * CAMERA_DISTANCE,
      Math.cos(this.rotationY) * CAMERA_DISTANCE
    )

    const cameraPos = playerPos.clone().add(cameraOffset)
    
    // 相机看向玩家前方一点
    const lookAtPos = new THREE.Vector3(
      playerPos.x + Math.sin(this.rotationY) * 2,
      playerPos.y + CAMERA_LOOK_AT_HEIGHT,
      playerPos.z + Math.cos(this.rotationY) * 2
    )

    // 平滑移动相机
    this.camera.position.lerp(cameraPos, 0.1)
    this.camera.lookAt(lookAtPos)
  }

  update(dt: number) {
    // 更新网格位置和旋转
    const translation = this.rigidBody.translation()
    
    this.mesh.position.set(
      translation.x,
      translation.y - PLAYER_HEIGHT / 2,
      translation.z
    )
    this.mesh.rotation.y = this.rotationY

    // 更新相机
    this.updateCamera()
  }

  getPosition(): THREE.Vector3 {
    const translation = this.rigidBody.translation()
    return new THREE.Vector3(
      translation.x,
      translation.y - PLAYER_HEIGHT / 2,
      translation.z
    )
  }

  getHandPosition(): THREE.Vector3 {
    // 计算手的位置（前方和上方）
    const translation = this.rigidBody.translation()
    const handHeight = PLAYER_HEIGHT * 0.65
    const handForward = 0.6

    return new THREE.Vector3(
      translation.x + Math.sin(this.rotationY) * handForward,
      handHeight,
      translation.z + Math.cos(this.rotationY) * handForward
    )
  }

  getRotationY(): number {
    return this.rotationY
  }

  getCameraDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.sin(this.rotationY),
      0,
      Math.cos(this.rotationY)
    )
  }
}

export default Player
