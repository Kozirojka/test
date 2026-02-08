import * as THREE from 'three'

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

export const createBlanket = ({ picnicZ, getGroundHeightAt, fixedPosition }) => {
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
  blanket.receiveShadow = true

  const placeOnGround = (object, x, z, lift = 0) => {
    object.position.set(x, 0, z)
    object.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(object)
    const groundY = getGroundHeightAt(x, z) + lift
    object.position.y += groundY - box.min.y
  }

  if (fixedPosition) {
    blanket.position.set(
      fixedPosition.x,
      fixedPosition.y,
      fixedPosition.z
    )
  } else {
    placeOnGround(blanket, 1.2, picnicZ + 0.7, 0.01)
  }

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

  const pressRadius = 0.55
  const pressStrength = 0.08
  const pressStiffness = 12
  const minBlanketDown = -0.008
  const heroLocal = new THREE.Vector3()

  const updateBlanket = (heroPosition, delta) => {
    heroLocal.copy(heroPosition)
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
      blanketPositions.setXYZ(
        i + blanketTopCount,
        baseX,
        baseY,
        topZ - blanketThickness
      )
    }
    blanketPositions.needsUpdate = true
    blanketGeometry.computeVertexNormals()
  }

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

  return { blanket, updateBlanket, getSurfaceHeightAt }
}
