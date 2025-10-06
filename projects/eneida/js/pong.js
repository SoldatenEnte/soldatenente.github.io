// js/pong.js - Simple Pong Game Logic and Rendering (Revised Focus/Restart/Text)

// --- Game Constants ---
const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_RADIUS = 6;
const PADDLE_SPEED = 5;
const AI_PADDLE_SPEED = 2.5; // Your value
const WINNING_SCORE = 5;
const INITIAL_BALL_SPEED_BASE = 2; // Your value
const BALL_SPEED_INCREASE_FACTOR = 1.1; // Your value
// NEW: Reduced vertical influence significantly
const VERTICAL_INFLUENCE_FACTOR = 0.05; // Was 0.08

const DIFFICULTY_SETTINGS = {
    easy: {
        aiSpeed: 1.3,
        initialBallSpeed: 1.5,
        ballSpeedIncrease: 1.05,
        verticalInfluence: 0.02, // Less vertical deflection
        name: 'Easy'
    },
    medium: {
        aiSpeed: 2.5,
        initialBallSpeed: 2.0,
        ballSpeedIncrease: 1.1,
        verticalInfluence: 0.04, // Moderate vertical deflection (original reduced value was 0.05)
        name: 'Medium'
    },
    hard: {
        aiSpeed: 4.5,
        initialBallSpeed: 2.5,
        ballSpeedIncrease: 1.25,
        verticalInfluence: 0.05, // More vertical deflection
        name: 'Hard'
    }
};

// --- Game State ---
let canvas, ctx;
let pongWindowElement = null; // Reference to the parent window div
let ballX, ballY, ballSpeedX, ballSpeedY;
let playerY, aiY;
let playerScore, aiScore;
let gameRunning = false; // Is the game logic allowed to update?
let isPaused = false;    // Is the game explicitly paused (e.g., window not active)?
let isGameOver = false;   // Has the score limit been reached?
let animationFrameId = null;
let keysPressed = {};
let currentDifficulty = 'medium'; 

// --- Helper Functions ---
function color(variableName, alpha = 1) {
    let col = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    if (!col) { // Fallbacks
        if (variableName === '--text-color') col = '#00ffcc';
        else if (variableName === '--accent-color') col = '#ff00ff';
        else if (variableName === '--prompt-color') col = '#a0a0ff';
        else if (variableName === '--error-color') col = '#ff3333';
        else if (variableName === '--success-color') col = 'lightgreen';
        else if (variableName === '--warning-color') col = 'orange';
        else col = '#ffffff';
    }
    if (alpha < 1) { // Apply alpha
        if (col.startsWith('#')) {
            let r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        if (col.startsWith('rgba')) { return col.replace(/,[^,]*\)$/, `, ${alpha})`); }
        if (col.startsWith('rgb')) { return col.replace('rgb', 'rgba').replace(')', `, ${alpha})`); }
    }
    return col;
}

// --- Drawing Functions ---
function drawRect(x, y, w, h, drawColor) {
    if (!ctx) return;
    ctx.fillStyle = drawColor;
    ctx.shadowColor = drawColor; ctx.shadowBlur = 8;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
}

function drawCircle(x, y, r, drawColor) {
    if (!ctx) return;
    ctx.fillStyle = drawColor;
    ctx.shadowColor = drawColor; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.shadowBlur = 0;
}
function drawNet() {
    if (!ctx) return;
    for (let i = 0; i < canvas.height; i += 30) {
        drawRect(canvas.width / 2 - 1, i, 2, 15, color('--prompt-color', 0.5));
    }
}

function drawText(text, x, y, drawColor, fontSize = '30px') {
    if (!ctx) return;
    let fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim() || 'monospace';
    ctx.font = `${fontSize} ${fontFamily}`;
    ctx.fillStyle = drawColor;
    ctx.textAlign = 'center';
    ctx.shadowColor = drawColor; ctx.shadowBlur = 10;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
}

