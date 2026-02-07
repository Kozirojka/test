import * as THREE from 'three'

const lerp = (a, b, t) => a + (b - a) * t
const smoothstep = (edge0, edge1, x) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export const createShore = () => {
  const groundWidth = 10
  const groundDepth = 6
  const groundCenterZ = 1.2
  const shoreZ = groundCenterZ - groundDepth / 2

  const shoreBand = 1.6
  const shoreLow = 0.01
  const landBase = 0.08
  const noiseAmp = 0.045

  const plateauCenter = new THREE.Vector2(-0.6, shoreZ + 3.1)
  const plateauInner = 0.9
  const plateauOuter = 2.2
  const plateauHeight = 0.35

  const roadHalf = 0.28
  const roadBlend = 0.24

  const getTerrainSample = (x, z) => {
    const shoreT = smoothstep(0, shoreBand, z - shoreZ)
    const baseNoise =
      Math.sin(x * 0.35) * Math.cos(z * 0.4) * 0.6 +
      Math.sin((x + z) * 0.2) * 0.4

    const dist = Math.hypot(x - plateauCenter.x, z - plateauCenter.y)
    const plateauT = 1 - smoothstep(plateauInner, plateauOuter, dist)
    const noise = baseNoise * noiseAmp * (1 - plateauT * 0.5)

    let height = shoreLow + (landBase + noise) * shoreT
    height += plateauHeight * plateauT

    const roadBaseZ = plateauCenter.y - 0.2
    const roadZ = roadBaseZ + Math.sin(x * 0.45) * 0.35
    const roadDistance = Math.abs(z - roadZ)
    const roadMask =
      (1 - smoothstep(roadHalf, roadHalf + roadBlend, roadDistance)) * shoreT
    height = lerp(height, height - 0.03, roadMask)

    return { height: Math.max(0.01, height), roadMask }
  }

  const getGroundHeightAt = (x, z) => getTerrainSample(x, z).height
  const getRoadMaskAt = (x, z) => getTerrainSample(x, z).roadMask

  const groundGeometry = new THREE.PlaneGeometry(
    groundWidth,
    groundDepth,
    80,
    50
  )
  groundGeometry.rotateX(-Math.PI / 2)
  const groundPositions = groundGeometry.attributes.position
  const groundColors = new Float32Array(groundPositions.count * 3)
  const grassColor = new THREE.Color(0x6bb86a)
  const dirtColor = new THREE.Color(0xbda58a)
  const mixedColor = new THREE.Color()
  for (let i = 0; i < groundPositions.count; i += 1) {
    const x = groundPositions.getX(i)
    const z = groundPositions.getZ(i) + groundCenterZ
    const { height, roadMask } = getTerrainSample(x, z)
    const y = height
    groundPositions.setY(i, y)

    mixedColor.copy(grassColor).lerp(dirtColor, roadMask)
    const c3 = i * 3
    groundColors[c3] = mixedColor.r
    groundColors[c3 + 1] = mixedColor.g
    groundColors[c3 + 2] = mixedColor.b
  }
  groundPositions.needsUpdate = true
  groundGeometry.setAttribute('color', new THREE.BufferAttribute(groundColors, 3))
  groundGeometry.computeVertexNormals()

  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b7d3f,
    roughness: 0.95,
    metalness: 0,
    vertexColors: true,
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

  const reeds = createReeds({
    bounds,
    shoreZ,
    water,
    waterDepth,
    getGroundHeightAt,
  })
  const roadStones = createRoadStones({
    bounds,
    shoreZ,
    getTerrainSample,
  })
  const roadTwigs = createRoadTwigs({
    bounds,
    shoreZ,
    getTerrainSample,
  })

  const group = new THREE.Group()
  group.add(water, waterWire, ground, reeds, roadStones, roadTwigs)
  return {
    group,
    ground,
    getGroundHeightAt,
    getRoadMaskAt,
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
  neck.position.set(0, 0.175, 0.12)
  neck.rotation.x = -Math.PI * 0.1

  const headGeometry = new THREE.SphereGeometry(0.05, 12, 10)
  const head = new THREE.Mesh(headGeometry, bodyMaterial)
  head.position.set(0, 0.285, 0.165)
  head.rotation.x = Math.PI * 0.05

  const beakGeometry = new THREE.ConeGeometry(0.025, 0.08, 10)
  const beakMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2a14a,
    roughness: 0.5,
  })
  const beak = new THREE.Mesh(beakGeometry, beakMaterial)
  beak.position.set(0, 0.295, 0.27)
  beak.rotation.x = Math.PI / 2

  swan.add(body, neck, head, beak)
  return swan
}

