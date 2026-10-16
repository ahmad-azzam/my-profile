import * as THREE from 'three'

// Procedural, monochrome planet textures painted on equirectangular canvases.
// Sampling 3D noise on the unit sphere keeps every texture seamless.

function perlin(seed: number) {
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const perm = [...Array(256).keys()]
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0
    ;[perm[i], perm[j]] = [perm[j], perm[i]]
  }
  const p = new Uint8Array(512)
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255]
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (t: number, a: number, b: number) => a + t * (b - a)
  const grad = (hash: number, x: number, y: number, z: number) => {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }
  const noise = (x: number, y: number, z: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z)
    const u = fade(x), v = fade(y), w = fade(z)
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z
    return lerp(w,
      lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
      lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)), lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))))
  }
  const fbm = (x: number, y: number, z: number, oct: number) => {
    let a = 0.5, f = 1, sum = 0
    for (let i = 0; i < oct; i++) { sum += a * noise(x * f, y * f, z * f); a *= 0.5; f *= 2 }
    return sum
  }
  return { noise, fbm, rnd }
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }

// Walk every texel of a w×h equirect map; fn writes `ch` channels (0..1) into out.
function paint(w: number, h: number, ch: number, fn: (x: number, y: number, z: number, out: Float32Array) => void) {
  const bufs = Array.from({ length: ch }, () => new Uint8ClampedArray(w * h))
  const out = new Float32Array(ch)
  for (let j = 0; j < h; j++) {
    const lat = (0.5 - (j + 0.5) / h) * Math.PI
    const cy = Math.sin(lat), cr = Math.cos(lat)
    for (let i = 0; i < w; i++) {
      const lon = ((i + 0.5) / w) * Math.PI * 2
      fn(-Math.cos(lon) * cr, cy, Math.sin(lon) * cr, out)
      for (let c = 0; c < ch; c++) bufs[c][j * w + i] = out[c] * 255
    }
  }
  return bufs
}

// gray: RGB = value. alpha: white with value as alpha.
function tex(w: number, h: number, data: Uint8ClampedArray, mode: 'color' | 'data' | 'alpha') {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const img = new ImageData(w, h)
  for (let k = 0; k < data.length; k++) {
    const v = data[k]
    img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = mode === 'alpha' ? 255 : v
    img.data[k * 4 + 3] = mode === 'alpha' ? v : 255
  }
  cv.getContext('2d')!.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(cv)
  if (mode !== 'data') t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export type PlanetMaps = { map: THREE.Texture; bump?: THREE.Texture; rough?: THREE.Texture; emissive?: THREE.Texture }

export function terra(w: number) {
  const h = w / 2
  const { fbm } = perlin(7)
  const [c, b, r] = paint(w, h, 3, (x, y, z, o) => {
    const n = fbm(x * 1.4 + 3, y * 1.4, z * 1.4, 6) + 0.12 * fbm(x * 7, y * 7, z * 7, 3)
    const sea = 0.03
    if (Math.abs(y) > 0.87 - 0.06 * n) { o[0] = 0.92; o[1] = 0.55; o[2] = 0.55; return }
    if (n > sea) {
      const e = n - sea
      o[0] = clamp(0.3 + e * 1.3 + 0.1 * fbm(x * 18, y * 18, z * 18, 2))
      o[1] = clamp(0.45 + e * 2)
      o[2] = 0.92
    } else {
      const d = sea - n
      o[0] = d < 0.025 ? 0.2 - d * 2 : clamp(0.13 - d * 0.25) + 0.03
      o[1] = 0.42
      o[2] = 0.28
    }
  })
  return { map: tex(w, h, c, 'color'), bump: tex(w, h, b, 'data'), rough: tex(w, h, r, 'data') }
}

export function clouds(w: number) {
  const h = w / 2
  const { fbm } = perlin(21)
  const [a] = paint(w, h, 1, (x, y, z, o) => {
    const q = fbm(x * 2, y * 2, z * 2, 3)
    const n = fbm(x * 2.6 + q * 1.4, y * 4 + q, z * 2.6 - q, 5)
    o[0] = smooth(0.1, 0.5, n + 0.08 * fbm(x * 12, y * 12, z * 12, 2)) * 0.7
  })
  return tex(w, h, a, 'alpha')
}

export function moon(w: number) {
  const h = w / 2
  const { fbm, rnd } = perlin(42)
  const craters = Array.from({ length: 110 }, () => {
    const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u)
    return { x: s * Math.cos(t), y: u, z: s * Math.sin(t), r: 0.03 + Math.pow(rnd(), 3) * 0.22 }
  })
  const [c, b] = paint(w, h, 2, (x, y, z, o) => {
    let v = 0.55 + 0.12 * fbm(x * 3, y * 3, z * 3, 5)
    if (fbm(x * 1.1 + 9, y * 1.1, z * 1.1, 3) > 0.08) v -= 0.16 // dark maria
    let bump = 0.5
    for (const k of craters) {
      const dot = x * k.x + y * k.y + z * k.z
      if (dot < 0.9) continue
      const t = Math.acos(Math.min(1, dot)) / k.r
      if (t < 1) { bump -= (1 - t * t) * 0.35; v -= (1 - t) * 0.08 }
      else if (t < 1.25) { const rim = 1 - (t - 1) / 0.25; bump += rim * 0.15; v += rim * 0.06 }
    }
    o[0] = clamp(v)
    o[1] = clamp(bump)
  })
  return { map: tex(w, h, c, 'color'), bump: tex(w, h, b, 'data') }
}

