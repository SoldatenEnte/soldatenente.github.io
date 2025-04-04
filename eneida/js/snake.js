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

// --- Game State ---
let canvas, ctx;
let snakeWindowElement = null;
let snake = []; // Array of {x, y} coordinates
let dx = 1, dy = 0; // Initial direction (right)
let food = { x: 0, y: 0 };
let score = 0;
let gameRunning = false;
let isPaused = false;
let isGameOver = false;
let animationFrameId = null; // Will use setTimeout instead for snake speed control
let gameLoopTimeoutId = null;
let currentSpeedMs = INITIAL_SPEED_MS;
let changingDirection = false; // Prevent 180 turns in one step
let pendingDirection = { dx: 1, dy: 0 }; // Store next intended direction

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
    console.log("Starting Snake game...");
    // Initial snake position (middle of the grid)
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY },
    ];
    dx = 1; dy = 0; // Move right initially
    pendingDirection = { dx: 1, dy: 0 };
    score = 0;
    currentSpeedMs = INITIAL_SPEED_MS;
    isGameOver = false;
    isPaused = false;
    changingDirection = false;
    placeFood();
    gameRunning = true;
    if (canvas) canvas.classList.remove('snake-paused-blur'); // Ensure blur removed
    if (!gameLoopTimeoutId) gameLoop(); // Start game loop if not already running
}

function moveSnake() {
    if (!gameRunning || isPaused || isGameOver) return;

    // Apply pending direction change if valid
    if (pendingDirection) {
        // Prevent reversing direction
        const isOpposite = (pendingDirection.dx === -dx && dx !== 0) || (pendingDirection.dy === -dy && dy !== 0);
        if (!isOpposite) {
            dx = pendingDirection.dx;
            dy = pendingDirection.dy;
        }
        pendingDirection = null; // Clear pending direction
    }
    changingDirection = false; // Allow direction change for the next tick

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // --- Collision Detection ---
    // Wall Collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOver();
        return;
    }
    // Self Collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    // Add new head
    snake.unshift(head);

    // --- Food Eating ---
    if (head.x === food.x && head.y === food.y) {
        score++;
        // Increase speed (make faster)
        currentSpeedMs = Math.max(MAX_SPEED_MS, currentSpeedMs * SPEED_INCREMENT_FACTOR);
        placeFood();
    } else {
        // Remove tail segment if food not eaten
        snake.pop();
    }
}

function gameOver() {
    console.log("Snake Game Over. Score:", score);
    isGameOver = true;
    gameRunning = false;
    if (gameLoopTimeoutId) clearTimeout(gameLoopTimeoutId);
    gameLoopTimeoutId = null;
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

export function initSnake(canvasElement, windowDivElement) {
    if (!canvasElement || !windowDivElement) {
        console.error("Snake Init Error: Canvas or Window element missing!");
        return;
    }
    canvas = canvasElement;
    snakeWindowElement = windowDivElement;

    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Snake Init Error: Failed to get 2D context.");
        return;
    }

    // Set canvas dimensions based on grid
    canvas.width = GRID_SIZE * BLOCK_SIZE;
    canvas.height = GRID_SIZE * BLOCK_SIZE;

    // --- Add Event Listeners ---
    // Use document level for keys so it works even if canvas doesn't have focus (but window does)
    document.addEventListener('keydown', handleKeyDown);
    // Click listener on the window element itself
    snakeWindowElement.addEventListener('mousedown', handleSnakeWindowClick);

    // Ensure blur state is correct initially
    if (canvas) canvas.classList.remove('snake-paused-blur');

    // Initial game state setup
    startGame(); // Start the game logic and drawing loop

    // Check if window is active to potentially pause immediately
    if (!snakeWindowElement.classList.contains('active-window')) {
        pauseGame();
    }

    console.log("Snake Initialized in window:", snakeWindowElement.id);
}

export function stopSnake() {
    console.log("Stopping Snake game...");
    gameRunning = false;
    isPaused = false;
    isGameOver = false; // Reset game over state as well
    if (gameLoopTimeoutId) {
        clearTimeout(gameLoopTimeoutId);
        gameLoopTimeoutId = null;
    }
    if (canvas) canvas.classList.remove('snake-paused-blur'); // Remove blur

    // --- Remove Event Listeners ---
    document.removeEventListener('keydown', handleKeyDown);
    if (snakeWindowElement) {
        snakeWindowElement.removeEventListener('mousedown', handleSnakeWindowClick);
    }

    // --- Clear state variables ---
    snake = [];
    dx = 1; dy = 0;
    pendingDirection = { dx: 1, dy: 0 };
    changingDirection = false;
    score = 0;
    currentSpeedMs = INITIAL_SPEED_MS;
    food = { x: 0, y: 0 };
    canvas = null;
    ctx = null;
    snakeWindowElement = null;

    console.log("Snake Stopped and Cleaned Up");
}