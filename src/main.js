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
controls.enabled = true
controls.enablePan = false

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

  const waterWidth = 14
  const waterDepth = 8
  const waterGeometry = new THREE.PlaneGeometry(waterWidth, waterDepth, 28, 18)
  const waterMaterial = new THREE.MeshPhongMaterial({
    color: 0x2a6fb2,
    specular: 0x7fd9ff,
    shininess: 70,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  })
  const water = new THREE.Mesh(waterGeometry, waterMaterial)
  water.rotation.x = -Math.PI / 2
  water.position.set(0, -0.22, shoreZ - waterDepth / 2 + 0.8)
  const waterCenter = new THREE.Vector2(water.position.x, water.position.z)

  const waterWireMaterial = new THREE.MeshBasicMaterial({
    color: 0x9ad8ff,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
  const waterWire = new THREE.Mesh(waterGeometry, waterWireMaterial)
  waterWire.rotation.copy(water.rotation)
  waterWire.position.copy(water.position)
  waterWire.renderOrder = 1

  const bounds = {
    minX: -groundWidth / 2 + 0.6,
    maxX: groundWidth / 2 - 0.6,
    minZ: shoreZ + 0.4,
    maxZ: groundCenterZ + groundDepth / 2 - 0.6,
  }

  const group = new THREE.Group()
  group.add(water, waterWire, ground)
  return {
    group,
    ground,
    getGroundHeightAt,
    bounds,
    shoreZ,
    water,
    waterWidth,
    waterDepth,
    waterCenter,
  }
}

const {
  group: shore,
  ground,
  getGroundHeightAt,
  bounds,
  shoreZ,
  water,
  waterWidth,
  waterDepth,
  waterCenter,
} = createShore()
scene.add(shore)

const placeOnGround = (object, x, z, lift = 0) => {
  object.position.set(x, 0, z)
  object.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(object)
  const groundY = getGroundHeightAt(x, z) + lift
  object.position.y += groundY - box.min.y
}

const placeOnSurface = (object, x, z, lift = 0) => {
  object.position.set(x, 0, z)
  object.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(object)
  const surfaceY = getSurfaceHeightAt(x, z) + lift
  object.position.y += surfaceY - box.min.y
}

const createFloralTexture = () => {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#d86a7a'
  ctx.fillRect(0, 0, size, size)

  const drawFlower = (cx, cy, petals, radius, petalColor, centerColor) => {
    ctx.fillStyle = petalColor
    for (let i = 0; i < petals; i += 1) {
      const angle = (i / petals) * Math.PI * 2
      const px = cx + Math.cos(angle) * radius
      const py = cy + Math.sin(angle) * radius
      ctx.beginPath()
      ctx.ellipse(px, py, radius * 0.45, radius * 0.75, angle, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = centerColor
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }

  const grid = 6
  const cell = size / grid
  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < grid; x += 1) {
      const jitterX = (Math.sin((x + 1) * 3.2) * 0.15 + 0.5) * cell
      const jitterY = (Math.cos((y + 1) * 2.7) * 0.15 + 0.5) * cell
      const cx = x * cell + jitterX
      const cy = y * cell + jitterY
      const petals = 5 + ((x + y) % 2)
      const radius = cell * 0.18
      drawFlower(cx, cy, petals, radius, '#f6c0d0', '#f7e1a0')
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 2)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

const createThickBlanketGeometry = (width, height, segW, segH, thickness) => {
  const base = new THREE.PlaneGeometry(width, height, segW, segH)
  const basePositions = base.attributes.position
  const topCount = basePositions.count
  const positions = new Float32Array(topCount * 2 * 3)

  for (let i = 0; i < topCount; i += 1) {
    const x = basePositions.getX(i)
    const y = basePositions.getY(i)
    const i3 = i * 3
    positions[i3] = x
    positions[i3 + 1] = y
    positions[i3 + 2] = 0

    const j3 = (i + topCount) * 3
    positions[j3] = x
    positions[j3 + 1] = y
    positions[j3 + 2] = -thickness
  }

  const indices = []
  const baseIndex = base.index?.array
  if (baseIndex) {
    for (let i = 0; i < baseIndex.length; i += 3) {
      indices.push(baseIndex[i], baseIndex[i + 1], baseIndex[i + 2])
      indices.push(
        baseIndex[i] + topCount,
        baseIndex[i + 2] + topCount,
        baseIndex[i + 1] + topCount
      )
    }
  }

  const row = segW + 1
  const addSide = (a, b) => {
    indices.push(a, a + topCount, b + topCount)
    indices.push(a, b + topCount, b)
  }

  for (let i = 0; i < segW; i += 1) {
    addSide(i, i + 1)
  }
  const lastRowStart = segH * row
  for (let i = 0; i < segW; i += 1) {
    addSide(lastRowStart + i + 1, lastRowStart + i)
  }
  for (let j = 0; j < segH; j += 1) {
    addSide((j + 1) * row, j * row)
  }
  for (let j = 0; j < segH; j += 1) {
    addSide(j * row + segW, (j + 1) * row + segW)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.userData = { topCount, thickness }
  return geometry
}

const scaleToHeight = (object, targetHeight) => {
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  box.getSize(size)
  if (size.y <= 0) return
  const factor = targetHeight / size.y
  object.scale.multiplyScalar(factor)
}

const propGroundEpsilon = 0.02
const picnicZ = shoreZ + 0.8

const heartMesh = createHeartMesh()
const bottleGroup = createBottleGroup()

const blanketThickness = 0.06
const blanketGeometry = createThickBlanketGeometry(
  1.8,
  1.2,
  16,
  12,
  blanketThickness
)

const blanketTexture = createFloralTexture()
const blanketMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.85,
  metalness: 0.05,
  side: THREE.DoubleSide,
  map: blanketTexture ?? undefined,
})

const blanket = new THREE.Mesh(blanketGeometry, blanketMaterial)
blanket.rotation.x = -Math.PI / 2
blanket.rotation.z = Math.PI * 0.08
placeOnGround(blanket, 1.2, picnicZ + 0.7, 0.01)

const conformBlanketToGround = () => {
  blanket.updateMatrixWorld(true)
  const inverse = new THREE.Matrix4().copy(blanket.matrixWorld).invert()
  const positions = blanketGeometry.attributes.position
  const { topCount, thickness } = blanketGeometry.userData
  const local = new THREE.Vector3()
  const world = new THREE.Vector3()

  for (let i = 0; i < topCount; i += 1) {
    local.fromBufferAttribute(positions, i)
    world.copy(local).applyMatrix4(blanket.matrixWorld)
    world.y = getGroundHeightAt(world.x, world.z) + 0.01
    local.copy(world).applyMatrix4(inverse)
    positions.setXYZ(i, local.x, local.y, local.z + thickness)
    positions.setXYZ(i + topCount, local.x, local.y, local.z)
  }

  positions.needsUpdate = true
  blanketGeometry.computeVertexNormals()
}

conformBlanketToGround()
const blanketPositions = blanketGeometry.attributes.position
const { topCount: blanketTopCount } = blanketGeometry.userData
const blanketBasePositions = new Float32Array(blanketTopCount * 3)
for (let i = 0; i < blanketTopCount; i += 1) {
  const i3 = i * 3
  blanketBasePositions[i3] = blanketPositions.getX(i)
  blanketBasePositions[i3 + 1] = blanketPositions.getY(i)
  blanketBasePositions[i3 + 2] = blanketPositions.getZ(i)
}
const blanketDisplacements = new Float32Array(blanketTopCount)

scene.add(blanket)

const createSwan = (bodyColor) => {
  const swan = new THREE.Group()

  const bodyGeometry = new THREE.SphereGeometry(0.12, 18, 12)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.6,
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.scale.set(1.5, 0.9, 2)

  const neckGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.26, 12)
  const neck = new THREE.Mesh(neckGeometry, bodyMaterial)
  neck.position.set(0, 0.16, 0.12)
  neck.rotation.x = -Math.PI * 0.1

  const headGeometry = new THREE.SphereGeometry(0.05, 12, 10)
  const head = new THREE.Mesh(headGeometry, bodyMaterial)
  head.position.set(0, 0.3, 0.18)

  const beakGeometry = new THREE.ConeGeometry(0.025, 0.08, 10)
  const beakMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2a14a,
    roughness: 0.5,
  })
  const beak = new THREE.Mesh(beakGeometry, beakMaterial)
  beak.position.set(0, 0.29, 0.25)
  beak.rotation.x = Math.PI / 2

  swan.add(body, neck, head, beak)
  return swan
}

