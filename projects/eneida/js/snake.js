// js/snake.js - Simple Snake Game Logic

// --- Game Constants ---
const GRID_SIZE = 20; // Number of cells across/down
const BLOCK_SIZE = 18; // Pixel size of each grid cell
const INITIAL_SPEED_MS = 150; // Lower is faster
const SPEED_INCREMENT_FACTOR = 0.95; // Multiplier for speed increase
const MAX_SPEED_MS = 60; // Fastest allowed speed
const FOOD_COLOR_VAR = '--success-color';
const SNAKE_HEAD_COLOR_VAR = '--text-color'; // Head color
const SNAKE_BODY_COLOR_VAR = '--prompt-color'; // Body color
const GRID_COLOR_VAR = '--text-color'; // Grid line color
const GAME_OVER_COLOR_VAR = '--error-color';
const PAUSED_COLOR_VAR = '--warning-color';
const SCORE_COLOR_VAR = '--accent-color';
const DEFAULT_SNAKE_MODE = 'medium';

export const SNAKE_MODES = {
    easy: {
        name: 'Easy',
        type: 'score', // Always score for snake
        initialSpeed: 180, // Slower start
        speedIncrementFactor: 0.98, // Slower speed increase
        maxSpeed: 80, // Higher min speed (slower max speed)
    },
    medium: {
        name: 'Medium',
        type: 'score',
        initialSpeed: 140, // Original-ish start
        speedIncrementFactor: 0.95, // Original speed increase
        maxSpeed: 60, // Original max speed
    },
    hard: {
        name: 'Hard',
        type: 'score',
        initialSpeed: 100, // Faster start
        speedIncrementFactor: 0.92, // Faster speed increase
        maxSpeed: 45, // Lower min speed (faster max speed)
    }
};

// --- Game State ---
let canvas, ctx;
let snakeContext = null;
let snakeWindowElement = null;
let snake = [];
let dx = 1, dy = 0;
let food = { x: 0, y: 0 };
let score = 0;
let gameRunning = false;
let isPaused = false;
let isGameOver = false;
let gameLoopTimeoutId = null;
let currentSpeedMs = SNAKE_MODES[DEFAULT_SNAKE_MODE].initialSpeed; // Initialize with default
let currentSpeedIncrementFactor = SNAKE_MODES[DEFAULT_SNAKE_MODE].speedIncrementFactor; // Initialize
let currentMaxSpeed = SNAKE_MODES[DEFAULT_SNAKE_MODE].maxSpeed; // Initialize
let currentGameModeKey = DEFAULT_SNAKE_MODE; // <<< NEW: Track current mode
let changingDirection = false;
let pendingDirection = { dx: 1, dy: 0 };

// --- Helper Functions ---
function color(variableName, alpha = 1) {
    try {
        let col = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        if (!col) { // Fallbacks for safety
            const fallbacks = {
                '--text-color': '#00ffcc', '--accent-color': '#ff00ff',
                '--prompt-color': '#a0a0ff', '--error-color': '#ff3333',
                '--success-color': 'lightgreen', '--warning-color': 'orange',
                '--background-color': '#05080a'
            };
            col = fallbacks[variableName] || '#ffffff';
        }
        if (alpha < 1) {
            if (col.startsWith('#')) {
                let r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            if (col.startsWith('rgba')) { return col.replace(/,[^,]*\)$/, `, ${alpha})`); }
            if (col.startsWith('rgb')) { return col.replace('rgb', 'rgba').replace(')', `, ${alpha})`); }
        }
        return col;
    } catch (e) { return '#CCCCCC'; } // Ultimate fallback
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// --- Game Logic ---
function placeFood() {
    let foodX, foodY;
    do {
        foodX = getRandomInt(GRID_SIZE);
        foodY = getRandomInt(GRID_SIZE);
    } while (snake.some(segment => segment.x === foodX && segment.y === foodY)); // Ensure food not on snake
    food = { x: foodX, y: foodY };
}

function startGame() {
    console.log(`Starting Snake game (Mode: ${currentGameModeKey})...`);
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY },
    ];
    dx = 1; dy = 0;
    pendingDirection = { dx: 1, dy: 0 };
    score = 0;

    // --- Use Mode Settings ---
    const settings = SNAKE_MODES[currentGameModeKey] || SNAKE_MODES[DEFAULT_SNAKE_MODE];
    currentSpeedMs = settings.initialSpeed;
    currentSpeedIncrementFactor = settings.speedIncrementFactor;
    currentMaxSpeed = settings.maxSpeed;
    console.log(`[Snake startGame] Initial speed: ${currentSpeedMs}ms, Increment: ${currentSpeedIncrementFactor}, Max Speed: ${currentMaxSpeed}ms`);
    // --- END Use Mode Settings ---

    isGameOver = false;
    isPaused = false;
    changingDirection = false;
    placeFood();
    gameRunning = true;
    if (canvas) canvas.classList.remove('snake-paused-blur');
    if (gameLoopTimeoutId) clearTimeout(gameLoopTimeoutId); // Clear previous loop if restarting
    gameLoopTimeoutId = null; // Reset timeout ID
    gameLoop(); // Start game loop
}

