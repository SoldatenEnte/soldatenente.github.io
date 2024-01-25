function startLoader() {
  let counterElement = document.querySelector(".counter");
  if(counterElement){
    let curValue = 0;

    function updateCounter() {
      if (curValue === 100) return;

      curValue += Math.floor(Math.random() * 4) + 2;

      if (curValue > 100) curValue = 100;

      counterElement.textContent = curValue;

      const rotation = Math.sin((curValue / 100) * Math.PI * 4) * 25;
      gsap.to(".preloader_icon", {
        x: (curValue / 70) * window.innerWidth,
        rotation: rotation,
      });

      setTimeout(updateCounter, Math.floor(Math.random() * 200));
      window.scrollTo(0, document.body.scrollHeight);
      console.log("Scroll");
    }

    updateCounter();
  }
}

startLoader();

// HIDE COUNTER
gsap.to(".counter", 0.25, {
  delay: 4,
  opacity: 0,
  onComplete: function () {
    window.scrollTo(0, 0);
    console.log("WÄÄ");
  },
});

gsap.to(".bar-1", 3.5, {
  delay: 3,
  height: 0,
  ease: "power4.inOut",
});

gsap.to(".bar-2", 3.75, {
  delay: 3,
  height: 0,
  ease: "power4.inOut",
});

gsap.to(".bar-3", 4, {
  delay: 3,
  height: 0,
  ease: "power4.inOut",
});

gsap.from(".h1", 1.5, {
  delay: 4,
  y: 700,
  stagger: {
    amount: 0.5,
  },
  ease: "power4.inOut",
  onComplete: function () {
    ["overlay", "counter", "preloader_icon"].forEach((className) => {
      const element = document.querySelector(`.${className}`);
      if (element) {
        element.parentNode.removeChild(element);
      }
    });
  },
});
