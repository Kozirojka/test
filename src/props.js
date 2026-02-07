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

const scaleToHeight = (object, targetHeight) => {
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  box.getSize(size)
  if (size.y <= 0) return
  const factor = targetHeight / size.y
  object.scale.multiplyScalar(factor)
}

const createActionHint = () => {
  const hint = document.createElement('div')
  hint.textContent = '1. Підняти Press L'
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

export const createPropSystem = ({
  scene,
  hero,
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
  const bottleGroup = createBottleGroup()
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
  const actionHint = createActionHint()
  const actionProject = new THREE.Vector3()
  const holdAnchor = new THREE.Object3D()
  holdAnchor.position.set(0.28, 0.38, 0.22)
  hero.add(holdAnchor)

  let activeProp = null
  let heldProp = null

  const gravity = 3.2
  const propFriction = 0.85
  const propBounce = 0.2
  const propAngularDamp = 0.92

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
  }

  const updateActionHint = () => {
    if (heldProp) {
      actionHint.style.display = 'none'
      return
    }

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
  }

  const handleKeyDown = (event) => {
    const key = event.key.toLowerCase()
    const code = event.code
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

  const handleKeyUp = () => {}

  return {
    updateProps,
    updateActionHint,
    handleKeyDown,
    handleKeyUp,
  }
}
