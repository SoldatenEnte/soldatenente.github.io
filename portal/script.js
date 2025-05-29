document.addEventListener("DOMContentLoaded", () => {
  const idlePortal = document.getElementById("idlePortal");
  const scannedPortal = document.getElementById("scannedPortal");
  const scanButton = document.getElementById("scanButton");
  const fullscreenPrompt = document.getElementById("fullscreenPrompt");
  const enableFullscreenBtn = document.getElementById("enableFullscreenBtn");

  idlePortal.play();

  function requestFullscreen() {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  }

  function hideFullscreenPrompt() {
    fullscreenPrompt.classList.add("hidden");
  }

  enableFullscreenBtn.addEventListener("click", () => {
    requestFullscreen();
    hideFullscreenPrompt();
  });

  if (
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen ||
    document.documentElement.msRequestFullscreen
  ) {
    fullscreenPrompt.classList.remove("hidden");
  } else {
    hideFullscreenPrompt();
    console.warn("Fullscreen API not supported on this browser.");
  }

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

  idlePortal.onerror = () => console.error("Error loading idlePortal video.");
  scannedPortal.onerror = () =>
    console.error("Error loading scannedPortal video.");
});
