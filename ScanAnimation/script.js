document.addEventListener("DOMContentLoaded", () => {
  const idlePortal = document.getElementById("idlePortal");
  const scannedPortal = document.getElementById("scannedPortal");
  const scanButton = document.getElementById("scanButton");

  idlePortal.play();

  scanButton.addEventListener("click", () => {
    if (scannedPortal.classList.contains("playing")) {
      return;
    }

    scannedPortal.currentTime = 0;
    scannedPortal.style.opacity = 1;
    scannedPortal.classList.add("playing");

    scannedPortal.play();

    scannedPortal.onended = () => {
      scannedPortal.style.opacity = 0;
      scannedPortal.classList.remove("playing");
      idlePortal.play();
    };
  });

  idlePortal.onerror = () => console.error("Error loading idlePortal video.");
  scannedPortal.onerror = () =>
    console.error("Error loading scannedPortal video.");
});
