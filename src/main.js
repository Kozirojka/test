import './style.css'
import * as THREE from 'three'
import { createScene } from './scene.js'
import { createShore, updateWater, createSwanSystem, createForest } from './world.js'
import { createBlanket } from './blanket.js'
import { createPropSystem } from './props.js'
import photoGiftFirst from './photos/me_and_sia_first_pick.png'
import photoGiftSecond from './photos/me_and_sia_second_photo.png'
import photoGiftThird from './photos/me_and_sia_third_photo.png'

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

const applyShadowSettings = (object, { cast = true, receive = true } = {}) => {
  if (!object) return
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast
      child.receiveShadow = receive
    }
  })
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
    transparent: true,
    opacity: 0,
  })
  const ground = new THREE.Mesh(geometry, material)
  ground.position.set(centerX, 0, centerZ)

  const house = new THREE.Group()
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xd8c3a5,
    roughness: 0.85,
    transparent: true,
    opacity: 0,
  })
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xa95445,
    roughness: 0.8,
    transparent: true,
    opacity: 0,
  })
  const baseWidth = 3.0
  const baseHeight = 1.4
  const baseDepth = 2.2
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth),
    baseMat
  )
  base.position.y = baseHeight / 2
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.0, 1.1, 4),
    roofMat
  )
  roof.position.y = baseHeight + 0.55
  roof.rotation.y = Math.PI / 4
  house.add(base, roof)

  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x8a5a3b,
    roughness: 0.7,
    transparent: true,
    opacity: 0,
  })
  const doorPivot = new THREE.Group()
  const doorWidth = 0.7
  const doorHeight = 1.05
  const doorDepth = 0.06
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth),
    doorMat
  )
  door.position.set(doorWidth / 2, doorHeight / 2 - 0.05, doorDepth / 2 + 0.02)
  doorPivot.position.set(baseWidth / 2 + 0.06, 0, 0)
  doorPivot.rotation.y = Math.PI / 2
  doorPivot.userData.baseYaw = Math.PI / 2
  doorPivot.add(door)
  house.add(doorPivot)

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xf5d88f,
    emissive: 0xffd37a,
    emissiveIntensity: 0.6,
    roughness: 0.4,
    transparent: true,
    opacity: 0,
  })
  const windowGeom = new THREE.BoxGeometry(0.45, 0.35, 0.04)
  const windowLeft = new THREE.Mesh(windowGeom, windowMat)
  const windowRight = new THREE.Mesh(windowGeom, windowMat)
  const windowZ = baseDepth / 2 + 0.02
  windowLeft.position.set(-0.75, 0.75, windowZ)
  windowRight.position.set(0.75, 0.75, windowZ)
  house.add(windowLeft, windowRight)

  const sideWindowGeom = new THREE.BoxGeometry(0.35, 0.3, 0.04)
  const sideWindowFront = new THREE.Mesh(sideWindowGeom, windowMat)
  const sideWindowBack = new THREE.Mesh(sideWindowGeom, windowMat)
  const sideWindowX = baseWidth / 2 + 0.02
  sideWindowFront.position.set(sideWindowX, 0.75, -0.45)
  sideWindowBack.position.set(sideWindowX, 0.75, 0.45)
  sideWindowFront.rotation.y = Math.PI / 2
  sideWindowBack.rotation.y = Math.PI / 2
  house.add(sideWindowFront, sideWindowBack)

  const chimneyMat = new THREE.MeshStandardMaterial({
    color: 0x7a6e62,
    roughness: 0.9,
    transparent: true,
    opacity: 0,
  })
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.5, 0.22),
    chimneyMat
  )
  chimney.position.set(-0.7, baseHeight + 0.9, -0.2)
  house.add(chimney)

  const dogGroup = new THREE.Group()
  const dogFur = new THREE.MeshStandardMaterial({
    color: 0x8a5a3b,
    roughness: 0.85,
    transparent: true,
    opacity: 0,
  })
  const dogLight = new THREE.MeshStandardMaterial({
    color: 0xb87a52,
    roughness: 0.9,
    transparent: true,
    opacity: 0,
  })
  const dogBody = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), dogFur)
  dogBody.scale.set(1.4, 1, 1.1)
  dogBody.position.set(0, 0.22, 0)
  const dogHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), dogFur)
  dogHead.position.set(0.28, 0.32, 0.05)
  const dogSnout = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 8),
    dogLight
  )
  dogSnout.position.set(0.42, 0.3, 0.06)
  const dogEarLeft = new THREE.Mesh(
    new THREE.ConeGeometry(0.05, 0.12, 6),
    dogFur
  )
  dogEarLeft.position.set(0.26, 0.47, 0.14)
  dogEarLeft.rotation.z = Math.PI * 0.25
  const dogEarRight = dogEarLeft.clone()
  dogEarRight.position.z = -0.04
  dogEarRight.rotation.z = -Math.PI * 0.25
  const dogLegFront = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.16, 6),
    dogFur
  )
  dogLegFront.position.set(0.18, 0.08, 0.12)
  const dogLegFrontB = dogLegFront.clone()
  dogLegFrontB.position.z = -0.08
  const dogLegBack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 0.12, 6),
    dogFur
  )
  dogLegBack.position.set(-0.18, 0.07, 0.12)
  const dogLegBackB = dogLegBack.clone()
  dogLegBackB.position.z = -0.08
  const dogTail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 0.2, 6),
    dogFur
  )
  dogTail.position.set(-0.3, 0.3, 0)
  dogTail.rotation.z = Math.PI * 0.25
  dogGroup.add(
    dogBody,
    dogHead,
    dogSnout,
    dogEarLeft,
    dogEarRight,
    dogLegFront,
    dogLegFrontB,
    dogLegBack,
    dogLegBackB,
    dogTail
  )
  dogGroup.scale.set(1, 1, 1)

  const smokeGroup = new THREE.Group()
  const smokeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd7d7d7,
    roughness: 0.9,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  })
  const smokePuffs = []
  for (let i = 0; i < 10; i += 1) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      smokeMaterial.clone()
    )
    puff.visible = false
    smokeGroup.add(puff)
    smokePuffs.push({ mesh: puff, life: 0 })
  }
  house.add(smokeGroup)
  const houseY = getHeightAt(clearingCenter.x, clearingCenter.y)
  house.position.set(clearingCenter.x, houseY, clearingCenter.y)

  const rand = (() => {
    let seed = 481239
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  })()
  const randRange = (min, max) => min + (max - min) * rand()

  const flowers = new THREE.Group()
  const flowerStemMat = new THREE.MeshStandardMaterial({
    color: 0x4a8b4a,
    roughness: 0.9,
    transparent: true,
    opacity: 0,
  })
  const flowerPetalMats = [
    new THREE.MeshStandardMaterial({
      color: 0xffb1c8,
      roughness: 0.7,
      transparent: true,
      opacity: 0,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xffe08a,
      roughness: 0.7,
      transparent: true,
      opacity: 0,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xc6b3ff,
      roughness: 0.7,
      transparent: true,
      opacity: 0,
    }),
  ]
  const swayItems = []
  for (let i = 0; i < 12; i += 1) {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.02, 0.24, 6),
      flowerStemMat
    )
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 8),
      flowerPetalMats[i % flowerPetalMats.length]
    )
    const flower = new THREE.Group()
    stem.position.y = 0.12
    petal.position.y = 0.27
    flower.add(stem, petal)
    const angle = randRange(0, Math.PI * 2)
    const radius = randRange(0.7, 1.6)
    const fx = clearingCenter.x + Math.cos(angle) * radius
    const fz = clearingCenter.y + Math.sin(angle) * radius
    const fy = getHeightAt(fx, fz)
    flower.position.set(fx, fy, fz)
    flower.rotation.y = randRange(0, Math.PI * 2)
    flowers.add(flower)
    swayItems.push({
      mesh: flower,
      phase: randRange(0, Math.PI * 2),
      base: randRange(-0.05, 0.05),
    })
  }

  const group = new THREE.Group()
  group.add(ground, house, flowers, dogGroup)
  const dogX = clearingCenter.x + baseWidth / 2 + 0.9
  const dogZ = clearingCenter.y + baseDepth / 2 + 0.6
  const dogY = getHeightAt(dogX, dogZ)
  dogGroup.position.set(dogX, dogY + 0.01, dogZ)
  dogGroup.scale.setScalar(1.15)

  return {
    group,
    getHeightAt,
    minX: centerX - width / 2 + 0.6,
    edgeX: rightEdgeX,
    doorPivot,
    chimney,
    smokePuffs,
    dog: dogGroup,
    dogTail,
    dogHead,
    swayItems,
    revealMaterials: [
      material,
      baseMat,
      roofMat,
      doorMat,
      windowMat,
      chimneyMat,
      dogFur,
      dogLight,
      flowerStemMat,
      ...flowerPetalMats,
    ],
  }
}

