export function setupScrollTrigger(particleSystem, start, end) {
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: "#threejs-canvas",
    start: start,
    end: end,
    onUpdate: (self) => {
      updateParticleOffsets(particleSystem, self.progress);
    },
  });
}

function updateParticleOffsets(particleSystem, scrollProgress) {
  // A higher power delays the effect, making it start later.
  // A smaller multiplier controls the final speed for a smoother dissolve.
  const displacementMultiplier = Math.pow(scrollProgress, 8) * 500;

  const scrollOffsets = particleSystem.geometry.attributes.scrollOffset.array;
  const offsets = particleSystem.geometry.attributes.offset.array;

  for (let i = 0; i < scrollOffsets.length; i += 3) {
    scrollOffsets[i] = offsets[i] * displacementMultiplier;
    scrollOffsets[i + 1] = offsets[i + 1] * displacementMultiplier;
    scrollOffsets[i + 2] = offsets[i + 2] * displacementMultiplier;
  }

  particleSystem.geometry.attributes.scrollOffset.needsUpdate = true;
}
