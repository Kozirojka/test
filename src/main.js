import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const app = document.querySelector('#app')
if (!app) {
  throw new Error('App container not found')
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.set(0, 2.2, 4.2)
camera.lookAt(0, 0.2, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
app.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.target.set(0, 0.2, 0)
controls.maxPolarAngle = Math.PI * 0.48
controls.minDistance = 2
controls.maxDistance = 7

const hemisphereLight = new THREE.HemisphereLight(0xbfd8ff, 0xf2d6a2, 0.7)
const sunLight = new THREE.DirectionalLight(0xffffff, 1)
sunLight.position.set(3.5, 5, 2.5)
scene.add(hemisphereLight, sunLight)

const createHeartMesh = () => {
  const heart = new THREE.Shape()
  heart.moveTo(0, 0.25)
  heart.bezierCurveTo(0, 0, -0.5, 0, -0.5, 0.3)
  heart.bezierCurveTo(-0.5, 0.6, -0.2, 0.85, 0, 1)
  heart.bezierCurveTo(0.2, 0.85, 0.5, 0.6, 0.5, 0.3)
  heart.bezierCurveTo(0.5, 0, 0, 0, 0, 0.25)

  const geometry = new THREE.ExtrudeGeometry(heart, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
    steps: 1,
  })
  geometry.center()

  const material = new THREE.MeshStandardMaterial({
    color: 0xff3b6b,
    metalness: 0.2,
    roughness: 0.35,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.scale.set(0.7, 0.7, 0.7)
  mesh.rotation.set(Math.PI / 2, Math.PI * 0.15, -Math.PI * 0.05)
  return mesh
}

const createBottleGroup = () => {
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.28, 0),
    new THREE.Vector2(0.32, 0.05),
    new THREE.Vector2(0.34, 0.2),
    new THREE.Vector2(0.35, 0.6),
    new THREE.Vector2(0.33, 1.1),
    new THREE.Vector2(0.25, 1.35),
    new THREE.Vector2(0.18, 1.55),
    new THREE.Vector2(0.18, 1.7),
    new THREE.Vector2(0.22, 1.78),
    new THREE.Vector2(0, 1.8),
  ]

  const bottleGeometry = new THREE.LatheGeometry(profile, 48)
  bottleGeometry.computeBoundingBox()
  if (bottleGeometry.boundingBox) {
    const center = new THREE.Vector3()
    bottleGeometry.boundingBox.getCenter(center)
    bottleGeometry.translate(-center.x, -center.y, -center.z)
  }

  const bottleMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f5a3a,
    metalness: 0.1,
    roughness: 0.35,
    transparent: true,
    opacity: 0.85,
  })

  const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial)

  const liquidProfile = [
    new THREE.Vector2(0, 0.05),
    new THREE.Vector2(0.26, 0.05),
    new THREE.Vector2(0.3, 0.2),
    new THREE.Vector2(0.31, 0.55),
    new THREE.Vector2(0.3, 0.95),
    new THREE.Vector2(0.2, 1.15),
    new THREE.Vector2(0.18, 1.25),
    new THREE.Vector2(0, 1.28),
  ]

  const liquidGeometry = new THREE.LatheGeometry(liquidProfile, 48)
  liquidGeometry.computeBoundingBox()
  if (liquidGeometry.boundingBox) {
    const center = new THREE.Vector3()
    liquidGeometry.boundingBox.getCenter(center)
    liquidGeometry.translate(-center.x, -center.y, -center.z)
  }

  const liquidMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b0d0d,
    metalness: 0,
    roughness: 0.6,
    transparent: true,
    opacity: 0.85,
  })

  const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial)

  const group = new THREE.Group()
  group.add(bottle, liquid)
  group.scale.set(0.6, 0.6, 0.6)
  group.rotation.y = -Math.PI * 0.15
  return group
}