export const createSwanSystem = (
  scene,
  water,
  waterCenter,
  waterWidth,
  waterDepth
) => {
  const swans = []
  const wakeSegments = 18
  const wakeLength = 1.2
  const wakeSpread = 0.14
  const wakeLift = 0.005
  const wakeMaterial = new THREE.LineBasicMaterial({
    color: 0xdff6ff,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  })

  const createWakeLine = () => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(wakeSegments * 3)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const line = new THREE.Line(geometry, wakeMaterial)
    line.frustumCulled = false
    return line
  }

  const addSwan = (color, id) => {
    const swan = createSwan(color)
    const leftWake = createWakeLine()
    const rightWake = createWakeLine()
    const centerWake = createWakeLine()
    swan.userData = { id, leftWake, rightWake, centerWake }
    swans.push(swan)
    scene.add(swan)
    scene.add(leftWake, rightWake, centerWake)
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
      const offset = lerp(Math.PI, 0, smoothstep(0, 1, phaseT))
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
    const offset = lerp(0.6, Math.PI, smoothstep(0, 1, phaseT))
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

      const dirLen = Math.hypot(dirX, dirZ) || 1
      const ndx = dirX / dirLen
      const ndz = dirZ / dirLen
      const sideX = ndz
      const sideZ = -ndx

      const updateWake = (line, sideSign) => {
        const positions = line.geometry.attributes.position
        for (let i = 0; i < wakeSegments; i += 1) {
          const t = i / (wakeSegments - 1)
          const dist = wakeLength * t
          const offset = wakeSpread * t * sideSign
          const px = worldX - ndx * dist + sideX * offset
          const pz = worldZ - ndz * dist + sideZ * offset
          const localX = px - waterCenter.x
          const localY = -(pz - waterCenter.y)
          const wave = waterWaveAt(localX, localY, time)
          const py = waterBaseY + wave + wakeLift
          positions.setXYZ(i, px, py, pz)
        }
        positions.needsUpdate = true
      }

      updateWake(swan.userData.leftWake, 1)
      updateWake(swan.userData.rightWake, -1)
      updateWake(swan.userData.centerWake, 0)
    }
    swanStoryTime += delta
  }

  return { swans, updateSwans }
}

export const createForest = ({
  bounds,
  shoreZ,
  picnicZ,
  getGroundHeightAt,
  getRoadMaskAt,
  blanketPosition,
  blanketRadius = 0.9,
  noSpawnZones = [],
}) => {
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
  const blanketCenter = blanketPosition
    ? new THREE.Vector2(blanketPosition.x, blanketPosition.z)
    : null
  const zones = noSpawnZones.map(
    (zone) => new THREE.Vector2(zone.x, zone.z)
  )
  let placed = 0
  let attempts = 0

  while (placed < treeCount && attempts < treeCount * 12) {
    attempts += 1
    const x = randRange(bounds.minX + 0.3, bounds.maxX - 0.3)
    const z = randRange(shoreZ + 1.6, bounds.maxZ)
    const dist = picnicCenter.distanceTo(new THREE.Vector2(x, z))
    if (dist < 1.6) continue
    if (blanketCenter && blanketCenter.distanceTo(new THREE.Vector2(x, z)) < blanketRadius)
      continue
    let blocked = false
    for (let i = 0; i < zones.length; i += 1) {
      const radius = noSpawnZones[i].radius ?? 1
      if (zones[i].distanceTo(new THREE.Vector2(x, z)) < radius) {
        blocked = true
        break
      }
    }
    if (blocked) continue

    if (getRoadMaskAt && getRoadMaskAt(x, z) > 0.35) continue
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
    if (blanketCenter && blanketCenter.distanceTo(new THREE.Vector2(x, z)) < blanketRadius)
      continue
    let blocked = false
    for (let i = 0; i < zones.length; i += 1) {
      const radius = noSpawnZones[i].radius ?? 1
      if (zones[i].distanceTo(new THREE.Vector2(x, z)) < radius) {
        blocked = true
        break
      }
    }
    if (blocked) continue

    if (getRoadMaskAt && getRoadMaskAt(x, z) > 0.35) continue
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

const createReeds = ({ bounds, shoreZ, water, waterDepth, getGroundHeightAt }) => {
  const group = new THREE.Group()
  const reedCount = 90

  const rand = (() => {
    let seed = 548912
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  })()

  const randRange = (min, max) => min + (max - min) * rand()

  const stalkGeometry = new THREE.CylinderGeometry(0.01, 0.015, 1, 5)
  const stalkMaterial = new THREE.MeshStandardMaterial({
    color: 0x496b3e,
    roughness: 0.95,
  })
  const stalks = new THREE.InstancedMesh(stalkGeometry, stalkMaterial, reedCount)

  const headGeometry = new THREE.SphereGeometry(0.03, 6, 4)
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0x7a4a2b,
    roughness: 0.9,
  })
  const heads = new THREE.InstancedMesh(headGeometry, headMaterial, reedCount)

  const dummy = new THREE.Object3D()
  const headDummy = new THREE.Object3D()

  const waterEdgeZ = water.position.z + waterDepth / 2
  const reedCenterZ = (shoreZ + waterEdgeZ) * 0.5
  const reedBand = 0.7

  for (let i = 0; i < reedCount; i += 1) {
    const x = randRange(bounds.minX - 0.4, bounds.maxX + 0.4)
    const z = randRange(reedCenterZ - reedBand, reedCenterZ + reedBand)
    const height = randRange(0.22, 0.45)
    const baseY = getGroundHeightAt(x, z) + randRange(-0.03, 0.02)

    dummy.position.set(x, baseY + height * 0.5, z)
    dummy.scale.set(1, height, 1)
    dummy.rotation.set(
      randRange(-0.12, 0.12),
      randRange(0, Math.PI * 2),
      randRange(-0.18, 0.18)
    )
    dummy.updateMatrix()
    stalks.setMatrixAt(i, dummy.matrix)

    const headScale = rand() > 0.2 ? randRange(0.6, 1) : 0.001
    headDummy.position.set(x, baseY + height, z)
    headDummy.scale.set(headScale, headScale, headScale)
    headDummy.rotation.copy(dummy.rotation)
    headDummy.updateMatrix()
    heads.setMatrixAt(i, headDummy.matrix)
  }

  stalks.instanceMatrix.needsUpdate = true
  heads.instanceMatrix.needsUpdate = true
  group.add(stalks, heads)
  return group
}

