document.addEventListener("DOMContentLoaded", () => {
  const idlePortal = document.getElementById("idlePortal");
  const scannedPortal = document.getElementById("scannedPortal");
  const scanButton = document.getElementById("scanButton");

  const splashScreen = document.getElementById("splashScreen");
  const startButton = document.getElementById("startButton");

  const fullscreenPrompt = document.getElementById("fullscreenPrompt");
  const enableFullscreenBtn = document.getElementById("enableFullscreenBtn");

  function hideModal(modalElement) {
    modalElement.classList.add("hidden");
  }

  function showModal(modalElement) {
    modalElement.classList.remove("hidden");
  }

  function requestFullscreen() {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  }

  startButton.addEventListener("click", () => {
    hideModal(splashScreen);

    idlePortal.play().catch((error) => {
      console.error("Idle video autoplay failed after user gesture:", error);
    });

    if (
      document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen ||
      document.documentElement.msRequestFullscreen
    ) {
      showModal(fullscreenPrompt);
    } else {
      console.warn("Fullscreen API not supported on this browser.");
      hideModal(fullscreenPrompt);
    }
  });

  enableFullscreenBtn.addEventListener("click", () => {
    requestFullscreen();
    hideModal(fullscreenPrompt);
  });

  document.addEventListener("fullscreenchange", exitHandler);
  document.addEventListener("webkitfullscreenchange", exitHandler);
  document.addEventListener("msfullscreenchange", exitHandler);

  function exitHandler() {
    if (
      !document.fullscreenElement &&
      !document.webkitIsFullScreen &&
      !document.msFullscreenElement
    ) {
      console.log("Exited fullscreen.");
    }
  }

  scanButton.addEventListener("click", () => {
    if (scannedPortal.classList.contains("playing")) {
      return;
    }

    scannedPortal.currentTime = 0;
    scannedPortal.style.opacity = 1;
    scannedPortal.classList.add("playing");

    scannedPortal.play().catch((error) => {
      console.error("Scanned video playback failed:", error);
    });

    scannedPortal.onended = () => {
      scannedPortal.style.opacity = 0;
      scannedPortal.classList.remove("playing");

      idlePortal
        .play()
        .catch((error) => console.error("Idle video resume failed:", error));
    };
  });

  idlePortal.onerror = () => console.error("Error loading idlePortal video.");
  scannedPortal.onerror = () =>
    console.error("Error loading scannedPortal video.");
});
