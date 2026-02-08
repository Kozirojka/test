import * as THREE from 'three'

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
  mesh.rotation.set(-Math.PI / 2, Math.PI * 0.15, -Math.PI * 0.05)
  return mesh
}

const createCanLabelTexture = ({ main, mid, dark, text, stripe }) => {
  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const grad = ctx.createLinearGradient(0, 0, width, 0)
  grad.addColorStop(0, main)
  grad.addColorStop(0.5, mid)
  grad.addColorStop(1, dark)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = stripe
  for (let i = 0; i < 14; i += 1) {
    const x = (i / 14) * width
    ctx.fillRect(x, 0, 6, height)
  }

  ctx.font = 'bold 96px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = text
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 8
  ctx.fillText('revo', width * 0.5, height * 0.52)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

const createCanGroup = (variant) => {
  const radius = 0.22
  const height = 0.7
  const radialSegments = 32

  const canGeometry = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    radialSegments,
    1,
    false
  )
  canGeometry.computeBoundingBox()
  if (canGeometry.boundingBox) {
    const center = new THREE.Vector3()
    canGeometry.boundingBox.getCenter(center)
    canGeometry.translate(-center.x, -center.y, -center.z)
  }

  const labelTexture = createCanLabelTexture(variant)
  const canMaterial = new THREE.MeshStandardMaterial({
    color: variant.shell,
    metalness: 0.75,
    roughness: 0.25,
    map: labelTexture ?? undefined,
  })
  if (labelTexture) {
    labelTexture.repeat.set(1, 1)
  }

  const rimGeometry = new THREE.TorusGeometry(radius * 0.98, 0.018, 10, 32)
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: variant.rim,
    metalness: 0.8,
    roughness: 0.2,
  })
  const topRim = new THREE.Mesh(rimGeometry, rimMaterial)
  topRim.rotation.x = Math.PI / 2
  topRim.position.y = height / 2 - 0.01

  const bottomRim = topRim.clone()
  bottomRim.position.y = -height / 2 + 0.01

  const can = new THREE.Mesh(canGeometry, canMaterial)

  const lidGeometry = new THREE.CylinderGeometry(
    radius * 0.96,
    radius * 0.96,
    0.02,
    radialSegments
  )
  const lidMaterial = new THREE.MeshStandardMaterial({
    color: variant.rim,
    metalness: 0.85,
    roughness: 0.2,
  })
  const lid = new THREE.Mesh(lidGeometry, lidMaterial)
  lid.position.y = height / 2 - 0.01

  const tabGeometry = new THREE.BoxGeometry(0.08, 0.01, 0.04)
  const tabMaterial = new THREE.MeshStandardMaterial({
    color: 0xdad6cf,
    metalness: 0.8,
    roughness: 0.25,
  })
  const tab = new THREE.Mesh(tabGeometry, tabMaterial)
  tab.position.set(0.05, height / 2 + 0.01, 0.06)

  const group = new THREE.Group()
  group.add(can, topRim, bottomRim, lid, tab)
  group.scale.set(0.7, 0.7, 0.7)
  group.rotation.y = -Math.PI * 0.15
  group.userData.type = 'can'
  group.userData.opened = false
  group.userData.canHeight = height
  group.userData.tab = tab
  group.userData.lid = lid
  group.userData.labelYaw = Math.PI / 2
  return group
}

const scaleToHeight = (object, targetHeight) => {
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  box.getSize(size)
  if (size.y <= 0) return
  const factor = targetHeight / size.y
  object.scale.multiplyScalar(factor)
}

