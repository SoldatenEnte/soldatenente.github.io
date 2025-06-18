(() => {
  const CONFIG = {
    PLAYER_MAX_HP: 100,
    CHARGE_MINIGAME_END_DELAY: 800,
    FURY_MINIGAME_END_DELAY: 400,
    FURY_SPAWN_RATE_START: 320,
    FURY_SPAWN_RATE_MULTIPLIER: 0.9,
    FURY_SPAWN_RATE_MIN: 100,
    FURY_LIFESPAN_START: 2200,
    FURY_LIFESPAN_MULTIPLIER: 0.96,
    FURY_LIFESPAN_MIN: 1000,
    DAMAGE_ANIM_MERGE_DELAY: 100,
    DAMAGE_ANIM_COMBINE_DELAY: 800,
    DAMAGE_ANIM_THROW_DELAY: 1200,
    DAMAGE_ANIM_THROW_DURATION: 500,
    ENEMY_TURN_DELAY: 500,
    ENEMY_ATTACK_ANIMATION_DURATION: 1000,
    INITIAL_MESSAGE_DURATION: 2000,
    ENEMIES: [
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
    ],
  };

  const a = (id) => document.getElementById(id);
  const UI = {
    attackBtn: a("attack-btn"),
    actionButtons: a("action-buttons"),
    restartBtn: a("restart-btn"),
    enemySelectionOverlay: a("enemy-selection-overlay"),
    enemySelectionGrid: a("enemy-selection-grid"),
    chargeOverlay: a("charge-overlay"),
    chargeBar: a("charge-meter-bar"),
    chargeIndicator: a("charge-meter-indicator"),
    chargeMeterContainer: a("charge-meter-container"),
    chargeMeterDamageValue: a("charge-meter-damage-value"),
    furyOverlay: a("fury-overlay"),
    furyInstructions: a("fury-instructions"),
    enemyHpBar: a("enemy-hp-bar"),
    enemyHpFlash: a("enemy-hp-flash"),
    enemyHpText: a("enemy-hp-text"),
    playerHpBar: a("player-hp-bar"),
    playerHpFlash: a("player-hp-flash"),
    playerHpText: a("player-hp-text"),
    messageDisplay: a("game-message"),
    liveMultiplierDisplay: a("live-multiplier"),
    enemySprite: a("enemy-sprite"),
    combatContentWrapper: a("combat-content-wrapper"),
    startGameOverlay: a("start-game-overlay"),
    startGameBtn: a("start-game-btn"),
    fullscreenPromptOverlay: a("fullscreen-prompt-overlay"),
    fullscreenYesBtn: a("fullscreen-yes-btn"),
    fullscreenNoBtn: a("fullscreen-no-btn"),
  };

  let gameState = "START_SCREEN";
  let currentEnemy;
  let enemyHP;
  let playerHP;
  let chargeAnimation;
  let lastChargeTime;
  let furySpawnInterval;
  let chargeValue = 0;
  let chargeDirection = 1;
  let activeCircles = [];
  let furyMissHandler = null;

  const updateHealthUI = (isDamage = false, target = null) => {
    if (!currentEnemy) return;
    const newEnemyWidth = (enemyHP / currentEnemy.maxHP) * 100;
    const newPlayerWidth = (playerHP / CONFIG.PLAYER_MAX_HP) * 100;

    if (isDamage) {
      const flashElement =
        target === "enemy" ? UI.enemyHpFlash : UI.playerHpFlash;
      const barElement = target === "enemy" ? UI.enemyHpBar : UI.playerHpBar;
      const newWidth = target === "enemy" ? newEnemyWidth : newPlayerWidth;
      flashElement.style.width = barElement.style.width;
      setTimeout(() => (flashElement.style.width = `${newWidth}%`), 50);
    }

    UI.enemyHpBar.style.width = `${newEnemyWidth}%`;
    UI.enemyHpText.textContent = `${Math.ceil(enemyHP)} / ${
      currentEnemy.maxHP
    }`;
    UI.playerHpBar.style.width = `${newPlayerWidth}%`;
    UI.playerHpText.textContent = `${Math.ceil(playerHP)} / ${
      CONFIG.PLAYER_MAX_HP
    }`;
  };

  const getMultiplierColor = (multiplier) => {
    const t = Math.max(0, Math.min(1, (multiplier - 1.0) / (3.5 - 1.0)));
    return `hsl(0, ${t * 100}%, ${100 - t * 65}%)`;
  };

  const shakeScreen = () => {
    UI.combatContentWrapper.classList.remove("shake");
    void UI.combatContentWrapper.offsetWidth;
    UI.combatContentWrapper.classList.add("shake");
  };

  const showFinalDamageAnimation = (baseDamage, multiplier, finalDamage) => {
    const animContainer = document.createElement("div");
    animContainer.className = "damage-flow-container";
    const finalDamageText =
      finalDamage >= 25 ? `${finalDamage} 🔥` : finalDamage;
    animContainer.innerHTML = `
      <span class="damage-flow-part base">${baseDamage}</span>
      <span class="damage-flow-part mult" style="color: ${getMultiplierColor(
        multiplier
      )};">x${multiplier.toFixed(2)}</span>
      <span class="damage-flow-part final">${finalDamageText}</span>
    `;
    UI.combatContentWrapper.appendChild(animContainer);

    setTimeout(
      () => animContainer.classList.add("is-merging"),
      CONFIG.DAMAGE_ANIM_MERGE_DELAY
    );
    setTimeout(
      () => animContainer.classList.add("is-combining"),
      CONFIG.DAMAGE_ANIM_COMBINE_DELAY
    );
    setTimeout(() => {
      animContainer.classList.add("is-throwing");
      setTimeout(() => {
        applyDamageToEnemy(finalDamage);
        animContainer.remove();
      }, CONFIG.DAMAGE_ANIM_THROW_DURATION);
    }, CONFIG.DAMAGE_ANIM_THROW_DELAY);
  };

  const showChargeMinigame = () => {
    gameState = "MINIGAME_CHARGE_PENDING";
    UI.chargeMeterDamageValue.style.opacity = "0";
    UI.chargeMeterContainer.classList.remove("glow");
    UI.chargeOverlay.classList.remove("hidden");
    UI.attackBtn.disabled = true;
    UI.messageDisplay.textContent = "";
    chargeValue = 0;
    chargeDirection = 1;
    UI.chargeBar.style.height = "0%";
    UI.chargeIndicator.style.bottom = "0%";
    UI.chargeBar.style.backgroundColor = "rgb(76, 175, 80)";
    UI.chargeOverlay.addEventListener("pointerdown", startChargeLoop, {
      once: true,
    });
  };

  const startChargeLoop = () => {
    gameState = "MINIGAME_CHARGE_ACTIVE";
    lastChargeTime = performance.now();
    UI.chargeOverlay.addEventListener("pointerup", endChargeMinigame, {
      once: true,
    });

    const chargeLoop = (currentTime) => {
      if (gameState !== "MINIGAME_CHARGE_ACTIVE") return;

      const deltaTime = currentTime - lastChargeTime;
      lastChargeTime = currentTime;

      const baseSpeedPerSecond = 0.6;
      const accelerationFactor = 3.6;
      const speed =
        baseSpeedPerSecond + Math.pow(chargeValue, 4) * accelerationFactor;

      chargeValue += speed * (deltaTime / 1000) * chargeDirection;
      chargeValue = Math.max(0, Math.min(1, chargeValue));
      chargeDirection =
        chargeValue >= 1 ? -1 : chargeValue <= 0 ? 1 : chargeDirection;
      UI.chargeMeterContainer.classList.toggle("glow", chargeValue >= 1);
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
      UI.chargeBar.style.backgroundColor = `rgb(${r},${g},${b})`;
      UI.chargeBar.style.height = `${chargeValue * 100}%`;
      UI.chargeIndicator.style.bottom = `${chargeValue * 100}%`;
      chargeAnimation = requestAnimationFrame(chargeLoop);
    };
    chargeAnimation = requestAnimationFrame(chargeLoop);
  };

  const endChargeMinigame = () => {
    if (gameState !== "MINIGAME_CHARGE_ACTIVE") return;
    gameState = "PROCESSING_CHARGE";
    cancelAnimationFrame(chargeAnimation);
    lastChargeTime = null;
    const effectiveCharge = Math.pow(chargeValue, 2.5);
    const baseDamage = Math.max(
      1,
      Math.min(10, Math.round(1 + 9 * effectiveCharge))
    );
    const isCrit = chargeValue >= 0.98;
    UI.chargeMeterDamageValue.textContent = isCrit
      ? `${baseDamage} 🔥`
      : baseDamage;
    UI.chargeMeterDamageValue.style.opacity = "1";
    setTimeout(() => {
      UI.chargeOverlay.classList.add("hidden");
      startFuryMinigame(baseDamage);
    }, CONFIG.CHARGE_MINIGAME_END_DELAY);
  };

  const startFuryMinigame = (baseDamage) => {
    gameState = "MINIGAME_FURY";
    UI.furyInstructions.classList.remove("hidden");
    UI.furyInstructions.style.opacity = "1";
    UI.furyOverlay.classList.remove("hidden");
    let multiplier = 1.0;
    let spawnRate = CONFIG.FURY_SPAWN_RATE_START;
    let lifespan = CONFIG.FURY_LIFESPAN_START;
    activeCircles = [];
    UI.liveMultiplierDisplay.textContent = `x1.00`;
    UI.liveMultiplierDisplay.style.color = getMultiplierColor(1.0);
    UI.liveMultiplierDisplay.style.fontSize = "4rem";

    const enemyRect = UI.enemySprite.getBoundingClientRect();
    const gameContainerRect =
      UI.furyOverlay.parentElement.getBoundingClientRect();

    const spawnCircle = () => {
      if (gameState !== "MINIGAME_FURY") return;
      const circleContainer = document.createElement("div");
      circleContainer.className = "fury-circle";

      const circleSize = Math.max(
        80,
        Math.min(enemyRect.width, enemyRect.height) * 0.6
      );
      circleContainer.style.width = `${circleSize}px`;
      circleContainer.style.height = `${circleSize}px`;

      const centerX =
        enemyRect.left - gameContainerRect.left + enemyRect.width / 2;
      const centerY =
        enemyRect.top - gameContainerRect.top + enemyRect.height / 2;
      const maxRadius = Math.min(enemyRect.width, enemyRect.height) * 0.75;
      let bestCandidate;
      if (activeCircles.length === 0) {
        bestCandidate = { x: centerX, y: centerY };
      } else {
        let bestMinDistance = -1;
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const radius = maxRadius * Math.sqrt(Math.random());
          const candidate = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          };
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
      const visual = circleContainer.querySelector(".fury-circle-visual");
      visual.style.borderWidth = `${Math.max(2, circleSize * 0.035)}px`;

      circleContainer.style.left = `${bestCandidate.x - circleSize / 2}px`;
      circleContainer.style.top = `${bestCandidate.y - circleSize / 2}px`;
      circleContainer.firstChild.style.animationDuration = `${
        lifespan / 1000
      }s`;

      const circleObject = {
        element: circleContainer,
        x: bestCandidate.x,
        y: bestCandidate.y,
      };
      circleObject.lifespanTimeoutId = setTimeout(() => {
        if (gameState === "MINIGAME_FURY")
          endFuryMinigame(baseDamage, multiplier, "timeout", circleObject);
      }, lifespan);
      activeCircles.push(circleObject);

      circleContainer.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        if (
          gameState !== "MINIGAME_FURY" ||
          circleContainer.classList.contains("disappearing")
        )
          return;
        if (UI.furyInstructions.style.opacity === "1") {
          UI.furyInstructions.style.opacity = "0";
          setTimeout(() => UI.furyInstructions.classList.add("hidden"), 400);
        }
        clearTimeout(circleObject.lifespanTimeoutId);
        multiplier += 0.1;
        UI.liveMultiplierDisplay.textContent = `x${multiplier.toFixed(2)}`;
        UI.liveMultiplierDisplay.style.color = getMultiplierColor(multiplier);
        UI.liveMultiplierDisplay.style.fontSize = `${
          4 + (multiplier - 1) * 1.5
        }rem`;
        UI.liveMultiplierDisplay.classList.remove("pulse");
        void UI.liveMultiplierDisplay.offsetWidth;
        UI.liveMultiplierDisplay.classList.add("pulse");
        circleContainer.classList.add("disappearing");
        setTimeout(() => circleContainer.remove(), 100);
        activeCircles = activeCircles.filter((c) => c !== circleObject);
      });
      UI.furyOverlay.appendChild(circleContainer);
    };

    const furyLoop = () => {
      if (gameState !== "MINIGAME_FURY") return;
      spawnCircle();
      spawnRate = Math.max(
        CONFIG.FURY_SPAWN_RATE_MIN,
        spawnRate * CONFIG.FURY_SPAWN_RATE_MULTIPLIER
      );
      lifespan = Math.max(
        CONFIG.FURY_LIFESPAN_MIN,
        lifespan * CONFIG.FURY_LIFESPAN_MULTIPLIER
      );
      furySpawnInterval = setTimeout(furyLoop, spawnRate);
    };
    furyLoop();

    furyMissHandler = (e) => {
      if (e.target === UI.furyOverlay && gameState === "MINIGAME_FURY") {
        endFuryMinigame(baseDamage, multiplier, "missclick", {
          x: e.clientX,
          y: e.clientY,
        });
      }
    };
    UI.furyOverlay.addEventListener("pointerdown", furyMissHandler);
  };

  const endFuryMinigame = (baseDamage, currentMultiplier, reason, details) => {
    if (gameState !== "MINIGAME_FURY") return;
    gameState = "PROCESSING_ATTACK";
    UI.furyInstructions.style.opacity = "0";
    setTimeout(() => UI.furyInstructions.classList.add("hidden"), 400);
    if (furyMissHandler)
      UI.furyOverlay.removeEventListener("pointerdown", furyMissHandler);
    clearTimeout(furySpawnInterval);

    activeCircles.forEach((c) => {
      clearTimeout(c.lifespanTimeoutId);
      if (reason === "timeout" && details && c.element === details.element) {
        c.element.classList.add("exploding");
        setTimeout(() => c.element.remove(), 300);
      } else {
        c.element.classList.add("disappearing");
        setTimeout(() => c.element.remove(), 100);
      }
    });
    activeCircles = [];

    if (reason) {
      const missText = document.createElement("div");
      missText.className = "miss-feedback";
      missText.textContent = reason === "timeout" ? "Too Slow!" : "Missed!";
      const overlayRect = UI.furyOverlay.getBoundingClientRect();
      missText.style.left = `${details.x - overlayRect.left}px`;
      missText.style.top = `${details.y - overlayRect.top}px`;
      UI.furyOverlay.appendChild(missText);
      setTimeout(() => missText.remove(), 600);
    }
    setTimeout(() => {
      UI.furyOverlay.classList.add("hidden");
      const finalDamage = Math.round(baseDamage * currentMultiplier);
      showFinalDamageAnimation(baseDamage, currentMultiplier, finalDamage);
    }, CONFIG.FURY_MINIGAME_END_DELAY);
  };

  const applyDamageToEnemy = (damage) => {
    enemyHP = Math.max(0, enemyHP - damage);
    shakeScreen();
    updateHealthUI(true, "enemy");
    if (enemyHP <= 0) {
      endGame(true);
    } else {
      setTimeout(enemyTurn, CONFIG.ENEMY_TURN_DELAY);
    }
  };

  const enemyTurn = () => {
    gameState = "ENEMY_TURN";
    UI.messageDisplay.textContent = `${currentEnemy.name} is attacking!`;
    const damageRange = currentEnemy.maxDamage - currentEnemy.minDamage;
    const enemyDamage = Math.floor(
      Math.random() * damageRange + currentEnemy.minDamage
    );

    setTimeout(() => {
      shakeScreen();
      playerHP = Math.max(0, playerHP - enemyDamage);
      updateHealthUI(true, "player");
      if (playerHP <= 0) {
        endGame(false);
      } else {
        gameState = "PLAYER_TURN";
        UI.messageDisplay.textContent = "Your turn!";
        UI.attackBtn.disabled = false;
      }
    }, CONFIG.ENEMY_ATTACK_ANIMATION_DURATION);
  };

  const endGame = (isVictory) => {
    gameState = "GAME_OVER";
    UI.attackBtn.disabled = true;
    UI.messageDisplay.textContent = isVictory ? "Victory!" : "Defeat!";
    UI.actionButtons.classList.add("hidden");
    UI.restartBtn.classList.remove("hidden");
  };

  const initializeCombat = (enemy) => {
    currentEnemy = enemy;
    enemyHP = currentEnemy.maxHP;
    playerHP = CONFIG.PLAYER_MAX_HP;
    gameState = "PLAYER_TURN";
    UI.messageDisplay.textContent = `A wild ${currentEnemy.name} appears!`;
    UI.enemySprite.textContent = currentEnemy.sprite;
    UI.playerHpFlash.style.width = "100%";
    UI.enemyHpFlash.style.width = "100%";
    UI.actionButtons.classList.remove("hidden");
    UI.attackBtn.disabled = false;
    UI.restartBtn.classList.add("hidden");
    UI.enemySelectionOverlay.classList.add("hidden");
    updateHealthUI();
    setTimeout(() => {
      if (gameState === "PLAYER_TURN")
        UI.messageDisplay.textContent = "Your turn!";
    }, CONFIG.INITIAL_MESSAGE_DURATION);
  };

  const showEnemySelection = () => {
    gameState = "SELECTING_ENEMY";
    UI.enemySelectionGrid.innerHTML = "";
    CONFIG.ENEMIES.forEach((enemy) => {
      const card = document.createElement("div");
      card.className = "enemy-card";
      card.innerHTML = `
        <div class="enemy-card-sprite">${enemy.sprite}</div>
        <div class="enemy-card-name">${enemy.name}</div>
        <div class="enemy-card-hp">HP: ${enemy.maxHP}</div>
      `;
      card.addEventListener("click", () => initializeCombat(enemy));
      UI.enemySelectionGrid.appendChild(card);
    });
    UI.actionButtons.classList.add("hidden");
    UI.restartBtn.classList.add("hidden");
    UI.enemySelectionOverlay.classList.remove("hidden");
  };

  const openFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(console.error);
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
  };

  const promptForFullscreen = () => {
    UI.fullscreenPromptOverlay.classList.remove("hidden");
    UI.fullscreenYesBtn.onclick = () => {
      openFullscreen();
      UI.fullscreenPromptOverlay.classList.add("hidden");
      showEnemySelection();
    };
    UI.fullscreenNoBtn.onclick = () => {
      UI.fullscreenPromptOverlay.classList.add("hidden");
      showEnemySelection();
    };
  };

  const beginGame = () => {
    UI.startGameOverlay.classList.add("hidden");
    promptForFullscreen();
  };

  const generateChargeMarkers = () => {
    const markerContainer = document.querySelector(".charge-meter-markers");
    for (let damage = 2; damage <= 10; damage++) {
      const chargeThreshold = Math.pow((damage - 1.5) / 9, 1 / 2.5);
      const marker = document.createElement("div");
      marker.className = "charge-meter-marker";
      marker.style.bottom = `${chargeThreshold * 100}%`;
      markerContainer.appendChild(marker);
    }
  };

  UI.startGameBtn.addEventListener("click", beginGame);
  UI.attackBtn.addEventListener("click", () => {
    if (gameState === "PLAYER_TURN") showChargeMinigame();
  });
  UI.restartBtn.addEventListener("click", showEnemySelection);

  generateChargeMarkers();
})();
