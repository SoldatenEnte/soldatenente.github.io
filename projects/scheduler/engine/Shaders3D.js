export const Shaders3D = {
  SharedWGSL: `
    struct DirectionalLight {
        direction: vec4<f32>,
        color: vec4<f32>,
    };
    struct Scene {
        view_proj:      mat4x4<f32>,
        inv_view_proj:  mat4x4<f32>,
        camera_pos:     vec4<f32>,
        ambient:        vec4<f32>,
        ambient_ground: vec4<f32>,
        ambient_solid:  vec4<f32>,
        exposure:       vec4<f32>,
        dir_lights:     array<DirectionalLight, 4>,
    };
    struct PointLight {
        position: vec3<f32>, candela: f32,
        color:    vec3<f32>, range:   f32,
    };
    struct LightData { lights: array<PointLight> };
    @group(0) @binding(0) var<uniform> scene: Scene;
    @group(0) @binding(1) var<storage, read> point_lights: LightData;

    /// Shrink an instance to nothing as it approaches the camera, so it is
    /// gone before it can reach the near plane.
    ///
    /// Geometry that straddles the near plane is clipped mid-solid: the cut
    /// face is not capped, so the camera sees straight into the object's
    /// interior, back-face culling removes the surface that would have hidden
    /// it, and what is left is a thin sliver of a shell. One of those is a
    /// glitchy flicker. A camera *inside* a dense instanced field crosses
    /// hundreds of them at once, and the screen fills with overlapping
    /// interior slivers that read as total geometry corruption.
    ///
    /// Scaling to zero rather than fading with alpha is deliberate: it needs
    /// no blending and therefore no back-to-front sort, which is not
    /// affordable for a million instances, and it removes the geometry
    /// outright instead of leaving invisible fragments still writing depth.
    ///
    /// scene.exposure.z = distance at which instances reach full size,
    /// scene.exposure.w = distance at/below which they vanish completely.
    /// Both zero (the default) disables this entirely.
    fn near_fade_scale(world_center: vec3<f32>) -> f32 {
        let fade_full = scene.exposure.z;
        let fade_zero = scene.exposure.w;
        if (fade_full <= fade_zero) { return 1.0; }
        let d = distance(world_center, scene.camera_pos.xyz);
        return smoothstep(fade_zero, fade_full, d);
    }
    struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) world_pos:  vec3<f32>,
        @location(1) normal:     vec3<f32>,
        @location(2) uv:         vec2<f32>,
        @location(3) base_color: vec4<f32>,
        @location(4) emissive:   vec3<f32>,
        @location(5) metallic:   f32,
        @location(6) roughness:  f32,
        @location(7) pad:        vec3<f32>,
    };
    @vertex
    fn vs_main(
      @location(0) vertex_pos:    vec3<f32>,
      @location(1) vertex_normal: vec3<f32>,
      @location(2) vertex_uv:     vec2<f32>,
      @location(6) vertex_color:  vec4<f32>,
      @location(3) inst_translation: vec3<f32>,
      @location(4) inst_rotation: vec4<f32>,
      @location(5) inst_scale_in: f32,
      @location(7) base_color: vec4<f32>,
      @location(8) emissive:   vec3<f32>,
      @location(9) metallic:   f32,
      @location(10) roughness: f32,
      @location(11) pad:       vec3<f32>,
    ) -> VertexOutput {
      // Applied to the instance scale, so the whole cube shrinks about its own
      // centre and never partially crosses the near plane.
      let inst_scale = inst_scale_in * near_fade_scale(inst_translation);
      let q = inst_rotation;
      let x = q.x; let y = q.y; let z = q.z; let w = q.w;
      let r00 = 1.0 - 2.0 * (y * y + z * z);
      let r01 = 2.0 * (x * y - w * z);
      let r02 = 2.0 * (x * z + w * y);
      let r10 = 2.0 * (x * y + w * z);
      let r11 = 1.0 - 2.0 * (x * x + z * z);
      let r12 = 2.0 * (y * z - w * x);
      let r20 = 2.0 * (x * z - w * y);
      let r21 = 2.0 * (y * z + w * x);
      let r22 = 1.0 - 2.0 * (x * x + y * y);
      let col0 = vec4<f32>(inst_scale * r00, inst_scale * r10, inst_scale * r20, 0.0);
      let col1 = vec4<f32>(inst_scale * r01, inst_scale * r11, inst_scale * r21, 0.0);
      let col2 = vec4<f32>(inst_scale * r02, inst_scale * r12, inst_scale * r22, 0.0);
      let col3 = vec4<f32>(inst_translation, 1.0);
      let M  = mat4x4<f32>(col0, col1, col2, col3);
      let NM = mat3x3<f32>(col0.xyz, col1.xyz, col2.xyz);
      var out: VertexOutput;
      out.world_pos  = (M * vec4<f32>(vertex_pos, 1.0)).xyz;
      out.normal     = normalize(NM * vertex_normal);
      out.position   = scene.view_proj * vec4<f32>(out.world_pos, 1.0);
      out.uv         = vertex_uv;
      let base_linear = pow(base_color.rgb, vec3<f32>(2.2));
      out.base_color = vec4<f32>(base_linear, base_color.a) * vertex_color;
      out.emissive   = emissive;
      out.metallic   = metallic;
      out.roughness  = roughness;
      out.pad        = pad;
      return out;
    }
  `,

  StandardFS: `
    fn srgbToLinear(c: vec3<f32>) -> vec3<f32> {
        return select(
            pow((c + vec3<f32>(0.055)) / 1.055, vec3<f32>(2.4)),
            c / 12.92,
            c <= vec3<f32>(0.04045)
        );
    }
    fn linearToSrgb(c: vec3<f32>) -> vec3<f32> {
        return select(
            1.055 * pow(c, vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055),
            c * 12.92,
            c <= vec3<f32>(0.0031308)
        );
    }
    fn RRTAndODTFit(v: vec3<f32>) -> vec3<f32> {
        let a = v * (v + 0.0245786) - 0.000090537;
        let b = v * (0.983729 * v + 0.4329510) + 0.238081;
        return a / b;
    }
    fn ACESFilmicToneMapping(color: vec3<f32>) -> vec3<f32> {
        let ACESInputMat = mat3x3<f32>(
            vec3<f32>(0.59719, 0.07600, 0.02840),
            vec3<f32>(0.35458, 0.90834, 0.13383),
            vec3<f32>(0.04823, 0.01566, 0.83777)
        );
        let ACESOutputMat = mat3x3<f32>(
            vec3<f32>(1.60475, -0.10208, -0.00327),
            vec3<f32>(-0.53108, 1.10813, -0.07276),
            vec3<f32>(-0.07367, -0.00605, 1.07602)
        );
        var c = color / 0.6;
        c = ACESInputMat * c;
        c = RRTAndODTFit(c);
        c = ACESOutputMat * c;
        return saturate(c);
    }
    @fragment
    fn fs_main(
        in: VertexOutput,
        @builtin(front_facing) is_front_facing: bool
    ) -> @location(0) vec4<f32> {
        var albedo    = in.base_color.rgb;
        var alpha     = in.base_color.a;
        let metallic  = in.metallic;
        let roughness = in.roughness;

        let is_particle_radial = in.pad.y;
        // fwidth (like dpdx/dpdy) must run in uniform control flow and cannot
        // be gated behind is_particle_radial, a per-fragment value — see the
        // note further down by the normal-derivative fix. Both derivatives
        // the branches below need are computed unconditionally up front; the
        // radial distance value itself is identical wherever it's evaluated,
        // so this changes nothing about the result, only where the call happens.
        let particle_r = length(in.uv - vec2<f32>(0.5, 0.5)) * 2.0;
        let particle_uv_fwidth = fwidth(in.uv.x);
        let particle_r_fwidth = fwidth(particle_r);
        if (is_particle_radial > 0.0) {
            let r = particle_r;
            var col = vec4<f32>(1.0);
            if (is_particle_radial > 2.2 && is_particle_radial < 2.8) {
                if (r <= 0.44) {
                    col = vec4<f32>(0.0, 30.0 / 255.0, 80.0 / 255.0, 0.0);
                } else if (r <= 0.47) {
                    let t = (r - 0.44) / (0.47 - 0.44);
                    let c0 = vec4<f32>(0.0, 30.0 / 255.0, 80.0 / 255.0, 0.0);
                    let c1 = vec4<f32>(40.0 / 255.0, 100.0 / 255.0, 255.0 / 255.0, 0.28);
                    col = mix(c0, c1, t);
                } else if (r <= 0.55) {
                    let t = (r - 0.47) / (0.55 - 0.47);
                    let c0 = vec4<f32>(40.0 / 255.0, 100.0 / 255.0, 255.0 / 255.0, 0.28);
                    let c1 = vec4<f32>(20.0 / 255.0, 50.0 / 255.0, 180.0 / 255.0, 0.12);
                    col = mix(c0, c1, t);
                } else if (r <= 0.70) {
                    let t = (r - 0.55) / (0.70 - 0.55);
                    let c0 = vec4<f32>(20.0 / 255.0, 50.0 / 255.0, 180.0 / 255.0, 0.12);
                    let c1 = vec4<f32>(5.0 / 255.0, 10.0 / 255.0, 40.0 / 255.0, 0.002);
                    col = mix(c0, c1, t);
                } else {
                    let t = (r - 0.70) / (1.00 - 0.70);
                    let c0 = vec4<f32>(5.0 / 255.0, 10.0 / 255.0, 40.0 / 255.0, 0.002);
                    let c1 = vec4<f32>(0.0);
                    col = mix(c0, c1, t);
                }
                albedo = col.rgb;
                alpha = col.a;
            } else if (is_particle_radial > 1.8 && is_particle_radial < 2.2) {
                let w = max(particle_uv_fwidth * 2.0, 0.0001);
                if (r <= 0.1) {
                    col = vec4<f32>(1.0, 1.0, 1.0, 1.0);
                } else if (r <= 0.3) {
                    let t = (r - 0.1) / (0.3 - 0.1);
                    col = vec4<f32>(1.0, 1.0, 1.0, mix(1.0, 0.4, t));
                } else if (r <= 0.6) {
                    let t = (r - 0.3) / (0.6 - 0.3);
                    col = vec4<f32>(1.0, 1.0, 1.0, mix(0.4, 0.1, t));
                } else if (r <= 1.0) {
                    let t = (r - 0.6) / (1.0 - 0.6);
                    col = vec4<f32>(1.0, 1.0, 1.0, mix(0.1, 0.0, t));
                } else {
                    col = vec4<f32>(0.0);
                }
                var final_col = col;
                if (w > 0.8) {
                    let edge_fade = smoothstep(1.5, 0.8, w);
                    let subpixel_col = vec4<f32>(1.0, 1.0, 1.0, 0.22);
                    final_col = mix(subpixel_col, col, edge_fade);
                }
                let coverage = clamp(0.785 / (w * w), 0.0, 1.0);
                let aa_r = smoothstep(1.0 + w, max(1.0 - w, 0.0), r);
                albedo = albedo * final_col.rgb;
                alpha = alpha * final_col.a * mix(aa_r, 1.0, clamp(w - 0.8, 0.0, 1.0)) * coverage;
            } else if (is_particle_radial > 2.8 && is_particle_radial < 3.2) {
                var opacity_factor = 0.0;
                if (r <= 0.4) {
                    opacity_factor = 1.0 - 0.7 * (r / 0.4);
                } else if (r <= 1.0) {
                    opacity_factor = 0.3 - 0.3 * ((r - 0.4) / 0.6);
                }
                albedo = albedo * vec3<f32>(1.0);
                alpha = alpha * opacity_factor;
            } else {
                let edge = particle_r_fwidth;
                let aa_r = smoothstep(0.0, edge * 2.0, 1.0 - r);
                let exponent = is_particle_radial;
                let intensity = pow(clamp(1.0 - r, 0.0, 1.0), exponent);
                alpha = alpha * intensity * aa_r;
            }
        }

        // WGSL requires dpdx/dpdy to run in uniform control flow (ch 15.2):
        // they compare values across a 2x2 fragment quad, so branching on a
        // per-fragment value (roughness varies per instance/material) before
        // calling them is invalid and fails shader compilation on strict
        // WGSL validators. Compute the derivative unconditionally instead and
        // pick the result with select(), which does not branch execution.
        var N = normalize(in.normal);
        let flat_normal = normalize(cross(dpdx(in.world_pos), dpdy(in.world_pos)));
        N = select(N, flat_normal, roughness > 0.99);
        let V = normalize(scene.camera_pos.xyz - in.world_pos);
        if (dot(N, V) < 0.0) {
            N = -N;
        }
        
        let INV_PI   = 0.31830988618;
        let exposure = scene.exposure.x;
        let NdotV    = max(dot(N, V), 0.0001);

        var emissive_contrib = in.emissive;
        
        let is_fresnel_alpha = in.pad.z;
        if (is_fresnel_alpha > 0.5) {
            if (!is_front_facing) {
                discard;
            }
            let fresnel_alpha = pow(1.0 - NdotV, 2.5);
            alpha = alpha * fresnel_alpha * 0.75;
        }

        var Lo = vec3<f32>(0.0);
        if (is_fresnel_alpha > 0.5 || is_particle_radial > 0.0) {
            Lo = albedo;
        } else {
            let alpha_roughness = roughness * roughness;
            let alpha_sq = max(alpha_roughness * alpha_roughness, 0.00001);
            let F0 = mix(vec3<f32>(0.04), albedo, metallic);

            var ambient_light = vec3<f32>(0.0);
            if (scene.ambient.a > 0.0) {
                let sky_ambient = srgbToLinear(scene.ambient.rgb) * scene.ambient.a;
                let ground_ambient = srgbToLinear(scene.ambient_ground.rgb) * scene.ambient_ground.a;
                let up_weight = N.y * 0.5 + 0.5;
                ambient_light += mix(ground_ambient, sky_ambient, up_weight);
            }
            if (scene.ambient_solid.a > 0.0) {
                ambient_light += srgbToLinear(scene.ambient_solid.rgb) * scene.ambient_solid.a;
            }
            
            let diffuseColor = albedo * (1.0 - metallic);
            Lo += diffuseColor * INV_PI * ambient_light;

            let kD = 1.0 - metallic;

            for (var i: u32 = 0; i < 4; i++) {
                let dl = scene.dir_lights[i];
                if (dl.color.a > 0.0) {
                    let L = normalize(-dl.direction.xyz);
                    let NdotL = max(dot(N, L), 0.0);
                    if (NdotL > 0.0) {
                        let H = normalize(V + L);
                        let NdotH = max(dot(N, H), 0.0);
                        let VdotH = max(dot(V, H), 0.0);

                        let F = F0 + (1.0 - F0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);

                        let denom = NdotH * NdotH * (alpha_sq - 1.0) + 1.0;
                        let D = alpha_sq * INV_PI / (denom * denom);

                        let gv = NdotL * sqrt(alpha_sq + (1.0 - alpha_sq) * (NdotV * NdotV));
                        let gl = NdotV * sqrt(alpha_sq + (1.0 - alpha_sq) * (NdotL * NdotL));
                        let V_vis = 0.5 / max(gv + gl, 0.00001);

                        let specular = D * V_vis * F;

                        let dir_col = srgbToLinear(dl.color.rgb) * dl.direction.w;
                        Lo += (kD * albedo * INV_PI + specular) * dir_col * NdotL;
                    }
                }
            }

            let light_count = u32(scene.camera_pos.w);
            for (var i: u32 = 0; i < light_count; i++) {
                let pl    = point_lights.lights[i];
                let lv    = pl.position - in.world_pos;
                let dist2 = dot(lv, lv);
                let dist  = sqrt(dist2);
                if (dist >= pl.range) { continue; }
                
                let L        = lv / dist;
                let NdotL    = max(dot(N, L), 0.0);
                
                if (NdotL > 0.0) {
                    let H = normalize(V + L);
                    let NdotH = max(dot(N, H), 0.0);
                    let VdotH = max(dot(V, H), 0.0);

                    let F = F0 + (1.0 - F0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);

                    let denom = NdotH * NdotH * (alpha_sq - 1.0) + 1.0;
                    let D = alpha_sq * INV_PI / (denom * denom);

                    let gv = NdotL * sqrt(alpha_sq + (1.0 - alpha_sq) * (NdotV * NdotV));
                    let gl = NdotV * sqrt(alpha_sq + (1.0 - alpha_sq) * (NdotL * NdotL));
                    let V_vis = 0.5 / max(gv + gl, 0.00001);

                    let specular = D * V_vis * F;

                    let window   = pow(max(1.0 - pow(dist / pl.range, 4.0), 0.0), 2.0);
                    let pl_color = srgbToLinear(pl.color);
                    let radiance = pl_color * (pl.candela / max(dist2, 0.0001)) * window;
                    
                    Lo += (kD * albedo * INV_PI + specular) * radiance * NdotL;
                }
            }
            Lo += emissive_contrib;
        }

        let exposed = Lo * exposure;
        let mapped = ACESFilmicToneMapping(exposed);
        let corrected = linearToSrgb(mapped);
        return vec4<f32>(corrected, alpha);
    }
  `,

  SkyWGSL: `
    struct Scene {
        view_proj:      mat4x4<f32>,
        inv_view_proj:  mat4x4<f32>,
        camera_pos:     vec4<f32>,
        ambient:        vec4<f32>,
        ambient_ground: vec4<f32>,
        ambient_solid:  vec4<f32>,
        exposure:       vec4<f32>,
    };
    @group(0) @binding(0) var<uniform> scene: Scene;
    struct SkyOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };

    @vertex fn vs_main(@builtin(vertex_index) vi: u32) -> SkyOut {
        var uvs = array<vec2<f32>, 3>(vec2<f32>(-1.0,-1.0), vec2<f32>(3.0,-1.0), vec2<f32>(-1.0,3.0));
        var out: SkyOut;
        out.uv = uvs[vi];
        out.pos = vec4<f32>(out.uv * vec2<f32>(2.0,-2.0) + vec2<f32>(-1.0,1.0), 1.0, 1.0);
        return out;
    }
    @fragment fn fs_main(in: SkyOut) -> @location(0) vec4<f32> {
        return vec4<f32>(1.0 / 255.0, 4.0 / 255.0, 10.0 / 255.0, 1.0);
    }
  `,

  GridWGSL: `
    struct Scene {
        view_proj:      mat4x4<f32>,
        inv_view_proj:  mat4x4<f32>,
        camera_pos:     vec4<f32>,
        ambient:        vec4<f32>,
        ambient_ground: vec4<f32>,
        ambient_solid:  vec4<f32>,
        exposure:       vec4<f32>,
    };
    @group(0) @binding(0) var<uniform> scene: Scene;
    struct GridOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };
    @vertex fn vs_main(@builtin(vertex_index) vi: u32) -> GridOut {
        var uvs = array<vec2<f32>, 3>(vec2<f32>(-1.0,-1.0), vec2<f32>(3.0,-1.0), vec2<f32>(-1.0,3.0));
        var out: GridOut; out.uv = uvs[vi];
        out.pos = vec4<f32>(out.uv * vec2<f32>(2.0,-2.0) + vec2<f32>(-1.0,1.0), 1.0, 1.0);
        return out;
    }
    @fragment fn fs_main(in: GridOut) -> @location(0) vec4<f32> {
        let ray_clip  = vec4<f32>(in.uv * vec2<f32>(2.0,-2.0) + vec2<f32>(-1.0,1.0), 1.0, 1.0);
        let ray_world = scene.inv_view_proj * ray_clip;
        let dir       = normalize(ray_world.xyz / ray_world.w - scene.camera_pos.xyz);
        if (dir.y >= 0.0) { discard; }
        let t    = -scene.camera_pos.y / dir.y;
        let pos  = scene.camera_pos.xyz + dir * t;
        let dist = length(pos - scene.camera_pos.xyz);
        let fade = clamp(1.0 - dist / 200.0, 0.0, 1.0);
        if (fade <= 0.0) { discard; }
        let coord  = pos.xz;
        let deriv  = fwidth(coord);
        let grid   = abs(fract(coord - 0.5) - 0.5) / deriv;
        let line   = min(grid.x, grid.y);
        let grid10 = abs(fract(coord * 0.1 - 0.5) - 0.5) / (deriv * 0.1);
        let line10 = min(grid10.x, grid10.y);
        var color  = vec3<f32>(0.2);
        var alpha  = (1.0 - min(line,1.0)) * 0.2 + (1.0 - min(line10,1.0)) * 0.5;
        let xAxis  = abs(pos.z) / deriv.y;
        let zAxis  = abs(pos.x) / deriv.x;
        if (xAxis < 1.5) { color = vec3<f32>(0.8,0.2,0.2); alpha = 0.8; }
        if (zAxis < 1.5) { color = vec3<f32>(0.2,0.2,0.8); alpha = 0.8; }
        if (alpha * fade < 0.01) { discard; }
        return vec4<f32>(color, alpha * fade);
    }
  `,

  GizmoWGSL: `
    struct Scene {
        view_proj:      mat4x4<f32>,
        inv_view_proj:  mat4x4<f32>,
        camera_pos:     vec4<f32>,
        ambient:        vec4<f32>,
        ambient_ground: vec4<f32>,
        ambient_solid:  vec4<f32>,
        exposure:       vec4<f32>,
    };
    @group(0) @binding(0) var<uniform> scene: Scene;
    struct GizmoData { pos: vec4<f32> };
    @group(1) @binding(0) var<uniform> gizmo: GizmoData;
    struct VO { @builtin(position) pos: vec4<f32>, @location(0) color: vec3<f32> };
    @vertex fn vs_main(@builtin(vertex_index) vi: u32) -> VO {
        let dist  = length(gizmo.pos.xyz - scene.camera_pos.xyz);
        let scale = dist * 0.15;
        var positions = array<vec3<f32>,6>(vec3<f32>(0,0,0),vec3<f32>(1,0,0),vec3<f32>(0,0,0),vec3<f32>(0,1,0),vec3<f32>(0,0,0),vec3<f32>(0,0,1));
        var colors    = array<vec3<f32>,6>(vec3<f32>(1,0,0),vec3<f32>(1,0,0),vec3<f32>(0,1,0),vec3<f32>(0,1,0),vec3<f32>(0.2,0.4,1),vec3<f32>(0.2,0.4,1));
        var out: VO; out.color = colors[vi];
        out.pos = scene.view_proj * vec4<f32>(gizmo.pos.xyz + positions[vi] * scale, 1.0);
        return out;
    }
    @fragment fn fs_main(in: VO) -> @location(0) vec4<f32> { return vec4<f32>(in.color, 1.0); }
  `,

  GPUSimComputeWGSL: `
    struct Particle {
        pos_x: f32,
        pos_y: f32,
        pos_z: f32,
        vel_x: f32,
        vel_y: f32,
        vel_z: f32,
        scale: f32,
        lifetime: f32,
    };
    @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
    struct SimParams {
        speed: f32,
        size: f32,
        gravity: f32,
        noise_scale: f32,
        time: f32,
        pad0: f32,
        row_stride: f32,
        pad2: f32,
    };
    @group(0) @binding(1) var<uniform> params: SimParams;

    fn hash(n: f32) -> f32 {
        return fract(sin(n) * 43758.5453123);
    }

    @compute @workgroup_size(64)
    fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
        // Flat index across a possibly-2D dispatch; see SIM_WORKGROUP_SIZE in
        // Renderer3D.js. With a single row this is just id.x.
        let index = id.x + id.y * u32(params.row_stride);
        if (index >= arrayLength(&particles)) {
            return;
        }
        var p = particles[index];
        p.lifetime += params.speed * 0.01;
        p.scale = params.size;

        var position = vec3<f32>(p.pos_x, p.pos_y, p.pos_z);
        var velocity = vec3<f32>(p.vel_x, p.vel_y, p.vel_z);

        if (p.lifetime >= 1.0) {
            p.lifetime = 0.0;
            let seed = f32(index) + params.time;
            let theta = hash(seed) * 6.28318530718;
            let phi = acos(hash(seed + 1.0) * 2.0 - 1.0);
            let dist = hash(seed + 2.0) * 15.0 + 5.0;
            position = vec3<f32>(
                sin(phi) * cos(theta) * dist,
                sin(phi) * sin(theta) * dist,
                cos(phi) * dist
            );
            let r_dir = normalize(position);
            velocity = -r_dir * (hash(seed + 3.0) * 5.0 + 5.0);
        } else {
            let dist_sq = dot(position, position);
            if (dist_sq > 0.1) {
                let r_dir = normalize(position);
                velocity -= r_dir * (params.gravity * 100.0 / dist_sq) * 0.016;
                let tangent = normalize(vec3<f32>(-position.y, position.x, 0.1));
                velocity += tangent * params.noise_scale * 0.5 * 0.016;
            }
            velocity.x += sin(position.y * 0.1 + params.time) * params.noise_scale * 0.016;
            velocity.y += cos(position.x * 0.1 + params.time) * params.noise_scale * 0.016;
            velocity.z += sin(position.z * 0.1 + params.time) * params.noise_scale * 0.016;
            position += velocity * 0.016;
        }

        p.pos_x = position.x;
        p.pos_y = position.y;
        p.pos_z = position.z;
        p.vel_x = velocity.x;
        p.vel_y = velocity.y;
        p.vel_z = velocity.z;

        particles[index] = p;
    }
  `,

  GPUSimRenderWGSL: `
    struct Scene {
        view_proj:      mat4x4<f32>,
        inv_view_proj:  mat4x4<f32>,
        camera_pos:     vec4<f32>,
        ambient:        vec4<f32>,
        ambient_ground: vec4<f32>,
        ambient_solid:  vec4<f32>,
        exposure:       vec4<f32>,
    };
    @group(0) @binding(0) var<uniform> scene: Scene;

    struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) color: vec4<f32>,
        @location(1) normal: vec3<f32>,
    };

    @vertex
    fn vs_main(
        @location(0) vertex_pos: vec3<f32>,
        @location(1) vertex_normal: vec3<f32>,
        @location(2) vertex_uv:     vec2<f32>,
        @location(6) vertex_color:  vec4<f32>,
        @location(3) inst_pos: vec3<f32>,
        @location(4) inst_vel: vec3<f32>,
        @location(5) inst_scale: f32,
        @location(7) inst_lifetime: f32,
    ) -> VertexOutput {
        let angle_x = inst_lifetime * 6.28318 * 2.0;
        let angle_y = inst_lifetime * 6.28318 * 1.5;
        let cx = cos(angle_x);
        let sx = sin(angle_x);
        let cy = cos(angle_y);
        let sy = sin(angle_y);

        var r_pos = vertex_pos;
        r_pos = vec3<f32>(
            r_pos.x,
            r_pos.y * cx - r_pos.z * sx,
            r_pos.y * sx + r_pos.z * cx
        );
        r_pos = vec3<f32>(
            r_pos.x * cy + r_pos.z * sy,
            r_pos.y,
            -r_pos.x * sy + r_pos.z * cy
        );

        var r_norm = vertex_normal;
        r_norm = vec3<f32>(
            r_norm.x,
            r_norm.y * cx - r_norm.z * sx,
            r_norm.y * sx + r_norm.z * cx
        );
        r_norm = vec3<f32>(
            r_norm.x * cy + r_norm.z * sy,
            r_norm.y,
            -r_norm.x * sy + r_norm.z * cy
        );

        let scale = inst_scale * (1.0 - inst_lifetime);
        let world_pos = inst_pos + r_pos * scale;

        var out: VertexOutput;
        out.position = scene.view_proj * vec4<f32>(world_pos, 1.0);
        out.normal = normalize(r_norm);

        let speed = length(inst_vel);
        let heat = clamp(speed / 15.0, 0.0, 1.0);
        let cold_color = vec3<f32>(0.1, 0.4, 1.0);
        let hot_color = vec3<f32>(1.0, 0.2, 0.1);
        let blend_color = mix(cold_color, hot_color, heat);
        out.color = vec4<f32>(blend_color * vertex_color.rgb, 1.0);
        return out;
    }

    @fragment
    fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
        let light_dir = normalize(vec3<f32>(0.577, 0.577, 0.577));
        let diffuse = max(dot(normalize(in.normal), light_dir), 0.0);
        let ambient = 0.25;
        let final_color = in.color.rgb * (diffuse + ambient);
        return vec4<f32>(final_color, 1.0);
    }
  `,
};
