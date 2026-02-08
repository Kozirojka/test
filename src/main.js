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

const smoothstep = (edge0, edge1, x) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

const createExpansionArea = ({ baseBounds, baseHeightAt }) => {
  const width = 6
  const depth = 6
  const seamX = baseBounds.minX - 0.6
  const centerX = seamX - width / 2
  const centerZ = (baseBounds.minZ + baseBounds.maxZ) * 0.5
  const rightEdgeX = seamX

  const clearingCenter = new THREE.Vector2(centerX - 0.6, centerZ + 0.4)

  const getHeightAt = (x, z) => {
    const localX = x - centerX
    const localZ = z - centerZ
    const base =
      0.12 + Math.sin(localX * 0.55) * Math.cos(localZ * 0.6) * 0.03
    const dist = Math.hypot(x - clearingCenter.x, z - clearingCenter.y)
    const clearingT = 1 - smoothstep(0.7, 1.8, dist)
    let height = THREE.MathUtils.lerp(base, 0.16, clearingT)

    const seamHeight = baseHeightAt(baseBounds.minX, z)
    const seamBlend = smoothstep(width / 2 - 1.2, width / 2, localX)
    height = THREE.MathUtils.lerp(height, seamHeight, seamBlend)
    return height
  }

  const geometry = new THREE.PlaneGeometry(width, depth, 48, 36)
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i) + centerX
    const z = positions.getZ(i) + centerZ
    positions.setY(i, getHeightAt(x, z))
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    color: 0x78c982,
    roughness: 0.9,
    metalness: 0,
  })
  const ground = new THREE.Mesh(geometry, material)
  ground.position.set(centerX, 0, centerZ)

  const house = new THREE.Group()
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xd8c3a5,
    roughness: 0.85,
  })
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xa95445,
    roughness: 0.8,
  })
  const baseWidth = 2.2
  const baseHeight = 1.1
  const baseDepth = 1.6
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth),
    baseMat
  )
  base.position.y = baseHeight / 2
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 0.9, 4),
    roofMat
  )
  roof.position.y = baseHeight + 0.4
  roof.rotation.y = Math.PI / 4
  house.add(base, roof)

  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x8a5a3b,
    roughness: 0.7,
  })
  const doorPivot = new THREE.Group()
  const doorWidth = 0.55
  const doorHeight = 0.85
  const doorDepth = 0.06
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth),
    doorMat
  )
  door.position.set(doorWidth / 2, doorHeight / 2 - 0.05, 0)
  doorPivot.position.set(baseWidth / 2 + 0.01, 0, 0)
  doorPivot.add(door)
  house.add(doorPivot)
  const houseY = getHeightAt(clearingCenter.x, clearingCenter.y)
  house.position.set(clearingCenter.x, houseY, clearingCenter.y)

  const group = new THREE.Group()
  group.add(ground, house)
  return {
    group,
    getHeightAt,
    minX: centerX - width / 2 + 0.6,
    edgeX: rightEdgeX,
    doorPivot,
  }
}