const createRoadStones = ({ bounds, shoreZ, getTerrainSample }) => {
  const group = new THREE.Group()
  const stoneCount = 80

  const rand = (() => {
    let seed = 903721
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  })()

  const randRange = (min, max) => min + (max - min) * rand()

  const stoneGeometry = new THREE.IcosahedronGeometry(0.035, 0)
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0xc3b7a3,
    roughness: 0.95,
  })
  const stones = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, stoneCount)
  const dummy = new THREE.Object3D()

  let placed = 0
  let attempts = 0
  const maxAttempts = stoneCount * 12

  while (placed < stoneCount && attempts < maxAttempts) {
    attempts += 1
    const x = randRange(bounds.minX, bounds.maxX)
    const z = randRange(shoreZ + 0.5, bounds.maxZ)
    const sample = getTerrainSample(x, z)
    if (sample.roadMask < 0.55) continue

    const size = randRange(0.5, 1.2)
    const y = sample.height + 0.01
    dummy.position.set(x, y, z)
    dummy.scale.set(size, size * 0.8, size)
    dummy.rotation.set(
      randRange(-0.2, 0.2),
      randRange(0, Math.PI * 2),
      randRange(-0.2, 0.2)
    )
    dummy.updateMatrix()
    stones.setMatrixAt(placed, dummy.matrix)
    placed += 1
  }

  stones.instanceMatrix.needsUpdate = true
  group.add(stones)
  return group
}

const createRoadTwigs = ({ bounds, shoreZ, getTerrainSample }) => {
  const group = new THREE.Group()
  const twigCount = 25

  const rand = (() => {
    let seed = 712349
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  })()

  const randRange = (min, max) => min + (max - min) * rand()

  const twigGeometryA = new THREE.CylinderGeometry(0.01, 0.012, 0.18, 5)
  const twigGeometryB = new THREE.CylinderGeometry(0.006, 0.018, 0.22, 5)
  const twigMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a6a4a,
    roughness: 0.95,
  })
  const twigCountA = Math.round(twigCount * 0.55)
  const twigCountB = twigCount - twigCountA
  const twigsA = new THREE.InstancedMesh(twigGeometryA, twigMaterial, twigCountA)
  const twigsB = new THREE.InstancedMesh(twigGeometryB, twigMaterial, twigCountB)
  const dummy = new THREE.Object3D()

  let placed = 0
  let attempts = 0
  const maxAttempts = twigCount * 12

  while (placed < twigCount && attempts < maxAttempts) {
    attempts += 1
    const x = randRange(bounds.minX, bounds.maxX)
    const z = randRange(shoreZ + 0.5, bounds.maxZ)
    const sample = getTerrainSample(x, z)
    if (sample.roadMask < 0.55) continue

    const y = sample.height + 0.005
    const scale = randRange(0.6, 1.2)
    dummy.position.set(x, y, z)
    dummy.scale.set(scale, scale * 0.7, scale)
    dummy.rotation.set(
      Math.PI / 2 + randRange(-0.08, 0.08),
      randRange(0, Math.PI * 2),
      randRange(-0.08, 0.08)
    )
    dummy.updateMatrix()
    if (placed < twigCountA) {
      twigsA.setMatrixAt(placed, dummy.matrix)
    } else {
      twigsB.setMatrixAt(placed - twigCountA, dummy.matrix)
    }
    placed += 1
  }

  twigsA.instanceMatrix.needsUpdate = true
  twigsB.instanceMatrix.needsUpdate = true
  group.add(twigsA, twigsB)
  return group
}
