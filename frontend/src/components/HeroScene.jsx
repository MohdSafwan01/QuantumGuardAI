import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export default function HeroScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    /* ── Sizes ── */
    let width = container.clientWidth
    let height = container.clientHeight

    /* ── Scene ── */
    const scene = new THREE.Scene()

    /* ── Camera ── */
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.z = 5

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    /* ── Group (for mouse tracking) ── */
    const group = new THREE.Group()
    scene.add(group)

    /* ── Wireframe icosahedron ── */
    const wireGeo = new THREE.IcosahedronGeometry(1.4, 1)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xc8ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    })
    const wireMesh = new THREE.Mesh(wireGeo, wireMat)
    group.add(wireMesh)

    /* ── Inner solid ── */
    const solidGeo = new THREE.IcosahedronGeometry(1.38, 1)
    const solidMat = new THREE.MeshBasicMaterial({
      color: 0x0a1a00,
      transparent: true,
      opacity: 0.6,
    })
    const solidMesh = new THREE.Mesh(solidGeo, solidMat)
    group.add(solidMesh)

    /* ── Ring 1 ── */
    const ring1Geo = new THREE.TorusGeometry(1.9, 0.008, 8, 80)
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0xc8ff00,
      transparent: true,
      opacity: 0.2,
    })
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat)
    ring1.rotation.x = Math.PI / 2.4
    group.add(ring1)

    /* ── Ring 2 ── */
    const ring2Geo = new THREE.TorusGeometry(2.1, 0.005, 8, 80)
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xc8ff00,
      transparent: true,
      opacity: 0.1,
    })
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat)
    ring2.rotation.x = Math.PI / 3
    ring2.rotation.z = Math.PI / 5
    group.add(ring2)

    /* ── Particles ── */
    const particleCount = 60
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const r = 2.2 + Math.random() * 1.4
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0xc8ff00,
      size: 0.025,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    group.add(particles)

    /* ── Mouse tracking ── */
    const mouse = { x: 0, y: 0 }
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      mouse.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2
    }
    container.addEventListener('mousemove', handleMouseMove)

    /* ── Animation loop ── */
    const clock = new THREE.Clock()
    let animId

    function animate() {
      animId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      // Wireframe pulse
      wireMat.opacity = 0.4 + 0.25 * Math.sin(t * 1.2)

      // Inner solid rotation
      solidMesh.rotation.y = t * 0.08

      // Ring rotations
      ring1.rotation.z = t * 0.15
      ring2.rotation.y = t * 0.1

      // Particle opacity pulse
      particleMat.opacity = 0.35 + 0.3 * Math.sin(t * 0.8)

      // Mouse follow (lerp)
      group.rotation.y += (mouse.x * 0.5 - group.rotation.y) * 0.04
      group.rotation.x += (mouse.y * 0.4 - group.rotation.x) * 0.04

      renderer.render(scene, camera)
    }
    animate()

    /* ── Resize handling ── */
    const handleResize = () => {
      width = container.clientWidth
      height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('mousemove', handleMouseMove)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0 }}
    >
      <div className="scanline-overlay" />
      <div className="hero-gradient-fade" />
    </div>
  )
}