const expansionArea = createExpansionArea({
  baseBounds: bounds,
  baseHeightAt: getGroundHeightAt,
})
expansionArea.group.visible = false
scene.add(expansionArea.group)
let expansionUnlocked = false
const doorState = {
  open: false,
  target: 0,
}
const getWorldHeightAt = (x, z) =>
  expansionUnlocked && x < expansionArea.edgeX
    ? expansionArea.getHeightAt(x, z)
    : getGroundHeightAt(x, z)

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

  const headGroup = new THREE.Group()
  headGroup.position.y = 0.62

  const headGeometry = new THREE.SphereGeometry(0.16, 24, 16)
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd7b3,
    roughness: 0.6,
    metalness: 0,
  })
  const head = new THREE.Mesh(headGeometry, headMaterial)
  head.position.set(0, 0, 0)
  headGroup.add(head)

  hero.add(body, headGroup)
  hero.userData.head = headGroup

  const limbMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd7b3,
    roughness: 0.6,
    metalness: 0,
  })
  const armGeometry = new THREE.CylinderGeometry(
    0.045 * slimFactor,
    0.055 * slimFactor,
    0.32,
    12
  )
  const leftArmGroup = new THREE.Group()
  const rightArmGroup = new THREE.Group()
  const leftArm = new THREE.Mesh(armGeometry, limbMaterial)
  const rightArm = new THREE.Mesh(armGeometry, limbMaterial)
  leftArm.position.y = -0.16
  rightArm.position.y = -0.16
  leftArmGroup.add(leftArm)
  rightArmGroup.add(rightArm)
  leftArmGroup.position.set(-0.23 * slimFactor, 0.46, 0)
  rightArmGroup.position.set(0.23 * slimFactor, 0.46, 0)
  leftArmGroup.rotation.z = Math.PI * 0.08
  rightArmGroup.rotation.z = -Math.PI * 0.08

  const legGeometry = new THREE.CylinderGeometry(
    0.06 * slimFactor,
    0.07 * slimFactor,
    0.38,
    12
  )
  const leftLegGroup = new THREE.Group()
  const rightLegGroup = new THREE.Group()
  const leftLeg = new THREE.Mesh(legGeometry, limbMaterial)
  const rightLeg = new THREE.Mesh(legGeometry, limbMaterial)
  leftLeg.position.y = -0.19
  rightLeg.position.y = -0.19
  leftLegGroup.add(leftLeg)
  rightLegGroup.add(rightLeg)
  leftLegGroup.position.set(-0.09 * slimFactor, 0.19, 0)
  rightLegGroup.position.set(0.09 * slimFactor, 0.19, 0)

  hero.add(leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup)

  hero.userData.limbs = {
    leftArm: leftArmGroup,
    rightArm: rightArmGroup,
    leftLeg: leftLegGroup,
    rightLeg: rightLegGroup,
  }

  const addFace = (eyeColorValue, lipColorValue) => {
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: eyeColorValue,
      roughness: 0.4,
      metalness: 0.1,
    })
    const eyeGeometry = new THREE.SphereGeometry(0.025, 12, 10)
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.05, 0.02, 0.14)
    rightEye.position.set(0.05, 0.02, 0.14)

    const lipGeometry = new THREE.CapsuleGeometry(0.03, 0.02, 4, 8)
    const lipMaterial = new THREE.MeshStandardMaterial({
      color: lipColorValue,
      roughness: 0.6,
    })
    const lips = new THREE.Mesh(lipGeometry, lipMaterial)
    lips.position.set(0, -0.04, 0.13)
    lips.rotation.x = Math.PI / 2

    headGroup.add(leftEye, rightEye, lips)
  }

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
    hairTop.position.set(0, 0.07, -0.02)
    hairTop.scale.set(1.02, 0.86, 1.02)

    const hairCapGeometry = new THREE.SphereGeometry(0.175, 20, 14)
    const hairCap = new THREE.Mesh(hairCapGeometry, hairMaterial)
    hairCap.position.set(0, 0.045, -0.02)
    hairCap.scale.set(0.98, 0.76, 0.98)

    const hairBackGeometry = new THREE.CylinderGeometry(0.14, 0.18, 0.34, 18)
    const hairBack = new THREE.Mesh(hairBackGeometry, hairMaterial)
    hairBack.position.set(0, -0.12, -0.07)
    hairBack.rotation.x = Math.PI * 0.08

    const hairSideGeometry = new THREE.CylinderGeometry(0.07, 0.09, 0.22, 12)
    const hairSideLeft = new THREE.Mesh(hairSideGeometry, hairMaterial)
    hairSideLeft.position.set(-0.16, -0.06, 0.02)
    hairSideLeft.rotation.z = Math.PI * 0.08
    hairSideLeft.rotation.x = Math.PI * 0.12

    const hairSideRight = hairSideLeft.clone()
    hairSideRight.position.x = 0.16
    hairSideRight.rotation.z = -Math.PI * 0.08

    const bangsGeometry = new THREE.BoxGeometry(0.18, 0.03, 0.03)
    const bangs = new THREE.Mesh(bangsGeometry, hairMaterial)
    bangs.position.set(0, 0.16, 0.04)
    bangs.rotation.x = -Math.PI * 0.07

    addFace(eyeColor ?? 0x2f9b4f, lipColor ?? 0xd96b7a)
    const earringGeometry = new THREE.SphereGeometry(0.015, 10, 8)
    const earringMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2d7a6,
      metalness: 0.7,
      roughness: 0.2,
    })
    const leftEarring = new THREE.Mesh(earringGeometry, earringMaterial)
    const rightEarring = new THREE.Mesh(earringGeometry, earringMaterial)
    leftEarring.position.set(-0.13, -0.01, 0.02)
    rightEarring.position.set(0.13, -0.01, 0.02)

    headGroup.add(
      hairTop,
      hairCap,
      hairBack,
      hairSideLeft,
      hairSideRight,
      bangs,
      leftEarring,
      rightEarring
    )
    hero.add(dress)
  } else {
    const hatGeometry = new THREE.CylinderGeometry(0.12, 0.14, 0.08, 20)
    const hatMaterial = new THREE.MeshStandardMaterial({
      color: hatColor ?? 0x1d1c2c,
      roughness: 0.7,
    })
    const hat = new THREE.Mesh(hatGeometry, hatMaterial)
    hat.position.y = 0.12
    headGroup.add(hat)
    const sleeveGeometry = new THREE.CylinderGeometry(0.085, 0.095, 0.14, 12)
    const sleeveMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor ?? 0x2c5cff,
      roughness: 0.6,
      metalness: 0.05,
    })
    const leftSleeve = new THREE.Mesh(sleeveGeometry, sleeveMaterial)
    const rightSleeve = new THREE.Mesh(sleeveGeometry, sleeveMaterial)
    leftSleeve.position.set(0, -0.03, 0)
    rightSleeve.position.set(0, -0.03, 0)
    leftArmGroup.add(leftSleeve)
    rightArmGroup.add(rightSleeve)
    addFace(eyeColor ?? 0x0a0a0a, lipColor ?? 0xd96b7a)
  }

  hero.scale.setScalar(scale)
  return hero
}

