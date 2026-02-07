import './style.css'
import * as THREE from 'three'
import { createScene } from './scene.js'
import { createShore, updateWater, createSwanSystem, createForest } from './world.js'
import { createBlanket } from './blanket.js'
import { createPropSystem } from './props.js'

const app = document.querySelector('#app')
const { scene, camera, renderer, controls } = createScene(app)

const {
  group: shore,
  getGroundHeightAt,
  getRoadMaskAt,
  bounds,
  shoreZ,
  water,
  waterWidth,
  waterDepth,
  waterCenter,
} = createShore()
scene.add(shore)

const picnicZ = shoreZ + 0.8

const { blanket, updateBlanket, getSurfaceHeightAt } = createBlanket({
  picnicZ,
  getGroundHeightAt,
  fixedPosition: {
    x: 1.2,
    y: 0.2346605718,
    z: -0.3,
  },
})
scene.add(blanket)

const createHero = ({
  bodyColor,
  hatColor,
  dressColor,
  hairColor,
  eyeColor,
  lipColor,
  scale = 1,
  slimFactor = 1,
  style = 'default',
} = {}) => {
  const hero = new THREE.Group()

  const bodyGeometry = new THREE.CylinderGeometry(
    0.18 * slimFactor,
    0.22 * slimFactor,
    0.5,
    24
  )
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: bodyColor ?? 0x2c5cff,
    roughness: 0.5,
    metalness: 0.1,
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.y = 0.25

  const headGeometry = new THREE.SphereGeometry(0.16, 24, 16)
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd7b3,
    roughness: 0.6,
    metalness: 0,
  })
  const head = new THREE.Mesh(headGeometry, headMaterial)
  head.position.y = 0.62
  hero.add(body, head)

  if (style === 'female') {
    const dressGeometry = new THREE.ConeGeometry(0.3 * slimFactor, 0.55, 28)
    const dressMaterial = new THREE.MeshStandardMaterial({
      color: dressColor ?? 0xff7aa2,
      roughness: 0.6,
      metalness: 0.05,
    })
    const dress = new THREE.Mesh(dressGeometry, dressMaterial)
    dress.position.y = 0.1

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: hairColor ?? 0x6b3f2a,
      roughness: 0.6,
      metalness: 0.1,
    })
    const hairTopGeometry = new THREE.SphereGeometry(0.185, 22, 16)
    const hairTop = new THREE.Mesh(hairTopGeometry, hairMaterial)
    hairTop.position.set(0, 0.69, -0.02)
    hairTop.scale.set(1.02, 0.86, 1.02)

    const hairCapGeometry = new THREE.SphereGeometry(0.175, 20, 14)
    const hairCap = new THREE.Mesh(hairCapGeometry, hairMaterial)
    hairCap.position.set(0, 0.665, -0.02)
    hairCap.scale.set(0.98, 0.76, 0.98)

    const hairBackGeometry = new THREE.CylinderGeometry(0.14, 0.18, 0.34, 18)
    const hairBack = new THREE.Mesh(hairBackGeometry, hairMaterial)
    hairBack.position.set(0, 0.5, -0.07)
    hairBack.rotation.x = Math.PI * 0.08

    const hairSideGeometry = new THREE.CylinderGeometry(0.07, 0.09, 0.22, 12)
    const hairSideLeft = new THREE.Mesh(hairSideGeometry, hairMaterial)
    hairSideLeft.position.set(-0.16, 0.56, 0.02)
    hairSideLeft.rotation.z = Math.PI * 0.08
    hairSideLeft.rotation.x = Math.PI * 0.12

    const hairSideRight = hairSideLeft.clone()
    hairSideRight.position.x = 0.16
    hairSideRight.rotation.z = -Math.PI * 0.08

    const bangsGeometry = new THREE.BoxGeometry(0.18, 0.03, 0.03)
    const bangs = new THREE.Mesh(bangsGeometry, hairMaterial)
    bangs.position.set(0, 0.78, 0.04)
    bangs.rotation.x = -Math.PI * 0.07

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: eyeColor ?? 0x2f9b4f,
      roughness: 0.4,
      metalness: 0.1,
    })
    const eyeGeometry = new THREE.SphereGeometry(0.025, 12, 10)
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.05, 0.64, 0.14)
    rightEye.position.set(0.05, 0.64, 0.14)

    const lipGeometry = new THREE.CapsuleGeometry(0.03, 0.02, 4, 8)
    const lipMaterial = new THREE.MeshStandardMaterial({
      color: lipColor ?? 0xd96b7a,
      roughness: 0.6,
    })
    const lips = new THREE.Mesh(lipGeometry, lipMaterial)
    lips.position.set(0, 0.58, 0.13)
    lips.rotation.x = Math.PI / 2

    const earringGeometry = new THREE.SphereGeometry(0.015, 10, 8)
    const earringMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2d7a6,
      metalness: 0.7,
      roughness: 0.2,
    })
    const leftEarring = new THREE.Mesh(earringGeometry, earringMaterial)
    const rightEarring = new THREE.Mesh(earringGeometry, earringMaterial)
    leftEarring.position.set(-0.13, 0.61, 0.02)
    rightEarring.position.set(0.13, 0.61, 0.02)

    hero.add(
      dress,
      hairTop,
      hairCap,
      hairBack,
      hairSideLeft,
      hairSideRight,
      bangs,
      leftEye,
      rightEye,
      lips,
      leftEarring,
      rightEarring
    )
  } else {
    const hatGeometry = new THREE.CylinderGeometry(0.12, 0.14, 0.08, 20)
    const hatMaterial = new THREE.MeshStandardMaterial({
      color: hatColor ?? 0x1d1c2c,
      roughness: 0.7,
    })
    const hat = new THREE.Mesh(hatGeometry, hatMaterial)
    hat.position.y = 0.74
    hero.add(hat)
  }

  hero.scale.setScalar(scale)
  return hero
}

