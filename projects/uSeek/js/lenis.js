const lenis = new Lenis();

lenis.on("scroll", (e) => {
  console.log("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
});

lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);