function drawAll() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
    gradient.addColorStop(0, color('--background-color', 0.1));
    gradient.addColorStop(1, color('--background-color', 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawNet();
    drawRect(10, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, color('--text-color'));
    drawRect(canvas.width - PADDLE_WIDTH - 10, aiY, PADDLE_WIDTH, PADDLE_HEIGHT, color('--accent-color'));
    drawCircle(ballX, ballY, BALL_RADIUS, color('--text-color'));
    drawText(playerScore, canvas.width * 0.25, 70, color('--text-color', 0.9), '50px');
    drawText(aiScore, canvas.width * 0.75, 70, color('--accent-color', 0.9), '50px');

    if (isPaused) {
        drawText("PAUSED", canvas.width / 2, canvas.height / 2, color('--warning-color', 0.9), '45px');
        drawText("(Window Not Active)", canvas.width / 2, canvas.height / 2 + 40, color('--prompt-color', 0.7), '18px');
    } else if (isGameOver) {
        let message = playerScore >= WINNING_SCORE ? "PLAYER WINS!" : "AI WINS!";
        let msgColor = playerScore >= WINNING_SCORE ? color('--success-color') : color('--error-color');
        drawText(message, canvas.width / 2, canvas.height / 2 - 30, msgColor, '40px');
        drawText("Click Window to Play Again", canvas.width / 2, canvas.height / 2 + 25, color('--prompt-color'), '22px');
    }
}


// --- Game Logic ---
function resetBall() {
    if (!canvas) return;
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    let angle = Math.random() * Math.PI / 2 - Math.PI / 4;
    ballSpeedX = -INITIAL_BALL_SPEED_BASE * Math.cos(angle); // Serve to player (left)
    ballSpeedY = INITIAL_BALL_SPEED_BASE * Math.sin(angle);
}

function moveAll() {
    if (!gameRunning || isPaused || isGameOver || !canvas) return;

    // Get difficulty settings for this frame
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    const aiPaddleSpeed = settings.aiSpeed;
    const ballSpeedIncrease = settings.ballSpeedIncrease;
    // *** Get vertical influence from settings ***
    const verticalInfluence = settings.verticalInfluence;

    // Move ball
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Ball collision (top/bottom walls)
    if (ballY - BALL_RADIUS < 0 || ballY + BALL_RADIUS > canvas.height) {
        ballSpeedY = -ballSpeedY;
        if (ballY - BALL_RADIUS < 0) ballY = BALL_RADIUS;
        if (ballY + BALL_RADIUS > canvas.height) ballY = canvas.height - BALL_RADIUS;
    }

    // Ball collision (paddles)
    // Player paddle (left)
    if (ballX - BALL_RADIUS < 10 + PADDLE_WIDTH && ballX - BALL_RADIUS > 10 && ballY > playerY && ballY < playerY + PADDLE_HEIGHT) {
        ballSpeedX = -ballSpeedX * ballSpeedIncrease;
        ballSpeedY *= ballSpeedIncrease;
        let deltaY = ballY - (playerY + PADDLE_HEIGHT / 2);
        // *** Use difficulty setting for vertical influence ***
        ballSpeedY += deltaY * verticalInfluence;
        ballX = 10 + PADDLE_WIDTH + BALL_RADIUS; // Prevent sticking
    }
    // AI paddle (right)
    if (ballX + BALL_RADIUS > canvas.width - PADDLE_WIDTH - 10 && ballX + BALL_RADIUS < canvas.width - 10 && ballY > aiY && ballY < aiY + PADDLE_HEIGHT) {
        ballSpeedX = -ballSpeedX * ballSpeedIncrease;
        ballSpeedY *= ballSpeedIncrease;
        let deltaY = ballY - (aiY + PADDLE_HEIGHT / 2);
        // *** Use difficulty setting for vertical influence ***
        ballSpeedY += deltaY * verticalInfluence;
        ballX = canvas.width - PADDLE_WIDTH - 10 - BALL_RADIUS; // Prevent sticking
    }

    // Ball out of bounds (scoring)
    if (ballX - BALL_RADIUS < 0) {
        aiScore++;
        if (aiScore >= WINNING_SCORE) { isGameOver = true; gameRunning = false; }
        else { resetBall(); }
    } else if (ballX + BALL_RADIUS > canvas.width) {
        playerScore++;
        if (playerScore >= WINNING_SCORE) { isGameOver = true; gameRunning = false; }
        else { resetBall(); }
    }

    // --- Move Paddles ---
    // Player (constant speed)
    if (keysPressed['w'] || keysPressed['ArrowUp']) { playerY -= PADDLE_SPEED; }
    if (keysPressed['s'] || keysPressed['ArrowDown']) { playerY += PADDLE_SPEED; }
    if (playerY < 0) playerY = 0;
    if (playerY > canvas.height - PADDLE_HEIGHT) playerY = canvas.height - PADDLE_HEIGHT;

    // AI Paddle Movement (uses difficulty speed)
    let aiCenter = aiY + PADDLE_HEIGHT / 2;
    if (ballSpeedX > 0) { // AI reacts only when ball is coming towards it
        if (aiCenter < ballY - PADDLE_HEIGHT * 0.35) aiY += aiPaddleSpeed;
        else if (aiCenter > ballY + PADDLE_HEIGHT * 0.35) aiY -= aiPaddleSpeed;
    } else { // Drift to center otherwise
        if (aiCenter < canvas.height / 2 - aiPaddleSpeed) aiY += aiPaddleSpeed * 0.5;
        else if (aiCenter > canvas.height / 2 + aiPaddleSpeed) aiY -= aiPaddleSpeed * 0.5;
    }
    if (aiY < 0) aiY = 0;
    if (aiY > canvas.height - PADDLE_HEIGHT) aiY = canvas.height - PADDLE_HEIGHT;
}

function gameLoop() {
    if (!pongWindowElement) return; // Stop if window is gone

    moveAll();
    drawAll(); // Always draw the current state (running, paused, game over)

    // Only continue the loop if the game is supposed to be actively running
    if (gameRunning && !isPaused && !isGameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
        animationFrameId = null; // Ensure loop stops if not running
    }
}

// --- Event Handlers ---
function handleKeyDown(evt) {
    if (pongWindowElement && pongWindowElement.classList.contains('active-window') && !isPaused && !isGameOver) {
        keysPressed[evt.key] = true;
    }
}

function handleKeyUp(evt) {
     keysPressed[evt.key] = false;
}

// Handles clicks *within* the Pong window (canvas or title bar etc.)
function handlePongWindowClick(evt) {
    if (isPaused) {
        resumeGame();
        return;
    }
    if (isGameOver) {
        console.log("Restarting Pong game from click.");
        playerScore = 0;
        aiScore = 0;
        isGameOver = false;
        isPaused = false;
        resetBall();
        gameRunning = true;
        if (!animationFrameId) { gameLoop(); }
    }
    // If clicking while running, do nothing (or maybe pause on click? For now, no)
}


// --- Pause/Resume --- (Exported for external control)
export function pauseGame() {
    if (gameRunning && !isPaused && !isGameOver) {
        gameRunning = false;
        isPaused = true;
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
        if (canvas) canvas.classList.add('pong-paused-blur');
        drawAll();
        console.log("Pong paused.");
    }
}

export function resumeGame() {
    if (isPaused && !isGameOver) {
        isPaused = false;
        gameRunning = true;
        if (canvas) canvas.classList.remove('pong-paused-blur');
        if (!animationFrameId) { gameLoop(); }
        console.log("Pong resumed.");
    } else if (isGameOver) {
         console.log("Resume called, but game is over. Click again to restart.");
    }
}

// --- Initialization and Cleanup ---
export function initPong(canvasElement, windowDivElement, difficulty = 'medium') {
    if (!canvasElement || !windowDivElement) {
        console.error("Pong Error: Canvas or Window element not provided!");
        return;
    }
    canvas = canvasElement;
    pongWindowElement = windowDivElement;
    currentDifficulty = difficulty; // Set current difficulty

    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Pong Error: Failed to get 2D context!");
        return;
    }
    console.log(`Initializing Pong with difficulty: ${currentDifficulty}`);

    // --- Resize canvas ---
    const resizeCanvas = () => { /* ... (resize logic as before) ... */
        if (!canvas || !canvas.parentElement) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        const style = getComputedStyle(canvas.parentElement);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingRight = parseFloat(style.paddingRight) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const paddingBottom = parseFloat(style.paddingBottom) || 0;
        const newWidth = Math.max(10, rect.width - paddingLeft - paddingRight);
        const newHeight = Math.max(10, rect.height - paddingTop - paddingBottom);
        if (canvas.width !== newWidth || canvas.height !== newHeight) {
             canvas.width = newWidth;
             canvas.height = newHeight;
             console.log(`Pong canvas resized to: ${canvas.width}x${canvas.height}`);
             playerY = Math.min(playerY, canvas.height - PADDLE_HEIGHT);
             aiY = Math.min(aiY, canvas.height - PADDLE_HEIGHT);
             drawAll(); // Redraw immediately
        }
    };
    resizeCanvas(); // Initial size
    if (getComputedStyle(pongWindowElement).resize !== 'none') { // Observer for resizable windows
        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(canvas.parentElement);
        pongWindowElement._pongResizeObserver = resizeObserver;
    }
    // --- End Resize ---

    // Initial positions & score
    playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
    aiY = canvas.height / 2 - PADDLE_HEIGHT / 2;
    playerScore = 0;
    aiScore = 0;
    isPaused = false;
    isGameOver = false;

    resetBall(); // Place ball initially

    // --- Add Event Listeners ---
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    pongWindowElement.addEventListener('mousedown', handlePongWindowClick);

    // --- Ensure initial blur state is correct ---
    if (canvas) canvas.classList.remove('pong-paused-blur');

    // --- Initial state (start running if active) ---
    if (pongWindowElement.classList.contains('active-window')) {
         gameRunning = true;
         isPaused = false;
         if (!animationFrameId) gameLoop();
    } else { // Start paused if not active
        gameRunning = false;
        isPaused = true;
        if (canvas) canvas.classList.add('pong-paused-blur');
        drawAll(); // Draw initial paused state
    }

    console.log("Pong Initialized in window:", pongWindowElement.id);
}

export function stopPong() {
    console.log("Stopping Pong game...");
    gameRunning = false; isPaused = false; isGameOver = false;
    if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
    if (canvas) canvas.classList.remove('pong-paused-blur');

    // Remove Listeners
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    if (pongWindowElement) {
        pongWindowElement.removeEventListener('mousedown', handlePongWindowClick);
        if (pongWindowElement._pongResizeObserver) {
            pongWindowElement._pongResizeObserver.disconnect();
            delete pongWindowElement._pongResizeObserver;
            console.log("Pong resize observer disconnected.");
        }
    }

    // Clear state
    keysPressed = {}; canvas = null; ctx = null; pongWindowElement = null;
    console.log("Pong Stopped and Cleaned Up");
}