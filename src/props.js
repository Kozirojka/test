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

  const group = new THREE.Group()
  group.add(can, topRim, bottomRim)
  group.scale.set(0.7, 0.7, 0.7)
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
    }
  }

  const props = [
    createPropBody(heartMesh),
    createPropBody(redCan),
    createPropBody(grayCan),
  ]
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
