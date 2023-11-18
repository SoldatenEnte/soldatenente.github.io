const modeToggle = document.getElementById("mode-toggle");

modeToggle.addEventListener("click", function () {
  const root = document.documentElement;

  if (root.classList.contains("light-mode")) {
    root.classList.remove("light-mode");
  } else {
    root.classList.add("light-mode");
  }
});
