import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { atmosphere, clouds, giant, ice, moon, ringTex, rogue, terra } from './planets'

type Props = {
  ready: boolean // boot finished -> fly-in intro
  stage: number // which planet the camera visits
  pulse: number // increments on every in-game hit -> shockwave + shake
  won: boolean // boss defeated -> rogue planet flares out
}

// Camera shot per level. focus: planet index (4 = whole-system view).
// dir: where the camera sits relative to the focus; dist: how far.
// sx (desktop) / sy (mobile): push the planet right/up so content stays readable.
const SHOTS = [
  { focus: 0, dir: [0.35, 0.18, 1], dist: 6.4, sx: 0.3, sy: 0.17 }, // title: home planet
  { focus: 1, dir: [-0.5, 0.25, 1], dist: 2.6, sx: -0.32, sy: 0.26 }, // identity: moon
  { focus: 2, dir: [0.55, 0.32, 1], dist: 17, sx: 0.3, sy: 0.26 }, // skills: ringed giant
  { focus: 3, dir: [-0.35, -0.05, 1], dist: 6, sx: -0.3, sy: 0.26 }, // vault: ice world
  { focus: 4, dir: [0.25, 0.75, 1], dist: 52, sx: 0.22, sy: 0.12 }, // log: whole system
  { focus: 5, dir: [0, 0.12, 1], dist: 9, sx: 0, sy: 0.06 }, // boss: rogue planet
] as const

