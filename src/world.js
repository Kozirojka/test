import * as THREE from 'three'

export const createShore = () => {
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

export const waterWaveAt = (localX, localY, time) =>
  Math.sin(localX * 1.2 + time * 1.6) * 0.07 +
  Math.cos(localY * 1.1 + time * 1.3) * 0.05 +
  Math.sin((localX + localY) * 0.6 + time * 0.9) * 0.03

export const updateWater = (water, time) => {
  const waterPositions = water.geometry.attributes.position
  for (let i = 0; i < waterPositions.count; i += 1) {
    const x = waterPositions.getX(i)
    const y = waterPositions.getY(i)
    const wave = waterWaveAt(x, y, time)
    waterPositions.setZ(i, wave)
  }
  waterPositions.needsUpdate = true
  water.geometry.computeVertexNormals()
}

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

const lerp = (a, b, t) => a + (b - a) * t
const smoothstep = (t) => t * t * (3 - 2 * t)

export const createSwanSystem = (
  scene,
  water,
  waterCenter,
  waterWidth,
  waterDepth
) => {
  const swans = []
  const addSwan = (color, id) => {
    const swan = createSwan(color)
    swan.userData = { id }
    swans.push(swan)
    scene.add(swan)
  }

  addSwan(0xffffff, 0)
  addSwan(0x1a1a1a, 1)

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
        13 * cosT -
        5 * Math.cos(2 * swanT) -
        2 * Math.cos(3 * swanT) -
        Math.cos(4 * swanT)
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

  const updateSwans = (time, delta) => {
    const waterBaseY = water.position.y + 0.02
    for (const swan of swans) {
      const { id } = swan.userData
      const pos = getSwanCurvePosition(swanStoryTime, id)
      const worldX = waterCenter.x + pos.x
      const worldZ = waterCenter.y + pos.z

      const localX = worldX - waterCenter.x
      const localY = -(worldZ - waterCenter.y)
      const waveHeight = waterWaveAt(localX, localY, time)
      const bob = Math.sin(swanStoryTime * 2 + id) * 0.01
      swan.position.set(worldX, waterBaseY + waveHeight + 0.06 + bob, worldZ)

      const ahead = getSwanCurvePosition(swanStoryTime + 0.03, id)
      const aheadX = waterCenter.x + ahead.x
      const aheadZ = waterCenter.y + ahead.z
      const dirX = aheadX - worldX
      const dirZ = aheadZ - worldZ
      swan.rotation.y = Math.atan2(dirX, dirZ)
      swan.rotation.z = Math.sin(swanStoryTime * 1.3 + id) * 0.02
    }
    swanStoryTime += delta
  }

  return { swans, updateSwans }
}

export const createForest = ({ bounds, shoreZ, picnicZ, getGroundHeightAt }) => {
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
