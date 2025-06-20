(() => {
  const CONFIG = {
    rings: [
      { id: "outer", needleTop: "0%", needleHeight: "12%" },
      { id: "middle", needleTop: "12%", needleHeight: "12%" },
      { id: "inner", needleTop: "24%", needleHeight: "12%" },
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
      UI.needleEl.style.top = ringConfig.needleTop;
      UI.needleEl.style.height = ringConfig.needleHeight;
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

      ringData.push({
        ...ringConfig,
        speed: baseSpeed * speedMultiplier,
        targetSize: Math.max(
          CONFIG.difficultySettings.targetSize.min / 2,
          baseTargetSize * targetSizeMultiplier
        ),
        targetStartAngle: targetStartAngle,
        targetEndAngle:
          targetStartAngle + baseTargetSize * targetSizeMultiplier,
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
      ring.targetElement.style.background = `conic-gradient(
        transparent ${targetStartAngle}deg,
        var(--accent-green) ${targetStartAngle}deg,
        var(--accent-green) ${targetEndAngle}deg,
        transparent ${targetEndAngle}deg
      )`;

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
})();