const hero = createHero()
const heroStartZ = picnicZ + 0.9
hero.position.set(0, getWorldHeightAt(0, heroStartZ), heroStartZ)
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
heroTwo.position.set(
  0.7,
  getWorldHeightAt(0.7, heroTwoStartZ),
  heroTwoStartZ
)
scene.add(heroTwo)

controls.target.copy(hero.position)

const createKissHeartMesh = () => {
  const heart = new THREE.Shape()
  heart.moveTo(0, 0.25)
  heart.bezierCurveTo(0, 0, -0.5, 0, -0.5, 0.3)
  heart.bezierCurveTo(-0.5, 0.6, -0.2, 0.85, 0, 1)
  heart.bezierCurveTo(0.2, 0.85, 0.5, 0.6, 0.5, 0.3)
  heart.bezierCurveTo(0.5, 0, 0, 0, 0, 0.25)

  const geometry = new THREE.ExtrudeGeometry(heart, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
    steps: 1,
  })
  geometry.center()

  const material = new THREE.MeshStandardMaterial({
    color: 0xff5a7a,
    emissive: 0x5a0d1f,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: 0,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.scale.set(0.45, 0.45, 0.45)
  mesh.rotation.set(0, 0, Math.PI)
  mesh.visible = false
  return mesh
}

const kissHeart = createKissHeartMesh()
if (kissHeart) {
  scene.add(kissHeart)
}

const createKissHint = () => {
  const hint = document.createElement('div')
  hint.textContent = 'Press B щоб поцілуватись'
  hint.style.position = 'fixed'
  hint.style.left = '50%'
  hint.style.bottom = '70px'
  hint.style.transform = 'translateX(-50%)'
  hint.style.padding = '8px 14px'
  hint.style.borderRadius = '10px'
  hint.style.background = 'rgba(16, 18, 24, 0.85)'
  hint.style.color = '#f7e9ef'
  hint.style.fontSize = '14px'
  hint.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif'
  hint.style.letterSpacing = '0.2px'
  hint.style.pointerEvents = 'none'
  hint.style.whiteSpace = 'nowrap'
  hint.style.display = 'none'
  hint.style.boxShadow = '0 10px 22px rgba(0,0,0,0.28)'
  document.body.appendChild(hint)
  return hint
}

const kissHint = createKissHint()

const fireworks = []
const createFireworkBurst = (origin) => {
  const count = 40
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3
    positions[i3] = origin.x
    positions[i3 + 1] = origin.y
    positions[i3 + 2] = origin.z
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI * 0.5
    const speed = 0.5 + Math.random() * 0.9
    velocities[i3] = Math.cos(theta) * Math.cos(phi) * speed
    velocities[i3 + 1] = Math.sin(phi) * speed + 0.3
    velocities[i3 + 2] = Math.sin(theta) * Math.cos(phi) * speed
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0xfff2a6,
    size: 0.06,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  })
  const points = new THREE.Points(geometry, material)
  points.userData = { velocities, life: 1.2, maxLife: 1.2 }
  scene.add(points)
  fireworks.push(points)
}

const updateFireworks = (delta) => {
  for (let i = fireworks.length - 1; i >= 0; i -= 1) {
    const points = fireworks[i]
    const positions = points.geometry.attributes.position
    const velocities = points.userData.velocities
    points.userData.life -= delta
    const lifeT = Math.max(points.userData.life / points.userData.maxLife, 0)
    points.material.opacity = lifeT
    for (let j = 0; j < positions.count; j += 1) {
      const j3 = j * 3
      velocities[j3 + 1] -= 0.9 * delta
      positions.array[j3] += velocities[j3] * delta
      positions.array[j3 + 1] += velocities[j3 + 1] * delta
      positions.array[j3 + 2] += velocities[j3 + 2] * delta
    }
    positions.needsUpdate = true
    if (points.userData.life <= 0) {
      scene.remove(points)
      points.geometry.dispose()
      points.material.dispose()
      fireworks.splice(i, 1)
    }
  }
}