const createShore = () => {
  const groundWidth = 10
  const groundDepth = 6
  const groundCenterZ = 1.2
  const shoreZ = groundCenterZ - groundDepth / 2
  const baseHeight = 0.06
  const slopeFactor = 0.05

  const getGroundHeightAt = (x, z) => {
    const slope = Math.max(0, z - shoreZ) * slopeFactor
    const noise =
      Math.sin(x * 0.35) * Math.cos(z * 0.4) * 0.06 +
      Math.sin((x + z) * 0.2) * 0.03
    const height = baseHeight + slope + noise
    return Math.max(0.02, height)
  }

  const groundGeometry = new THREE.PlaneGeometry(
    groundWidth,
    groundDepth,
    80,
    50
  )
  groundGeometry.rotateX(-Math.PI / 2)
  const groundPositions = groundGeometry.attributes.position
  for (let i = 0; i < groundPositions.count; i += 1) {
    const x = groundPositions.getX(i)
    const z = groundPositions.getZ(i) + groundCenterZ
    const y = getGroundHeightAt(x, z)
    groundPositions.setY(i, y)
  }
  groundPositions.needsUpdate = true
  groundGeometry.computeVertexNormals()

  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b7d3f,
    roughness: 0.95,
    metalness: 0,
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.position.z = groundCenterZ

  const waterWidth = 16
  const waterDepth = 10
  const waterGeometry = new THREE.PlaneGeometry(waterWidth, waterDepth, 1, 1)
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a6fb2,
    roughness: 0.25,
    metalness: 0.25,
    transparent: true,
    opacity: 0.9,
  })
  const water = new THREE.Mesh(waterGeometry, waterMaterial)
  water.rotation.x = -Math.PI / 2
  water.position.set(0, -0.25, shoreZ - waterDepth / 2 + 0.3)

  const bounds = {
    minX: -groundWidth / 2 + 0.6,
    maxX: groundWidth / 2 - 0.6,
    minZ: shoreZ + 0.4,
    maxZ: groundCenterZ + groundDepth / 2 - 0.6,
  }

  const group = new THREE.Group()
  group.add(water, ground)
  return {
    group,
    ground,
    getGroundHeightAt,
    bounds,
    shoreZ,
  }
}

const { group: shore, ground, getGroundHeightAt, bounds, shoreZ } =
  createShore()
scene.add(shore)

const placeOnGround = (object, x, z, lift = 0) => {
  object.position.set(x, 0, z)
  object.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(object)
  const groundY = getGroundHeightAt(x, z) + lift
  object.position.y += groundY - box.min.y
}

const scaleToHeight = (object, targetHeight) => {
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  box.getSize(size)
  if (size.y <= 0) return
  const factor = targetHeight / size.y
  object.scale.multiplyScalar(factor)
}

const picnicZ = shoreZ + 0.8

const heartMesh = createHeartMesh()
const bottleGroup = createBottleGroup()

const blanketGeometry = new THREE.PlaneGeometry(1.8, 1.2, 16, 12)

const blanketMaterial = new THREE.MeshStandardMaterial({
  color: 0xd86a7a,
  roughness: 0.8,
  metalness: 0.05,
  side: THREE.DoubleSide,
})

const blanket = new THREE.Mesh(blanketGeometry, blanketMaterial)
blanket.rotation.x = -Math.PI / 2
blanket.rotation.z = Math.PI * 0.08
placeOnGround(blanket, 1.2, picnicZ + 0.7, 0.01)

const conformBlanketToGround = () => {
  blanket.updateMatrixWorld(true)
  const inverse = new THREE.Matrix4().copy(blanket.matrixWorld).invert()
  const positions = blanketGeometry.attributes.position
  const local = new THREE.Vector3()
  const world = new THREE.Vector3()

  for (let i = 0; i < positions.count; i += 1) {
    local.fromBufferAttribute(positions, i)
    world.copy(local).applyMatrix4(blanket.matrixWorld)
    world.y = getGroundHeightAt(world.x, world.z) + 0.01
    local.copy(world).applyMatrix4(inverse)
    positions.setXYZ(i, local.x, local.y, local.z)
  }

  positions.needsUpdate = true
  blanketGeometry.computeVertexNormals()
}

conformBlanketToGround()
const blanketPositions = blanketGeometry.attributes.position
const blanketBasePositions = new Float32Array(blanketPositions.array)
const blanketDisplacements = new Float32Array(blanketPositions.count)

scene.add(blanket)