const waterSwans = []
const addSwan = (color, id) => {
  const swan = createSwan(color)
  swan.userData = {
    id,
  }
  waterSwans.push(swan)
  scene.add(swan)
}

addSwan(0xffffff, 0)
addSwan(0x1a1a1a, 1)

const surfaceRaycaster = new THREE.Raycaster()
const surfaceOrigin = new THREE.Vector3()
const surfaceDown = new THREE.Vector3(0, -1, 0)
const getSurfaceHeightAt = (x, z) => {
  let height = getGroundHeightAt(x, z)
  surfaceOrigin.set(x, height + 2, z)
  surfaceRaycaster.set(surfaceOrigin, surfaceDown)
  const hit = surfaceRaycaster.intersectObject(blanket, false)[0]
  if (hit) {
    height = Math.max(height, hit.point.y)
  }
  return height
}

const waterWaveAt = (localX, localY, time) =>
  Math.sin(localX * 1.2 + time * 1.6) * 0.07 +
  Math.cos(localY * 1.1 + time * 1.3) * 0.05 +
  Math.sin((localX + localY) * 0.6 + time * 0.9) * 0.03

const lerp = (a, b, t) => a + (b - a) * t
const smoothstep = (t) => t * t * (3 - 2 * t)

const heartDuration = 18
const hugDuration = 10
const separateDuration = 14
const storySpeed = 1
const storyTotal = heartDuration + hugDuration + separateDuration
const minWaterSize = Math.min(waterWidth, waterDepth)
const heartScale = 0.18 * minWaterSize
const hugRadius = 0.22 * minWaterSize
const separateRadius = 0.35 * minWaterSize
let swanStoryTime = 0

