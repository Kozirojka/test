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
})
scene.add(blanket)

const createHero = () => {
  const hero = new THREE.Group()

  const bodyGeometry = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 24)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c5cff,
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

  const hatGeometry = new THREE.CylinderGeometry(0.12, 0.14, 0.08, 20)
  const hatMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d1c2c,
    roughness: 0.7,
  })
  const hat = new THREE.Mesh(hatGeometry, hatMaterial)
  hat.position.y = 0.74

  hero.add(body, head, hat)
  return hero
}

const hero = createHero()
const heroStartZ = picnicZ + 0.9
hero.position.set(0, getGroundHeightAt(0, heroStartZ), heroStartZ)
scene.add(hero)
controls.target.copy(hero.position)
const lastHeroPosition = hero.position.clone()

const heroBounds = new THREE.Box3().setFromObject(hero)
const heroSize = new THREE.Vector3()
heroBounds.getSize(heroSize)

const propSystem = createPropSystem({
  scene,
  hero,
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

const forest = createForest({ bounds, shoreZ, picnicZ, getGroundHeightAt })
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
const worldUp = new THREE.Vector3(0, 1, 0)
const move = new THREE.Vector3()
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const facing = new THREE.Vector3()
const deltaHero = new THREE.Vector3()

const updateHero = (delta) => {
  camera.getWorldDirection(forward)
  forward.y = 0
  if (forward.lengthSq() > 0) {
    forward.normalize()
  }
  right.crossVectors(forward, worldUp).normalize()

  move.set(0, 0, 0)
  if (keys.has('w') || keys.has('KeyW') || keys.has('arrowup')) {
    move.add(forward)
  }
  if (keys.has('s') || keys.has('KeyS') || keys.has('arrowdown')) {
    move.sub(forward)
  }
  if (keys.has('a') || keys.has('KeyA') || keys.has('arrowleft')) {
    move.sub(right)
  }
  if (keys.has('d') || keys.has('KeyD') || keys.has('arrowright')) {
    move.add(right)
  }

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(heroSpeed * delta)
    hero.position.add(move)

    hero.position.x = THREE.MathUtils.clamp(
      hero.position.x,
      bounds.minX,
      bounds.maxX
    )
    hero.position.z = THREE.MathUtils.clamp(
      hero.position.z,
      bounds.minZ,
      bounds.maxZ
    )

    hero.position.y = getGroundHeightAt(hero.position.x, hero.position.z)
    facing.copy(hero.position).add(move)
    hero.lookAt(facing.x, hero.position.y, facing.z)
  }
}

const syncCameraToHero = () => {
  if (!hero.position.equals(lastHeroPosition)) {
    deltaHero.copy(hero.position).sub(lastHeroPosition)
    camera.position.add(deltaHero)
    controls.target.add(deltaHero)
    lastHeroPosition.copy(hero.position)
  }
}

const clock = new THREE.Clock()
const animate = () => {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const time = clock.getElapsedTime()

  updateHero(delta)
  syncCameraToHero()
  updateWater(water, time)
  swanSystem.updateSwans(time, delta)
  propSystem.updateProps(delta)
  propSystem.updateActionHint()
  updateBlanket(hero.position, delta)

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
