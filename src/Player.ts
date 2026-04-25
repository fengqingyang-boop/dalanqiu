import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'

const PLAYER_HEIGHT = 1.9
const PLAYER_RADIUS = 0.35
const PLAYER_MASS = 80
const MOVE_SPEED = 8
const CAMERA_DISTANCE = 4
const CAMERA_HEIGHT_OFFSET = 1.5
const CAMERA_LOOK_AT_HEIGHT = 1.2

type AnimationState = 'idle' | 'dribbling' | 'shooting' | 'dunking'

class Player {
  private scene: THREE.Scene
  private physicsWorld: RAPIER.World
  private RAPIER: typeof RAPIER
  private camera: THREE.PerspectiveCamera

  private mesh!: THREE.Group
  private rigidBody!: RAPIER.RigidBody

  private leftArm!: THREE.Mesh
  private rightArm!: THREE.Mesh
  private leftLeg!: THREE.Mesh
  private rightLeg!: THREE.Mesh

  private rotationY: number = 0
  private cameraPitch: number = 0.2

  private animationState: AnimationState = 'idle'
  private animationTime: number = 0
  private defaultLeftArmRotation: number = 0.3
  private defaultRightArmRotation: number = -0.3
  private defaultLeftLegRotation: number = 0
  private defaultRightLegRotation: number = 0

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

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      roughness: 0.7,
      metalness: 0.1
    })

    const torsoHeight = PLAYER_HEIGHT * 0.4
    const torsoRadius = 0.25
    const torsoGeometry = new THREE.CapsuleGeometry(torsoRadius, torsoHeight, 4, 8)
    const torso = new THREE.Mesh(torsoGeometry, bodyMaterial)
    torso.position.y = PLAYER_HEIGHT * 0.45
    torso.castShadow = true
    torso.receiveShadow = true
    this.mesh.add(torso)

    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdbcb4,
      roughness: 0.8
    })
    const headGeometry = new THREE.SphereGeometry(0.18, 16, 16)
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = PLAYER_HEIGHT * 0.8
    head.castShadow = true
    this.mesh.add(head)

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9
    })
    const hairGeometry = new THREE.SphereGeometry(0.19, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    const hair = new THREE.Mesh(hairGeometry, hairMaterial)
    hair.position.y = PLAYER_HEIGHT * 0.82
    hair.castShadow = true
    this.mesh.add(hair)

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const eyeGeometry = new THREE.SphereGeometry(0.02, 8, 8)
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.05, PLAYER_HEIGHT * 0.82, 0.15)
    this.mesh.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.05, PLAYER_HEIGHT * 0.82, 0.15)
    this.mesh.add(rightEye)

    const shortsMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.7
    })
    const shortsGeometry = new THREE.CylinderGeometry(0.25, 0.28, 0.25, 16)
    const shorts = new THREE.Mesh(shortsGeometry, shortsMaterial)
    shorts.position.y = PLAYER_HEIGHT * 0.3
    shorts.castShadow = true
    this.mesh.add(shorts)

    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdbcb4,
      roughness: 0.8
    })
    const legGeometry = new THREE.CapsuleGeometry(0.08, 0.45, 4, 8)

    this.leftLeg = new THREE.Mesh(legGeometry, legMaterial)
    this.leftLeg.position.set(-0.1, 0.45, 0)
    this.leftLeg.castShadow = true
    this.mesh.add(this.leftLeg)

    this.rightLeg = new THREE.Mesh(legGeometry, legMaterial)
    this.rightLeg.position.set(0.1, 0.45, 0)
    this.rightLeg.castShadow = true
    this.mesh.add(this.rightLeg)

    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdbcb4,
      roughness: 0.8
    })
    const armGeometry = new THREE.CapsuleGeometry(0.06, 0.5, 4, 8)

    this.leftArm = new THREE.Mesh(armGeometry, armMaterial)
    this.leftArm.position.set(-0.35, PLAYER_HEIGHT * 0.55, 0)
    this.leftArm.rotation.z = this.defaultLeftArmRotation
    this.leftArm.castShadow = true
    this.mesh.add(this.leftArm)

    this.rightArm = new THREE.Mesh(armGeometry, armMaterial)
    this.rightArm.position.set(0.35, PLAYER_HEIGHT * 0.55, 0)
    this.rightArm.rotation.z = this.defaultRightArmRotation
    this.rightArm.castShadow = true
    this.mesh.add(this.rightArm)

    this.mesh.position.set(0, 0, 3)
    this.scene.add(this.mesh)
  }

  private createPhysics() {
    const bodyDesc = this.RAPIER.RigidBodyDesc.kinematicPositionBased()
    bodyDesc.setTranslation(0, PLAYER_HEIGHT / 2, 3)
    this.rigidBody = this.physicsWorld.createRigidBody(bodyDesc)

    const colliderDesc = this.RAPIER.ColliderDesc.capsule(
      PLAYER_HEIGHT / 2 - PLAYER_RADIUS,
      PLAYER_RADIUS
    )
    colliderDesc.setMass(PLAYER_MASS)
    colliderDesc.setFriction(0.5)
    colliderDesc.setRestitution(0.1)
    this.physicsWorld.createCollider(colliderDesc, this.rigidBody)
  }

  playDribbleAnimation() {
    this.animationState = 'dribbling'
    this.animationTime = 0
  }

  playShootAnimation() {
    this.animationState = 'shooting'
    this.animationTime = 0
  }

  playDunkAnimation() {
    this.animationState = 'dunking'
    this.animationTime = 0
  }

  resetAnimation() {
    this.animationState = 'idle'
    this.leftArm.rotation.z = this.defaultLeftArmRotation
    this.rightArm.rotation.z = this.defaultRightArmRotation
    this.leftArm.rotation.x = 0
    this.rightArm.rotation.x = 0
    this.leftLeg.rotation.x = 0
    this.rightLeg.rotation.x = 0
  }

  private updateAnimation(dt: number) {
    this.animationTime += dt

    switch (this.animationState) {
      case 'dribbling':
        this.updateDribbleAnimation()
        break
      case 'shooting':
        this.updateShootAnimation()
        break
      case 'dunking':
        this.updateDunkAnimation()
        break
      case 'idle':
      default:
        this.updateIdleAnimation()
        break
    }
  }

  private updateDribbleAnimation() {
    const phase = this.animationTime * 8
    
    const dribbleZ = Math.sin(phase) * 0.3 - 0.3
    const dribbleX = Math.sin(phase) * 0.2
    
    this.rightArm.rotation.x = dribbleZ
    this.rightArm.rotation.z = this.defaultRightArmRotation + dribbleX
    
    this.leftArm.rotation.x = dribbleZ * 0.5
  }

  private updateShootAnimation() {
    const phase = Math.min(this.animationTime * 4, 1)
    
    const easeOut = 1 - Math.pow(1 - phase, 3)
    const armUp = easeOut * 1.5
    
    this.rightArm.rotation.z = this.defaultRightArmRotation - armUp
    this.leftArm.rotation.z = this.defaultLeftArmRotation + armUp
    this.rightArm.rotation.x = -easeOut * 0.8
    this.leftArm.rotation.x = -easeOut * 0.8
  }

  private updateDunkAnimation() {
    const phase = Math.min(this.animationTime * 3, 1)
    
    if (phase < 0.3) {
      const jumpPhase = phase / 0.3
      const jump = jumpPhase * 0.5
      this.rightArm.rotation.z = this.defaultRightArmRotation - jump * 1.5
      this.leftArm.rotation.z = this.defaultLeftArmRotation + jump * 1.5
    } else {
      const slamPhase = (phase - 0.3) / 0.7
      const slam = slamPhase * 2
      this.rightArm.rotation.z = this.defaultRightArmRotation + slam
      this.leftArm.rotation.z = this.defaultLeftArmRotation - slam
      this.rightArm.rotation.x = slamPhase * 1.5
      this.leftArm.rotation.x = slamPhase * 1.5
    }
  }

  private updateIdleAnimation() {
    const breath = Math.sin(this.animationTime * 2) * 0.05
    this.leftArm.rotation.z = this.defaultLeftArmRotation + breath
    this.rightArm.rotation.z = this.defaultRightArmRotation - breath
  }

  move(direction: THREE.Vector3, dt: number) {
    const translation = this.rigidBody.translation()
    const currentPos = new THREE.Vector3(translation.x, translation.y, translation.z)

    const moveDistance = MOVE_SPEED * dt
    const moveDelta = direction.clone().multiplyScalar(moveDistance)

    const newPos = currentPos.add(moveDelta)

    const courtHalfW = 7.5 - PLAYER_RADIUS
    const courtHalfL = 14 - PLAYER_RADIUS
    newPos.x = Math.max(-courtHalfW, Math.min(courtHalfW, newPos.x))
    newPos.z = Math.max(-courtHalfL, Math.min(courtHalfL, newPos.z))

    this.rigidBody.setNextKinematicTranslation({
      x: newPos.x,
      y: PLAYER_HEIGHT / 2,
      z: newPos.z
    })

    if (direction.length() > 0.01) {
      const angle = Math.atan2(direction.x, direction.z)
      this.rotationY = angle

      const walkPhase = this.animationTime * 10
      const legSwing = Math.sin(walkPhase) * 0.3
      this.leftLeg.rotation.x = legSwing
      this.rightLeg.rotation.x = -legSwing
    }
  }

  rotateCamera(deltaX: number, deltaY: number) {
    const sensitivity = 0.002
    this.rotationY += deltaX * sensitivity
    this.cameraPitch += deltaY * sensitivity

    this.cameraPitch = Math.max(-0.5, Math.min(1.2, this.cameraPitch))
  }

  updateCamera() {
    const translation = this.rigidBody.translation()
    const playerPos = new THREE.Vector3(translation.x, translation.y, translation.z)

    const cameraOffset = new THREE.Vector3(
      Math.sin(this.rotationY) * CAMERA_DISTANCE,
      CAMERA_HEIGHT_OFFSET + Math.sin(this.cameraPitch) * CAMERA_DISTANCE,
      Math.cos(this.rotationY) * CAMERA_DISTANCE
    )

    const cameraPos = playerPos.clone().add(cameraOffset)
    
    const lookAtPos = new THREE.Vector3(
      playerPos.x + Math.sin(this.rotationY) * 2,
      playerPos.y + CAMERA_LOOK_AT_HEIGHT,
      playerPos.z + Math.cos(this.rotationY) * 2
    )

    this.camera.position.lerp(cameraPos, 0.1)
    this.camera.lookAt(lookAtPos)
  }

  update(dt: number) {
    this.updateAnimation(dt)

    const translation = this.rigidBody.translation()
    
    this.mesh.position.set(
      translation.x,
      translation.y - PLAYER_HEIGHT / 2,
      translation.z
    )
    this.mesh.rotation.y = this.rotationY

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
    const translation = this.rigidBody.translation()
    const handHeight = PLAYER_HEIGHT * 0.65
    const handForward = 0.6

    let heightOffset = 0
    if (this.animationState === 'shooting' || this.animationState === 'dunking') {
      heightOffset = 0.3
    }

    return new THREE.Vector3(
      translation.x + Math.sin(this.rotationY) * handForward,
      handHeight + heightOffset,
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