function moveSnake() {
    if (!gameRunning || isPaused || isGameOver) return;

    // ... (apply pending direction - no changes) ...
     if (pendingDirection) {
        const isOpposite = (pendingDirection.dx === -dx && dx !== 0) || (pendingDirection.dy === -dy && dy !== 0);
        if (!isOpposite) {
            dx = pendingDirection.dx;
            dy = pendingDirection.dy;
        }
        pendingDirection = null;
    }
    changingDirection = false;


    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // ... (collision detection - no changes) ...
     if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) { gameOver(); return; }
     if (snake.some(segment => segment.x === head.x && segment.y === head.y)) { gameOver(); return; }


    snake.unshift(head);

    // --- Food Eating ---
    if (head.x === food.x && head.y === food.y) {
        score++;
        // --- Increase speed based on mode ---
        currentSpeedMs = Math.max(currentMaxSpeed, currentSpeedMs * currentSpeedIncrementFactor);
        // --- END Increase speed ---
        placeFood();
        console.log(`[Snake moveSnake] Food eaten! New score: ${score}, New speed: ${currentSpeedMs.toFixed(2)}ms`);
    } else {
        snake.pop();
    }
}

function gameOver() {
    console.log("Snake Game Over. Score:", score);
    isGameOver = true;
    gameRunning = false;
    if (gameLoopTimeoutId) clearTimeout(gameLoopTimeoutId);
    gameLoopTimeoutId = null;

    // --- Enhanced Score Saving ---
    console.log("[Snake gameOver] Attempting to save score. Context available:", !!snakeContext);
    if (snakeContext && typeof snakeContext.saveGameScore === 'function') {
        const username = snakeContext.getState?.('username') || 'GUEST_SNAKE';
        // Use currentGameModeKey which should be set during init/startGame
        const modeToSave = currentGameModeKey || 'default'; // Fallback just in case
        console.log(`[Snake gameOver] Saving score for: game=snake, mode=${modeToSave}, user=${username}, score=${score}`);
        snakeContext.saveGameScore('snake', modeToSave, username, score, false) // isTimeValue = false
            .then(success => console.log(`[Snake gameOver] Score save attempt result: ${success}`))
            .catch(err => console.error("[Snake gameOver] Error saving snake score:", err));
    } else {
        console.warn("[Snake gameOver] Snake context or saveGameScore function not available, cannot save score.");
        if(!snakeContext) console.warn("[Snake gameOver] Reason: snakeContext is null or undefined.");
        else if(typeof snakeContext.saveGameScore !== 'function') console.warn("[Snake gameOver] Reason: snakeContext.saveGameScore is not a function.");
    }
    // --- END Enhanced Score Saving ---

    drawGame(); // Draw final game over screen
}

// --- Drawing Functions ---
function drawGrid() {
    if (!ctx) return;
    ctx.strokeStyle = color(GRID_COLOR_VAR, 0.1); // Faint grid
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= GRID_SIZE; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, GRID_SIZE * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y <= GRID_SIZE; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(GRID_SIZE * BLOCK_SIZE, y * BLOCK_SIZE);
        ctx.stroke();
    }
}

