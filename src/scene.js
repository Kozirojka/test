import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export const createScene = (app) => {
  if (!app) {
    throw new Error('App container not found')
  }

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b1220)

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  )
  camera.position.set(0, 2.2, 4.2)
  camera.lookAt(0, 0.2, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  app.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.target.set(0, 0.2, 0)
  controls.maxPolarAngle = Math.PI * 0.48
  controls.minDistance = 2
  controls.maxDistance = 7
  controls.enabled = true
  controls.enablePan = false

  const hemisphereLight = new THREE.HemisphereLight(0xbfd8ff, 0xf2d6a2, 0.7)
  const sunLight = new THREE.DirectionalLight(0xffffff, 1)
  sunLight.position.set(3.5, 5, 2.5)
  scene.add(hemisphereLight, sunLight)

  return { scene, camera, renderer, controls }
}
