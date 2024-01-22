const modeToggle = document.getElementById("mode-toggle");
const logo = document.getElementById("logo");
const ship = document.getElementById("ship-icon");

const impressum = document.getElementById("impressumIcon");
const shipbutton = document.getElementById("ship-button");
const help = document.getElementById("help");
const light = document.getElementById("light");

modeToggle.addEventListener("click", function () {
  const root = document.documentElement;

  if (root.classList.contains("light-mode")) {
    root.classList.remove("light-mode");
    logo.src = "files/logo_light.svg";
    ship.src = "files/icons/ship_light.svg";
    impressum.src = "files/icons/impressum.svg";
    shipbutton.src = "files/icons/ship_button.svg";
    help.src = "files/icons/help_light.svg";
    light.src = "files/icons/light.svg";
  } else {
    root.classList.add("light-mode");
    logo.src = "files/logo_dark.svg";
    ship.src = "files/icons/ship_dark.svg";
    impressum.src = "files/icons/impressum_dark.svg";
    shipbutton.src = "files/icons/ship_button_dark.svg";
    help.src = "files/icons/help.svg";
    light.src = "files/icons/dark.svg";
  }
});
