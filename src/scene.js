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
  sunLight.position.set(-4, 2.2, -3.5)
  sunLight.target.position.set(0, 0, 0)

  const sunGeometry = new THREE.SphereGeometry(0.55, 24, 18)
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffc36f })
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial)
  sunMesh.position.set(-6.5, 2.1, -8)

  const sunGlow = new THREE.PointLight(0xffc37a, 0.45, 20, 2)
  sunGlow.position.copy(sunMesh.position)

  scene.add(
    ambientLight,
    hemisphereLight,
    sunLight,
    sunLight.target,
    sunMesh,
    sunGlow
  )

  return { scene, camera, renderer, controls }
}
