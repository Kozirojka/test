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

  const wrapText = (value, maxWidth) => {
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

  const lines = wrapText(text, width - 80)
  const lineHeight = 34
  const totalHeight = lines.length * lineHeight
  const startY = height / 2 - totalHeight / 2 + lineHeight / 2
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight)
  })

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
  sign.renderOrder = 2
  return sign
}

const edgeSignLeft = createEdgeSign(
  'Відгадайте загадку, щоб відкрити новий рівень'
)
const edgeSignRight = createEdgeSign(
  'Відгадайте загадку, щоб відкрити новий рівень'
)
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
}

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

    heroTarget.position.y = getGroundHeightAt(
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
    hero.position.y = getGroundHeightAt(hero.position.x, hero.position.z)
    heroTwo.position.y = getGroundHeightAt(heroTwo.position.x, heroTwo.position.z)
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
    edgeSignLeft.visible = endHit
    edgeSignRight.visible = false
  }

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