const getSwanCurvePosition = (time, swanId) => {
  const t = (time * storySpeed) % storyTotal
  const phaseOffset = swanId === 0 ? 0 : 1

  if (t < heartDuration) {
    const phaseT = t / heartDuration
    const baseT = phaseT * Math.PI * 2
    const offset = lerp(Math.PI, 0, smoothstep(phaseT))
    const swanT = baseT + (phaseOffset ? offset : 0)
    const sinT = Math.sin(swanT)
    const cosT = Math.cos(swanT)
    const x = 16 * sinT * sinT * sinT
    const y =
      13 * cosT - 5 * Math.cos(2 * swanT) - 2 * Math.cos(3 * swanT) - Math.cos(4 * swanT)
    return {
      x: x * heartScale,
      z: y * heartScale * 0.8,
    }
  }

  if (t < heartDuration + hugDuration) {
    const phaseT = (t - heartDuration) / hugDuration
    const angle = phaseT * Math.PI * 2
    const offset = 0.6
    const swanAngle = angle + (phaseOffset ? offset : 0)
    return {
      x: Math.cos(swanAngle) * hugRadius,
      z: Math.sin(swanAngle) * hugRadius,
    }
  }

  const phaseT = (t - heartDuration - hugDuration) / separateDuration
  const angle = phaseT * Math.PI * 2
  const offset = lerp(0.6, Math.PI, smoothstep(phaseT))
  const swanAngle = angle + (phaseOffset ? offset : 0)
  return {
    x: Math.cos(swanAngle) * separateRadius,
    z: Math.sin(swanAngle) * separateRadius,
  }
}

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
controls.target.copy(hero.position)
const lastHeroPosition = hero.position.clone()

const holdAnchor = new THREE.Object3D()
holdAnchor.position.set(0.28, 0.38, 0.22)
hero.add(holdAnchor)

const heroBounds = new THREE.Box3().setFromObject(hero)
const heroSize = new THREE.Vector3()
heroBounds.getSize(heroSize)
const targetPropHeight = heroSize.y / 5


scaleToHeight(heartMesh, targetPropHeight)
scaleToHeight(bottleGroup, targetPropHeight)

placeOnSurface(heartMesh, -0.6, picnicZ + 0.05, propGroundEpsilon)
placeOnSurface(bottleGroup, 0.5, picnicZ - 0.15, propGroundEpsilon)
scene.add(heartMesh, bottleGroup)

const heroRadius = 0.5 * Math.max(heroSize.x, heroSize.z)
const createPropBody = (mesh) => {
  const box = new THREE.Box3().setFromObject(mesh)
  const size = new THREE.Vector3()
  box.getSize(size)
  return {
    mesh,
    velocity: new THREE.Vector3(),
    angular: new THREE.Vector3(),
    radius: 0.5 * Math.max(size.x, size.z),
    halfHeight: size.y / 2 + propGroundEpsilon,
    cooldown: 0,
    held: false,
  }
}

