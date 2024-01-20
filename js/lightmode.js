const modeToggle = document.getElementById("mode-toggle");
const logo = document.getElementById("logo");
const ship = document.getElementById("ship-icon");

modeToggle.addEventListener("click", function () {
  const root = document.documentElement;

  if (root.classList.contains("light-mode")) {
    root.classList.remove("light-mode");
    logo.src = "files/logo_light.svg";
    ship.src = "files/icons/ship_light.svg";
  } else {
    root.classList.add("light-mode");
    logo.src = "files/logo_dark.svg";
    ship.src = "files/icons/ship_dark.svg";
  }
});
