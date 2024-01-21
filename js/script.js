gsap.registerPlugin(ScrollTrigger);

console.log("Script loaded successfully.");

const textElements = gsap.utils.toArray(".navigator_text");

textElements.forEach((text) => {
  gsap.to(text, {
    backgroundSize: "100%",
    ease: "none",
    scrollTrigger: {
      trigger: text,
      start: "50% 80%",
      end: "600% 20%",
      scrub: 4,
      markers: false,
    },
  });
});

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".navigator_container",
    start: "center center",
    end: "100% 20%",
    markers: false,
    pin: true,
  },
});

const tl_ship = gsap.timeline({
  scrollTrigger: {
    trigger: ".navigator_container",
    start: "center center",
    end: "100% 20%",
    scrub: 3,
    markers: false,
    onUpdate: (self) => {
      const progress = self.progress;
      const rotation = Math.sin(progress * Math.PI * 3) * 30;
      gsap.to("#ship-icon", {
        rotation: rotation,
      });
    },
  },
});

let containerWidth;
function updateContainerWidth() {
  const navigatorContainer = document.querySelector(".navigator_container");

  if (navigatorContainer) {
    containerWidth = navigatorContainer.offsetWidth;
  } else {
    console.error("AAAAAAAHHHHHHHHHHHHHHH... (dies inside)");
  }
}

updateContainerWidth();
window.addEventListener("resize", updateContainerWidth);

tl_ship.to("#ship-icon", {
  x: containerWidth - 150,
});

tl_parallax_0 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-0",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    markers: false,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_1 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-1",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    markers: false,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_2 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-2",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    markers: false,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_3 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-3",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    markers: false,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_4 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-4",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    markers: false,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_5 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-5",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    markers: false,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_6 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-6",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    markers: false,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_text = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-text",
    start: "center center",
    end: "100% 0%",
    scrub: 2,
    markers: false,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_7 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-7",
    start: "center center",
    end: "100% 0%",
    scrub: 4,
    markers: false,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_8 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-8",
    start: "center center",
    end: "100% 0%",
    scrub: 4,
    markers: false,
    toggleActions: "play reverse play reverse",
  },
});
tl_parallax_0.to("#parallax-0", {
  y: -450,
});

tl_parallax_1.to("#parallax-1", {
  y: -400,
});

tl_parallax_2.to("#parallax-2", {
  y: -350,
  x: -50,
});

tl_parallax_3.to("#parallax-3", {
  y: -200,
  x: 100,
});

tl_parallax_4.to("#parallax-4", {
  y: -500,
});

tl_parallax_5.to("#parallax-5", {
  y: -150,
  x: -150,
});

tl_parallax_6.to("#parallax-6", {
  y: -150,
  x: 200,
});

tl_parallax_text.to("#parallax-text", {
  y: 350,
});

tl_parallax_7.to("#parallax-7", {
  transform: "scale(1.1)",
  y: -150,
});

tl_parallax_8.to("#parallax-8", {
  transform: "scale(1.2)",
  y: -150,
});