const createForest = () => {
  const group = new THREE.Group()
  const treeCount = 16
  const bushCount = 20

  const rand = (() => {
    let seed = 912345
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  })()

  const randRange = (min, max) => min + (max - min) * rand()

  const trunkGeometry = new THREE.CylinderGeometry(0.07, 0.1, 0.7, 8)
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x6a4a2f,
    roughness: 0.9,
  })
  const leafGeometry = new THREE.ConeGeometry(0.35, 0.9, 8)
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f6b3f,
    roughness: 0.9,
  })

  const trunkMesh = new THREE.InstancedMesh(
    trunkGeometry,
    trunkMaterial,
    treeCount
  )
  const leafMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, treeCount)

  const dummy = new THREE.Object3D()
  const picnicCenter = new THREE.Vector2(0, picnicZ)
  let placed = 0
  let attempts = 0

  while (placed < treeCount && attempts < treeCount * 12) {
    attempts += 1
    const x = randRange(bounds.minX + 0.3, bounds.maxX - 0.3)
    const z = randRange(shoreZ + 1.6, bounds.maxZ)
    const dist = picnicCenter.distanceTo(new THREE.Vector2(x, z))
    if (dist < 1.6) continue

    const y = getGroundHeightAt(x, z)
    const scale = randRange(0.85, 1.25)

    dummy.position.set(x, y + 0.35 * scale, z)
    dummy.scale.set(scale, scale, scale)
    dummy.rotation.y = randRange(0, Math.PI * 2)
    dummy.updateMatrix()
    trunkMesh.setMatrixAt(placed, dummy.matrix)

    dummy.position.set(x, y + 0.95 * scale, z)
    dummy.scale.set(scale * 1.15, scale * 1.15, scale * 1.15)
    dummy.rotation.y = randRange(0, Math.PI * 2)
    dummy.updateMatrix()
    leafMesh.setMatrixAt(placed, dummy.matrix)

    placed += 1
  }

  trunkMesh.instanceMatrix.needsUpdate = true
  leafMesh.instanceMatrix.needsUpdate = true
  group.add(trunkMesh, leafMesh)

  const bushGeometry = new THREE.IcosahedronGeometry(0.22, 1)
  const bushMaterial = new THREE.MeshStandardMaterial({
    color: 0x377b41,
    roughness: 0.95,
  })
  const bushMesh = new THREE.InstancedMesh(
    bushGeometry,
    bushMaterial,
    bushCount
  )

  placed = 0
  attempts = 0
  while (placed < bushCount && attempts < bushCount * 12) {
    attempts += 1
    const x = randRange(bounds.minX + 0.2, bounds.maxX - 0.2)
    const z = randRange(shoreZ + 1.2, bounds.maxZ)
    const dist = picnicCenter.distanceTo(new THREE.Vector2(x, z))
    if (dist < 1.1) continue

    const y = getGroundHeightAt(x, z)
    const scale = randRange(0.7, 1.3)

    dummy.position.set(x, y + 0.15 * scale, z)
    dummy.scale.set(scale, scale, scale)
    dummy.rotation.y = randRange(0, Math.PI * 2)
    dummy.updateMatrix()
    bushMesh.setMatrixAt(placed, dummy.matrix)

    placed += 1
  }

  bushMesh.instanceMatrix.needsUpdate = true
  group.add(bushMesh)

  return group
}

scene.add(createForest())

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

const heroBounds = new THREE.Box3().setFromObject(hero)
const heroSize = new THREE.Vector3()
heroBounds.getSize(heroSize)
const targetPropHeight = heroSize.y / 5

scaleToHeight(heartMesh, targetPropHeight)
scaleToHeight(bottleGroup, targetPropHeight)

placeOnGround(heartMesh, -0.6, picnicZ + 0.05)
placeOnGround(bottleGroup, 0.5, picnicZ - 0.15)
scene.add(heartMesh, bottleGroup)

const keys = new Set()
const onKeyDown = (event) => {
  keys.add(event.key.toLowerCase())
}
const onKeyUp = (event) => {
  keys.delete(event.key.toLowerCase())
}
window.addEventListener('keydown', onKeyDown)
window.addEventListener('keyup', onKeyUp)

const clock = new THREE.Clock()
const heroSpeed = 1.1
const heroLocal = new THREE.Vector3()
const pressRadius = 0.55
const pressStrength = 0.08
const pressStiffness = 12
const minBlanketDown = -0.008

const animate = () => {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const time = clock.getElapsedTime()

  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  forward.y = 0
  if (forward.lengthSq() > 0) {
    forward.normalize()
  }
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

  const move = new THREE.Vector3()
  if (keys.has('w') || keys.has('arrowup')) move.add(forward)
  if (keys.has('s') || keys.has('arrowdown')) move.sub(forward)
  if (keys.has('a') || keys.has('arrowleft')) move.sub(right)
  if (keys.has('d') || keys.has('arrowright')) move.add(right)

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
    const facing = hero.position.clone().add(move)
    hero.lookAt(facing.x, hero.position.y, facing.z)
  }

  heroLocal.copy(hero.position)
  blanket.worldToLocal(heroLocal)
  const smoothing = 1 - Math.exp(-pressStiffness * delta)

  for (let i = 0; i < blanketPositions.count; i += 1) {
    const baseIndex = i * 3
    const baseX = blanketBasePositions[baseIndex]
    const baseY = blanketBasePositions[baseIndex + 1]
    const baseZ = blanketBasePositions[baseIndex + 2]

    const dx = baseX - heroLocal.x
    const dy = baseY - heroLocal.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    let target = 0
    if (dist < pressRadius) {
      const t = 1 - dist / pressRadius
      target = -pressStrength * t * t
    }
    target = Math.max(target, minBlanketDown)

    const current = blanketDisplacements[i]
    const next = current + (target - current) * smoothing
    blanketDisplacements[i] = next
    blanketPositions.setZ(i, baseZ + next)
  }
  blanketPositions.needsUpdate = true
  blanketGeometry.computeVertexNormals()

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