const createActionHint = (text) => {
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

const createOpenHint = () => {
  const hint = document.createElement('div')
  hint.textContent = 'Press O / T щоб відкрити банку'
  hint.style.position = 'fixed'
  hint.style.left = '50%'
  hint.style.bottom = '24px'
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

export const createPropSystem = ({
  scene,
  hero,
  heroTwo,
  heroSize,
  picnicZ,
  bounds,
  getSurfaceHeightAt,
  renderer,
  camera,
  propGroundEpsilon = 0.02,
}) => {
  const placeOnSurface = (object, x, z, lift = 0) => {
    object.position.set(x, 0, z)
    object.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(object)
    const surfaceY = getSurfaceHeightAt(x, z) + lift
    object.position.y += surfaceY - box.min.y
  }

  const heartMesh = createHeartMesh()
  heartMesh.userData.type = 'heart'
  heartMesh.userData.giftId = 'me_and_sia_first_pick'
  const redCan = createCanGroup({
    main: '#cf2b2b',
    mid: '#ff3f3f',
    dark: '#b81818',
    text: '#fff4e6',
    stripe: 'rgba(255,255,255,0.12)',
    shell: 0xffe7d2,
    rim: 0xf2e8dd,
  })
  const grayCan = createCanGroup({
    main: '#9aa2ab',
    mid: '#c4cbd3',
    dark: '#7c838b',
    text: '#f3f6f9',
    stripe: 'rgba(255,255,255,0.18)',
    shell: 0xe5e9ee,
    rim: 0xf1f4f7,
  })
  const targetPropHeight = heroSize.y / 5

  scaleToHeight(heartMesh, targetPropHeight)
  scaleToHeight(redCan, targetPropHeight)
  scaleToHeight(grayCan, targetPropHeight)

  redCan.userData.pickupLabel = 'Підняти банку червоного рева'
  redCan.userData.pickupLabelP1 = 'Підняти банку червоного рева (L)'
  redCan.userData.pickupLabelP2 = 'Підняти банку червоного рева (E/R)'
  grayCan.userData.pickupLabel = 'Підняти банку сірого рева'
  grayCan.userData.pickupLabelP1 = 'Підняти банку сірого рева (L)'
  grayCan.userData.pickupLabelP2 = 'Підняти банку сірого рева (E/R)'
  heartMesh.userData.pickupLabel = 'Підняти сердечко'
  heartMesh.userData.pickupLabelP1 = 'Підняти сердечко (L)'
  heartMesh.userData.pickupLabelP2 = 'Підняти сердечко (E/R)'

  placeOnSurface(heartMesh, -0.6, picnicZ + 0.05, propGroundEpsilon)
  placeOnSurface(redCan, 0.5, picnicZ - 0.15, propGroundEpsilon)
  placeOnSurface(grayCan, 0.15, picnicZ - 0.35, propGroundEpsilon)
  scene.add(heartMesh, redCan, grayCan)

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
      isCan: mesh.userData?.type === 'can',
      isHeart: mesh.userData?.type === 'heart',
      opened: mesh.userData?.opened ?? false,
    }
  }

  const props = [
    createPropBody(heartMesh),
    createPropBody(redCan),
    createPropBody(grayCan),
  ]
  const actionHint = createActionHint('1. Підняти Press L')
  const actionHintTwo = heroTwo
    ? createActionHint('Press E/R щоб підняти')
    : null
  const openHint = createOpenHint()
  const actionProject = new THREE.Vector3()
  const actionProjectTwo = new THREE.Vector3()

  const createHandState = (player, rightOffset, leftOffset) => {
    const holdRight = new THREE.Object3D()
    const holdLeft = new THREE.Object3D()
    const rightArm = player.userData?.limbs?.rightArm
    const leftArm = player.userData?.limbs?.leftArm
    const baseRightPos = rightArm ? rightArm.position.clone() : null
    const baseLeftPos = leftArm ? leftArm.position.clone() : null
    const baseRightRot = rightArm ? rightArm.rotation.clone() : null
    const baseLeftRot = leftArm ? leftArm.rotation.clone() : null
    if (rightArm && leftArm) {
      holdRight.position.set(0, -0.3, 0.14)
      holdLeft.position.set(0, -0.3, 0.14)
      rightArm.add(holdRight)
      leftArm.add(holdLeft)
    } else {
      holdRight.position.copy(rightOffset)
      holdLeft.position.copy(leftOffset)
      player.add(holdRight, holdLeft)
    }
    return {
      player,
      holdRight,
      holdLeft,
      rightArm,
      leftArm,
      baseRightPos,
      baseLeftPos,
      baseRightRot,
      baseLeftRot,
      heldRightProp: null,
      heldLeftProp: null,
      activeProp: null,
    }
  }

  const playerOne = createHandState(
    hero,
    new THREE.Vector3(0.21, 0.18, 0.16),
    new THREE.Vector3(-0.21, 0.18, 0.16)
  )
  const playerTwo = heroTwo
    ? createHandState(
        heroTwo,
        new THREE.Vector3(0.21, 0.18, 0.16),
        new THREE.Vector3(-0.21, 0.18, 0.16)
      )
    : null

  const openEffects = []

  const createOpenEffect = (position) => {
    const count = 18
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3
      positions[i3] = 0
      positions[i3 + 1] = 0
      positions[i3 + 2] = 0
      velocities[i3] = (Math.random() - 0.5) * 0.25
      velocities[i3 + 1] = 0.35 + Math.random() * 0.2
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.25
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
    const points = new THREE.Points(geometry, material)
    points.position.copy(position)
    scene.add(points)
    openEffects.push({ points, velocities, life: 0.6 })
  }

  const updateOpenEffects = (delta) => {
    for (let i = openEffects.length - 1; i >= 0; i -= 1) {
      const effect = openEffects[i]
      effect.life -= delta
      const positions = effect.points.geometry.attributes.position
      const velocity = effect.velocities
      for (let j = 0; j < positions.count; j += 1) {
        const j3 = j * 3
        positions.setXYZ(
          j,
          positions.getX(j) + velocity[j3] * delta,
          positions.getY(j) + velocity[j3 + 1] * delta,
          positions.getZ(j) + velocity[j3 + 2] * delta
        )
        velocity[j3 + 1] -= 0.6 * delta
      }
      positions.needsUpdate = true
      effect.points.material.opacity = Math.max(0, effect.life / 0.6)
      if (effect.life <= 0) {
        scene.remove(effect.points)
        effect.points.geometry.dispose()
        effect.points.material.dispose()
        openEffects.splice(i, 1)
      }
    }
  }

  const gravity = 3.2
  const propFriction = 0.85
  const propBounce = 0.2
  const propAngularDamp = 0.92
  const dropRightDir = new THREE.Vector3()
  const dropForwardDir = new THREE.Vector3()
  const armExtend = {
    z: 0.08,
    xRot: -0.18,
  }

  const updateArmPose = (playerState) => {
    if (!playerState) return
    const { rightArm, leftArm, baseRightPos, baseLeftPos, baseRightRot, baseLeftRot } =
      playerState
    if (rightArm && baseRightPos && baseRightRot) {
      rightArm.position.copy(baseRightPos)
      rightArm.rotation.copy(baseRightRot)
      rightArm.rotation.x += rightArm.userData?.swingX ?? 0
      rightArm.rotation.x += rightArm.userData?.hugX ?? 0
      rightArm.rotation.z += rightArm.userData?.hugZ ?? 0
      if (playerState.heldRightProp) {
        rightArm.position.z += armExtend.z
        rightArm.rotation.x += armExtend.xRot
      }
    }
    if (leftArm && baseLeftPos && baseLeftRot) {
      leftArm.position.copy(baseLeftPos)
      leftArm.rotation.copy(baseLeftRot)
      leftArm.rotation.x += leftArm.userData?.swingX ?? 0
      leftArm.rotation.x += leftArm.userData?.hugX ?? 0
      leftArm.rotation.z += leftArm.userData?.hugZ ?? 0
      if (playerState.heldLeftProp) {
        leftArm.position.z += armExtend.z
        leftArm.rotation.x += armExtend.xRot
      }
    }
  }

  const applyHeroImpulse = (prop, heroRef) => {
    if (!heroRef) return
    const dx = prop.mesh.position.x - heroRef.position.x
    const dz = prop.mesh.position.z - heroRef.position.z
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
  }

  const updateProps = (delta) => {
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

      applyHeroImpulse(prop, hero)
      if (heroTwo) {
        applyHeroImpulse(prop, heroTwo)
      }

      prop.angular.multiplyScalar(propAngularDamp)
      prop.mesh.rotation.x += prop.angular.x * delta
      prop.mesh.rotation.y += prop.angular.y * delta
      prop.mesh.rotation.z += prop.angular.z * delta
    }
    updateOpenEffects(delta)
    updateArmPose(playerOne)
    if (playerTwo) {
      updateArmPose(playerTwo)
    }
  }

  const findNearestPropFor = (heroRef) => {
    let nearest = null
    let nearestDist = Infinity
    for (const prop of props) {
      if (prop.held) continue
      const dx = prop.mesh.position.x - heroRef.position.x
      const dz = prop.mesh.position.z - heroRef.position.z
      const dist = Math.hypot(dx, dz)
      const range = heroRadius + prop.radius + 0.2
      if (dist < range && dist < nearestDist) {
        nearestDist = dist
        nearest = prop
      }
    }
    return nearest
  }

  const updateHintForPlayer = (playerState, hint, projector, labelKey) => {
    if (!playerState || !hint) return
    if (playerState.heldLeftProp && playerState.heldRightProp) {
      hint.style.display = 'none'
      playerState.activeProp = null
      return
    }

    const prop = findNearestPropFor(playerState.player)
    playerState.activeProp = prop
    if (prop) {
      const rect = renderer.domElement.getBoundingClientRect()
      projector.copy(prop.mesh.position)
      projector.y += prop.halfHeight + 0.05
      projector.project(camera)
      const screenX = (projector.x * 0.5 + 0.5) * rect.width + rect.left
      const screenY = (-projector.y * 0.5 + 0.5) * rect.height + rect.top
      hint.textContent =
        prop.mesh.userData?.[labelKey] ??
        prop.mesh.userData?.pickupLabel ??
        hint.textContent
      hint.style.left = `${screenX}px`
      hint.style.top = `${screenY}px`
      hint.style.display = 'block'
    } else {
      hint.style.display = 'none'
    }
  }

  const hasClosedCan = (playerState) =>
    Boolean(
      (playerState?.heldRightProp &&
        playerState.heldRightProp.isCan &&
        !playerState.heldRightProp.opened) ||
        (playerState?.heldLeftProp &&
          playerState.heldLeftProp.isCan &&
          !playerState.heldLeftProp.opened)
    )

  const updateActionHint = () => {
    updateHintForPlayer(playerOne, actionHint, actionProject, 'pickupLabelP1')
    if (playerTwo && actionHintTwo) {
      updateHintForPlayer(
        playerTwo,
        actionHintTwo,
        actionProjectTwo,
        'pickupLabelP2'
      )
    }
    openHint.style.display =
      hasClosedCan(playerOne) || hasClosedCan(playerTwo) ? 'block' : 'none'
  }

  const attachToHand = (prop, playerState, hand) => {
    prop.held = true
    prop.velocity.set(0, 0, 0)
    prop.angular.set(0, 0, 0)
    prop.mesh.position.set(0, 0, 0)
    if (prop.isCan) {
      prop.mesh.rotation.set(0, prop.mesh.userData?.labelYaw ?? Math.PI / 2, 0)
    } else {
      prop.mesh.rotation.set(Math.PI / 2, 0, 0)
    }
    if (hand === 'right') {
      playerState.holdRight.add(prop.mesh)
      playerState.heldRightProp = prop
    } else {
      playerState.holdLeft.add(prop.mesh)
      playerState.heldLeftProp = prop
    }
  }

  const openCan = (prop) => {
    if (!prop || !prop.isCan || prop.opened) return
    prop.opened = true
    prop.mesh.userData.opened = true
    const { tab, lid, canHeight } = prop.mesh.userData
    if (tab) {
      tab.rotation.x = -Math.PI / 2
      tab.rotation.y += Math.PI * 0.15
      tab.position.y += 0.015
    }
    if (lid && lid.material) {
      lid.material.color.set(0xd8d3cd)
    }
    const mouth = new THREE.Vector3(0, (canHeight ?? 0.7) / 2, 0)
    prop.mesh.localToWorld(mouth)
    createOpenEffect(mouth)
  }

  const dropFromHand = (prop, playerState, hand) => {
    if (!prop) return
    const player = playerState.player
    dropRightDir.set(1, 0, 0).applyQuaternion(player.quaternion)
    dropForwardDir.set(0, 0, 1).applyQuaternion(player.quaternion)
    const side = hand === 'right' ? 0.25 : -0.25
    const dropX = player.position.x + dropForwardDir.x * 0.6 + dropRightDir.x * side
    const dropZ = player.position.z + dropForwardDir.z * 0.6 + dropRightDir.z * side

    if (hand === 'right') {
      playerState.holdRight.remove(prop.mesh)
      playerState.heldRightProp = null
    } else {
      playerState.holdLeft.remove(prop.mesh)
      playerState.heldLeftProp = null
    }

    scene.add(prop.mesh)
    placeOnSurface(prop.mesh, dropX, dropZ, propGroundEpsilon)
    prop.velocity.set(dropForwardDir.x * 0.2, 0.2, dropForwardDir.z * 0.2)
    prop.angular.set(
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 1.2
    )
    prop.held = false
    prop.cooldown = 0.5
  }

  const handleKeyDown = (event) => {
    const key = event.key.toLowerCase()
    const code = event.code
    if ((key === 'l' || code === 'KeyL') && playerOne.activeProp) {
      if (!playerOne.heldRightProp) {
        attachToHand(playerOne.activeProp, playerOne, 'right')
      } else if (!playerOne.heldLeftProp) {
        attachToHand(playerOne.activeProp, playerOne, 'left')
      } else {
        return
      }
      playerOne.activeProp = null
      actionHint.style.display = 'none'
    }
    if (key === 'k' || code === 'KeyK') {
      if (playerOne.heldRightProp) {
        dropFromHand(playerOne.heldRightProp, playerOne, 'right')
      } else if (playerOne.heldLeftProp) {
        dropFromHand(playerOne.heldLeftProp, playerOne, 'left')
      }
    }
    if (key === 'o' || code === 'KeyO') {
      if (playerOne.heldRightProp) {
        openCan(playerOne.heldRightProp)
      }
      if (playerOne.heldLeftProp) {
        openCan(playerOne.heldLeftProp)
      }
    }

    if (playerTwo) {
      if (key === 'e' || code === 'KeyE') {
        if (playerTwo.activeProp) {
          if (!playerTwo.heldRightProp) {
            attachToHand(playerTwo.activeProp, playerTwo, 'right')
          } else if (!playerTwo.heldLeftProp) {
            attachToHand(playerTwo.activeProp, playerTwo, 'left')
          } else {
            return
          }
          playerTwo.activeProp = null
          if (actionHintTwo) {
            actionHintTwo.style.display = 'none'
          }
        } else if (playerTwo.heldRightProp) {
          dropFromHand(playerTwo.heldRightProp, playerTwo, 'right')
        }
      }
      if (key === 'r' || code === 'KeyR') {
        if (playerTwo.activeProp) {
          if (!playerTwo.heldLeftProp) {
            attachToHand(playerTwo.activeProp, playerTwo, 'left')
          } else if (!playerTwo.heldRightProp) {
            attachToHand(playerTwo.activeProp, playerTwo, 'right')
          } else {
            return
          }
          playerTwo.activeProp = null
          if (actionHintTwo) {
            actionHintTwo.style.display = 'none'
          }
        } else if (playerTwo.heldLeftProp) {
          dropFromHand(playerTwo.heldLeftProp, playerTwo, 'left')
        }
      }
      if (key === 't' || code === 'KeyT') {
        if (playerTwo.heldRightProp) {
          openCan(playerTwo.heldRightProp)
        }
        if (playerTwo.heldLeftProp) {
          openCan(playerTwo.heldLeftProp)
        }
      }
    }
  }

  const handleKeyUp = () => {}

  return {
    updateProps,
    updateActionHint,
    handleKeyDown,
    handleKeyUp,
    getHeartHolder: () => {
      const getHeldHeartFor = (playerState) => {
        if (!playerState) return null
        if (playerState.heldRightProp?.isHeart) return playerState.heldRightProp
        if (playerState.heldLeftProp?.isHeart) return playerState.heldLeftProp
        return null
      }
      const p1Heart = getHeldHeartFor(playerOne)
      if (p1Heart) {
        return { owner: 'p1', prop: p1Heart }
      }
      const p2Heart = getHeldHeartFor(playerTwo)
      if (p2Heart) {
        return { owner: 'p2', prop: p2Heart }
      }
      return null
    },
  }
}