const createEdgeSign = (text) => {
  const width = 640
  const height = 320
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(16, 18, 24, 0.85)'
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = 6
  const radius = 28
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(width - radius, 0)
  ctx.quadraticCurveTo(width, 0, width, radius)
  ctx.lineTo(width, height - radius)
  ctx.quadraticCurveTo(width, height, width - radius, height)
  ctx.lineTo(radius, height)
  ctx.quadraticCurveTo(0, height, 0, height - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#f7e9ef'
  ctx.font = 'bold 26px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const wrapLine = (value, maxWidth) => {
    const words = value.split(' ')
    const lines = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line)
        line = word
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    return lines
  }

  const wrapText = (value, maxWidth) => {
    const parts = value.split('\n')
    const lines = []
    for (const part of parts) {
      lines.push(...wrapLine(part, maxWidth))
    }
    return lines
  }

  const drawText = (value) => {
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = 'rgba(16, 18, 24, 0.85)'
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 6
    const radius = 28
    ctx.beginPath()
    ctx.moveTo(radius, 0)
    ctx.lineTo(width - radius, 0)
    ctx.quadraticCurveTo(width, 0, width, radius)
    ctx.lineTo(width, height - radius)
    ctx.quadraticCurveTo(width, height, width - radius, height)
    ctx.lineTo(radius, height)
    ctx.quadraticCurveTo(0, height, 0, height - radius)
    ctx.lineTo(0, radius)
    ctx.quadraticCurveTo(0, 0, radius, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#f7e9ef'
    ctx.font = 'bold 26px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const lines = wrapText(value, width - 80)
    const lineHeight = 34
    const totalHeight = lines.length * lineHeight
    const startY = height / 2 - totalHeight / 2 + lineHeight / 2
    lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, startY + index * lineHeight)
    })
  }

  drawText(text)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const geometry = new THREE.PlaneGeometry(2.3, 0.9)
  const sign = new THREE.Mesh(geometry, material)
  sign.visible = true
  sign.userData.baseScale = 1
  sign.userData.drawText = (value) => {
    drawText(value)
    texture.needsUpdate = true
  }
  sign.renderOrder = 2
  return sign
}

const edgeDefaultText =
  'Щоб пройти до наступного етапу, потрібно відповісти на запитання. Нажміть C, щоб почати.'
const edgeHintText = edgeDefaultText
const edgeQuestionText = 'Які квіти Сія любить найбільше?'
const edgeQuestions = [
  {
    text: 'Які квіти Сія любить найбільше?',
    options: ['Троянди', 'Півонії', 'Лілії'],
    correct: 1,
  },
  {
    text: 'Який колір асоціюється з Валентином?',
    options: ['Синій', 'Червоний', 'Зелений'],
    correct: 1,
  },
  {
    text: 'Що символізує сердечко?',
    options: ['Дружбу', 'Кохання', 'Подорожі'],
    correct: 1,
  },
  {
    text: 'Коли святкують День святого Валентина?',
    options: ['14 лютого', '8 березня', '1 травня'],
    correct: 0,
  },
  {
    text: 'Що найчастіше дарують на Валентина?',
    options: ['Листівку', 'Шкарпетки', 'Парасольку'],
    correct: 0,
  },
]
const edgeSignLeft = createEdgeSign(edgeDefaultText)
const edgeSignRight = createEdgeSign(edgeDefaultText)
const findRoadCenterZ = (x) => {
  const steps = 50
  let bestZ = shoreZ + 1.0
  let bestMask = -1
  for (let i = 0; i <= steps; i += 1) {
    const z = bounds.minZ + (bounds.maxZ - bounds.minZ) * (i / steps)
    const mask = getRoadMaskAt(x, z)
    if (mask > bestMask) {
      bestMask = mask
      bestZ = z
    }
  }
  return bestZ
}
const edgeSignX = bounds.minX + 0.2
const edgeSignZ = findRoadCenterZ(edgeSignX)
if (edgeSignLeft && edgeSignRight) {
  scene.add(edgeSignLeft, edgeSignRight)
  edgeSignLeft.position.set(
    edgeSignX,
    getGroundHeightAt(edgeSignX, edgeSignZ) + 0.75,
    edgeSignZ
  )
  edgeSignRight.position.set(
    edgeSignX,
    getGroundHeightAt(edgeSignX, edgeSignZ) + 0.75,
    edgeSignZ
  )
  edgeSignLeft.position.y += 0.4
  edgeSignRight.position.y += 0.4
  const signTargetX = THREE.MathUtils.clamp(0, bounds.minX, bounds.maxX)
  const signTargetZ = edgeSignZ
  const signFacing = Math.atan2(
    signTargetX - edgeSignX,
    signTargetZ - edgeSignZ
  )
  edgeSignLeft.rotation.y = signFacing
  edgeSignRight.rotation.y = signFacing
  edgeSignLeft.userData.triggerPos = edgeSignLeft.position.clone()
  edgeSignRight.userData.triggerPos = edgeSignRight.position.clone()
  edgeSignLeft.userData.triggerRadius = 1.6
  edgeSignRight.userData.triggerRadius = 1.6
  edgeSignLeft.userData.basePos = edgeSignLeft.position.clone()
  edgeSignRight.userData.basePos = edgeSignRight.position.clone()
  edgeSignLeft.userData.baseRot = edgeSignLeft.rotation.clone()
  edgeSignRight.userData.baseRot = edgeSignRight.rotation.clone()
}