function drawRect(x, y, w, h, fillColor, shadowColor = null, shadowBlur = 0) {
     if (!ctx) return;
     ctx.fillStyle = fillColor;
     if (shadowColor) {
         ctx.shadowColor = shadowColor;
         ctx.shadowBlur = shadowBlur;
     }
     ctx.fillRect(x, y, w, h);
     if (shadowColor) {
         ctx.shadowBlur = 0; // Reset shadow
     }
}

function drawSnake() {
    if (!ctx) return;
    const headColor = color(SNAKE_HEAD_COLOR_VAR);
    const bodyColor = color(SNAKE_BODY_COLOR_VAR);
    const glowColor = color('--text-color', 0.8); // Use text color glow

    snake.forEach((segment, index) => {
        const drawX = segment.x * BLOCK_SIZE;
        const drawY = segment.y * BLOCK_SIZE;
        const segmentColor = (index === 0) ? headColor : bodyColor;
        const shadow = (index === 0) ? glowColor : null; // Only head glows
        drawRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE, segmentColor, shadow, 5);
        // Add subtle border
        ctx.strokeStyle = color('--background-color', 0.5); // Dark border
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
    });
}

function drawFood() {
    if (!ctx) return;
    const foodColor = color(FOOD_COLOR_VAR);
    drawRect(
        food.x * BLOCK_SIZE,
        food.y * BLOCK_SIZE,
        BLOCK_SIZE,
        BLOCK_SIZE,
        foodColor,
        foodColor, // Use food color for glow
        8
    );
}

function drawText(text, x, y, fillColor, fontSize = '20px', textAlign = 'center') {
    if (!ctx) return;
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim() || 'monospace';
    ctx.font = `${fontSize} ${fontFamily}`;
    ctx.fillStyle = fillColor;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'middle';
    // Optional: Add subtle shadow to text
    ctx.shadowColor = color('--background-color', 0.7);
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 2;
    ctx.fillText(text, x, y);
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
}


function drawGame() {
    if (!ctx || !canvas) return;

    // Clear canvas
    ctx.fillStyle = color('--background-color', 0.8); // Slightly transparent background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawFood();
    drawSnake();

    // Draw Score
    drawText(`Score: ${score}`, canvas.width / 2, 20, color(SCORE_COLOR_VAR), '16px');

    // Draw Pause/Game Over messages
    if (isPaused) {
        ctx.fillStyle = color('--background-color', 0.7); // Dim background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawText("PAUSED", canvas.width / 2, canvas.height / 2 - 15, color(PAUSED_COLOR_VAR), '30px');
        drawText("(Window Not Active)", canvas.width / 2, canvas.height / 2 + 15, color('--prompt-color'), '14px');
    } else if (isGameOver) {
        ctx.fillStyle = color('--background-color', 0.8); // Dim background more
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawText("GAME OVER", canvas.width / 2, canvas.height / 2 - 25, color(GAME_OVER_COLOR_VAR), '34px');
        drawText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 5, color(SCORE_COLOR_VAR), '20px');
        drawText("Click to Play Again", canvas.width / 2, canvas.height / 2 + 35, color('--prompt-color'), '16px');
    }
}


// --- Game Loop ---
function gameLoop() {
    if (!gameRunning || isPaused || isGameOver) {
        gameLoopTimeoutId = null; // Ensure timer ID is cleared
        return;
    }

    moveSnake();
    // Only draw if the game hasn't just ended in moveSnake()
    if (!isGameOver) {
        drawGame();
        // Schedule next frame
        gameLoopTimeoutId = setTimeout(gameLoop, currentSpeedMs);
    } else {
        gameLoopTimeoutId = null; // Ensure timer ID is cleared on game over
    }
}

