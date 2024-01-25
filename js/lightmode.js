const modeToggle = document.getElementById("mode-toggle");
const logo = document.getElementById("logo");
const logo_2 = document.getElementById("logo_2");
const ship = document.getElementById("ship-icon");

const impressum = document.getElementById("impressumIcon");
const shipbutton = document.getElementById("ship-button");
const light = document.getElementById("light");

modeToggle.addEventListener("click", function () {
  const root = document.documentElement;

  if (root.classList.contains("light-mode")) {
    root.classList.remove("light-mode");
    if (logo) logo.src = "files/logo_light.svg";
    if (logo_2) logo_2.src = "files/logo_light.svg";
    if (ship) ship.src = "files/icons/ship_light.svg";
    if (impressum) impressum.src = "files/icons/impressum.svg";
    if (shipbutton) shipbutton.src = "files/icons/ship_button.svg";
    if (light) light.src = "files/icons/light.svg";
  } else {
    root.classList.add("light-mode");
    if (logo) logo.src = "files/logo_dark.svg";
    if (logo_2) logo_2.src = "files/logo_dark.svg";
    if (ship) ship.src = "files/icons/ship_dark.svg";
    if (impressum) impressum.src = "files/icons/impressum_dark.svg";
    if (shipbutton) shipbutton.src = "files/icons/ship_button_dark.svg";
    if (light) light.src = "files/icons/dark.svg";
  }
});
