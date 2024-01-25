//XRAY für die Fotos und die Hinweise. Hinweise? Nee, es gibt sicherlich keine Hinweise :)
//Inspiration: https://codepen.io/erikrahm/pen/qBwMMR
document.addEventListener("DOMContentLoaded", function () {
  var photo = document.getElementById("photo");
  var xray = document.getElementById("xray");

  if (photo) {
    photo.addEventListener("mousemove", function (e) {
      var offset = getOffset(photo);
      var mouseX = e.pageX - offset.left;
      var mouseY = e.pageY - offset.top;

      xray.style.maskPosition = mouseX - 75 + "px " + (mouseY - 75) + "px";
    });
  }

  // Function to get the offset of an element
  function getOffset(el) {
    var rect = el.getBoundingClientRect();
    return {
      left: rect.left + window.pageXOffset,
      top: rect.top + window.pageYOffset,
    };
  }
});

// Damit die Schlingel nicht Bild so leicht in neuem Tab öffnen können :)
var xrayElement = document.getElementById("xray");

if (xrayElement) {
  xrayElement.addEventListener("contextmenu", function (e) {
    // Verhindere das Standardkontextmenü
    e.preventDefault();
  });
}

// Malen auf der Sternenkarte
document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("star-container");
  const canvas = document.getElementById("star-canvas");
  if (container && canvas) {
    const context = canvas.getContext("2d");
    let isDrawing = false;
    if (container && canvas) {
      canvas.width = starmap.width;
      canvas.height = starmap.height;

      canvas.addEventListener("mousedown", startDrawing);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("mouseup", stopDrawing);
      canvas.addEventListener("mouseout", stopDrawing);

      canvas.addEventListener("contextmenu", resetDrawing);
      canvas.addEventListener("contextmenu", function (e) {
        e.preventDefault();
      });
      canvas.addEventListener("touchmove", function (e) {
        e.startDrawing();
        e.preventDefault();
      });

      function startDrawing(e) {
        isDrawing = true;
        draw(e);
      }

      function draw(e) {
        if (!isDrawing) return;

        const x = e.clientX - container.getBoundingClientRect().left;
        const y = e.clientY - container.getBoundingClientRect().top;

        context.beginPath();
        context.arc(x, y, 5, 0, 2 * Math.PI);
        context.fillStyle = "red"; // Set color to black
        context.fill();
        context.closePath();
      }

      function stopDrawing() {
        isDrawing = false;
      }

      function resetDrawing() {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }
});

function toggleColor(element) {
  // Wenn die Hintergrundfarbe transparent ist oder nicht festgelegt wurde
  if (
    !element.style.backgroundColor ||
    element.style.backgroundColor === "transparent"
  ) {
    element.style.backgroundColor = "#f86c30"; // Setze die Farbe auf #f86c30
  } else {
    element.style.backgroundColor = "transparent"; // Setze die Farbe auf transparent
  }
}

gsap.registerPlugin(ScrollTrigger);

console.log("Script loaded successfully.");

const textElements = gsap.utils.toArray(".navigator_text");

textElements.forEach((text) => {
  gsap.to(text, {
    backgroundSize: "100%",
    ease: "none",
    scrollTrigger: {
      trigger: text,
      start: "1900% 80%",
      end: "2200% 20%",
      scrub: 4,
    },
  });
});

const pirate_textElements = gsap.utils.toArray(".pirate-home-text");

pirate_textElements.forEach((text) => {
  gsap.to(text, {
    backgroundSize: "100%",
    ease: "none",
    scrollTrigger: {
      trigger: text,
      start: "50% 80%",
      end: "2600% 20%",
      scrub: 2,
    },
  });
});

// JAN
const tl_pirate_welcome = gsap.timeline({
  scrollTrigger: {
    trigger: ".jan-1",
    start: "center center",
    end: "250% 20%",
    toggleActions: "play reverse play reverse",
    pin: true,
  },
});

const tl_pirate_lock = gsap.timeline({
  scrollTrigger: {
    trigger: ".jan-2",
    start: "center center",
    end: "100% 20%",
    toggleActions: "play reverse play reverse",
    pin: true,
  },
});

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".navigator_container",
    start: "center center",
    end: "100% 20%",
    pin: true,
  },
});

const tl_ship = gsap.timeline({
  scrollTrigger: {
    trigger: ".navigator_container",
    start: "center center",
    end: "100% 20%",
    scrub: 3,
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
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_1 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-1",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_2 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-2",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_3 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-3",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_4 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-4",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_5 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-5",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_6 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-6",
    start: "center center",
    end: "100% 0%",
    scrub: 3,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_text = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-text",
    start: "center center",
    end: "100% 0%",
    scrub: 2,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_7 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-7",
    start: "center center",
    end: "100% 0%",
    scrub: 4,
    toggleActions: "play reverse play reverse",
  },
});

tl_parallax_8 = gsap.timeline({
  scrollTrigger: {
    trigger: "#parallax-8",
    start: "center center",
    end: "100% 0%",
    scrub: 4,
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