const expansionArea = createExpansionArea({
  baseBounds: bounds,
  baseHeightAt: getGroundHeightAt,
})
expansionArea.group.visible = false
scene.add(expansionArea.group)
applyShadowSettings(expansionArea.group, { cast: true, receive: true })
if (expansionArea.smokePuffs) {
  for (const puff of expansionArea.smokePuffs) {
    puff.mesh.castShadow = false
    puff.mesh.receiveShadow = false
  }
}
let expansionUnlocked = false
const expansionReveal = {
  active: false,
  t: 0,
  duration: 2.4,
}
const doorState = {
  open: false,
  target: 0,
}
const smokeState = {
  timer: 0,
  interval: 0.35,
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
applyShadowSettings(hero, { cast: true, receive: true })

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
applyShadowSettings(heroTwo, { cast: true, receive: true })

controls.target.copy(hero.position)

const blanketAnchor = new THREE.Vector3(1.2, 0, -0.3)
const seatLeft = new THREE.Vector3()
const seatRight = new THREE.Vector3()
const sitConfig = {
  offsetLeft: new THREE.Vector3(-0.28, 0, 0.1),
  offsetRight: new THREE.Vector3(0.28, 0, -0.1),
  yOffset: -0.04,
  radius: 0.7,
  transition: 0.4,
}
const sitState = {
  p1: {
    seated: false,
    transitioning: false,
    t: 0,
    start: new THREE.Vector3(),
  },
  p2: {
    seated: false,
    transitioning: false,
    t: 0,
    start: new THREE.Vector3(),
  },
}
const updateSeatPositions = () => {
  seatLeft.copy(blanketAnchor).add(sitConfig.offsetLeft)
  seatLeft.y = getSurfaceHeightAt(seatLeft.x, seatLeft.z) + sitConfig.yOffset
  seatRight.copy(blanketAnchor).add(sitConfig.offsetRight)
  seatRight.y = getSurfaceHeightAt(seatRight.x, seatRight.z) + sitConfig.yOffset
}
updateSeatPositions()

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

const createDoorHint = () => {
  const hint = document.createElement('div')
  hint.textContent = 'Press F щоб відкрити/закрити двері'
  hint.style.position = 'fixed'
  hint.style.left = '0'
  hint.style.top = '0'
  hint.style.transform = 'translate(-50%, -120%)'
  hint.style.padding = '6px 10px'
  hint.style.borderRadius = '8px'
  hint.style.background = 'rgba(16, 18, 24, 0.85)'
  hint.style.color = '#f7e9ef'
  hint.style.fontSize = '13px'
  hint.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif'
  hint.style.letterSpacing = '0.2px'
  hint.style.pointerEvents = 'none'
  hint.style.whiteSpace = 'nowrap'
  hint.style.display = 'none'
  hint.style.boxShadow = '0 8px 18px rgba(0,0,0,0.25)'
  document.body.appendChild(hint)
  return hint
}

const doorHint = createDoorHint()
const createDogHint = () => {
  const hint = document.createElement('div')
  hint.textContent = 'Аксель'
  hint.style.position = 'fixed'
  hint.style.left = '0'
  hint.style.top = '0'
  hint.style.transform = 'translate(-50%, -120%)'
  hint.style.padding = '6px 10px'
  hint.style.borderRadius = '8px'
  hint.style.background = 'rgba(16, 18, 24, 0.85)'
  hint.style.color = '#f7e9ef'
  hint.style.fontSize = '13px'
  hint.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif'
  hint.style.letterSpacing = '0.2px'
  hint.style.pointerEvents = 'none'
  hint.style.whiteSpace = 'nowrap'
  hint.style.display = 'none'
  hint.style.boxShadow = '0 8px 18px rgba(0,0,0,0.25)'
  document.body.appendChild(hint)
  return hint
}
const dogHint = createDogHint()
const createSitHint = (text) => {
  const hint = document.createElement('div')
  hint.textContent = text
  hint.style.position = 'fixed'
  hint.style.left = '0'
  hint.style.top = '0'
  hint.style.transform = 'translate(-50%, -120%)'
  hint.style.padding = '6px 10px'
  hint.style.borderRadius = '8px'
  hint.style.background = 'rgba(16, 18, 24, 0.85)'
  hint.style.color = '#f7e9ef'
  hint.style.fontSize = '13px'
  hint.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif'
  hint.style.letterSpacing = '0.2px'
  hint.style.pointerEvents = 'none'
  hint.style.whiteSpace = 'nowrap'
  hint.style.display = 'none'
  hint.style.boxShadow = '0 8px 18px rgba(0,0,0,0.25)'
  document.body.appendChild(hint)
  return hint
}
const sitHintP1 = createSitHint('Press Q щоб сісти')
const sitHintP2 = createSitHint('Press I щоб сісти')

const createGiftHint = () => {
  const hint = document.createElement('div')
  hint.textContent = 'Press P щоб відкрити фото'
  hint.style.position = 'fixed'
  hint.style.left = '50%'
  hint.style.bottom = '90px'
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
const giftHint = createGiftHint()
const createGiftPagination = () => {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '0'
  container.style.top = '0'
  container.style.transform = 'translate(-50%, 0)'
  container.style.display = 'none'
  container.style.gap = '8px'
  container.style.padding = '6px 10px'
  container.style.borderRadius = '999px'
  container.style.background = 'rgba(16, 18, 24, 0.65)'
  container.style.pointerEvents = 'auto'
  container.style.alignItems = 'center'
  container.style.justifyContent = 'center'
  container.style.backdropFilter = 'blur(4px)'
  container.style.boxShadow = '0 10px 22px rgba(0,0,0,0.2)'
  container.style.zIndex = '10'
  document.body.appendChild(container)
  return container
}
const giftPagination = createGiftPagination()
const giftPaginationState = { ids: [] }
const createGiftCaption = () => {
  const caption = document.createElement('div')
  caption.style.position = 'fixed'
  caption.style.left = '0'
  caption.style.top = '0'
  caption.style.transform = 'translate(-50%, 0)'
  caption.style.display = 'none'
  caption.style.padding = '6px 12px'
  caption.style.borderRadius = '10px'
  caption.style.background = 'rgba(16, 18, 24, 0.75)'
  caption.style.color = '#f7e9ef'
  caption.style.fontSize = '13px'
  caption.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif'
  caption.style.letterSpacing = '0.2px'
  caption.style.pointerEvents = 'none'
  caption.style.whiteSpace = 'nowrap'
  caption.style.boxShadow = '0 8px 18px rgba(0,0,0,0.25)'
  caption.style.zIndex = '10'
  document.body.appendChild(caption)
  return caption
}
const giftCaption = createGiftCaption()

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

const edgeSignZones = [{ x: edgeSignX, z: edgeSignZ, radius: 1.2 }]

const { group: forest, heartSpawns } = createForest({
  bounds,
  shoreZ,
  picnicZ,
  getGroundHeightAt,
  getRoadMaskAt,
  blanketPosition: { x: 1.2, y: 0.2346605718, z: -0.3 },
  noSpawnZones: edgeSignZones,
})
scene.add(forest)

const heroBounds = new THREE.Box3().setFromObject(hero)
const heroSize = new THREE.Vector3()
heroBounds.getSize(heroSize)

const getWorldSurfaceHeightAt = (x, z) =>
  expansionUnlocked && x < expansionArea.edgeX
    ? expansionArea.getHeightAt(x, z)
    : getSurfaceHeightAt(x, z)

const heartAlbums = [
  {
    id: 'album_main',
    photos: [
      {
        id: 'me_and_sia_first_pick',
        src: photoGiftFirst,
        caption: 'В іванофранківську',
      },
      {
        id: 'me_and_sia_second_photo',
        src: photoGiftSecond,
        caption: 'В Києві',
      },
      {
        id: 'me_and_sia_third_photo',
        src: photoGiftThird,
        caption: 'В тебе дома  в миколаєві',
      },
    ],
  },
]

const propSystem = createPropSystem({
  scene,
  hero,
  heroTwo,
  heroSize,
  picnicZ,
  bounds,
  heartSpawns,
  heartAlbums,
  getSurfaceHeightAt: getWorldSurfaceHeightAt,
  renderer,
  camera,
})

const giftBaseHeight = 1.2
const giftMaterial = new THREE.MeshBasicMaterial({
  transparent: false,
  depthWrite: true,
  opacity: 1,
  side: THREE.DoubleSide,
})
const giftPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), giftMaterial)
giftPlane.visible = false
scene.add(giftPlane)
const giftPaginationAnchor = new THREE.Vector3()
const giftPaginationScreen = new THREE.Vector3()
const giftCaptionAnchor = new THREE.Vector3()
const giftCaptionScreen = new THREE.Vector3()
const updateGiftScale = (texture) => {
  const image = texture?.image
  if (!image || !image.width || !image.height) return
  const aspect = image.width / image.height
  giftPlane.scale.set(giftBaseHeight * aspect, giftBaseHeight, 1)
}
const giftSources = {}
const giftCaptions = {}
const albumPhotoIds = {}
for (const album of heartAlbums) {
  albumPhotoIds[album.id] = []
  for (const photo of album.photos) {
    giftSources[photo.id] = photo.src
    giftCaptions[photo.id] = photo.caption
    albumPhotoIds[album.id].push(photo.id)
  }
}
const giftTextures = {}
const giftLoader = new THREE.TextureLoader()
const loadGiftTexture = (giftId, src) => {
  const texture = giftLoader.load(src, () => {
    if (giftMaterial.map === texture) {
      updateGiftScale(texture)
    }
  })
  texture.colorSpace = THREE.SRGBColorSpace
  giftTextures[giftId] = texture
  return texture
}
for (const [giftId, src] of Object.entries(giftSources)) {
  loadGiftTexture(giftId, src)
}
let activeGiftId = null
let activeAlbumId = heartAlbums[0]?.id ?? null
const setGiftTexture = (giftId) => {
  const albumFallback =
    activeAlbumId && albumPhotoIds[activeAlbumId]?.length
      ? albumPhotoIds[activeAlbumId][0]
      : Object.keys(giftSources)[0]
  const chosenId = giftTextures[giftId] ? giftId : albumFallback
  const texture = giftTextures[chosenId]
  if (giftMaterial.map !== texture) {
    giftMaterial.map = texture
    giftMaterial.needsUpdate = true
    updateGiftScale(texture)
  }
  activeGiftId = chosenId
}
if (activeAlbumId && albumPhotoIds[activeAlbumId]?.length) {
  setGiftTexture(albumPhotoIds[activeAlbumId][0])
} else {
  setGiftTexture(Object.keys(giftSources)[0])
}