const hero = createHero()
const heroStartZ = picnicZ + 0.9
hero.position.set(0, getGroundHeightAt(0, heroStartZ), heroStartZ)
scene.add(hero)

const heroTwo = createHero({
  style: 'female',
  bodyColor: 0xffc1d7,
  dressColor: 0xff91b2,
  hairColor: 0x6b3f2a,
  eyeColor: 0x3aa35f,
  lipColor: 0xd96b7a,
  scale: 0.88,
  slimFactor: 0.85,
})
const heroTwoStartZ = picnicZ + 0.6
heroTwo.position.set(0.7, getGroundHeightAt(0.7, heroTwoStartZ), heroTwoStartZ)
scene.add(heroTwo)

controls.target.copy(hero.position)

const heroBounds = new THREE.Box3().setFromObject(hero)
const heroSize = new THREE.Vector3()
heroBounds.getSize(heroSize)

const propSystem = createPropSystem({
  scene,
  hero,
  heroTwo,
  heroSize,
  picnicZ,
  bounds,
  getSurfaceHeightAt,
  renderer,
  camera,
})

const swanSystem = createSwanSystem(
  scene,
  water,
  waterCenter,
  waterWidth,
  waterDepth
)

const forest = createForest({
  bounds,
  shoreZ,
  picnicZ,
  getGroundHeightAt,
  getRoadMaskAt,
  blanketPosition: { x: 1.2, y: 0.2346605718, z: -0.3 },
})
scene.add(forest)

const keys = new Set()
const onKeyDown = (event) => {
  const key = event.key.toLowerCase()
  const code = event.code
  keys.add(key)
  if (code) {
    keys.add(code)
  }
  propSystem.handleKeyDown(event)
}
const onKeyUp = (event) => {
  const key = event.key.toLowerCase()
  keys.delete(key)
  if (event.code) {
    keys.delete(event.code)
  }
  propSystem.handleKeyUp(event)
}
window.addEventListener('keydown', onKeyDown)
window.addEventListener('keyup', onKeyUp)

const heroSpeed = 1.1
const heroTurnSpeed = 8
const worldUp = new THREE.Vector3(0, 1, 0)
const move = new THREE.Vector3()
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const targetQuat = new THREE.Quaternion()
const heroMidpoint = new THREE.Vector3()
const cameraOffset = new THREE.Vector3()
const tmpVec = new THREE.Vector3()

const hasAny = (list) => list.some((key) => keys.has(key))

const updateHero = (heroTarget, input, delta) => {
  camera.getWorldDirection(forward)
  forward.y = 0
  if (forward.lengthSq() > 0) {
    forward.normalize()
  }
  right.crossVectors(forward, worldUp).normalize()

  move.set(0, 0, 0)
  if (hasAny(input.forward)) {
    move.add(forward)
  }
  if (hasAny(input.backward)) {
    move.sub(forward)
  }
  if (hasAny(input.left)) {
    move.sub(right)
  }
  if (hasAny(input.right)) {
    move.add(right)
  }

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(heroSpeed * delta)
    heroTarget.position.add(move)

    heroTarget.position.x = THREE.MathUtils.clamp(
      heroTarget.position.x,
      bounds.minX,
      bounds.maxX
    )
    heroTarget.position.z = THREE.MathUtils.clamp(
      heroTarget.position.z,
      bounds.minZ,
      bounds.maxZ
    )

    heroTarget.position.y = getGroundHeightAt(
      heroTarget.position.x,
      heroTarget.position.z
    )
    const targetAngle = Math.atan2(move.x, move.z)
    targetQuat.setFromAxisAngle(worldUp, targetAngle)
    const turnAlpha = 1 - Math.exp(-heroTurnSpeed * delta)
    heroTarget.quaternion.slerp(targetQuat, turnAlpha)
  }
}

const updateSharedCamera = () => {
  heroMidpoint.copy(hero.position).add(heroTwo.position).multiplyScalar(0.5)
  cameraOffset.copy(camera.position).sub(controls.target)
  const heroDistance = hero.position.distanceTo(heroTwo.position)
  const desiredDistance = THREE.MathUtils.clamp(3 + heroDistance * 0.8, 3, 7)
  const currentDistance = cameraOffset.length() || 1
  cameraOffset.multiplyScalar(desiredDistance / currentDistance)
  camera.position.copy(heroMidpoint).add(cameraOffset)
  controls.target.copy(heroMidpoint)
}

const clock = new THREE.Clock()
const animate = () => {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const time = clock.getElapsedTime()

  updateHero(
    hero,
    {
      forward: ['w', 'KeyW'],
      backward: ['s', 'KeyS'],
      left: ['a', 'KeyA'],
      right: ['d', 'KeyD'],
    },
    delta
  )
  updateHero(
    heroTwo,
    {
      forward: ['arrowup'],
      backward: ['arrowdown'],
      left: ['arrowleft'],
      right: ['arrowright'],
    },
    delta
  )
  updateSharedCamera()
  updateWater(water, time)
  swanSystem.updateSwans(time, delta)
  propSystem.updateProps(delta)
  propSystem.updateActionHint()
  const blanketCenter = tmpVec.set(1.2, 0, -0.3)
  const heroDist = hero.position.distanceTo(blanketCenter)
  const heroTwoDist = heroTwo.position.distanceTo(blanketCenter)
  updateBlanket(heroDist <= heroTwoDist ? hero.position : heroTwo.position, delta)

  controls.update()
  renderer.render(scene, camera)
}

animate()

const onResize = () => {
  const width = window.innerWidth
  const height = window.innerHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
}

window.addEventListener('resize', onResize)