export function giant(w: number) {
  const h = w / 2
  const { fbm } = perlin(5)
  const storm = new THREE.Vector3(0.6, -0.35, 0.72).normalize()
  const [c] = paint(w, h, 1, (x, y, z, o) => {
    const t = fbm(x * 2, y * 7, z * 2, 4)
    let v = 0.56 + 0.16 * Math.sin(y * 16 + t * 3) + 0.08 * Math.sin(y * 41 + t * 6) + 0.05 * fbm(x * 9, y * 30, z * 9, 2)
    const d = x * storm.x + y * storm.y + z * storm.z
    if (d > 0.985) v -= (d - 0.985) * 18 * (0.5 + 0.5 * Math.sin(d * 900))
    o[0] = clamp(v)
  })
  return { map: tex(w, h, c, 'color') }
}

export function ringTex() {
  const n = 512
  const { noise } = perlin(11)
  const cv = document.createElement('canvas')
  cv.width = n
  cv.height = 1
  const img = new ImageData(n, 1)
  for (let i = 0; i < n; i++) {
    const r = i / n
    let a = 0.35 + 0.35 * noise(r * 40, 0.5, 0.5) + 0.25 * noise(r * 160, 1.5, 0.5)
    if (r > 0.56 && r < 0.62) a *= 0.08 // main gap
    a *= smooth(0, 0.08, r) * smooth(1, 0.85, r)
    const g = 200 + 40 * noise(r * 25, 3.5, 0.5)
    img.data.set([g, g, g, clamp(a) * 255], i * 4)
  }
  cv.getContext('2d')!.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function ice(w: number) {
  const h = w / 2
  const { fbm, noise } = perlin(77)
  const [c, b] = paint(w, h, 2, (x, y, z, o) => {
    // Europa-like: long thin lineae, patchy, over a mottled bright crust
    const q = fbm(x * 1.5, y * 1.5, z * 1.5, 3)
    const l1 = 1 - Math.abs(noise(x * 3 + q * 2, y * 7, z * 3 - q * 2))
    const l2 = 1 - Math.abs(noise(x * 9 - q, y * 4 + q, z * 9))
    const mask = smooth(-0.05, 0.25, fbm(x * 2 + 5, y * 2, z * 2, 3))
    const crack = Math.max(smooth(0.975, 0.997, l1), 0.7 * smooth(0.985, 0.998, l2)) * mask
    const mottle = fbm(x * 4, y * 4, z * 4, 5)
    o[0] = clamp(0.74 + 0.16 * mottle - crack * 0.3 - smooth(0.2, 0.5, q) * 0.12)
    o[1] = clamp(0.55 + 0.1 * mottle - crack * 0.35)
  })
  return { map: tex(w, h, c, 'color'), bump: tex(w, h, b, 'data') }
}

export function rogue(w: number) {
  const h = w / 2
  const { fbm, noise } = perlin(13)
  const [c, e] = paint(w, h, 2, (x, y, z, o) => {
    // dark crust split by thin glowing fissures (ridged noise -> narrow lines)
    const q = fbm(x * 2, y * 2, z * 2, 3)
    const big = 1 - Math.abs(noise(x * 2.2 + q, y * 2.2 - q, z * 2.2))
    const small = 1 - Math.abs(noise(x * 7 - q * 2, y * 7, z * 7 + q * 2))
    const glow = smooth(0.965, 0.997, big) + 0.5 * smooth(0.975, 0.998, small)
    o[0] = clamp(0.06 + 0.07 * fbm(x * 5, y * 5, z * 5, 5) + glow * 0.1)
    o[1] = clamp(glow)
  })
  return { map: tex(w, h, c, 'color'), emissive: tex(w, h, e, 'color') }
}

// Fresnel rim glow for atmospheres (a slightly larger BackSide sphere), lit only on the sun side.
export function atmosphere(radius: number, strength: number, sunPos: THREE.Vector3) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: { uStrength: { value: strength }, uSun: { value: sunPos.clone().normalize() } },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vV;
        varying vec3 vW;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vW = normalize(mat3(modelMatrix) * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uStrength;
        uniform vec3 uSun;
        varying vec3 vN;
        varying vec3 vV;
        varying vec3 vW;
        void main() {
          float rim = pow(1.0 - abs(dot(vN, vV)), 4.0);
          float day = smoothstep(-0.35, 0.55, dot(vW, uSun));
          float a = rim * day * uStrength;
          gl_FragColor = vec4(vec3(0.88, 0.92, 1.0) * a, a);
        }`,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
}
