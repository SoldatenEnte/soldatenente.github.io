(() => {
  const attackBtn = document.getElementById("attack-btn");
  const actionButtons = document.getElementById("action-buttons");
  const restartBtn = document.getElementById("restart-btn");
  const enemySelectionOverlay = document.getElementById(
    "enemy-selection-overlay"
  );
  const enemySelectionGrid = document.getElementById("enemy-selection-grid");
  const chargeOverlay = document.getElementById("charge-overlay");
  const chargeBar = document.getElementById("charge-meter-bar");
  const chargeIndicator = document.getElementById("charge-meter-indicator");
  const chargeMeterContainer = document.getElementById(
    "charge-meter-container"
  );
  const chargeMeterDamageValue = document.getElementById(
    "charge-meter-damage-value"
  );
  const furyOverlay = document.getElementById("fury-overlay");
  const enemyHpBar = document.getElementById("enemy-hp-bar");
  const enemyHpFlash = document.getElementById("enemy-hp-flash");
  const enemyHpText = document.getElementById("enemy-hp-text");
  const playerHpBar = document.getElementById("player-hp-bar");
  const playerHpFlash = document.getElementById("player-hp-flash");
  const playerHpText = document.getElementById("player-hp-text");
  const messageDisplay = document.getElementById("game-message");
  const liveMultiplierDisplay = document.getElementById("live-multiplier");
  const enemySprite = document.getElementById("enemy-sprite");
  const combatContentWrapper = document.getElementById(
    "combat-content-wrapper"
  );
  const startGameOverlay = document.getElementById("start-game-overlay");
  const startGameBtn = document.getElementById("start-game-btn");
  const fullscreenPromptOverlay = document.getElementById(
    "fullscreen-prompt-overlay"
  );
  const fullscreenYesBtn = document.getElementById("fullscreen-yes-btn");
  const fullscreenNoBtn = document.getElementById("fullscreen-no-btn");

  const enemies = [
    { name: "Slime", sprite: "🟢", maxHP: 50, minDamage: 3, maxDamage: 8 },
    { name: "Goblin", sprite: "👹", maxHP: 100, minDamage: 5, maxDamage: 10 },
    { name: "Orc", sprite: "😈", maxHP: 150, minDamage: 12, maxDamage: 20 },
    {
      name: "Armored Knight",
      sprite: "🤖",
      maxHP: 200,
      minDamage: 15,
      maxDamage: 25,
    },
  ];

  let currentEnemy;
  let gameState = "START_SCREEN";
  const maxPlayerHP = 100;
  let enemyHP, playerHP;
  let chargeAnimation, furySpawnInterval;
  let chargeValue = 0,
    chargeDirection = 1;
  let activeCircles = [];
  let furyMissHandler = null;

  const openFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(console.error);
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  };

  const getMultiplierColor = (multiplier) => {
    const t = Math.max(0, Math.min(1, (multiplier - 1.0) / (3.5 - 1.0)));
    return `hsl(0, ${t * 100}%, ${100 - t * 65}%)`;
  };

  const shakeScreen = () => {
    combatContentWrapper.classList.add("shake");
    combatContentWrapper.addEventListener(
      "animationend",
      () => combatContentWrapper.classList.remove("shake"),
      { once: true }
    );
  };

  const updateUI = (isDamage = false, target = null) => {
    if (!currentEnemy) return;
    const newEnemyWidth = (enemyHP / currentEnemy.maxHP) * 100;
    const newPlayerWidth = (playerHP / maxPlayerHP) * 100;

    if (isDamage && target === "enemy") {
      enemyHpFlash.style.width = enemyHpBar.style.width;
      setTimeout(() => (enemyHpFlash.style.width = `${newEnemyWidth}%`), 50);
    }
    if (isDamage && target === "player") {
      playerHpFlash.style.width = playerHpBar.style.width;
      setTimeout(() => (playerHpFlash.style.width = `${newPlayerWidth}%`), 50);
    }

    enemyHpBar.style.width = `${newEnemyWidth}%`;
    enemyHpText.textContent = `${Math.ceil(enemyHP)} / ${currentEnemy.maxHP}`;
    playerHpBar.style.width = `${newPlayerWidth}%`;
    playerHpText.textContent = `${Math.ceil(playerHP)} / ${maxPlayerHP}`;
  };

  const showChargeMinigame = () => {
    gameState = "MINIGAME_CHARGE_PENDING";
    chargeMeterDamageValue.style.opacity = "0";
    chargeMeterContainer.classList.remove("glow");
    chargeOverlay.classList.remove("hidden");
    attackBtn.disabled = true;
    messageDisplay.textContent = "";
    chargeValue = 0;
    chargeBar.style.height = "0%";
    chargeIndicator.style.bottom = "0%";
    chargeBar.style.backgroundColor = "rgb(76, 175, 80)";
    chargeOverlay.addEventListener("pointerdown", startChargeLoop, {
      once: true,
    });
  };

  const startChargeLoop = () => {
    gameState = "MINIGAME_CHARGE_ACTIVE";
    chargeDirection = 1;
    chargeOverlay.addEventListener("pointerup", endChargeMinigame, {
      once: true,
    });
    const chargeLoop = () => {
      const currentSpeed = 0.01 + Math.pow(chargeValue, 4) * 0.06;
      chargeValue += currentSpeed * chargeDirection;
      chargeValue = Math.max(0, Math.min(1, chargeValue));
      chargeDirection =
        chargeValue >= 1 ? -1 : chargeValue <= 0 ? 1 : chargeDirection;
      chargeMeterContainer.classList.toggle("glow", chargeValue >= 1);

      const ratio =
        chargeValue < 0.5 ? chargeValue / 0.5 : (chargeValue - 0.5) / 0.5;
      const r =
        chargeValue < 0.5
          ? Math.round(76 + 179 * ratio)
          : Math.round(255 - 16 * ratio);
      const g =
        chargeValue < 0.5
          ? Math.round(175 + 60 * ratio)
          : Math.round(235 - 152 * ratio);
      const b =
        chargeValue < 0.5
          ? Math.round(80 - 21 * ratio)
          : Math.round(59 + 21 * ratio);
      chargeBar.style.backgroundColor = `rgb(${r},${g},${b})`;
      chargeBar.style.height = `${chargeValue * 100}%`;
      chargeIndicator.style.bottom = `${chargeValue * 100}%`;

      if (gameState === "MINIGAME_CHARGE_ACTIVE")
        chargeAnimation = requestAnimationFrame(chargeLoop);
    };
    chargeAnimation = requestAnimationFrame(chargeLoop);
  };

  const endChargeMinigame = () => {
    if (gameState !== "MINIGAME_CHARGE_ACTIVE") return;
    gameState = "PROCESSING_CHARGE";
    cancelAnimationFrame(chargeAnimation);
    const effectiveCharge = Math.pow(chargeValue, 2.5);
    let baseDamage = Math.round(1 + 9 * effectiveCharge);
    baseDamage = Math.max(1, Math.min(10, baseDamage));
    const isCrit = chargeValue >= 0.98;
    if (isCrit) shakeScreen();

    chargeMeterDamageValue.textContent = isCrit
      ? `${baseDamage} 🔥`
      : baseDamage;
    chargeMeterDamageValue.style.opacity = "1";

    setTimeout(() => {
      chargeOverlay.classList.add("hidden");
      startFuryMinigame(baseDamage);
    }, 800);
  };

  const startFuryMinigame = (baseDamage) => {
    if (furySpawnInterval) clearTimeout(furySpawnInterval);
    gameState = "MINIGAME_FURY";
    furyOverlay.classList.remove("hidden");
    let multiplier = 1.0;
    let spawnRate = 280;
    let zIndexCounter = 100;
    activeCircles = [];
    liveMultiplierDisplay.classList.remove("pulse");
    liveMultiplierDisplay.textContent = `x1.00`;
    liveMultiplierDisplay.style.color = getMultiplierColor(1.0);
    liveMultiplierDisplay.style.fontSize = "4rem";

    const enemyRect = enemySprite.getBoundingClientRect();
    const gameContainerRect = furyOverlay.parentElement.getBoundingClientRect();

    const spawnCircle = () => {
      if (gameState !== "MINIGAME_FURY") return;
      const circleContainer = document.createElement("div");
      circleContainer.className = "fury-circle";

      const centerX =
        enemyRect.left - gameContainerRect.left + enemyRect.width / 2;
      const centerY =
        enemyRect.top - gameContainerRect.top + enemyRect.height / 2;
      const maxRadius = Math.min(enemyRect.width, enemyRect.height) * 0.8;
      const circleHitboxSize = 140;

      const getSpawnPoint = () => ({
        x:
          centerX +
          maxRadius *
            Math.sqrt(Math.random()) *
            Math.cos(Math.random() * 2 * Math.PI),
        y:
          centerY +
          maxRadius *
            Math.sqrt(Math.random()) *
            Math.sin(Math.random() * 2 * Math.PI),
      });

      let bestCandidate = activeCircles.length === 0 ? getSpawnPoint() : null;
      if (!bestCandidate) {
        let bestMinDistance = -1;
        for (let i = 0; i < 15; i++) {
          const candidate = getSpawnPoint();
          let minDistance = Infinity;
          activeCircles.forEach((c) => {
            const dx = candidate.x - c.x;
            const dy = candidate.y - c.y;
            minDistance = Math.min(minDistance, Math.sqrt(dx * dx + dy * dy));
          });
          if (minDistance > bestMinDistance) {
            bestMinDistance = minDistance;
            bestCandidate = candidate;
          }
        }
      }

      circleContainer.innerHTML = `<div class="fury-circle-visual"></div>`;
      circleContainer.style.left = `${
        bestCandidate.x - circleHitboxSize / 2
      }px`;
      circleContainer.style.top = `${bestCandidate.y - circleHitboxSize / 2}px`;
      circleContainer.style.zIndex = zIndexCounter--;
      circleContainer.firstChild.style.animationDuration = `2s`;

      const lifespanTimeoutId = setTimeout(() => {
        if (gameState === "MINIGAME_FURY") {
          endFuryMinigame(baseDamage, multiplier, true);
        }
      }, 2000);

      const circleObject = {
        element: circleContainer,
        x: bestCandidate.x,
        y: bestCandidate.y,
        lifespanTimeoutId,
      };
      activeCircles.push(circleObject);

      circleContainer.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        if (
          gameState !== "MINIGAME_FURY" ||
          circleContainer.classList.contains("disappearing")
        )
          return;

        clearTimeout(circleObject.lifespanTimeoutId);

        multiplier += 0.1;
        liveMultiplierDisplay.textContent = `x${multiplier.toFixed(2)}`;
        liveMultiplierDisplay.style.color = getMultiplierColor(multiplier);
        liveMultiplierDisplay.style.fontSize = `${
          4 + (multiplier - 1) * 1.5
        }rem`;
        liveMultiplierDisplay.classList.remove("pulse");
        void liveMultiplierDisplay.offsetWidth;
        liveMultiplierDisplay.classList.add("pulse");

        circleContainer.classList.add("disappearing");
        setTimeout(() => circleContainer.remove(), 100);

        activeCircles = activeCircles.filter((c) => c !== circleObject);
      });

      furyOverlay.appendChild(circleContainer);
    };

    const furyLoop = () => {
      if (gameState !== "MINIGAME_FURY") return;
      spawnCircle();
      spawnRate = Math.max(100, spawnRate * 0.88);
      furySpawnInterval = setTimeout(furyLoop, spawnRate);
    };
    furyLoop();

    furyMissHandler = (e) => {
      if (e.target === furyOverlay && gameState === "MINIGAME_FURY") {
        endFuryMinigame(baseDamage, multiplier, true);
      }
    };
    furyOverlay.addEventListener("pointerdown", furyMissHandler);
  };

  const endFuryMinigame = (baseDamage, currentMultiplier, missed = false) => {
    if (gameState !== "MINIGAME_FURY") return;
    gameState = "PROCESSING_ATTACK";

    if (furyMissHandler)
      furyOverlay.removeEventListener("pointerdown", furyMissHandler);
    clearTimeout(furySpawnInterval);

    activeCircles.forEach((c) => {
      clearTimeout(c.lifespanTimeoutId);
      c.element.classList.add("disappearing");
      setTimeout(() => c.element.remove(), 100);
    });
    activeCircles = [];

    if (missed) {
      const missText = document.createElement("div");
      missText.className = "miss-feedback";
      missText.textContent = "Missed!";
      missText.style.left = `50%`;
      missText.style.top = `50%`;
      furyOverlay.appendChild(missText);
      setTimeout(() => missText.remove(), 450);
    }

    setTimeout(() => {
      furyOverlay.classList.add("hidden");
      const finalDamage = Math.round(baseDamage * currentMultiplier);
      showFinalDamageAnimation(baseDamage, currentMultiplier, finalDamage);
    }, 300);
  };

  const showFinalDamageAnimation = (baseDamage, multiplier, finalDamage) => {
    const animContainer = document.createElement("div");
    animContainer.className = "damage-flow-container";
    animContainer.innerHTML = `
      <span class="damage-flow-part base">${baseDamage}</span>
      <span class="damage-flow-part mult" style="color: ${getMultiplierColor(
        multiplier
      )};">x${multiplier.toFixed(2)}</span>
      <span class="damage-flow-part final">${
        finalDamage >= 25 ? `${finalDamage} 🔥` : finalDamage
      }</span>
    `;
    combatContentWrapper.appendChild(animContainer);

    // Reverted to previous timing with adjusted 'is-combining' CSS
    setTimeout(() => animContainer.classList.add("is-merging"), 100); // Numbers appear and move to center
    setTimeout(() => animContainer.classList.add("is-combining"), 800); // Numbers start shrinking/fading, final number appears
    setTimeout(() => {
      animContainer.classList.add("is-throwing"); // Final number flies to enemy
      animContainer.addEventListener(
        "animationend",
        (e) => {
          if (e.animationName === "throw-to-enemy") {
            animContainer.remove();
            shakeScreen();
            applyDamageToEnemy(finalDamage);
          }
        },
        { once: true }
      );
    }, 1200); // Start throwing after the merge-fade finishes and final is visible
  };

  const applyDamageToEnemy = (damage) => {
    enemyHP = Math.max(0, enemyHP - damage);
    updateUI(true, "enemy");
    if (enemyHP <= 0) endGame(true);
    else setTimeout(enemyTurn, 500);
  };

  const enemyTurn = () => {
    gameState = "ENEMY_TURN";
    messageDisplay.textContent = `${currentEnemy.name} is attacking!`;
    const damageRange = currentEnemy.maxDamage - currentEnemy.minDamage;
    const enemyDamage = Math.floor(
      Math.random() * damageRange + currentEnemy.minDamage
    );

    setTimeout(() => {
      shakeScreen();
      playerHP = Math.max(0, playerHP - enemyDamage);
      updateUI(true, "player");
      if (playerHP <= 0) endGame(false);
      else {
        gameState = "PLAYER_TURN";
        messageDisplay.textContent = "Your turn!";
        attackBtn.disabled = false;
      }
    }, 1000);
  };

  const endGame = (isVictory) => {
    gameState = "GAME_OVER";
    messageDisplay.textContent = isVictory ? "Victory!" : "Defeat!";
    actionButtons.classList.add("hidden");
    restartBtn.classList.remove("hidden");
  };

  const initializeCombat = (enemy) => {
    currentEnemy = enemy;
    enemyHP = currentEnemy.maxHP;
    playerHP = maxPlayerHP;
    gameState = "PLAYER_TURN";
    messageDisplay.textContent = `A wild ${currentEnemy.name} appears!`;
    enemySprite.textContent = currentEnemy.sprite;
    playerHpFlash.style.width = "100%";
    enemyHpFlash.style.width = "100%";
    actionButtons.classList.remove("hidden");
    attackBtn.disabled = false;
    restartBtn.classList.add("hidden");
    enemySelectionOverlay.classList.add("hidden");
    updateUI();
    setTimeout(() => {
      if (gameState === "PLAYER_TURN") {
        messageDisplay.textContent = "Your turn!";
      }
    }, 2000);
  };

  const showEnemySelection = () => {
    gameState = "SELECTING_ENEMY";
    enemySelectionGrid.innerHTML = "";
    enemies.forEach((enemy) => {
      const card = document.createElement("div");
      card.className = "enemy-card";
      card.innerHTML = `
        <div class="enemy-card-sprite">${enemy.sprite}</div>
        <div class="enemy-card-name">${enemy.name}</div>
        <div class="enemy-card-hp">HP: ${enemy.maxHP}</div>
      `;
      card.addEventListener("click", () => initializeCombat(enemy));
      enemySelectionGrid.appendChild(card);
    });
    actionButtons.classList.add("hidden");
    restartBtn.classList.add("hidden");
    enemySelectionOverlay.classList.remove("hidden");
  };

  const promptForFullscreen = () => {
    fullscreenPromptOverlay.classList.remove("hidden");
    fullscreenYesBtn.onclick = () => {
      openFullscreen();
      fullscreenPromptOverlay.classList.add("hidden");
      showEnemySelection();
    };
    fullscreenNoBtn.onclick = () => {
      fullscreenPromptOverlay.classList.add("hidden");
      showEnemySelection();
    };
  };

  const beginGame = () => {
    startGameOverlay.classList.add("hidden");
    promptForFullscreen();
  };

  startGameBtn.addEventListener("click", beginGame);
  attackBtn.addEventListener("click", () => {
    if (gameState === "PLAYER_TURN") showChargeMinigame();
  });
  restartBtn.addEventListener("click", showEnemySelection);
})();