// --- Event Handlers ---
function handleKeyDown(evt) {
    // Only process input if the snake window is active and game is running
    if (!snakeWindowElement || !snakeWindowElement.classList.contains('active-window') || isPaused || isGameOver || !gameRunning) {
        return;
    }

    // Prevent browser scroll on arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w','a','s','d'].includes(evt.key)) {
        evt.preventDefault();
    }

    if (changingDirection) return; // Don't allow changing direction multiple times before the next tick

    let nextDx = dx;
    let nextDy = dy;

    switch (evt.key) {
        case 'ArrowUp':
        case 'w':
            if (dy === 0) { nextDx = 0; nextDy = -1; } // Can only go up if not moving vertically
            break;
        case 'ArrowDown':
        case 's':
            if (dy === 0) { nextDx = 0; nextDy = 1; } // Can only go down if not moving vertically
            break;
        case 'ArrowLeft':
        case 'a':
            if (dx === 0) { nextDx = -1; nextDy = 0; } // Can only go left if not moving horizontally
            break;
        case 'ArrowRight':
        case 'd':
            if (dx === 0) { nextDx = 1; nextDy = 0; } // Can only go right if not moving horizontally
            break;
        default:
            return; // Ignore other keys
    }

    // Check if the new direction is set and not the direct opposite
    const isOpposite = (nextDx === -dx && dx !== 0) || (nextDy === -dy && dy !== 0);
    if (!isOpposite && (nextDx !== dx || nextDy !== dy)) {
        pendingDirection = { dx: nextDx, dy: nextDy };
        changingDirection = true; // Mark that direction changed this tick
    }
}

function handleSnakeWindowClick(evt) {
    if (isGameOver) {
        startGame(); // Restart game on click if game over
    } else if (isPaused) {
        // If paused, clicking the window should resume the game
        resumeGame();
    }
}

// --- Pause/Resume/Stop --- (Exported for external control)
export function pauseGame() {
    if (gameRunning && !isPaused && !isGameOver) {
        isPaused = true;
        if (gameLoopTimeoutId) clearTimeout(gameLoopTimeoutId);
        gameLoopTimeoutId = null;
        if (canvas) canvas.classList.add('snake-paused-blur'); // Add blur class
        drawGame(); // Draw paused state
        console.log("Snake paused.");
    }
}

export function resumeGame() {
    if (isPaused && !isGameOver) {
        isPaused = false;
        if (canvas) canvas.classList.remove('snake-paused-blur'); // Remove blur class
        if (!gameLoopTimeoutId) gameLoop(); // Restart loop if not already running
        console.log("Snake resumed.");
    }
}

export function initSnake(canvasElement, windowDivElement, context, modeKey = DEFAULT_SNAKE_MODE) { // <<< Added modeKey
    if (!canvasElement || !windowDivElement) { /* ... error ... */ return; }
    if (!context) { /* ... error ... */ return; }

    // <<< Validate modeKey >>>
    if (!SNAKE_MODES[modeKey]) {
        console.warn(`[Snake init] Invalid modeKey '${modeKey}', defaulting to '${DEFAULT_SNAKE_MODE}'.`);
        modeKey = DEFAULT_SNAKE_MODE;
    }
    // <<< END Validate >>>

    canvas = canvasElement;
    snakeWindowElement = windowDivElement;
    snakeContext = context;
    currentGameModeKey = modeKey; // <<< Store the selected mode

    ctx = canvas.getContext('2d');
    if (!ctx) { /* ... error ... */ return; }

    canvas.width = GRID_SIZE * BLOCK_SIZE;
    canvas.height = GRID_SIZE * BLOCK_SIZE;

    document.addEventListener('keydown', handleKeyDown);
    snakeWindowElement.addEventListener('mousedown', handleSnakeWindowClick);

    if (canvas) canvas.classList.remove('snake-paused-blur');

    // startGame will now use the correct currentGameModeKey to set speeds
    startGame();

    if (!snakeWindowElement.classList.contains('active-window')) {
        pauseGame();
    }

    console.log(`Snake Initialized (Mode: ${currentGameModeKey}) in window:`, snakeWindowElement.id);
}

export function stopSnake() {
    console.log("Stopping Snake game...");
    // ... existing cleanup code ...

    // Remove Listeners
    document.removeEventListener('keydown', handleKeyDown);
    if (snakeWindowElement) {
        snakeWindowElement.removeEventListener('mousedown', handleSnakeWindowClick);
    }

    // Clear state variables
    // ... existing state clearing ...
    snakeContext = null; // <<< Clear the context reference
    canvas = null;
    ctx = null;
    snakeWindowElement = null;

    console.log("Snake Stopped and Cleaned Up");
}