const getUniqueGiftIds = (entries) => {
  const result = []
  const seen = new Set()
  for (const id of entries) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

const syncGiftPagination = (giftIds) => {
  const sameLength = giftPaginationState.ids.length === giftIds.length
  const sameContent =
    sameLength &&
    giftPaginationState.ids.every((value, index) => value === giftIds[index])
  if (sameContent) return
  giftPaginationState.ids = giftIds.slice()
  giftPagination.innerHTML = ''
  giftIds.forEach((giftId, index) => {
    const dot = document.createElement('button')
    dot.type = 'button'
    dot.dataset.index = `${index}`
    dot.dataset.giftId = giftId
    dot.style.width = '10px'
    dot.style.height = '10px'
    dot.style.borderRadius = '50%'
    dot.style.border = '1px solid rgba(255,255,255,0.5)'
    dot.style.background = 'rgba(255,255,255,0.35)'
    dot.style.cursor = 'pointer'
    dot.style.padding = '0'
    dot.style.outline = 'none'
    dot.style.boxShadow = '0 2px 4px rgba(0,0,0,0.25)'
    giftPagination.appendChild(dot)
  })
}

const updateGiftPaginationActive = () => {
  const dots = giftPagination.querySelectorAll('button[data-index]')
  dots.forEach((dot) => {
    const isActive = dot.dataset.giftId === activeGiftId
    dot.style.background = isActive
      ? 'rgba(255,255,255,0.9)'
      : 'rgba(255,255,255,0.35)'
    dot.style.transform = isActive ? 'scale(1.15)' : 'scale(1)'
  })
}

giftPagination.addEventListener('click', (event) => {
  const target = event.target.closest('button[data-index]')
  if (!target) return
  const index = Number(target.dataset.index)
  const giftId = giftPaginationState.ids[index]
  if (!giftId) return
  setGiftTexture(giftId)
  giftPlane.visible = true
})

const swanSystem = createSwanSystem(
  scene,
  water,
  waterCenter,
  waterWidth,
  waterDepth
)

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

const toggleSit = (heroTarget, state, seatPos) => {
  if (!heroTarget || !state) return
  if (state.seated) {
    state.seated = false
    state.transitioning = false
    state.t = 0
    return
  }
  if (heroTarget.position.distanceTo(seatPos) > sitConfig.radius) return
  state.seated = true
  state.transitioning = true
  state.t = 0
  state.start.copy(heroTarget.position)
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
  if (key === 'q' || code === 'KeyQ') {
    updateSeatPositions()
    toggleSit(hero, sitState.p1, seatLeft)
  }
  if (key === 'i' || code === 'KeyI') {
    updateSeatPositions()
    toggleSit(heroTwo, sitState.p2, seatRight)
  }
  if (key === 'p' || code === 'KeyP') {
    const heldHearts = propSystem.getHeldHearts
      ? propSystem.getHeldHearts()
      : []
    if (heldHearts.length === 0) {
      giftPlane.visible = false
    } else {
      const heldAlbums = getUniqueGiftIds(
        heldHearts.map((entry) => entry.prop?.mesh?.userData?.albumId)
      )
      if (heldAlbums.length > 0 && !heldAlbums.includes(activeAlbumId)) {
        activeAlbumId = heldAlbums[0]
      }
      const albumIds = activeAlbumId ? albumPhotoIds[activeAlbumId] ?? [] : []
      if (!giftPlane.visible) {
        const giftId =
          activeGiftId && albumIds.includes(activeGiftId)
            ? activeGiftId
            : albumIds[0]
        if (giftId) {
          setGiftTexture(giftId)
          giftPlane.visible = true
        }
      } else {
        giftPlane.visible = false
      }
    }
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
      const heroNear = hero.position.distanceTo(doorPos) < 1.4
      const heroTwoNear = heroTwo
        ? heroTwo.position.distanceTo(doorPos) < 1.4
        : false
      if (heroNear || heroTwoNear) {
        doorState.open = !doorState.open
        doorState.target = doorState.open ? -Math.PI * 0.55 : 0
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
const cameraPanOffset = new THREE.Vector3()
const cameraTarget = new THREE.Vector3()
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

const updateSeatedHero = (heroTarget, state, seatPos, delta) => {
  if (!heroTarget || !state) return
  const moveAlpha = Math.min(state.t / sitConfig.transition, 1)
  if (state.transitioning) {
    state.t += delta
    const t = Math.min(state.t / sitConfig.transition, 1)
    const eased = t * t * (3 - 2 * t)
    heroTarget.position.lerpVectors(state.start, seatPos, eased)
    if (t >= 1) {
      state.transitioning = false
    }
  } else {
    heroTarget.position.copy(seatPos)
  }
  if (moveAlpha < 1) {
    heroTarget.position.y = THREE.MathUtils.lerp(
      heroTarget.position.y,
      seatPos.y,
      moveAlpha
    )
  }
  const lookTargetX = waterCenter.x
  const lookTargetZ = waterCenter.y
  const targetAngle = Math.atan2(
    lookTargetX - heroTarget.position.x,
    lookTargetZ - heroTarget.position.z
  )
  targetQuat.setFromAxisAngle(worldUp, targetAngle)
  const turnAlpha = 1 - Math.exp(-heroTurnSpeed * delta)
  heroTarget.quaternion.slerp(targetQuat, turnAlpha)

  const limbTargets = heroTarget.userData?.limbs
  if (limbTargets) {
    limbTargets.leftArm.userData.swingX = 0
    limbTargets.rightArm.userData.swingX = 0
    limbTargets.leftArm.userData.hugX = 0
    limbTargets.rightArm.userData.hugX = 0
    limbTargets.leftArm.userData.hugZ = 0
    limbTargets.rightArm.userData.hugZ = 0
  }
}

const applySeatedPose = (heroTarget) => {
  const limbs = heroTarget?.userData?.limbs
  if (!limbs) return
  const ensureBase = (limb) => {
    if (!limb.userData.basePos) {
      limb.userData.basePos = limb.position.clone()
    }
  }
  ensureBase(limbs.leftLeg)
  ensureBase(limbs.rightLeg)
  ensureBase(limbs.leftArm)
  ensureBase(limbs.rightArm)

  limbs.leftLeg.rotation.x = -1.05
  limbs.rightLeg.rotation.x = -1.05
  limbs.leftLeg.rotation.z = 0.06
  limbs.rightLeg.rotation.z = -0.06
  limbs.leftLeg.position.copy(limbs.leftLeg.userData.basePos)
  limbs.rightLeg.position.copy(limbs.rightLeg.userData.basePos)
  limbs.leftLeg.position.y -= 0.04
  limbs.rightLeg.position.y -= 0.04
  limbs.leftLeg.position.z += 0.12
  limbs.rightLeg.position.z += 0.12

  limbs.leftArm.rotation.x = 0.25
  limbs.rightArm.rotation.x = 0.25
  limbs.leftArm.rotation.z = 0.06
  limbs.rightArm.rotation.z = -0.06
  limbs.leftArm.position.copy(limbs.leftArm.userData.basePos)
  limbs.rightArm.position.copy(limbs.rightArm.userData.basePos)
  limbs.leftArm.position.z += 0.06
  limbs.rightArm.position.z += 0.06
  limbs.leftArm.position.y -= 0.01
  limbs.rightArm.position.y -= 0.01
}

const resetSeatedPose = (heroTarget) => {
  const limbs = heroTarget?.userData?.limbs
  if (!limbs) return
  const resetLimb = (limb) => {
    if (limb?.userData?.basePos) {
      limb.position.copy(limb.userData.basePos)
    }
  }
  resetLimb(limbs.leftLeg)
  resetLimb(limbs.rightLeg)
  resetLimb(limbs.leftArm)
  resetLimb(limbs.rightArm)
}

const updateSharedCamera = () => {
  heroMidpoint.copy(hero.position).add(heroTwo.position).multiplyScalar(0.5)
  cameraTarget.copy(heroMidpoint).add(cameraPanOffset)
  cameraOffset.copy(camera.position).sub(controls.target)
  const heroDistance = hero.position.distanceTo(heroTwo.position)
  const desiredDistance = THREE.MathUtils.clamp(3 + heroDistance * 0.8, 3, 7)
  const currentDistance = cameraOffset.length() || 1
  cameraOffset.multiplyScalar(desiredDistance / currentDistance)
  camera.position.copy(cameraTarget).add(cameraOffset)
  controls.target.copy(cameraTarget)
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
  updateSeatPositions()

  const heldHearts = propSystem.getHeldHearts
    ? propSystem.getHeldHearts()
    : []
  const heldAlbums = getUniqueGiftIds(
    heldHearts.map((entry) => entry.prop?.mesh?.userData?.albumId)
  )
  if (heldAlbums.length > 0 && !heldAlbums.includes(activeAlbumId)) {
    activeAlbumId = heldAlbums[0]
  }
  const heldGiftIds =
    heldHearts.length > 0 && activeAlbumId
      ? albumPhotoIds[activeAlbumId] ?? []
      : []
  if (heldHearts.length === 0 && giftPlane.visible) {
    giftPlane.visible = false
    activeGiftId = null
  }
  if (giftHint) {
    giftHint.textContent =
      heldGiftIds.length > 1
        ? 'Press P щоб переглянути фото'
        : 'Press P щоб відкрити фото'
    giftHint.style.display = heldHearts.length > 0 ? 'block' : 'none'
  }
  if (giftPlane.visible) {
    if (heldGiftIds.length > 0) {
      if (!heldGiftIds.includes(activeGiftId)) {
        setGiftTexture(heldGiftIds[0])
      }
    }
    giftPlane.position.set(
      (waterCenter.x + heroMidpoint.x) * 0.5,
      water.position.y + 1.7 + Math.sin(time * 1.2) * 0.04,
      (waterCenter.y + heroMidpoint.z) * 0.5
    )
    giftPlane.lookAt(camera.position)
  }

  if (giftPlane.visible && heldGiftIds.length > 1) {
    syncGiftPagination(heldGiftIds)
    updateGiftPaginationActive()
    giftPaginationAnchor.set(0, -0.65, 0)
    giftPlane.localToWorld(giftPaginationAnchor)
    giftPaginationScreen.copy(giftPaginationAnchor).project(camera)
    const rect = renderer.domElement.getBoundingClientRect()
    const screenX =
      (giftPaginationScreen.x * 0.5 + 0.5) * rect.width + rect.left
    const screenY =
      (-giftPaginationScreen.y * 0.5 + 0.5) * rect.height + rect.top
    giftPagination.style.left = `${screenX}px`
    giftPagination.style.top = `${screenY}px`
    giftPagination.style.display = 'flex'
  } else {
    giftPagination.style.display = 'none'
  }

  if (giftPlane.visible && activeGiftId && giftCaptions[activeGiftId]) {
    const rect = renderer.domElement.getBoundingClientRect()
    const offsetY = heldGiftIds.length > 1 ? -0.82 : -0.74
    giftCaptionAnchor.set(0, offsetY, 0)
    giftPlane.localToWorld(giftCaptionAnchor)
    giftCaptionScreen.copy(giftCaptionAnchor).project(camera)
    const screenX =
      (giftCaptionScreen.x * 0.5 + 0.5) * rect.width + rect.left
    const screenY =
      (-giftCaptionScreen.y * 0.5 + 0.5) * rect.height + rect.top
    giftCaption.textContent = giftCaptions[activeGiftId]
    giftCaption.style.left = `${screenX}px`
    giftCaption.style.top = `${screenY}px`
    giftCaption.style.display = 'block'
  } else {
    giftCaption.style.display = 'none'
  }

  if (kissState.cooldown > 0) {
    kissState.cooldown = Math.max(0, kissState.cooldown - delta)
  }

  const heroDistance = hero.position.distanceTo(heroTwo.position)
  const canKiss =
    heroDistance < 0.6 &&
    areFacingEachOther() &&
    kissState.cooldown <= 0 &&
    !sitState.p1.seated &&
    !sitState.p2.seated

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
    if (sitState.p1.seated) {
      updateSeatedHero(hero, sitState.p1, seatLeft, delta)
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
      resetSeatedPose(hero)
    }
    if (sitState.p2.seated) {
      updateSeatedHero(heroTwo, sitState.p2, seatRight, delta)
    } else {
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
      resetSeatedPose(heroTwo)
    }
  }
  updateSharedCamera()
  updateWater(water, time)
  swanSystem.updateSwans(time, delta)
  propSystem.updateProps(delta)
  propSystem.updateActionHint()
  if (!kissState.active) {
    if (sitState.p1.seated) {
      applySeatedPose(hero)
    }
    if (sitState.p2.seated) {
      applySeatedPose(heroTwo)
    }
  }
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
          expansionReveal.active = true
          expansionReveal.t = 0
          expansionArea.group.scale.set(0.85, 0.85, 0.85)
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
    const baseYaw = doorPivot.userData?.baseYaw ?? 0
    const damp = 1 - Math.exp(-8 * delta)
    doorPivot.rotation.y = THREE.MathUtils.lerp(
      doorPivot.rotation.y,
      baseYaw + doorState.target,
      damp
    )
  }

  if (doorHint && expansionUnlocked && expansionArea.doorPivot) {
    const doorPos = new THREE.Vector3()
    expansionArea.doorPivot.getWorldPosition(doorPos)
    const heroNear = hero.position.distanceTo(doorPos) < 1.4
    const heroTwoNear = heroTwo
      ? heroTwo.position.distanceTo(doorPos) < 1.4
      : false
    if (heroNear || heroTwoNear) {
      const rect = renderer.domElement.getBoundingClientRect()
      const screen = doorPos.clone()
      screen.y += 0.6
      screen.project(camera)
      const screenX = (screen.x * 0.5 + 0.5) * rect.width + rect.left
      const screenY = (-screen.y * 0.5 + 0.5) * rect.height + rect.top
      doorHint.textContent = doorState.open
        ? 'Press F щоб закрити двері'
        : 'Press F щоб відкрити двері'
      doorHint.style.left = `${screenX}px`
      doorHint.style.top = `${screenY}px`
      doorHint.style.display = 'block'
    } else {
      doorHint.style.display = 'none'
    }
  } else if (doorHint) {
    doorHint.style.display = 'none'
  }

  if (sitHintP1) {
    const nearSeat = hero.position.distanceTo(seatLeft) < sitConfig.radius + 0.2
    if (!sitState.p1.seated && nearSeat && !kissState.active) {
      const rect = renderer.domElement.getBoundingClientRect()
      const screen = seatLeft.clone()
      screen.y += 0.2
      screen.project(camera)
      const screenX = (screen.x * 0.5 + 0.5) * rect.width + rect.left
      const screenY = (-screen.y * 0.5 + 0.5) * rect.height + rect.top
      sitHintP1.style.left = `${screenX}px`
      sitHintP1.style.top = `${screenY}px`
      sitHintP1.style.display = 'block'
    } else {
      sitHintP1.style.display = 'none'
    }
  }

  if (sitHintP2 && heroTwo) {
    const nearSeat = heroTwo.position.distanceTo(seatRight) < sitConfig.radius + 0.2
    if (!sitState.p2.seated && nearSeat && !kissState.active) {
      const rect = renderer.domElement.getBoundingClientRect()
      const screen = seatRight.clone()
      screen.y += 0.2
      screen.project(camera)
      const screenX = (screen.x * 0.5 + 0.5) * rect.width + rect.left
      const screenY = (-screen.y * 0.5 + 0.5) * rect.height + rect.top
      sitHintP2.style.left = `${screenX}px`
      sitHintP2.style.top = `${screenY}px`
      sitHintP2.style.display = 'block'
    } else {
      sitHintP2.style.display = 'none'
    }
  } else if (sitHintP2) {
    sitHintP2.style.display = 'none'
  }

  if (dogHint && expansionUnlocked && expansionArea.dog) {
    const dogPos = new THREE.Vector3()
    expansionArea.dog.getWorldPosition(dogPos)
    const heroNear = hero.position.distanceTo(dogPos) < 1.4
    const heroTwoNear = heroTwo
      ? heroTwo.position.distanceTo(dogPos) < 1.4
      : false
    if (heroNear || heroTwoNear) {
      const rect = renderer.domElement.getBoundingClientRect()
      const screen = dogPos.clone()
      screen.y += 0.35
      screen.project(camera)
      const screenX = (screen.x * 0.5 + 0.5) * rect.width + rect.left
      const screenY = (-screen.y * 0.5 + 0.5) * rect.height + rect.top
      dogHint.style.left = `${screenX}px`
      dogHint.style.top = `${screenY}px`
      dogHint.style.display = 'block'
    } else {
      dogHint.style.display = 'none'
    }
  } else if (dogHint) {
    dogHint.style.display = 'none'
  }

  if (expansionUnlocked && expansionArea.smokePuffs && expansionArea.chimney) {
    smokeState.timer += delta
    if (smokeState.timer >= smokeState.interval) {
      smokeState.timer = 0
      const next = expansionArea.smokePuffs.find((puff) => puff.life <= 0)
      if (next) {
        next.life = 1
        next.mesh.visible = true
        next.mesh.material.opacity = 0.25
        next.mesh.position.set(
          expansionArea.chimney.position.x,
          expansionArea.chimney.position.y + 0.3,
          expansionArea.chimney.position.z
        )
        next.mesh.scale.setScalar(0.8 + Math.random() * 0.4)
      }
    }
    for (const puff of expansionArea.smokePuffs) {
      if (puff.life <= 0) continue
      puff.life -= delta * 0.45
      puff.mesh.position.y += delta * 0.2
      puff.mesh.position.x += Math.sin(time * 1.5 + puff.life * 8) * 0.0015
      puff.mesh.position.z += Math.cos(time * 1.2 + puff.life * 6) * 0.0015
      puff.mesh.material.opacity = Math.max(0, puff.life * 0.35)
      puff.mesh.scale.multiplyScalar(1 + delta * 0.12)
      if (puff.life <= 0) {
        puff.mesh.visible = false
      }
    }
  }

  if (expansionUnlocked) {
    if (expansionArea.dogTail) {
      expansionArea.dogTail.rotation.y = Math.sin(time * 4) * 0.5
    }
    if (expansionArea.dogHead) {
      expansionArea.dogHead.rotation.x = Math.sin(time * 1.6) * 0.08
    }
    if (expansionArea.swayItems) {
      for (const item of expansionArea.swayItems) {
        item.mesh.rotation.z =
          item.base + Math.sin(time * 1.4 + item.phase) * 0.08
      }
    }
  }

  if (expansionReveal.active) {
    expansionReveal.t = Math.min(
      expansionReveal.duration,
      expansionReveal.t + delta
    )
    const progress = expansionReveal.t / expansionReveal.duration
    const eased = smoothstep(0, 1, progress)
    expansionArea.group.scale.setScalar(0.85 + eased * 0.15)
    if (expansionArea.revealMaterials) {
      for (const mat of expansionArea.revealMaterials) {
        mat.opacity = eased
      }
    }
    if (progress >= 1) {
      expansionReveal.active = false
      expansionArea.group.scale.setScalar(1)
      if (expansionArea.revealMaterials) {
        for (const mat of expansionArea.revealMaterials) {
          mat.opacity = 1
          mat.transparent = false
        }
      }
    }
  }

  if (expansionUnlocked && !expansionReveal.active && expansionArea.revealMaterials) {
    for (const mat of expansionArea.revealMaterials) {
      if (mat.opacity < 1) {
        mat.opacity = 1
        mat.transparent = false
      }
    }
  }

  updateFireworks(delta)

  controls.update()
  cameraPanOffset.copy(controls.target).sub(heroMidpoint)
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
