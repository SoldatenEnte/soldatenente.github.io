export function addAnimations(particleSystems) {
  return function idleAnimation(time) {
    const idleRotationSpeed = 0.25;
    const idleRotationAmplitude = 0.4;

    particleSystems.forEach((particleSystem) => {
      const idleRotationX =
        Math.sin(time * idleRotationSpeed) * idleRotationAmplitude;
      const idleRotationY =
        Math.cos(time * idleRotationSpeed) * idleRotationAmplitude;

      particleSystem.rotation.x = idleRotationX;
      particleSystem.rotation.y = idleRotationY;
      particleSystem.rotation.z = 0.25;

      const positions = particleSystem.geometry.attributes.position.array;
      const initialPositions =
        particleSystem.geometry.attributes.initialPosition.array;
      const offsets = particleSystem.geometry.attributes.offset.array;
      const scrollOffsets =
        particleSystem.geometry.attributes.scrollOffset.array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] =
          initialPositions[i] +
          Math.sin(time * 0.5) * offsets[i] +
          scrollOffsets[i];
        positions[i + 1] =
          initialPositions[i + 1] +
          Math.cos(time * 0.5) * offsets[i + 1] +
          scrollOffsets[i + 1];
        positions[i + 2] =
          initialPositions[i + 2] +
          Math.sin(time * 0.5) * offsets[i + 2] +
          scrollOffsets[i + 2];
      }

      particleSystem.geometry.attributes.position.needsUpdate = true;
    });
  };
}
