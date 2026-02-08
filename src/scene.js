import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export const createScene = (app) => {
  if (!app) {
    throw new Error('App container not found')
  }

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf3c29a)

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  )
  camera.position.set(0, 3.6, 4.2)
  camera.lookAt(0, 0.5, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  app.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.target.set(0, 0.5, 0)
  controls.maxPolarAngle = Math.PI * 0.48
  controls.minDistance = 2
  controls.maxDistance = 7
  controls.enabled = true
  controls.enablePan = true
  controls.screenSpacePanning = true
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  }
  renderer.domElement.addEventListener('contextmenu', (event) =>
    event.preventDefault()
  )

  const ambientLight = new THREE.AmbientLight(0xffe6c8, 0.35)
  const hemisphereLight = new THREE.HemisphereLight(0xffe1b8, 0x5b4a3b, 0.75)
  const sunLight = new THREE.DirectionalLight(0xffb06a, 1.15)
  sunLight.position.set(4, 2.2, -3.5)
  sunLight.target.position.set(0, 0, 0)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(1024, 1024)
  sunLight.shadow.bias = -0.0006
  sunLight.shadow.normalBias = 0.04
  sunLight.shadow.camera.left = -12
  sunLight.shadow.camera.right = 12
  sunLight.shadow.camera.top = 12
  sunLight.shadow.camera.bottom = -12
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 20

  const sunGeometry = new THREE.SphereGeometry(0.55, 24, 18)
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffc36f })
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial)
  sunMesh.position.set(6.5, 2.1, -8)

  const sunGlow = new THREE.PointLight(0xffc37a, 0.45, 20, 2)
  sunGlow.position.copy(sunMesh.position)

  const cloudGroup = new THREE.Group()
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0,
    transparent: true,
    opacity: 0.95,
  })
  const puffGeometry = new THREE.SphereGeometry(0.35, 12, 10)
  const cloudDefs = [
    { x: -4.6, y: 3.2, z: -6.2, scale: 1.1 },
    { x: 1.6, y: 3.0, z: -5.0, scale: 0.95 },
    { x: 5.2, y: 3.4, z: -6.8, scale: 1.2 },
    { x: -1.8, y: 2.8, z: -3.0, scale: 0.8 },
    { x: 3.4, y: 2.7, z: -2.2, scale: 0.75 },
  ]

  const addCloud = ({ x, y, z, scale }) => {
    const cloud = new THREE.Group()
    for (let i = 0; i < 5; i += 1) {
      const puff = new THREE.Mesh(puffGeometry, cloudMaterial)
      const angle = (i / 5) * Math.PI * 2
      const radius = 0.35 + (i % 2) * 0.18
      puff.position.set(Math.cos(angle) * radius, (i - 2) * 0.05, Math.sin(angle) * radius)
      const puffScale = scale * (0.7 + (i % 3) * 0.15)
      puff.scale.setScalar(puffScale)
      puff.castShadow = false
      puff.receiveShadow = false
      cloud.add(puff)
    }
    cloud.position.set(x, y, z)
    cloudGroup.add(cloud)
  }

  for (const cloudDef of cloudDefs) {
    addCloud(cloudDef)
  }

  scene.add(
    ambientLight,
    hemisphereLight,
    sunLight,
    sunLight.target,
    sunMesh,
    sunGlow,
    cloudGroup
  )

  return { scene, camera, renderer, controls }
}