// Monochrome solar system. One renderer for the page lifetime.
export default function Scene(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const live = useRef(props)
  live.current = props

  useEffect(() => {
    const el = host.current!
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobileMq = matchMedia('(max-width: 767px)')
    const W = mobileMq.matches ? 512 : 1024 // texture width; mobile paints 4x fewer texels

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1200)

    // sunlight from the upper-left front: gives every planet a lit side and a night side
    const sun = new THREE.DirectionalLight(0xffffff, 2.6)
    sun.position.set(-6, 2.5, 1.4)
    scene.add(sun, new THREE.AmbientLight(0xffffff, 0.04))

    // stars: faint field + a few bright ones
    const starLayer = (count: number, size: number, opacity: number) => {
      const pos = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u)
        const r = 300 + Math.random() * 200
        pos.set([r * s * Math.cos(t), r * u, r * s * Math.sin(t)], i * 3)
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size, sizeAttenuation: false, transparent: true, opacity }))
    }
    const stars = new THREE.Group()
    stars.add(starLayer(mobileMq.matches ? 1500 : 3000, 1.2, 0.7), starLayer(250, 2.4, 0.95))
    scene.add(stars)

    // planets start untextured gray and get their maps as soon as each one is painted
    const std = (o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, metalness: 0, ...o })
    const sphere = (r: number, mat: THREE.Material) => new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32), mat)

    const home = sphere(1.6, std({ color: 0x223344 }))
    const cloudMesh = sphere(1.625, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }))
    home.add(cloudMesh, atmosphere(1.7, 1.4, sun.position))
    home.rotation.z = 0.41 // axial tilt

    const moonOrbit = new THREE.Group()
    moonOrbit.rotation.set(0.25, 0, 0.12)
    const moonMesh = sphere(0.42, std())
    moonMesh.position.x = 4.2
    moonOrbit.add(moonMesh)

    const giantGroup = new THREE.Group()
    giantGroup.position.set(22, 4, -20)
    const giantMesh = sphere(3.4, std({ color: 0xaaaaaa, roughness: 1 }))
    const ringGeo = new THREE.RingGeometry(4.4, 8.2, 160, 1)
    const rp = ringGeo.attributes.position, ruv = ringGeo.attributes.uv, v = new THREE.Vector3()
    for (let i = 0; i < rp.count; i++) ruv.setXY(i, (v.fromBufferAttribute(rp, i).length() - 4.4) / 3.8, 0.5)
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ map: ringTex(), transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false }))
    ring.rotation.x = -Math.PI / 2
    giantGroup.add(giantMesh, ring)
    giantGroup.rotation.set(0.45, 0, 0.2)

    const iceMesh = sphere(1.15, std({ roughness: 0.55 }))
    iceMesh.position.set(-16, -3, -12)
    iceMesh.add(atmosphere(1.24, 0.8, sun.position))

    const rogueMat = std({ emissive: 0xffffff, emissiveIntensity: 0 })
    const rogueMesh = sphere(2.3, rogueMat)
    rogueMesh.position.set(5, -1, -46)

    scene.add(home, moonOrbit, giantGroup, iceMesh, rogueMesh)

    const SYSTEM_CENTER = new THREE.Vector3(3, 0, -16)
    const focusOf = (i: number, out: THREE.Vector3) =>
      i === 0 ? out.set(0, 0, 0)
      : i === 1 ? moonMesh.getWorldPosition(out)
      : i === 2 ? out.copy(giantGroup.position)
      : i === 3 ? out.copy(iceMesh.position)
      : i === 5 ? out.copy(rogueMesh.position)
      : out.copy(SYSTEM_CENTER)
    const radiusOf = [1.6, 0.42, 3.4, 1.15, 12, 2.3]

    // paint textures one planet per task so the boot screen keeps animating
    let alive = true
    const jobs: (() => void)[] = [
      () => { const m = terra(W); Object.assign(home.material, { map: m.map, bumpMap: m.bump, bumpScale: 3, roughnessMap: m.rough, roughness: 1, color: new THREE.Color(0xffffff) }) },
      () => { Object.assign(cloudMesh.material, { alphaMap: clouds(W), opacity: 1 }) },
      () => { const m = moon(W / 2); Object.assign(moonMesh.material, { map: m.map, bumpMap: m.bump, bumpScale: 4, color: new THREE.Color(0xffffff) }) },
      () => { const m = giant(W / 2); Object.assign(giantMesh.material, { map: m.map, color: new THREE.Color(0xffffff) }) },
      () => { const m = ice(W / 2); Object.assign(iceMesh.material, { map: m.map, bumpMap: m.bump, bumpScale: 2, color: new THREE.Color(0xffffff) }) },
      () => { const m = rogue(W / 2); Object.assign(rogueMat, { map: m.map, emissiveMap: m.emissive, color: new THREE.Color(0xffffff) }) },
    ]
    const runJobs = () => {
      const job = jobs.shift()
      if (!alive) return
      if (!job) return renderer.compile(scene, camera) // precompile shaders for off-screen planets too
      job()
      ;[home, cloudMesh, moonMesh, giantMesh, iceMesh, rogueMesh].forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial
        mat.needsUpdate = true
        // upload to the GPU now, so the first flight to a planet doesn't hitch
        ;[mat.map, mat.bumpMap, mat.roughnessMap, mat.alphaMap, mat.emissiveMap].forEach((tx) => tx && renderer.initTexture(tx))
      })
      setTimeout(runJobs, 0)
    }
    setTimeout(runJobs, 30)

    // hit shockwave: a ring around the focused planet, always facing the camera
    const wave = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 1, 1).getPoints(128)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
    )
    scene.add(wave)

    const pointer = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1
      pointer.y = (e.clientY / innerHeight) * 2 - 1
    }
    addEventListener('pointermove', onMove, { passive: true })

    // desired camera position + look target for the current shot
    const UP = new THREE.Vector3(0, 1, 0)
    const f = new THREE.Vector3(), d = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3()
    const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3()
    const shot = (far: number) => {
      const s = SHOTS[live.current.stage] ?? SHOTS[0]
      const mobile = mobileMq.matches
      const dist = s.dist * (mobile ? 2 : 1) + far // portrait screens need the camera further back
      focusOf(s.focus, f)
      d.set(s.dir[0], s.dir[1], s.dir[2]).normalize()
      right.crossVectors(d, UP).negate().normalize() // camera right = cross(-dir, up)
      up.crossVectors(right, d).negate().normalize()
      wantPos.copy(f).addScaledVector(d, dist)
      wantLook.copy(f).addScaledVector(right, mobile ? 0 : -s.sx * dist).addScaledVector(up, mobile ? -s.sy * dist : 0)
      return s
    }

    shot(80)
    const camPos = wantPos.clone()
    const camLook = wantLook.clone()
    const place = () => {
      camera.position.copy(camPos)
      camera.lookAt(camLook)
    }
    place()

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      if (reduced) renderer.render(scene, camera)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const clock = new THREE.Clock()
    let raf = 0
    let waveT = 1
    let lastPulse = live.current.pulse
    let flare = 0
    const tmp = new THREE.Vector3()

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const { ready, pulse, won, stage } = live.current
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.elapsedTime
      const boss = stage === 5

      // orbits & spins
      home.rotation.y += dt * 0.05
      cloudMesh.rotation.y += dt * 0.018
      moonOrbit.rotation.y += dt * 0.12
      moonMesh.rotation.y += dt * 0.05
      giantMesh.rotation.y += dt * 0.08
      iceMesh.rotation.y += dt * 0.07
      rogueMesh.rotation.y += dt * (boss && !won ? 0.25 : 0.04)
      stars.rotation.y += dt * 0.002

      // shockwave + camera shake on hits
      if (pulse !== lastPulse) {
        lastPulse = pulse
        waveT = 0
        if (boss) flare = 1
      }
      let boost = 0
      const s = shot(ready ? 0 : 80)
      wave.visible = waveT < 1
      if (waveT < 1) {
        waveT = Math.min(waveT + dt * 1.3, 1)
        focusOf(s.focus, tmp)
        wave.position.copy(tmp)
        wave.lookAt(camera.position)
        wave.scale.setScalar(radiusOf[s.focus] * (1.05 + waveT * 1.8))
        ;(wave.material as THREE.LineBasicMaterial).opacity = (1 - waveT) * 0.9
        boost = 1 - waveT
      }

      // rogue planet: cracks breathe during the fight, flare on hits, burn out on victory
      flare = Math.max(0, flare - dt * 2.5)
      const target = !rogueMat.emissiveMap ? 0 : !boss ? 0.15 : won ? 0 : 1 + Math.sin(t * 5) * 0.35
      rogueMat.emissiveIntensity += (target + flare * 2.5 - rogueMat.emissiveIntensity) * 0.15
      rogueMesh.scale.setScalar(1 + boost * (boss ? 0.04 : 0))

      // cinematic camera: frame-rate independent easing toward the shot
      const k = 1 - Math.pow(1 - 0.028, dt * 60)
      camPos.lerp(wantPos, k)
      camLook.lerp(wantLook, k * 1.4)
      const dist = camPos.distanceTo(camLook)
      camera.position.copy(camPos)
        .addScaledVector(right, pointer.x * dist * 0.015)
        .addScaledVector(up, -pointer.y * dist * 0.012)
      if (boost > 0) camera.position.addScaledVector(right, (Math.random() - 0.5) * boost * dist * 0.008)
      camera.lookAt(camLook)
      renderer.render(scene, camera)
    }
    if (!reduced) tick()

    // reduced motion: jump straight to each level's framing
    const sync = reduced
      ? setInterval(() => (shot(0), camPos.copy(wantPos), camLook.copy(wantLook), place(), renderer.render(scene, camera)), 400)
      : 0

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      clearInterval(sync)
      removeEventListener('pointermove', onMove)
      ro.disconnect()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        const mat = m.material as THREE.MeshStandardMaterial | undefined
        if (!mat) return
        ;[mat.map, mat.bumpMap, mat.roughnessMap, mat.alphaMap, mat.emissiveMap].forEach((tx) => tx?.dispose())
        mat.dispose()
      })
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={host} className="scene" aria-hidden="true" />
}
