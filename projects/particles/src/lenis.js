export function setupLenis() {
  const lenis = new Lenis();

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 800);
  });

  gsap.ticker.lagSmoothing(0);
}