const props = [createPropBody(heartMesh), createPropBody(bottleGroup)]

const actionHint = document.createElement('div')
actionHint.textContent = '1. Підняти Press L'
actionHint.style.position = 'fixed'
actionHint.style.left = '0'
actionHint.style.top = '0'
actionHint.style.transform = 'translate(-50%, -120%)'
actionHint.style.padding = '6px 10px'
actionHint.style.borderRadius = '8px'
actionHint.style.background = 'rgba(16, 18, 24, 0.85)'
actionHint.style.color = '#f7e9ef'
actionHint.style.fontSize = '13px'
actionHint.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif'
actionHint.style.letterSpacing = '0.2px'
actionHint.style.pointerEvents = 'none'
actionHint.style.whiteSpace = 'nowrap'
actionHint.style.display = 'none'
actionHint.style.boxShadow = '0 8px 18px rgba(0,0,0,0.25)'
document.body.appendChild(actionHint)

let activeProp = null
let heldProp = null
const actionProject = new THREE.Vector3()

const keys = new Set()
const onKeyDown = (event) => {
  const key = event.key.toLowerCase()
  const code = event.code
  keys.add(key)
  if (code) {
    keys.add(code)
  }
  if ((key === 'l' || code === 'KeyL') && activeProp && !heldProp) {
    heldProp = activeProp
    heldProp.held = true
    heldProp.velocity.set(0, 0, 0)
    heldProp.angular.set(0, 0, 0)
    heldProp.mesh.position.set(0, 0, 0)
    heldProp.mesh.rotation.set(0, 0, 0)
    holdAnchor.add(heldProp.mesh)
    activeProp = null
    actionHint.style.display = 'none'
  }
  if ((key === 'k' || code === 'KeyK') && heldProp) {
    const dropDir = new THREE.Vector3(0, 0, 1).applyQuaternion(
      hero.quaternion
    )
    const dropX = hero.position.x + dropDir.x * 0.6
    const dropZ = hero.position.z + dropDir.z * 0.6

    holdAnchor.remove(heldProp.mesh)
    scene.add(heldProp.mesh)
    placeOnSurface(heldProp.mesh, dropX, dropZ, propGroundEpsilon)
    heldProp.velocity.set(dropDir.x * 0.2, 0.2, dropDir.z * 0.2)
    heldProp.angular.set(
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 1.2
    )
    heldProp.held = false
    heldProp.cooldown = 0.5
    heldProp = null
  }
}
const onKeyUp = (event) => {
  const key = event.key.toLowerCase()
  keys.delete(key)
  if (event.code) {
    keys.delete(event.code)
  }
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
const gravity = 3.2
const propFriction = 0.85
const propBounce = 0.2
const propAngularDamp = 0.92
const waterBaseY = water.position.y + 0.02

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
    const facing = hero.position.clone().add(move)
    hero.lookAt(facing.x, hero.position.y, facing.z)
  }

  if (!hero.position.equals(lastHeroPosition)) {
    const deltaHero = hero.position.clone().sub(lastHeroPosition)
    camera.position.add(deltaHero)
    controls.target.add(deltaHero)
    lastHeroPosition.copy(hero.position)
  }

  const waterPositions = water.geometry.attributes.position
  for (let i = 0; i < waterPositions.count; i += 1) {
    const x = waterPositions.getX(i)
    const y = waterPositions.getY(i)
    const wave = waterWaveAt(x, y, time)
    waterPositions.setZ(i, wave)
  }
  waterPositions.needsUpdate = true
  water.geometry.computeVertexNormals()

  const swanTime = swanStoryTime
  for (const swan of waterSwans) {
    const { id } = swan.userData
    const pos = getSwanCurvePosition(swanTime, id)
    const worldX = waterCenter.x + pos.x
    const worldZ = waterCenter.y + pos.z

    const localX = worldX - waterCenter.x
    const localY = -(worldZ - waterCenter.y)
    const waveHeight = waterWaveAt(localX, localY, time)
    const bob = Math.sin(swanTime * 2 + id) * 0.01
    swan.position.set(worldX, water.position.y + waveHeight + 0.06 + bob, worldZ)

    const ahead = getSwanCurvePosition(swanTime + 0.03, id)
    const aheadX = waterCenter.x + ahead.x
    const aheadZ = waterCenter.y + ahead.z
    const dirX = aheadX - worldX
    const dirZ = aheadZ - worldZ
    swan.rotation.y = Math.atan2(dirX, dirZ)
    swan.rotation.z = Math.sin(swanTime * 1.3 + id) * 0.02
  }
  swanStoryTime += delta

  for (const prop of props) {
    if (prop.held) continue
    if (prop.cooldown > 0) {
      prop.cooldown = Math.max(0, prop.cooldown - delta)
    }

    prop.velocity.y -= gravity * delta
    prop.mesh.position.addScaledVector(prop.velocity, delta)

    if (prop.mesh.position.x < bounds.minX) {
      prop.mesh.position.x = bounds.minX
      prop.velocity.x *= -0.3
    } else if (prop.mesh.position.x > bounds.maxX) {
      prop.mesh.position.x = bounds.maxX
      prop.velocity.x *= -0.3
    }

    if (prop.mesh.position.z < bounds.minZ) {
      prop.mesh.position.z = bounds.minZ
      prop.velocity.z *= -0.3
    } else if (prop.mesh.position.z > bounds.maxZ) {
      prop.mesh.position.z = bounds.maxZ
      prop.velocity.z *= -0.3
    }

    const floorY =
      getSurfaceHeightAt(prop.mesh.position.x, prop.mesh.position.z) +
      prop.halfHeight
    if (prop.mesh.position.y < floorY) {
      prop.mesh.position.y = floorY
      if (prop.velocity.y < 0) {
        prop.velocity.y *= -propBounce
      }
      prop.velocity.x *= propFriction
      prop.velocity.z *= propFriction
    }

    const dx = prop.mesh.position.x - hero.position.x
    const dz = prop.mesh.position.z - hero.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < heroRadius + prop.radius && prop.cooldown <= 0) {
      let dirX = dx
      let dirZ = dz
      if (dist < 0.0001) {
        const angle = Math.random() * Math.PI * 2
        dirX = Math.cos(angle)
        dirZ = Math.sin(angle)
      } else {
        dirX /= dist
        dirZ /= dist
      }

      prop.velocity.x += dirX * 0.9
      prop.velocity.z += dirZ * 0.9
      prop.velocity.y += 0.6
      prop.angular.set(
        (Math.random() - 0.5) * 3.2,
        (Math.random() - 0.5) * 3.2,
        (Math.random() - 0.5) * 3.2
      )
      prop.cooldown = 0.35
    }

    prop.angular.multiplyScalar(propAngularDamp)
    prop.mesh.rotation.x += prop.angular.x * delta
    prop.mesh.rotation.y += prop.angular.y * delta
    prop.mesh.rotation.z += prop.angular.z * delta
  }

  if (!heldProp) {
    activeProp = null
    let nearestDist = Infinity
    for (const prop of props) {
      if (prop.held) continue
      const dx = prop.mesh.position.x - hero.position.x
      const dz = prop.mesh.position.z - hero.position.z
      const dist = Math.hypot(dx, dz)
      const range = heroRadius + prop.radius + 0.2
      if (dist < range && dist < nearestDist) {
        nearestDist = dist
        activeProp = prop
      }
    }

    if (activeProp) {
      const rect = renderer.domElement.getBoundingClientRect()
      actionProject.copy(activeProp.mesh.position)
      actionProject.y += activeProp.halfHeight + 0.05
      actionProject.project(camera)
      const screenX = (actionProject.x * 0.5 + 0.5) * rect.width + rect.left
      const screenY = (-actionProject.y * 0.5 + 0.5) * rect.height + rect.top
      actionHint.style.left = `${screenX}px`
      actionHint.style.top = `${screenY}px`
      actionHint.style.display = 'block'
    } else {
      actionHint.style.display = 'none'
    }
  } else {
    actionHint.style.display = 'none'
  }

  heroLocal.copy(hero.position)
  blanket.worldToLocal(heroLocal)
  const smoothing = 1 - Math.exp(-pressStiffness * delta)

  for (let i = 0; i < blanketTopCount; i += 1) {
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
    const topZ = baseZ + next
    blanketPositions.setXYZ(i, baseX, baseY, topZ)
    blanketPositions.setXYZ(i + blanketTopCount, baseX, baseY, topZ - blanketThickness)
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
