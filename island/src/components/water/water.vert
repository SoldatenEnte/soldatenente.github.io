varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vViewVector;
varying vec3 vCameraPosition;
varying vec4 vReflectionUv;
varying float vWaveHeight;

uniform float uTime;
uniform float uWaveSteepness;
uniform float uWaveLength;
uniform float uWaveSpeed;
uniform float uFbmSpeed;
uniform vec3 uWaveDirection;
uniform mat4 uReflectionTextureMatrix;

vec2 angleToDirection(float angle) {
    return vec2(cos(angle * (PI / 180.0)), sin(angle * (PI / 180.0)));
}

float fbm(vec2 p) {
    float total = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float lacunarity = 2.3;
    float gain = 0.4;
    int octaves = 5;
    float maxValue = 0.0;
    for (int i = 0; i < octaves; i++) {
        total += gln_simplex(p * frequency) * amplitude;
        maxValue += amplitude;
        frequency *= lacunarity;
        amplitude *= gain;
    }
    return total / maxValue;
}

vec3 gerstnerWave(vec3 point, vec2 direction, float steepness, float waveLength, float time) {
    float k = 2.0 * PI / waveLength;
    float a = steepness / k;
    float d_dot_p = point.x * direction.x + point.y * direction.y;
    float f = k * (d_dot_p - time);
    float cos_f = cos(f);
    float sin_f = sin(f);

    return vec3(
        direction.x * a * cos_f,
        direction.y * a * cos_f,
        a * sin_f
    );
}

vec3 displace(vec3 point) {
    vec3 totalDisplacement = vec3(0.0);

    float noiseInput = (uTime * uFbmSpeed);
    float fbmNoise = gln_normalize(fbm((point.xy * 0.5) + noiseInput));
    totalDisplacement.z += fbmNoise * 0.5;

    float waveTime = uTime * uWaveSpeed;

    vec2 dirA = angleToDirection(uWaveDirection.x);
    totalDisplacement += gerstnerWave(point, dirA, uWaveSteepness, uWaveLength, waveTime);

    vec2 dirB = angleToDirection(uWaveDirection.y);
    totalDisplacement += gerstnerWave(point, dirB, uWaveSteepness * 0.5, uWaveLength * 0.5, waveTime);

    vec2 dirC = angleToDirection(uWaveDirection.z);
    totalDisplacement += gerstnerWave(point, dirC, uWaveSteepness * 0.25, uWaveLength * 0.25, waveTime);

    vWaveHeight = totalDisplacement.z;
    return point + totalDisplacement;
}

vec3 orthogonal(vec3 v) {
    return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y));
}

vec3 recalcNormals(vec3 newPos) {
    float offset = 0.001;
    vec3 tangent = orthogonal(normal);
    vec3 bitangent = normalize(cross(normal, tangent));
    vec3 neighbour1 = position + tangent * offset;
    vec3 neighbour2 = position + bitangent * offset;
    vec3 displacedNeighbour1 = displace(neighbour1);
    vec3 displacedNeighbour2 = displace(neighbour2);
    vec3 displacedTangent = displacedNeighbour1 - newPos;
    vec3 displacedBitangent = displacedNeighbour2 - newPos;
    return normalize(cross(displacedTangent, displacedBitangent));
}

void main() {
    csm_Position = displace(position);
    csm_Normal = recalcNormals(csm_Position);
    vUv = uv;
    vWorldPosition = (modelMatrix * vec4(csm_Position, 1.0)).xyz;
    vViewVector = cameraPosition - vWorldPosition;
    vCameraPosition = cameraPosition;
    vReflectionUv = uReflectionTextureMatrix * vec4(csm_Position, 1.0);
}