const heroBounds = new THREE.Box3().setFromObject(hero)
const heroSize = new THREE.Vector3()
heroBounds.getSize(heroSize)

const getWorldSurfaceHeightAt = (x, z) =>
  expansionUnlocked && x < expansionArea.edgeX
    ? expansionArea.getHeightAt(x, z)
    : getSurfaceHeightAt(x, z)

const propSystem = createPropSystem({
  scene,
  hero,
  heroTwo,
  heroSize,
  picnicZ,
  bounds,
  getSurfaceHeightAt: getWorldSurfaceHeightAt,
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

const edgeSignZones = [{ x: edgeSignX, z: edgeSignZ, radius: 1.2 }]

const forest = createForest({
  bounds,
  shoreZ,
  picnicZ,
  getGroundHeightAt,
  getRoadMaskAt,
  blanketPosition: { x: 1.2, y: 0.2346605718, z: -0.3 },
  noSpawnZones: edgeSignZones,
})
scene.add(forest)

const keys = new Set()
let kissRequested = false
let edgeSignProximity = false
const edgeTyping = {
  active: false,
  progress: 0,
  speed: 22,
}
let edgeSignMode = 'default'
const edgeQuiz = {
  active: false,
  completed: false,
  current: 0,
  selected: null,
  result: null,
  advanceTimer: 0,
}
const getEdgeOptionsText = () => {
  const question = edgeQuestions[edgeQuiz.current]
  if (!question) return ''
  const lines = question.options.map((option, index) => {
    const key = `${index + 1}`
    const marker = edgeQuiz.selected === key ? ' ◀' : ''
    return `${key}) ${option}${marker}`
  })
  lines.push('Enter — підтвердити')
  if (edgeQuiz.result === 'correct') {
    lines.push('Правильно!')
  } else if (edgeQuiz.result === 'wrong') {
    lines.push('Неправильно, спробуй ще.')
  }
  return lines.join('\n')
}
const getEdgeQuestionText = () => {
  const question = edgeQuestions[edgeQuiz.current]
  if (!question) return ''
  const progress = `Питання ${edgeQuiz.current + 1}/${edgeQuestions.length}`
  return `${progress}\n${question.text}\n${getEdgeOptionsText()}`
}
const updateEdgeSignText = (value) => {
  if (edgeSignLeft?.userData?.drawText) {
    edgeSignLeft.userData.drawText(value)
  }
}
const onKeyDown = (event) => {
  const key = event.key.toLowerCase()
  const code = event.code
  keys.add(key)
  if (code) {
    keys.add(code)
  }
  if (key === 'b' || code === 'KeyB') {
    kissRequested = true
  }
  if (
    (key === 'c' || code === 'KeyC') &&
    edgeSignProximity &&
    !edgeQuiz.active &&
    !edgeQuiz.completed
  ) {
    edgeQuiz.active = true
    edgeQuiz.current = 0
    edgeQuiz.selected = null
    edgeQuiz.result = null
    edgeQuiz.advanceTimer = 0
    edgeTyping.active = true
    edgeTyping.progress = 0
    edgeSignMode = 'typing'
  }
  if (edgeSignProximity && edgeQuiz.active && !edgeTyping.active) {
    if (key === '1' || code === 'Digit1' || code === 'Numpad1') {
      edgeQuiz.selected = '1'
      updateEdgeSignText(getEdgeQuestionText())
    } else if (key === '2' || code === 'Digit2' || code === 'Numpad2') {
      edgeQuiz.selected = '2'
      updateEdgeSignText(getEdgeQuestionText())
    } else if (key === '3' || code === 'Digit3' || code === 'Numpad3') {
      edgeQuiz.selected = '3'
      updateEdgeSignText(getEdgeQuestionText())
    }
    if (key === 'enter' || code === 'Enter') {
      if (edgeQuiz.selected) {
        const question = edgeQuestions[edgeQuiz.current]
        const correctKey = `${question.correct + 1}`
        if (edgeQuiz.selected === correctKey) {
          edgeQuiz.result = 'correct'
          edgeQuiz.advanceTimer = 1.2
          const basePos = edgeSignLeft?.userData?.basePos
          if (basePos) {
            createFireworkBurst(
              new THREE.Vector3(basePos.x, basePos.y + 0.6, basePos.z)
            )
          }
        } else {
          edgeQuiz.result = 'wrong'
          edgeQuiz.advanceTimer = 0
          edgeSignLeft.userData.shakeTimer = 0.45
        }
        updateEdgeSignText(getEdgeQuestionText())
      }
    }
  }
  if (expansionUnlocked && (key === 'f' || code === 'KeyF')) {
    const doorPivot = expansionArea.doorPivot
    if (doorPivot) {
      const doorPos = new THREE.Vector3()
      doorPivot.getWorldPosition(doorPos)
      const heroNear = hero.position.distanceTo(doorPos) < 1.2
      const heroTwoNear = heroTwo
        ? heroTwo.position.distanceTo(doorPos) < 1.2
        : false
      if (heroNear || heroTwoNear) {
        doorState.open = !doorState.open
        doorState.target = doorState.open ? -Math.PI * 0.5 : 0
      }
    }
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
const tmpVecB = new THREE.Vector3()
const heroForward = new THREE.Vector3()
const heroTwoForward = new THREE.Vector3()

const kissState = {
  active: false,
  timer: 0,
  duration: 1.6,
  cooldown: 0,
  startA: new THREE.Vector3(),
  startB: new THREE.Vector3(),
  targetA: new THREE.Vector3(),
  targetB: new THREE.Vector3(),
}

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

  const moveAmount = move.lengthSq()
  if (moveAmount > 0) {
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

    heroTarget.position.y = getWorldHeightAt(
      heroTarget.position.x,
      heroTarget.position.z
    )
    const targetAngle = Math.atan2(move.x, move.z)
    targetQuat.setFromAxisAngle(worldUp, targetAngle)
    const turnAlpha = 1 - Math.exp(-heroTurnSpeed * delta)
    heroTarget.quaternion.slerp(targetQuat, turnAlpha)
  }

  const limbTargets = heroTarget.userData?.limbs
  if (limbTargets) {
    const swing = moveAmount > 0 ? Math.sin(performance.now() * 0.006) * 0.45 : 0
    limbTargets.leftArm.rotation.x = swing
    limbTargets.rightArm.rotation.x = -swing
    limbTargets.leftLeg.rotation.x = -swing
    limbTargets.rightLeg.rotation.x = swing
    limbTargets.leftArm.userData.swingX = swing
    limbTargets.rightArm.userData.swingX = -swing
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

const areFacingEachOther = () => {
  heroForward.set(0, 0, 1).applyQuaternion(hero.quaternion)
  heroTwoForward.set(0, 0, 1).applyQuaternion(heroTwo.quaternion)
  tmpVec.copy(heroTwo.position).sub(hero.position).normalize()
  tmpVecB.copy(hero.position).sub(heroTwo.position).normalize()
  const facingA = heroForward.dot(tmpVec) > 0.6
  const facingB = heroTwoForward.dot(tmpVecB) > 0.6
  return facingA && facingB
}

const clock = new THREE.Clock()
const animate = () => {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const time = clock.getElapsedTime()

  if (kissState.cooldown > 0) {
    kissState.cooldown = Math.max(0, kissState.cooldown - delta)
  }

  const heroDistance = hero.position.distanceTo(heroTwo.position)
  const canKiss =
    heroDistance < 0.6 && areFacingEachOther() && kissState.cooldown <= 0

  if (kissRequested && canKiss && !kissState.active) {
    kissState.active = true
    kissState.timer = 0
    kissState.cooldown = kissState.duration + 0.4
    kissState.startA.copy(hero.position)
    kissState.startB.copy(heroTwo.position)
    heroMidpoint.copy(hero.position).add(heroTwo.position).multiplyScalar(0.5)
    tmpVec.copy(heroTwo.position).sub(hero.position)
    tmpVec.y = 0
    if (tmpVec.lengthSq() < 0.0001) {
      tmpVec.set(1, 0, 0)
    } else {
      tmpVec.normalize()
    }
    const desiredDistance = 0.32
    kissState.targetA.copy(heroMidpoint).addScaledVector(tmpVec, -desiredDistance * 0.5)
    kissState.targetB.copy(heroMidpoint).addScaledVector(tmpVec, desiredDistance * 0.5)
  }
  kissRequested = false

  if (kissState.active) {
    updateHero(
      hero,
      { forward: [], backward: [], left: [], right: [] },
      delta
    )
    updateHero(
      heroTwo,
      { forward: [], backward: [], left: [], right: [] },
      delta
    )
    kissState.timer += delta
    const t = Math.min(kissState.timer / kissState.duration, 1)
    let blend = 1
    if (t < 0.4) {
      blend = t / 0.4
    } else if (t > 0.6) {
      blend = 1 - (t - 0.6) / 0.4
    }
    hero.position.lerpVectors(kissState.startA, kissState.targetA, blend)
    heroTwo.position.lerpVectors(kissState.startB, kissState.targetB, blend)
    hero.position.y = getWorldHeightAt(hero.position.x, hero.position.z)
    heroTwo.position.y = getWorldHeightAt(heroTwo.position.x, heroTwo.position.z)
    hero.lookAt(heroTwo.position.x, hero.position.y, heroTwo.position.z)
    heroTwo.lookAt(hero.position.x, heroTwo.position.y, hero.position.z)
    if (hero.userData?.head && heroTwo.userData?.head) {
      const headTilt = Math.min(heroDistance * 0.6, 0.2)
      hero.userData.head.rotation.x = headTilt
      heroTwo.userData.head.rotation.x = -headTilt
    }
    if (hero.userData?.limbs) {
      const hugT = Math.min(kissState.timer / 0.5, 1)
      const hugEase = hugT * hugT * (3 - 2 * hugT)
      const hugX = -0.9 * hugEase
      const hugZ = 0.35 * hugEase
      hero.userData.limbs.leftArm.userData.hugX = hugX
      hero.userData.limbs.rightArm.userData.hugX = hugX
      hero.userData.limbs.leftArm.userData.hugZ = hugZ
      hero.userData.limbs.rightArm.userData.hugZ = -hugZ
    }
  } else {
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
  }
  updateSharedCamera()
  updateWater(water, time)
  swanSystem.updateSwans(time, delta)
  propSystem.updateProps(delta)
  propSystem.updateActionHint()
  const blanketCenter = tmpVec.set(1.2, 0, -0.3)
  const heroDist = hero.position.distanceTo(blanketCenter)
  const heroTwoDist = heroTwo.position.distanceTo(blanketCenter)
  updateBlanket(heroDist <= heroTwoDist ? hero.position : heroTwo.position, delta)

  if (kissHeart) {
    if (kissState.active) {
      const t = Math.min(kissState.timer / kissState.duration, 1)
      const pop = t < 0.3 ? t / 0.3 : 1
      const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1
      heroMidpoint.copy(hero.position).add(heroTwo.position).multiplyScalar(0.5)
      kissHeart.visible = true
      kissHeart.position.set(
        heroMidpoint.x,
        heroMidpoint.y + 0.9 + t * 0.25 + Math.sin(time * 6) * 0.03,
        heroMidpoint.z
      )
      kissHeart.scale.setScalar(0.22 + pop * 0.22)
      kissHeart.rotation.y = Math.PI + Math.sin(time * 2) * 0.15
      kissHeart.material.opacity = Math.max(0, fade)
      if (t >= 1) {
        kissState.active = false
        kissHeart.visible = false
        kissHeart.material.opacity = 0
      }
    } else {
      kissHeart.visible = false
      kissHeart.material.opacity = 0
    }
  }

  if (kissHint) {
    const showHint =
      !kissState.active &&
      kissState.cooldown <= 0 &&
      heroDistance < 0.8 &&
      areFacingEachOther()
    kissHint.style.display = showHint ? 'block' : 'none'
  }

  if (!kissState.active) {
    if (hero.userData?.head) {
      hero.userData.head.rotation.x = 0
    }
    if (heroTwo.userData?.head) {
      heroTwo.userData.head.rotation.x = 0
    }
    if (hero.userData?.limbs) {
      hero.userData.limbs.leftArm.userData.hugX = 0
      hero.userData.limbs.rightArm.userData.hugX = 0
      hero.userData.limbs.leftArm.userData.hugZ = 0
      hero.userData.limbs.rightArm.userData.hugZ = 0
    }
  }

  if (edgeSignLeft && edgeSignRight) {
    const triggerPos = edgeSignLeft.userData.triggerPos
    const triggerRadius = edgeSignLeft.userData.triggerRadius ?? 1.6
    let endHit = false
    if (triggerPos) {
      endHit =
        hero.position.distanceTo(triggerPos) < triggerRadius ||
        heroTwo.position.distanceTo(triggerPos) < triggerRadius
    } else {
      const edgeThreshold = 0.7
      endHit =
        hero.position.x > bounds.maxX - edgeThreshold ||
        heroTwo.position.x > bounds.maxX - edgeThreshold
    }
    edgeSignProximity = endHit
    edgeSignLeft.visible = endHit
    edgeSignRight.visible = false
    if (!edgeSignProximity) {
      edgeTyping.active = false
      edgeTyping.progress = 0
      edgeQuiz.active = false
      edgeQuiz.current = 0
      edgeQuiz.selected = null
      edgeQuiz.result = null
      edgeQuiz.advanceTimer = 0
      if (edgeSignMode !== 'default' && edgeSignLeft.userData.drawText) {
        edgeSignLeft.userData.drawText(edgeDefaultText)
        edgeSignMode = 'default'
      }
    } else if (!edgeQuiz.active && !edgeQuiz.completed) {
      if (edgeSignMode !== 'hint' && edgeSignLeft.userData.drawText) {
        edgeSignLeft.userData.drawText(edgeHintText)
        edgeSignMode = 'hint'
      }
    }
  }

  if (edgeTyping.active && edgeSignLeft?.userData?.drawText) {
    edgeTyping.progress += delta * edgeTyping.speed
    const count = Math.min(
      Math.floor(edgeTyping.progress),
      edgeQuestions[edgeQuiz.current]?.text?.length ?? 0
    )
    const progressLine = `Питання ${edgeQuiz.current + 1}/${edgeQuestions.length}`
    const question = edgeQuestions[edgeQuiz.current]
    edgeSignLeft.userData.drawText(
      `${progressLine}\n${question.text.slice(0, count)}`
    )
    if (question && count >= question.text.length) {
      edgeTyping.active = false
      edgeSignMode = 'quiz'
      updateEdgeSignText(getEdgeQuestionText())
    }
  }

    if (edgeQuiz.active && edgeQuiz.advanceTimer > 0) {
      edgeQuiz.advanceTimer = Math.max(0, edgeQuiz.advanceTimer - delta)
      if (edgeQuiz.advanceTimer === 0 && edgeQuiz.result === 'correct') {
        if (edgeQuiz.current < edgeQuestions.length - 1) {
          edgeQuiz.current += 1
        edgeQuiz.selected = null
        edgeQuiz.result = null
        edgeTyping.active = true
        edgeTyping.progress = 0
        edgeSignMode = 'typing'
      } else {
        edgeQuiz.completed = true
        edgeQuiz.active = false
        edgeSignMode = 'completed'
        updateEdgeSignText('Всі відповіді правильні!\nНову локацію відкрито!')
        if (!expansionUnlocked) {
          expansionUnlocked = true
          expansionArea.group.visible = true
          bounds.minX = expansionArea.minX
        }
      }
    }
  }

  if (edgeSignLeft?.userData?.shakeTimer) {
    edgeSignLeft.userData.shakeTimer = Math.max(
      0,
      edgeSignLeft.userData.shakeTimer - delta
    )
    const shakeT = edgeSignLeft.userData.shakeTimer / 0.45
    const basePos = edgeSignLeft.userData.basePos
    const baseRot = edgeSignLeft.userData.baseRot
    if (basePos && baseRot) {
      edgeSignLeft.position.x = basePos.x + Math.sin(time * 45) * 0.04 * shakeT
      edgeSignLeft.position.y = basePos.y + Math.sin(time * 55) * 0.02 * shakeT
      edgeSignLeft.position.z = basePos.z
      edgeSignLeft.rotation.x = baseRot.x
      edgeSignLeft.rotation.y = baseRot.y
      edgeSignLeft.rotation.z = Math.sin(time * 60) * 0.06 * shakeT
      if (edgeSignLeft.userData.shakeTimer === 0) {
        edgeSignLeft.position.copy(basePos)
        edgeSignLeft.rotation.copy(baseRot)
      }
    }
  }

  if (expansionUnlocked && expansionArea.doorPivot) {
    const doorPivot = expansionArea.doorPivot
    const damp = 1 - Math.exp(-8 * delta)
    doorPivot.rotation.y = THREE.MathUtils.lerp(
      doorPivot.rotation.y,
      doorState.target,
      damp
    )
  }

  updateFireworks(delta)

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
