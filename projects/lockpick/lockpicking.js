(() => {
  const CONFIG = {
    rings: [
      // needleLineHeight is for the ::before element's height.
      // highlight values are for the ::after element.
      // All % are relative to the main #needle element's height.
      {
        id: "outer",
        needleLineHeight: "100%",
        highlightTop: "0%",
        highlightHeight: "24%",
      },
      {
        id: "middle",
        needleLineHeight: "76%",
        highlightTop: "24%",
        highlightHeight: "24%",
      },
      {
        id: "inner",
        needleLineHeight: "52%",
        highlightTop: "48%",
        highlightHeight: "24%",
      },
    ],
    difficultySettings: {
      speed: { min: 60, max: 250 },
      targetSize: { min: 15, max: 45 },
    },
    successPause: 300,
    failurePause: 1000,
    unlockAnimationDuration: 1200,
  };

  const getEl = (id) => document.getElementById(id);
  const UI = {
    gameContainer: getEl("game-container"),
    lockWrapper: getEl("lock-wrapper"),
    needleContainer: getEl("needle-container"),
    needleEl: getEl("needle"),
    message: getEl("message-display"),
    startScreen: getEl("start-screen"),
    winScreen: getEl("win-screen"),
    failScreen: getEl("fail-screen"),
    startBtn: getEl("start-btn"),
    playAgainWinBtn: getEl("play-again-btn-win"),
    playAgainFailBtn: getEl("play-again-btn-fail"),
    fullscreenPromptOverlay: getEl("fullscreen-prompt-overlay"),
    fullscreenYesBtn: getEl("fullscreen-yes-btn"),
    fullscreenNoBtn: getEl("fullscreen-no-btn"),
    difficultySlider: getEl("difficulty-slider"),
    difficultyValue: getEl("difficulty-value"),
  };

  let gameState = "IDLE";
  let currentRingIndex = 0;
  let needleAngle = 0;
  let lastTimestamp = 0;
  let animationFrameId;
  const ringData = [];

  function lerp(min, max, value) {
    return min * (1 - value) + max * value;
  }

  function updateNeedleForRing(index) {
    const ringConfig = CONFIG.rings[index];
    if (ringConfig) {
      // Use CSS variables to control the ::before and ::after pseudo-elements
      UI.needleEl.style.setProperty(
        "--needle-line-height",
        ringConfig.needleLineHeight
      );
      UI.needleEl.style.setProperty(
        "--needle-highlight-top",
        ringConfig.highlightTop
      );
      UI.needleEl.style.setProperty(
        "--needle-highlight-height",
        ringConfig.highlightHeight
      );
    }
  }

  function generateLevel() {
    ringData.length = 0;
    const difficulty = parseFloat(UI.difficultySlider.value);
    const baseSpeed = lerp(
      CONFIG.difficultySettings.speed.min,
      CONFIG.difficultySettings.speed.max,
      difficulty
    );
    const baseTargetSize = lerp(
      CONFIG.difficultySettings.targetSize.max,
      CONFIG.difficultySettings.targetSize.min,
      difficulty
    );

    CONFIG.rings.forEach((ringConfig, i) => {
      const targetStartAngle = Math.random() * 360;
      const speedMultiplier = 1 + i * (0.2 + difficulty * 0.4);
      const targetSizeMultiplier = 1 - i * (0.1 + difficulty * 0.2);

      const calculatedSize = baseTargetSize * targetSizeMultiplier;
      const finalTargetSize = Math.max(
        CONFIG.difficultySettings.targetSize.min / 2,
        calculatedSize
      );

      ringData.push({
        ...ringConfig,
        speed: baseSpeed * speedMultiplier,
        targetSize: finalTargetSize,
        targetStartAngle: targetStartAngle,
        targetEndAngle: targetStartAngle + finalTargetSize,
        element: getEl(`ring-${ringConfig.id}`),
        targetElement: getEl(`target-${ringConfig.id}`),
      });
    });
  }

  function renderLockState() {
    UI.lockWrapper.classList.remove("unlocked");
    ringData.forEach((ring, index) => {
      ring.element.classList.remove("success");
      ring.targetElement.classList.remove("active");

      const { targetStartAngle, targetEndAngle } = ring;
      let backgroundValue;

      // *** BUG FIX STARTS HERE ***
      // Check if the target zone wraps around the 360-degree mark
      if (targetEndAngle > 360) {
        const wrappedAngle = targetEndAngle % 360;
        // Create a gradient with two green sections
        backgroundValue = `conic-gradient(
          var(--accent-green) 0deg, 
          var(--accent-green) ${wrappedAngle}deg,
          transparent ${wrappedAngle}deg,
          transparent ${targetStartAngle}deg,
          var(--accent-green) ${targetStartAngle}deg,
          var(--accent-green) 360deg
        )`;
      } else {
        // Normal, non-wrapped case
        backgroundValue = `conic-gradient(
          transparent ${targetStartAngle}deg,
          var(--accent-green) ${targetStartAngle}deg,
          var(--accent-green) ${targetEndAngle}deg,
          transparent ${targetEndAngle}deg
        )`;
      }
      ring.targetElement.style.background = backgroundValue;
      // *** BUG FIX ENDS HERE ***

      if (index === currentRingIndex && gameState === "PLAYING") {
        ring.targetElement.classList.add("active");
      }
    });
  }

  function gameLoop(timestamp) {
    if (gameState !== "PLAYING") return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const currentSpeed = ringData[currentRingIndex].speed;
    needleAngle = (needleAngle + currentSpeed * deltaTime) % 360;
    UI.needleContainer.style.transform = `translate(-50%, -50%) rotate(${needleAngle}deg)`;

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    gameState = "PLAYING";
    currentRingIndex = 0;
    needleAngle = Math.random() * 360;
    lastTimestamp = 0;

    UI.needleContainer.style.transform = `translate(-50%, -50%) rotate(${needleAngle}deg)`;

    UI.startScreen.classList.add("hidden");
    UI.winScreen.classList.add("hidden");
    UI.failScreen.classList.add("hidden");
    UI.message.style.opacity = 1;
    UI.message.textContent = `Ring ${currentRingIndex + 1} of ${
      CONFIG.rings.length
    }`;

    generateLevel();
    renderLockState();
    updateNeedleForRing(currentRingIndex);
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function handlePlayerInput() {
    if (gameState !== "PLAYING") return;

    const ring = ringData[currentRingIndex];
    let { targetStartAngle, targetEndAngle } = ring;

    const isSuccess =
      targetEndAngle > 360
        ? needleAngle >= targetStartAngle || needleAngle <= targetEndAngle % 360
        : needleAngle >= targetStartAngle && needleAngle <= targetEndAngle;

    if (isSuccess) {
      handleSuccess();
    } else {
      handleFailure();
    }
  }

  function handleSuccess() {
    cancelAnimationFrame(animationFrameId);
    gameState = "SUCCESS";

    const ring = ringData[currentRingIndex];
    ring.element.classList.add("success");
    ring.targetElement.classList.remove("active");

    if (currentRingIndex < CONFIG.rings.length - 1) {
      currentRingIndex++;
      setTimeout(() => {
        gameState = "PLAYING";
        lastTimestamp = 0;
        UI.message.textContent = `Ring ${currentRingIndex + 1} of ${
          CONFIG.rings.length
        }`;
        renderLockState();
        updateNeedleForRing(currentRingIndex);
        animationFrameId = requestAnimationFrame(gameLoop);
      }, CONFIG.successPause);
    } else {
      UI.message.textContent = "Unlocked!";
      UI.lockWrapper.classList.add("unlocked");
      // Retract the needle on win
      UI.needleEl.style.setProperty("--needle-line-height", "0%");
      UI.needleEl.style.setProperty("--needle-highlight-height", "0%");
      setTimeout(() => {
        UI.winScreen.classList.remove("hidden");
      }, CONFIG.unlockAnimationDuration);
    }
  }

  function handleFailure() {
    cancelAnimationFrame(animationFrameId);
    gameState = "FAIL";

    UI.lockWrapper.classList.add("shake");
    ringData.forEach((r) => r.targetElement.classList.remove("active"));
    UI.message.textContent = "Pick Broken!";
    // Retract the needle on fail
    UI.needleEl.style.setProperty("--needle-line-height", "0%");
    UI.needleEl.style.setProperty("--needle-highlight-height", "0%");

    setTimeout(() => {
      UI.failScreen.classList.remove("hidden");
      UI.lockWrapper.classList.remove("shake");
    }, CONFIG.failurePause);
  }

  function openFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(console.error);
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
  }

  function showStartScreen() {
    UI.fullscreenPromptOverlay.classList.add("hidden");
    UI.winScreen.classList.add("hidden");
    UI.failScreen.classList.add("hidden");
    UI.startScreen.classList.remove("hidden");
    // Ensure needle is hidden on the start screen
    UI.needleEl.style.setProperty("--needle-line-height", "0%");
    UI.needleEl.style.setProperty("--needle-highlight-height", "0%");
  }

  function updateDifficultyDisplay() {
    const value = parseFloat(UI.difficultySlider.value);
    if (value < 0.2) UI.difficultyValue.textContent = "Trivial";
    else if (value < 0.4) UI.difficultyValue.textContent = "Easy";
    else if (value < 0.6) UI.difficultyValue.textContent = "Normal";
    else if (value < 0.8) UI.difficultyValue.textContent = "Hard";
    else UI.difficultyValue.textContent = "Master";
  }

  UI.fullscreenYesBtn.addEventListener("click", () => {
    openFullscreen();
    showStartScreen();
  });
  UI.fullscreenNoBtn.addEventListener("click", showStartScreen);
  UI.startBtn.addEventListener("click", startGame);
  UI.playAgainWinBtn.addEventListener("click", showStartScreen);
  UI.playAgainFailBtn.addEventListener("click", startGame);
  UI.difficultySlider.addEventListener("input", updateDifficultyDisplay);

  UI.gameContainer.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".overlay-box")) return;
    handlePlayerInput();
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (gameState === "PLAYING") {
        handlePlayerInput();
      } else if (!UI.startScreen.classList.contains("hidden")) {
        UI.startBtn.click();
      } else if (!UI.winScreen.classList.contains("hidden")) {
        UI.playAgainWinBtn.click();
      } else if (!UI.failScreen.classList.contains("hidden")) {
        UI.playAgainFailBtn.click();
      }
    }
  });

  updateDifficultyDisplay();
  showStartScreen(); // Show start screen initially and hide needle
})();
