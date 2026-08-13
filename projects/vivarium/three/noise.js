let perm = new Uint8Array(512);
let permMod12 = new Uint8Array(512);

const grad3 = new Float32Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0,
  -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
]);

export function set_noise_seed(seedNum) {
  let lcg = seedNum >>> 0;
  function next_random() {
    let t = (lcg += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  let p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    let j = Math.floor(next_random() * (i + 1));
    let tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }
}

set_noise_seed(12345);

export function noise3D(xin, yin, zin) {
  let n0, n1, n2, n3;
  const s = (xin + yin + zin) * 0.333333333;
  let i = Math.floor(xin + s);
  let j = Math.floor(yin + s);
  let k = Math.floor(zin + s);
  const t = (i + j + k) * 0.166666667;
  const X0 = i - t;
  const Y0 = j - t;
  const Z0 = k - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;
  const z0 = zin - Z0;
  let i1, j1, k1;
  let i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1;
      j1 = 0;
      k1 = 0;
      i2 = 1;
      j2 = 1;
      k2 = 0;
    } else if (x0 >= z0) {
      i1 = 1;
      j1 = 0;
      k1 = 0;
      i2 = 1;
      j2 = 0;
      k2 = 1;
    } else {
      i1 = 0;
      j1 = 0;
      k1 = 1;
      i2 = 1;
      j2 = 0;
      k2 = 1;
    }
  } else {
    if (y0 < z0) {
      i1 = 0;
      j1 = 0;
      k1 = 1;
      i2 = 0;
      j2 = 1;
      k2 = 1;
    } else if (x0 < z0) {
      i1 = 0;
      j1 = 1;
      k1 = 0;
      i2 = 0;
      j2 = 1;
      k2 = 1;
    } else {
      i1 = 0;
      j1 = 1;
      k1 = 0;
      i2 = 1;
      j2 = 1;
      k2 = 0;
    }
  }
  const x1 = x0 - i1 + 0.166666667;
  const y1 = y0 - j1 + 0.166666667;
  const z1 = z0 - k1 + 0.166666667;
  const x2 = x0 - i2 + 0.333333333;
  const y2 = y0 - j2 + 0.333333333;
  const z2 = z0 - k2 + 0.333333333;
  const x3 = x0 - 1.0 + 0.5;
  const y3 = y0 - 1.0 + 0.5;
  const z3 = z0 - 1.0 + 0.5;
  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 < 0) n0 = 0.0;
  else {
    t0 *= t0;
    let gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
    n0 =
      t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
  }
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 < 0) n1 = 0.0;
  else {
    t1 *= t1;
    let gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
    n1 =
      t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
  }
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 < 0) n2 = 0.0;
  else {
    t2 *= t2;
    let gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
    n2 =
      t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
  }
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 < 0) n3 = 0.0;
  else {
    t3 *= t3;
    let gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
    n3 =
      t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
  }
  return 32.0 * (n0 + n1 + n2 + n3);
}

export function hash_u32(x) {
  x = Math.imul(x ^ (x >>> 17), 0xed5ad4bb);
  x = Math.imul(x ^ (x >>> 11), 0xac4c1b51);
  x = Math.imul(x ^ (x >>> 15), 0x31848bab);
  return (x ^ (x >>> 14)) >>> 0;
}

export function hash3d_int(x, y, z) {
  let u =
    (Math.imul(x, 73856093) ^
      Math.imul(y, 19349663) ^
      Math.imul(z, 83492791)) >>>
    0;
  return (hash_u32(u) & 0xffffff) / 16777216.0;
}

export function noise3d_int(x, y, z) {
  return noise3D(x, y, z);
}

export function fbm3d_int(x, y, z, octaves, persistence, lacunarity, scale) {
  let total = 0.0;
  let frequency = scale;
  let amplitude = 1.0;
  let maxValue = 0.0;
  for (let i = 0; i < octaves; i++) {
    total += noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return (total / maxValue) * 1.25;
}

export function ridged_fbm3d_int(
  x,
  y,
  z,
  octaves,
  persistence,
  lacunarity,
  scale,
) {
  let total = 0.0;
  let frequency = scale;
  let amplitude = 1.0;
  let weight = 1.0;
  let maxValue = 0.0;
  for (let i = 0; i < octaves; i++) {
    let v = noise3D(x * frequency, y * frequency, z * frequency);
    let n = 1.0 - Math.abs(v);
    n = n * n;
    n *= weight;
    weight = Math.max(0.1, Math.min(1.0, n * 2.0));
    total += n * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return (total / maxValue) * 1.1;
}

export function smoothstep(edge0, edge1, x) {
  if (edge0 === edge1) {
    return x < edge0 ? 0.0 : 1.0;
  }
  let t = Math.max(0.0, Math.min(1.0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3.0 - 2.0 * t);
}
