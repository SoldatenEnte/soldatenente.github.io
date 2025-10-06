gsap.timeline({
  scrollTrigger: {
    trigger: "#heading-a",
    start: "50% 50%",
    endTrigger: "#heading-a-end",
    end: "50% 50%",
    scrub: true,
    pin: true,
  },
});

gsap.timeline({
  scrollTrigger: {
    trigger: "#target",
    start: "-200% 50%",
    end: "900% 50%",
    scrub: true,
    onUpdate: (self) => {
      const progress = self.progress;
      const moveAmount = 3000; // Change this value to adjust how much the object moves

      gsap.to("#target", { x: -moveAmount * progress });
    },
  },
});

gsap.timeline({
  scrollTrigger: {
    trigger: "#target",
    start: "50% 50%",
    end: "400% 50%",
    scrub: true,
    pin: true,
  },
});

gsap.timeline({
  scrollTrigger: {
    trigger: "#heading-b",
    start: "50% 50%",
    end: "300% 50%",
    scrub: false,
    pin: true,
    onEnter: () => {
      document.getElementById("zooming-heading").style.visibility = "visible";
    },
    onEnterBack: () => {
      document.getElementById("zooming-heading").style.visibility = "visible";
      document.body.style.backgroundColor = "var(--color-2)";
    },
    onLeave: () => {
      document.getElementById("zooming-heading").style.visibility = "hidden";
      document.body.style.backgroundColor = "white";
    },
    onUpdate: (self) => {
      const scroll = self.progress;
      const scaleValue = Math.max(0, Math.pow(3 * self.progress, 4));
      let width = Math.max(0, gsap.utils.mapRange(0.8, 1, 0, 100, scroll));

      gsap.to("#heading-b h1", {
        scale: scaleValue,
        transformOrigin: "center center",
        opacity: 0.3 * (scaleValue)
      });

      document.getElementById("container-to-animate").style.width = `${width}vw`;
    },
  },
});





//Textanimation mit Letterspace und Fontweight
gsap.timeline({
  scrollTrigger: {
    trigger: "#text-a",
    start: "-500% 50%",
    end: "100% 50%",
    scrub: 4,
    ease:1,
    onUpdate: (self) => {
      const progress = self.progress;
      const spacing = 400 - 400 * self.progress;
      const weight = Math.max(0, gsap.utils.mapRange(0.5, 1, 200, 900, self.progress))
      gsap.to("#text-a", {
        letterSpacing: `${spacing}px`,
        fontWeight: weight
      });
    },
  },
});


gsap.timeline({
  scrollTrigger: {
    trigger: "#text-b",
    start: "-1000% 50%",
    end: "100% 50%",
    ease: 1,
    scrub: 4,
    onUpdate: (self) => {
      const progress = self.progress;
      const spacing = 700 - 700 * self.progress;
      const weight = 2000 - 1400 * self.progress;
      gsap.to("#text-b", {
        letterSpacing: `${spacing}px`,
        fontWeight: weight
      });
    },
  },
});

//Background Icons
const icons = document.querySelectorAll('.svg-icon');

icons.forEach((icon, index) => {
  gsap.to(icon, {
    y: () => Math.sin(index * 0.5) * 50,
    x: () => Math.cos(index * 0.5) * 30,
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
      toggleActions: "play pause resume pause"
    }
  });
});

// Optional: Zusätzliche Rotation für mehr Dynamik
icons.forEach((icon, index) => {
  gsap.to(icon, {
    rotation: () => Math.sin(index * 0.8) * 200, // Rotiert das Icon leicht
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
    }
  });
});



//THREEHEADING

const elements = document.querySelectorAll('.three-heading-animated');

elements.forEach((element, index) => {
  const direction = index === 1 ? -1 : 1;
  const h1Element = element.querySelector('h1'); // Select the h1 inside the div

  gsap.fromTo(element, 
    { 
      x: direction * -window.innerWidth / 4,
    },
    {
      x: () => direction * window.innerWidth / 4,
      ease: 'none',
      scrollTrigger: {
        trigger: elements[1],
        start: '-100% 100%',
        end: '200% 0%',
        scrub: true,
        onUpdate: function(self) {
          const progress = self.progress;
          const distanceFromCenter = Math.abs(progress - 0.5);
          const fontWeight = gsap.utils.mapRange(0, 0.5, 900, 200, distanceFromCenter);
          h1Element.style.fontWeight = Math.round(fontWeight);
        }
      }
    }
  );
});


document.addEventListener('DOMContentLoaded', function() {
  const scrollButtons = [
    { button: 'scroll-down-button', target: 'skills-section', smooth: true },
    { button: 'scroll-skills', target: 'skills-section', smooth: true },
    { button: 'scroll-work', target: 'work-section', smooth: true },
    { button: 'scroll-topics', target: 'topics-section', smooth: false },
    { button: 'scroll-another', target: 'another-section', smooth: false }
  ];

  scrollButtons.forEach(({ button, target, smooth }) => {
    const scrollButton = document.getElementById(button);
    const targetSection = document.getElementById(target);

    scrollButton.addEventListener('click', function(e) {
      e.preventDefault();
      targetSection.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto'
      });
    });
  });
});
