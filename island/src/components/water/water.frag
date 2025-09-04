uniform sampler2D uDepthTexture;
uniform sampler2D uReflectedTexture;
uniform vec2 uCameraNearFar;
uniform vec2 uResolution;
uniform float uTime;

uniform float uWaterDepth;
uniform vec3 uWaterShallowColor;
uniform vec3 uWaterDeepColor;
uniform vec3 uHorizonColor;
uniform float uHorizonDistance;
uniform sampler2D uFoamTexture;
uniform vec3 uFoamColor;
uniform float uFoamAlpha;
uniform float uFoamBlend;
uniform float uFoamIntersectionFade;
uniform float uFoamIntersectionCutoff;
uniform sampler2D uNormalsTexture;

uniform float uWaveCrestStart;
uniform float uWaveCrestEnd;

uniform vec3 uWaveCrestColor;
uniform float uReflectionFresnelPower;
uniform float uReflectionStrength;
uniform float uReflectionMix;
uniform bool uReflectionEnabled;
uniform float uFoamTiling;
uniform float uFoamSpeed;
uniform float uFoamDistortion;
uniform float uNormalsScale;
uniform float uNormalsSpeed;
uniform float uNormalsStrength;
uniform float uPlaneSize;
uniform float uFogNear;
uniform float uFogFar;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vViewVector;
varying vec3 vCameraPosition;
varying vec4 vReflectionUv;
varying float vWaveHeight;

float getDepth(vec2 screenPosition) {
    return texture2D(uDepthTexture, screenPosition).x;
}

float getViewZ(float depth) {
    return perspectiveDepthToViewZ(depth, uCameraNearFar.x, uCameraNearFar.y);
}

vec3 getWorldSpaceScenePosition(vec2 uv) {
    vec3 viewVector = -vViewVector;
    float screenPositionZ = getViewZ(gl_FragCoord.z);
    float sceneDepthZ = getViewZ(getDepth(uv));
    viewVector = viewVector / screenPositionZ;
    viewVector = viewVector * sceneDepthZ;
    viewVector = viewVector + vCameraPosition;
    return viewVector;
}

// Injected GLSL functions will go here
#include <hsv_lerp>
#include <fresnel>
#include <distort_uv>
#include <blend>

vec2 panUV(vec2 _uv, float _tiling, float _speed) {
    return mod((_uv * _tiling) + (uTime * _speed), 1.0);
}

vec4 overlay(vec4 base, vec4 over, float blend) {
    float overAlpha = saturate(over.a);
    return mix(Overwrite(base, over, overAlpha), LinearDodge(base, over, overAlpha), blend);
}

void main() {
    vec2 screenUV = gl_FragCoord.xy / uResolution;
    vec2 worldUv = mod(vWorldPosition.xz, uPlaneSize) * 0.1;

    vec3 worldSpaceScenePosition = getWorldSpaceScenePosition(screenUV);
    float shoreDepth = max(0.0, vWorldPosition.y - worldSpaceScenePosition.y);
    float shoreT = smoothstep(0.0, uWaterDepth, shoreDepth);
    vec3 waterColor = mix(uWaterShallowColor, uWaterDeepColor, shoreT);
    vec4 color = vec4(waterColor, 1.0);

    color = HSVLerp(color, vec4(uHorizonColor, 1.0), Fresnel(uHorizonDistance));

    float intersectionFoamDepth = saturate(exp(-shoreDepth / uFoamIntersectionFade));
    float intersectionFoamMask = intersectionFoamDepth + 0.1;
    intersectionFoamMask = smoothstep(1.0 - uFoamIntersectionFade, 1.0, intersectionFoamMask);

    vec2 foamUv = panUV(worldUv, uFoamTiling, uFoamSpeed);
    foamUv = DistortUv(foamUv, uFoamDistortion);
    float foamTexColor = texture2D(uFoamTexture, foamUv).r;
    float foamMask = foamTexColor * intersectionFoamMask;
    foamMask = smoothstep(1.0 - uFoamIntersectionCutoff, 1.0, foamMask);
    vec4 foam = vec4(uFoamColor, foamMask * uFoamAlpha);
    color = overlay(color, foam, uFoamBlend);

    float crestFactor = smoothstep(uWaveCrestStart, uWaveCrestEnd, vWaveHeight);
    color.rgb = mix(color.rgb, uWaveCrestColor, crestFactor);

    vec2 normalUvA = panUV(worldUv, uNormalsScale, uNormalsSpeed);
    vec3 normalsA = texture2D(uNormalsTexture, normalUvA).rgb * 2.0 - 1.0;
    vec2 normalUvB = panUV(worldUv, uNormalsScale * 0.75, uNormalsSpeed * -0.6);
    vec3 normalsB = texture2D(uNormalsTexture, normalUvB).rgb * 2.0 - 1.0;
    vec3 normals = normalize(normalsA + normalsB);
    normals = normalize(vec3(normals.xy * uNormalsStrength, normals.z));

    if (uReflectionEnabled) {
        vec4 reflected = texture2DProj(uReflectedTexture, vReflectionUv + vec4(normals, 0.0) * 0.1);
        float reflectionFresnel = Fresnel(uReflectionFresnelPower) * uReflectionStrength;
        vec4 finalReflectionColor = mix(vec4(0.0), reflected, reflectionFresnel);
        float distanceToCamera = distance(vCameraPosition, vWorldPosition);
        float fogFactor = smoothstep(uFogNear, uFogFar, distanceToCamera);
        finalReflectionColor.rgb = mix(finalReflectionColor.rgb, uHorizonColor, fogFactor);
        color = overlay(color, finalReflectionColor, uReflectionMix);
    }

    csm_DiffuseColor = color;
    csm_FragNormal = normals;
}