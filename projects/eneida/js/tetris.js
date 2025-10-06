// js/tetris.js

const DEFAULT_DAS = 95; // ms (Delayed Auto Shift)
const DEFAULT_ARR = 0; 
const DEFAULT_SDR = 10;

export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 20;
const UI_AREA_WIDTH = 100;
const NEXT_PIECE_BOX_GRID_SIZE = 4;
const NEXT_PIECE_BLOCK_SIZE_FACTOR = 0.7;
const HOLD_BOX_GRID_SIZE = 4;

let heldPieceIndex = null;
let canHold = true;

let lockDelayTimer = null;
let canLock = false;
const LOCK_DELAY_MS = 500;
let lockDelayResets = 0;
const MAX_LOCK_DELAY_RESETS = 15;
let forceLockStartTime = 0;
let forceLockTimerId = null;
const FORCE_LOCK_DELAY_MS = 5000; // 5 seconds

let currentBag = [];
let bagIndex = 0;

let dasTimerId = null;
let arrTimerId = null;
let sdrTimerId = null;
let isMovingLeft = false;
let isMovingRight = false;
let isSoftDropping = false;
let currentDas = DEFAULT_DAS; // Can be customized later if needed
let currentArr = DEFAULT_ARR; // Can be customized later if needed
let currentSdr = DEFAULT_SDR;

let countdownValue = 0; // 1 for Ready, 0 for GO!, -1 otherwise
let countdownTimerId = null;

let animationFrameId = null;

const SHAPES = [
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    [
        [1, 1],
        [1, 1]
    ],
    [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
];
const SHAPE_COLORS = [
    '--text-color',
    '--prompt-color',
    '--warning-color',
    '--yellow-color',
    '--success-color',
    '--accent-color',
    '--error-color'
];


export const GAME_MODES = {
    easy: {
        type: 'level',
        levelSpeed: 800,
        speedIncrement: 50,
        name: 'Easy'
    },
    medium: {
        type: 'level',
        levelSpeed: 600,
        speedIncrement: 40,
        name: 'Medium'
    },
    hard: {
        type: 'level',
        levelSpeed: 400,
        speedIncrement: 30,
        name: 'Hard'
    },
    '20l': {
        type: 'sprint',
        lineGoal: 20,
        levelSpeed: 900, // Slower speed
        speedIncrement: 0,
        name: 'Sprint 20L'
    },
    '40l': {
        type: 'sprint',
        lineGoal: 40,
        levelSpeed: 900, // Slower speed
        speedIncrement: 0,
        name: 'Sprint 40L'
    },
    '100l': {
        type: 'sprint',
        lineGoal: 100,
        levelSpeed: 900, // Slower speed
        speedIncrement: 0,
        name: 'Sprint 100L'
    },
    '1000l': {
        type: 'sprint',
        lineGoal: 1000,
        levelSpeed: 900, // Slower speed
        speedIncrement: 0,
        name: 'Sprint 1000L'
    }
};


let canvas, ctx;
let tetrisContext = null;
let tetrisWindowElement = null;
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let linesCleared = 0;
let gameRunning = false; // True when piece is dropping/active game logic
let gameActive = false; // True from init until stop (used for key listeners etc)
let isPaused = false;
let isGameOver = false;
let dropTimer = null;
let dropInterval = 600;
let currentGameModeKey = 'medium';


let isSprintMode = false;
let sprintLineGoal = 0;
let startTime = 0;
let elapsedTime = 0;
let pauseStartTime = 0;
let finalTime = 0;



function color(variableName, alpha = 1) {
    try {
        let col = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        if (!col) {
            if (variableName === '--text-color') col = '#00ffcc';
            else if (variableName === '--accent-color') col = '#ff00ff';
            else if (variableName === '--prompt-color') col = '#a0a0ff';
            else if (variableName === '--error-color') col = '#ff3333';
            else if (variableName === '--success-color') col = 'lightgreen';
            else if (variableName === '--warning-color') col = 'orange';
            else if (variableName === '--yellow-color') col = '#ffff00';
            else return '#CCCCCC';
        }
        if (alpha < 1) {
            if (col.startsWith('#')) {
                let r = parseInt(col.slice(1, 3), 16),
                    g = parseInt(col.slice(3, 5), 16),
                    b = parseInt(col.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            if (col.startsWith('rgba')) {
                return col.replace(/,[^,]*\)$/, `, ${alpha})`);
            }
            if (col.startsWith('rgb')) {
                return col.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
            }
        }
        return col;
    } catch (e) {
        return '#FFFFFF';
    }
}

function getThemeColor(cssVar, fallback) {
    let themeCol = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    return themeCol || fallback;
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedMs = String(ms).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}.${formattedMs}`;
}


function createBoard() {
    return Array.from({
        length: ROWS
    }, () => Array(COLS).fill(0));
}

function getRandomPiece() {
    if (currentBag.length === 0 || bagIndex >= currentBag.length) {
        fillBag();
    }
    const pieceIndex = currentBag[bagIndex];
    bagIndex++;
    const shape = SHAPES[pieceIndex];
    let minR = shape.length,
        maxR = -1,
        minC = shape[0].length,
        maxC = -1;
    shape.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                minR = Math.min(minR, r);
                maxR = Math.max(maxR, r);
                minC = Math.min(minC, c);
                maxC = Math.max(maxC, c);
            }
        });
    });
    if (maxR === -1) {
        minR = 0;
        maxR = 0;
        minC = 0;
        maxC = 0;
    }
    const pieceGridWidth = maxC - minC + 1;
    let initialY = (pieceIndex === 0) ? (0 - minR) : (-1 - minR);
    const initialX = Math.floor(COLS / 2) - Math.floor(pieceGridWidth / 2) - minC;
    return {
        shape,
        colorIndex: pieceIndex + 1,
        y: initialY,
        x: initialX
    };
}

function rotatePiece(piece) { // Clockwise Rotation
    const shape = piece.shape;
    const N = shape.length;
    // Transpose then reverse rows for CW rotation
    let newShape = shape.map((_, index) => shape.map(col => col[index])).map(row => row.reverse());
    return { ...piece, shape: newShape };
}

function rotatePieceCounterClockwise(piece) {
    const shape = piece.shape;
    const N = shape.length;
    const newShape = Array.from({ length: N }, () => Array(N).fill(0));
    // Use the formula: new[r][c] = old[c][N-1-r]
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            newShape[r][c] = shape[c][N - 1 - r];
        }
    }
    return { ...piece, shape: newShape };
}

function isValidMove(piece, board) {
    const {
        shape,
        x,
        y
    } = piece;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const boardX = x + c;
                const boardY = y + r;
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return false;
                if (boardY >= 0 && board[boardY][boardX] !== 0) return false;
            }
        }
    }
    return true;
}

function mergePieceToBoard(piece, board) {
    const {
        shape,
        x,
        y,
        colorIndex
    } = piece;
    shape.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                const boardX = x + c;
                const boardY = y + r;
                if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                    board[boardY][boardX] = colorIndex;
                }
            }
        });
    });
}

function clearLines(board) {
    let linesRemoved = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) {
            linesRemoved++;
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
            r++;
        }
    }
    return linesRemoved;
}

function updateGameProgress(linesRemoved) {
    if (linesRemoved <= 0) return;
    linesCleared += linesRemoved;

    if (isSprintMode) {
        const remaining = sprintLineGoal - linesCleared;
        if (remaining <= 0 && !isGameOver) {
            isGameOver = true;
            gameRunning = false;
            finalTime = elapsedTime;
            clearTimers();

            // --- UPDATED SCORE SAVING (Sprint Win) ---
            if (tetrisContext?.saveGameScore) {
                const username = tetrisContext.getState?.('username') || 'GUEST_TETRIS';
                tetrisContext.saveGameScore('tetris', currentGameModeKey, username, finalTime, true) // isTimeValue = true
                    .then(success => console.log(`Tetris Sprint time save attempt: ${success}`))
                    .catch(err => console.error("Error saving Tetris Sprint time:", err));
            } else {
                console.warn("Tetris context or saveGameScore function not available, cannot save Sprint time.");
            }
            // --- END UPDATE ---
        }
    } else { // Level Mode
        const points = [0, 100, 300, 500, 800];
        score += points[linesRemoved] * level;
        const newLevel = Math.floor(linesCleared / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            const settings = GAME_MODES[currentGameModeKey];
            dropInterval = Math.max(100, settings.levelSpeed - (level - 1) * settings.speedIncrement);
            resetDropTimer();
        }
    }
}


function drawBlock(x, y, colorIndex, targetCtx = ctx, blockSize = BLOCK_SIZE, drawGrid = true) {
    if (!targetCtx || colorIndex === 0) return;
    const colorVarName = SHAPE_COLORS[colorIndex - 1];
    let actualColor = color(colorVarName, 1) || '#CCCCCC';
    targetCtx.fillStyle = actualColor;
    const drawX = x * blockSize;
    const drawY = y * blockSize;
    targetCtx.fillRect(drawX, drawY, blockSize, blockSize);
    if (drawGrid) {
        targetCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        targetCtx.lineWidth = 1;
        targetCtx.strokeRect(drawX, drawY, blockSize, blockSize);
    }
}

function drawBoard(board) {
    if (!ctx || !canvas) return;
    const boardWidth = COLS * BLOCK_SIZE;
    const boardHeight = ROWS * BLOCK_SIZE;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, boardWidth, boardHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }
}

function drawPiece(piece) {
    if (!ctx || !piece) return;
    const {
        shape,
        x,
        y,
        colorIndex
    } = piece;
    shape.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                if (y + r >= 0) {
                    drawBlock(x + c, y + r, colorIndex);
                }
            }
        });
    });
}

function drawNextPiecePreview(piece) {
    if (!ctx || !piece) return;

    const gameBoardRightEdge = COLS * BLOCK_SIZE;
    const uiCenterX = gameBoardRightEdge + (UI_AREA_WIDTH / 2);
    const uiTopY = 30;
    const labelFontSize = 14; // Assuming these are defined elsewhere or use defaults
    const labelLineHeight = labelFontSize * 1.2;
    const boxSpacing = labelLineHeight * 0.7;

    const nextLabelY = uiTopY + labelLineHeight * 0.5;
    const nextBoxY = nextLabelY + boxSpacing;

    const nextPieceBlockSize = BLOCK_SIZE * NEXT_PIECE_BLOCK_SIZE_FACTOR;
    const nextBoxGridWidth = NEXT_PIECE_BOX_GRID_SIZE;
    const nextBoxGridHeight = NEXT_PIECE_BOX_GRID_SIZE; // Assuming a square box for simplicity
    const nextBoxPixelWidth = nextBoxGridWidth * nextPieceBlockSize;
    const nextBoxPixelHeight = nextBoxGridHeight * nextPieceBlockSize;
    const nextBoxX = uiCenterX - nextBoxPixelWidth / 2;

    const { shape, colorIndex } = piece;

    // --- Calculate Piece Dimensions and Offset ---
    let minR = shape.length, maxR = -1, minC = shape[0].length, maxC = -1;
    let pieceHeightInBlocks = 0;
    let pieceWidthInBlocks = 0;
    shape.forEach((row, r) => row.forEach((cell, c) => {
        if (cell) {
            minR = Math.min(minR, r);
            maxR = Math.max(maxR, r);
            minC = Math.min(minC, c);
            maxC = Math.max(maxC, c);
        }
    }));

    // Handle empty shapes (shouldn't happen with standard pieces)
    if (maxR === -1) {
         minR = 0; maxR = 0; minC = 0; maxC = 0;
         pieceHeightInBlocks = 1; pieceWidthInBlocks = 1;
    } else {
        pieceHeightInBlocks = maxR - minR + 1;
        pieceWidthInBlocks = maxC - minC + 1;
    }

    // Calculate centering offsets within the preview box grid
    const gridOffsetX = Math.floor((nextBoxGridWidth - pieceWidthInBlocks) / 2);
    const gridOffsetY = Math.floor((nextBoxGridHeight - pieceHeightInBlocks) / 2);
    // --- End Calculation ---

    const colorVarName = SHAPE_COLORS[colorIndex - 1];
    let actualColor = color(colorVarName, 1) || '#CCCCCC';
    ctx.fillStyle = actualColor;
    ctx.shadowColor = actualColor; ctx.shadowBlur = 3;

    // Draw the piece centered in the box
    shape.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                // Adjust drawing position based on calculated offsets and piece's own origin (minR, minC)
                const drawGridX = gridOffsetX + (c - minC);
                const drawGridY = gridOffsetY + (r - minR);

                const drawPixelX = nextBoxX + drawGridX * nextPieceBlockSize;
                const drawPixelY = nextBoxY + drawGridY * nextPieceBlockSize;

                ctx.fillRect(drawPixelX, drawPixelY, nextPieceBlockSize, nextPieceBlockSize);
            }
        });
    });
    ctx.shadowBlur = 0;
}

function drawHoldPiecePreview(pieceIndex) {
    if (!ctx || pieceIndex === null) return;

    // --- Calculate positioning relative to Next box (consistent layout) ---
    const gameBoardRightEdge = COLS * BLOCK_SIZE;
    const uiCenterX = gameBoardRightEdge + (UI_AREA_WIDTH / 2);
    const uiTopY = 30;
    const labelFontSize = 14;
    const labelLineHeight = labelFontSize * 1.2;
    const boxSpacing = labelLineHeight * 0.7;
    const sectionSpacing = labelLineHeight * 1.5;

    // Next box position needed for relative placement
    const nextLabelY = uiTopY + labelLineHeight * 0.5;
    const nextBoxY = nextLabelY + boxSpacing;
    const nextPieceBlockSize = BLOCK_SIZE * NEXT_PIECE_BLOCK_SIZE_FACTOR;
    const nextBoxDisplaySize = NEXT_PIECE_BOX_GRID_SIZE * nextPieceBlockSize;

    // Hold box position
    const holdLabelY = nextBoxY + nextBoxDisplaySize + sectionSpacing;
    const holdBoxY = holdLabelY + boxSpacing; // Top Y coordinate of the hold box content area

    // Hold box dimensions (assuming same size as Next box for consistency)
    const holdPieceBlockSize = BLOCK_SIZE * NEXT_PIECE_BLOCK_SIZE_FACTOR;
    const holdBoxGridWidth = HOLD_BOX_GRID_SIZE;
    const holdBoxGridHeight = HOLD_BOX_GRID_SIZE;
    const holdBoxPixelWidth = holdBoxGridWidth * holdPieceBlockSize;
    // const holdBoxPixelHeight = holdBoxGridHeight * holdPieceBlockSize; // Not strictly needed for drawing
    const holdBoxX = uiCenterX - holdBoxPixelWidth / 2; // Left X coordinate of the hold box content area
    // --- End Positioning ---

    const shape = SHAPES[pieceIndex];
    const colorIndex = pieceIndex + 1;

    // --- Calculate Piece Dimensions and Offset (same logic as Next piece) ---
    let minR = shape.length, maxR = -1, minC = shape[0].length, maxC = -1;
    let pieceHeightInBlocks = 0;
    let pieceWidthInBlocks = 0;
    shape.forEach((row, r) => row.forEach((cell, c) => {
        if (cell) {
            minR = Math.min(minR, r);
            maxR = Math.max(maxR, r);
            minC = Math.min(minC, c);
            maxC = Math.max(maxC, c);
        }
    }));
    if (maxR === -1) {
         minR = 0; maxR = 0; minC = 0; maxC = 0;
         pieceHeightInBlocks = 1; pieceWidthInBlocks = 1;
    } else {
        pieceHeightInBlocks = maxR - minR + 1;
        pieceWidthInBlocks = maxC - minC + 1;
    }
    const gridOffsetX = Math.floor((holdBoxGridWidth - pieceWidthInBlocks) / 2);
    const gridOffsetY = Math.floor((holdBoxGridHeight - pieceHeightInBlocks) / 2);
    // --- End Calculation ---

    const colorVarName = SHAPE_COLORS[colorIndex - 1];
    let actualColor = color(colorVarName, 1) || '#CCCCCC';
    ctx.fillStyle = actualColor;
    ctx.shadowColor = actualColor; ctx.shadowBlur = 3;

    // Draw the piece centered
    shape.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                const drawGridX = gridOffsetX + (c - minC);
                const drawGridY = gridOffsetY + (r - minR);

                const drawPixelX = holdBoxX + drawGridX * holdPieceBlockSize;
                const drawPixelY = holdBoxY + drawGridY * holdPieceBlockSize;

                ctx.fillRect(drawPixelX, drawPixelY, holdPieceBlockSize, holdPieceBlockSize);
            }
        });
    });
    ctx.shadowBlur = 0;
}
function drawUI() {
    if (!ctx || !canvas) return;

    const gameBoardRightEdge = COLS * BLOCK_SIZE;
    const uiWidth = canvas.width - gameBoardRightEdge;
    const uiCenterX = gameBoardRightEdge + (uiWidth / 2);
    const uiTopY = 30; // Keep consistent starting point for Next/Hold boxes
    const labelFontSize = 14;
    const valueFontSize = 16;
    const labelLineHeight = labelFontSize * 1.2;
    const valueLineHeight = valueFontSize * 1.3;
    const boxSpacing = labelLineHeight * 0.7;
    const sectionSpacing = labelLineHeight * 1.5; // Spacing between Next/Hold and Stats
    const statSpacing = labelLineHeight + valueLineHeight; // Spacing between individual stats

    const promptColor = color('--prompt-color', 1);
    const textColor = color('--text-color', 1);
    // warningColor, errorColor, successColor are used in overlays, not base UI text here
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim() || 'monospace';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // --- Draw Next and Hold Boxes (Always Drawn) ---
    // Next Piece Box
    const nextLabelY = uiTopY + labelLineHeight * 0.5;
    ctx.font = `${labelFontSize}px ${fontFamily}`; ctx.fillStyle = promptColor; ctx.fillText(`Next:`, uiCenterX, nextLabelY);
    const nextPieceBlockSize = BLOCK_SIZE * NEXT_PIECE_BLOCK_SIZE_FACTOR;
    const nextBoxDisplaySize = NEXT_PIECE_BOX_GRID_SIZE * nextPieceBlockSize;
    const nextBoxX = uiCenterX - nextBoxDisplaySize / 2;
    const nextBoxY = nextLabelY + boxSpacing;
    ctx.strokeStyle = color('--prompt-color', 0.5); ctx.lineWidth = 1;
    ctx.strokeRect(nextBoxX, nextBoxY, nextBoxDisplaySize, nextBoxDisplaySize);

    // Hold Piece Box
    const holdLabelY = nextBoxY + nextBoxDisplaySize + sectionSpacing; // Position below Next box
    ctx.font = `${labelFontSize}px ${fontFamily}`; ctx.fillStyle = promptColor; ctx.fillText(`Hold:`, uiCenterX, holdLabelY);
    const holdPieceBlockSize = BLOCK_SIZE * NEXT_PIECE_BLOCK_SIZE_FACTOR;
    const holdBoxDisplaySize = HOLD_BOX_GRID_SIZE * holdPieceBlockSize;
    const holdBoxX = uiCenterX - holdBoxDisplaySize / 2;
    const holdBoxY = holdLabelY + boxSpacing;
    ctx.strokeStyle = color('--prompt-color', 0.5); ctx.lineWidth = 1;
    ctx.strokeRect(holdBoxX, holdBoxY, holdBoxDisplaySize, holdBoxDisplaySize);

    // --- Draw Stats Area (Conditional) ---
    const statsStartY = holdBoxY + holdBoxDisplaySize + sectionSpacing; // Position below Hold box

    // *** Conditional Rendering based on isSprintMode ***
    if (isSprintMode) {
        // Sprint Mode: Time and Lines Left
        const timeLabelY = statsStartY;
        ctx.font = `${labelFontSize}px ${fontFamily}`; ctx.fillStyle = promptColor; ctx.fillText(`Time:`, uiCenterX, timeLabelY);
        ctx.font = `${valueFontSize}px ${fontFamily}`; ctx.fillStyle = textColor;
        // Display finalTime if game is over, otherwise elapsedTime
        ctx.fillText(formatTime(isGameOver ? finalTime : elapsedTime), uiCenterX, timeLabelY + valueLineHeight);

        const linesLeftLabelY = timeLabelY + statSpacing;
        const remaining = Math.max(0, sprintLineGoal - linesCleared);
        ctx.font = `${labelFontSize}px ${fontFamily}`; ctx.fillStyle = promptColor; ctx.fillText(`Lines Left:`, uiCenterX, linesLeftLabelY);
        ctx.font = `${valueFontSize}px ${fontFamily}`; ctx.fillStyle = textColor; ctx.fillText(`${remaining}`, uiCenterX, linesLeftLabelY + valueLineHeight);

    } else {
        // Level Mode: Score, Level, Lines
        const scoreLabelY = statsStartY;
        ctx.font = `${labelFontSize}px ${fontFamily}`; ctx.fillStyle = promptColor; ctx.fillText(`Score:`, uiCenterX, scoreLabelY);
        ctx.font = `${valueFontSize}px ${fontFamily}`; ctx.fillStyle = textColor; ctx.fillText(`${score}`, uiCenterX, scoreLabelY + valueLineHeight);

        const levelLabelY = scoreLabelY + statSpacing;
        ctx.font = `${labelFontSize}px ${fontFamily}`; ctx.fillStyle = promptColor; ctx.fillText(`Level:`, uiCenterX, levelLabelY);
        ctx.font = `${valueFontSize}px ${fontFamily}`; ctx.fillStyle = textColor; ctx.fillText(`${level}`, uiCenterX, levelLabelY + valueLineHeight);

        const linesLabelY = levelLabelY + statSpacing;
        ctx.font = `${labelFontSize}px ${fontFamily}`; ctx.fillStyle = promptColor; ctx.fillText(`Lines:`, uiCenterX, linesLabelY);
        ctx.font = `${valueFontSize}px ${fontFamily}`; ctx.fillStyle = textColor; ctx.fillText(`${linesCleared}`, uiCenterX, linesLabelY + valueLineHeight);
    }
    // *** End Conditional Rendering ***
}

function drawGame() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Draw Board and Pieces ---
    drawBoard(board); // Draw the board (will be empty during countdown after restart)
    // Draw ghost only during active play (not pause, game over, or countdown)
    if (currentPiece && !isGameOver && !isPaused && gameRunning && countdownValue < 0) {
        const ghostY = calculateGhostPosition(currentPiece, board);
        if (ghostY >= currentPiece.y) drawGhostPiece(currentPiece, ghostY);
    }
    // Draw locked pieces
    board.forEach((row, r) => row.forEach((cell, c) => { if (cell !== 0) drawBlock(c, r, cell); }));
    // Draw current piece only if it exists and game isn't over
    // (it will be null during countdown)
    if (currentPiece && !isGameOver) drawPiece(currentPiece);

    // --- Draw UI Elements ---
    drawUI(); // Score, Level, Time, etc.
    // Draw next/hold previews (show next even during countdown)
    if (!isGameOver) {
        if (nextPiece) drawNextPiecePreview(nextPiece); // <<< Shows the first piece during countdown
        if (heldPieceIndex !== null) drawHoldPiecePreview(heldPieceIndex);
    }


    // --- Draw Overlay Messages (Paused, Game Over, Countdown) ---
    const gameAreaWidth = COLS * BLOCK_SIZE;
    const gameAreaHeight = ROWS * BLOCK_SIZE;
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim() || 'monospace';

    // Countdown / GO! message (only if not paused)
    if (countdownValue >= 0 && !isPaused) { // Combine Ready and GO rendering
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, gameAreaWidth, gameAreaHeight);
        const text = countdownValue === 1 ? "Ready" : "GO!";
        const fontSize = countdownValue === 1 ? 60 : 70;
        const txtColor = countdownValue === 1 ? color('--text-color') : color('--success-color');
        ctx.font = `bold ${fontSize}px ${fontFamily}`; ctx.fillStyle = txtColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, gameAreaWidth / 2, gameAreaHeight / 2);
    }
    // Game Over message (takes precedence over pause/countdown visually)
    else if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'; ctx.fillRect(0, 0, gameAreaWidth, gameAreaHeight);
        // ... (game over message logic - same as before) ...
        let message = ""; let msgColor = color('--error-color'); let detailText = ""; if (isSprintMode) { const goalReached = linesCleared >= sprintLineGoal; message = goalReached ? `COMPLETE!` : "GAME OVER"; msgColor = goalReached ? color('--success-color') : color('--error-color'); detailText = goalReached ? `Time: ${formatTime(finalTime)}` : `Lines: ${linesCleared} / ${sprintLineGoal}`; } else { message = "GAME OVER"; msgColor = color('--error-color'); detailText = `Score: ${score}`; } ctx.font = `30px ${fontFamily}`; ctx.fillStyle = msgColor; ctx.fillText(message, gameAreaWidth / 2, gameAreaHeight / 2 - 25); ctx.font = `16px ${fontFamily}`; ctx.fillStyle = color('--text-color'); ctx.fillText(detailText, gameAreaWidth / 2, gameAreaHeight / 2 + 5); ctx.font = `14px ${fontFamily}`; ctx.fillStyle = color('--prompt-color'); ctx.fillText("Click/F4 to Play Again", gameAreaWidth / 2, gameAreaHeight / 2 + 30);
    }
    // Paused message (shown if paused)
    else if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, gameAreaWidth, gameAreaHeight);
        ctx.font = `30px ${fontFamily}`; ctx.fillStyle = color('--warning-color'); ctx.fillText("PAUSED", gameAreaWidth / 2, gameAreaHeight / 2 - 20);
        ctx.font = `14px ${fontFamily}`; ctx.fillStyle = color('--prompt-color');
        ctx.fillText("(Window Not Active)", gameAreaWidth / 2, gameAreaHeight / 2 + 10);
    }
}

function resetDropTimer() {
    if (dropTimer) clearInterval(dropTimer); dropTimer = null; // Clear existing if any
    if (gameRunning && !isPaused && !isGameOver && countdownValue < 0) { // Only start if game running AND countdown finished
        dropTimer = setInterval(() => {
            movePieceDown(false);
        }, dropInterval);
    }
}

function movePieceDown(isManualDrop = false) {
    if (!gameRunning || isPaused || isGameOver || !currentPiece) return;
    const movedPiece = { ...currentPiece, y: currentPiece.y + 1 };
    if (isValidMove(movedPiece, board)) {
        currentPiece = movedPiece;
        // Reset lock delay *only* if the piece moved down successfully
        // And only if it was potentially in a lock state
        if (canLock) {
            canLock = false; lockDelayResets = 0;
            clearLockDelayTimer();
            clearForceLockTimer(); // Also clear force lock timer
        }
    } else { // Cannot move down
        // Start lock delay *only* if not already started AND if this wasn't just an SDR tick
        // (We let the main drop timer handle lock delay initiation)
        if (!canLock && !isManualDrop) { // Check !isManualDrop or !isSoftDropping ? Let's use !isManualDrop for now.
            canLock = true;
            startLockDelayTimer();
            startForceLockTimer();
        } else if (isManualDrop && !canLock) {
            // If manual drop (SDR) hits bottom, maybe initiate lock slightly faster?
            // Or just let the natural drop interval trigger it. Let's stick to natural for now.
        }
    }
     // Force redraw needed? Game loop should handle it.
     // drawGame();
}

function fillBag() {
    const pieces = [0, 1, 2, 3, 4, 5, 6];
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    currentBag = pieces;
    bagIndex = 0;
}

function startLockDelayTimer() {
    clearLockDelayTimer();
    if (!canLock || isGameOver || isPaused || !gameRunning) return;
    lockDelayTimer = setTimeout(() => {
        const checkStillStuck = {
            ...currentPiece,
            y: currentPiece.y + 1
        };
        if (!isValidMove(checkStillStuck, board)) {
            forceLockPiece();
        } else {
            canLock = false;
            lockDelayTimer = null;
            lockDelayResets = 0;
        }
    }, LOCK_DELAY_MS);
}

function clearLockDelayTimer() {
    if (lockDelayTimer) {
        clearTimeout(lockDelayTimer);
        lockDelayTimer = null;
    }
}

function resetLockDelayTimerIfPossible() {
    if (canLock && lockDelayTimer !== null && lockDelayResets < MAX_LOCK_DELAY_RESETS) {
        lockDelayResets++;
        startLockDelayTimer();
        return true;
    }
    return false;
}

function calculateGhostPosition(piece, board) {
    if (!piece) return -1;
    let ghostY = piece.y;
    let testPiece = {
        ...piece
    };
    while (true) {
        testPiece.y = ghostY + 1;
        if (isValidMove(testPiece, board)) {
            ghostY++;
        } else {
            break;
        }
    }
    return ghostY;
}

function drawGhostPiece(piece, ghostY) {
    if (!ctx || !piece || ghostY < piece.y) return;

    const {
        shape,
        x,
        colorIndex
    } = piece;
    const ghostAlpha = 0.3;

    const colorVarName = SHAPE_COLORS[colorIndex - 1];
    let baseColorCSS = color(colorVarName, 1) || '#888888';
    let ghostFillColor = `rgba(128, 128, 128, ${ghostAlpha})`;

    try {
        const tempDiv = document.createElement('div');
        tempDiv.style.color = baseColorCSS;
        document.body.appendChild(tempDiv);
        const computedColor = getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);

        if (computedColor.startsWith('rgb')) {
            const match = computedColor.match(/rgb(?:a)?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            if (match) {
                ghostFillColor = `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${ghostAlpha})`;
            }
        }
    } catch (e) {
       }

    ctx.fillStyle = ghostFillColor;

    shape.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) {
                const drawX = (x + c) * BLOCK_SIZE;
                const drawY = (ghostY + r) * BLOCK_SIZE;
                if (ghostY + r >= 0) {
                    ctx.fillRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
                 }
            }
        });
    });
}

function holdPiece() {
    if (!canHold || isGameOver || isPaused || !gameRunning || !currentPiece) return;
    clearTimers(); // <<< Clear ALL timers before hold
    canLock = false; lockDelayResets = 0;
    // ... (rest of hold logic) ...
    const currentPieceIndex = currentPiece.colorIndex - 1;
    if (heldPieceIndex === null) {
        heldPieceIndex = currentPieceIndex; currentPiece = nextPiece;
        if (!currentPiece) { isGameOver = true; gameRunning = false; return; }
        nextPiece = getRandomPiece();
        if (!isValidMove(currentPiece, board)) { isGameOver = true; gameRunning = false; currentPiece = null; }
    } else {
        const previouslyHeldIndex = heldPieceIndex; heldPieceIndex = currentPieceIndex;
        const shape = SHAPES[previouslyHeldIndex]; const colorIndex = previouslyHeldIndex + 1;
        let minR = shape.length, maxR = -1, minC = shape[0].length, maxC = -1; shape.forEach((row, r) => row.forEach((cell, c) => { if (cell) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); } })); if (maxR === -1) { minR = 0; maxR = 0; minC = 0; maxC = 0; } const pieceGridWidth = maxC - minC + 1; let initialY = (previouslyHeldIndex === 0) ? (0 - minR) : (-1 - minR); let initialX = Math.floor(COLS / 2) - Math.floor(pieceGridWidth / 2) - minC;
        currentPiece = { shape, colorIndex: colorIndex, y: initialY, x: initialX };
        if (!isValidMove(currentPiece, board)) { isGameOver = true; gameRunning = false; currentPiece = null; }
    }
    canHold = false;
    if(gameRunning && !isPaused && !isGameOver) resetDropTimer();
}

function forceLockPiece() {
    if (!currentPiece || isGameOver || isPaused || !gameRunning) return;

    clearTimers();
    canLock = false; lockDelayResets = 0;

    let isLockingAboveBoard = false;
    const { shape, y: lockedY } = currentPiece;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] && (lockedY + r < 0)) {
                isLockingAboveBoard = true;
                break;
            }
        }
        if (isLockingAboveBoard) break;
    }

    mergePieceToBoard(currentPiece, board);

    if (isLockingAboveBoard) {
        isGameOver = true; gameRunning = false; currentPiece = null;
        // --- UPDATED SCORE SAVING (Level Mode Game Over - Lockout) ---
        if (!isSprintMode) {
            if (tetrisContext?.saveGameScore) {
                const username = tetrisContext.getState?.('username') || 'GUEST_TETRIS';
                tetrisContext.saveGameScore('tetris', currentGameModeKey, username, score, false) // isTimeValue = false
                    .then(success => console.log(`Tetris Level score save attempt (lockout): ${success}`))
                    .catch(err => console.error("Error saving Tetris Level score (lockout):", err));
            } else {
                console.warn("Tetris context or saveGameScore function not available, cannot save Level score (lockout).");
            }
        }
        // --- END UPDATE ---
        return; // Exit after game over
    }

    const linesRemoved = clearLines(board);
    updateGameProgress(linesRemoved); // updateGameProgress now handles Sprint win saving

    // Check if Sprint mode just ended in updateGameProgress
    if (isGameOver && isSprintMode) {
        return; // Don't spawn next piece if sprint just ended
    }

    canHold = true;
    const pieceToSpawn = nextPiece;

    if (!pieceToSpawn) {
        isGameOver = true; gameRunning = false; currentPiece = null;
        // --- UPDATED SCORE SAVING (Level Mode Game Over - Next Piece Fail) ---
        if (!isSprintMode) {
            if (tetrisContext?.saveGameScore) {
                const username = tetrisContext.getState?.('username') || 'GUEST_TETRIS';
                tetrisContext.saveGameScore('tetris', currentGameModeKey, username, score, false) // isTimeValue = false
                    .then(success => console.log(`Tetris Level score save attempt (nextPiece fail): ${success}`))
                    .catch(err => console.error("Error saving Tetris Level score (nextPiece fail):", err));
            } else {
                 console.warn("Tetris context or saveGameScore function not available, cannot save Level score (nextPiece fail).");
            }
        }
        // --- END UPDATE ---
        return;
    }

    nextPiece = getRandomPiece();
    let spawnPositionPrimary = { ...pieceToSpawn };
    let spawnPositionAlternative = { ...pieceToSpawn, y: pieceToSpawn.y - 1 };
    let finalSpawnPosition = null;

    if (isValidMove(spawnPositionPrimary, board)) {
        finalSpawnPosition = spawnPositionPrimary;
    } else if (isValidMove(spawnPositionAlternative, board)) {
        finalSpawnPosition = spawnPositionAlternative;
    } else {
        isGameOver = true; gameRunning = false; currentPiece = null; finalSpawnPosition = null;
        // --- UPDATED SCORE SAVING (Level Mode Game Over - Spawn Fail) ---
        if (!isSprintMode) {
            if (tetrisContext?.saveGameScore) {
                const username = tetrisContext.getState?.('username') || 'GUEST_TETRIS';
                tetrisContext.saveGameScore('tetris', currentGameModeKey, username, score, false) // isTimeValue = false
                    .then(success => console.log(`Tetris Level score save attempt (spawn fail): ${success}`))
                    .catch(err => console.error("Error saving Tetris Level score (spawn fail):", err));
            } else {
                 console.warn("Tetris context or saveGameScore function not available, cannot save Level score (spawn fail).");
            }
        }
        // --- END UPDATE ---
    }

    currentPiece = finalSpawnPosition;
    if (currentPiece) {
        canLock = false; lockDelayResets = 0; // Reset lock state for new piece
    }
    if (gameRunning && !isGameOver && !isPaused) {
        resetDropTimer(); // Restart drop timer if game continues
    }
}

function hardDrop() {
    if (!gameRunning || isPaused || isGameOver || !currentPiece) return;
    clearTimers(); // <<< Clear ALL timers before hard drop
    canLock = false; lockDelayResets = 0;
    // ... (rest of hard drop logic) ...
    let piece = { ...currentPiece }; let testY = piece.y;
    while (true) { piece.y = testY + 1; if (isValidMove(piece, board)) { testY++; } else { break; } }
    currentPiece.y = testY;
    forceLockPiece(); // Lock immediately
}

function attemptMove(dx, dy) {
    if (!gameRunning || isPaused || isGameOver || !currentPiece) return false;

    const movedPiece = {
        ...currentPiece,
        x: currentPiece.x + dx,
        y: currentPiece.y + dy
    };

    if (isValidMove(movedPiece, board)) {
        currentPiece = movedPiece;
        if (canLock) {
            resetLockDelayTimerIfPossible();
        }
        return true;
    }
    return false;
}

function tryRotation(rotationFunction) {
    if (!gameRunning || isPaused || isGameOver || !currentPiece) return false;

    const rotated = rotationFunction(currentPiece);
    // Standard SRS kick offsets (can be expanded for full SRS if needed)
    // Order: 0->R, R->0, R->L, L->R, L->0, 0->L, 0->T, T->0, T->R, R->T, T->L, L->T
    // Simplified set often works for basic kicks:
    const kickOffsets = [
        [0, 0],   // No kick
        [-1, 0],  // Left 1
        [1, 0],   // Right 1
        [0, -1],  // Up 1 (less common, but useful sometimes) - REMOVED FOR NOW, usually kick down first
        [-2, 0],  // Left 2 (for I piece)
        [2, 0],   // Right 2 (for I piece)
        [0, 1],   // Down 1 (If needed - add to handle floor kicks)
        // More complex kicks for T-spins etc. would go here if implementing full SRS
        [-1, 1],  // Diagonal down-left
        [1, 1],   // Diagonal down-right
        [-1, -1], // Diagonal up-left
        [1, -1],  // Diagonal up-right
    ];
    let rotatedSuccessfully = false;

    for (let offset of kickOffsets) {
        // Apply offset relative to the *original* piece position BEFORE rotation was applied conceptually
        const kickedPiece = { ...rotated, x: currentPiece.x + offset[0], y: currentPiece.y + offset[1] };

        if (isValidMove(kickedPiece, board)) {
            const movedUp = kickedPiece.y < currentPiece.y; // Check if kick moved piece upwards
            currentPiece = kickedPiece; // Apply the successful rotation/kick

            if (movedUp) { // If kicked upwards, definitely reset lock state
                canLock = false;
                clearLockDelayTimer();
                clearForceLockTimer(); // Also clear force lock timer
                lockDelayResets = 0;
            } else { // If not kicked upwards, try to reset lock delay if possible
                resetLockDelayTimerIfPossible();
                // Also reset force lock timer on any successful rotation, even if not kicked up
                clearForceLockTimer();
            }

            rotatedSuccessfully = true;
            break; // Exit loop once valid rotation found
        }
    }

    // --- Movement Interruption (AFTER checking all kicks) ---
    if (rotatedSuccessfully) {
        clearDasArrSdrTimers(); // Clear any pending DAS or active SDR

        // Immediately restart ARR if the key is still held
        const direction = isMovingLeft ? 'left' : (isMovingRight ? 'right' : null);
        if (direction) {
             // Don't wait for DAS, start ARR directly if the key is held
             startARR(direction);
        }
    }
    // --- End Movement Interruption ---

    return rotatedSuccessfully;
}

function handleKeyDown(evt) {
    if (!gameActive || !tetrisWindowElement || !tetrisWindowElement.classList.contains('active-window')) {
         if (evt.key === 'F4' && gameActive) { evt.preventDefault(); restartGame(); }
        return;
    }
    const allowGameplayKeys = gameRunning && !isPaused && !isGameOver;
    if (evt.key === 'F4') {
         evt.preventDefault();
         restartGame();
         return;
    }

    if (!allowGameplayKeys) {
        return;
    }

    // --- MODIFICATION: Add 'x' to preventDefault list ---
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'c', 'C', 'x'].includes(evt.key)) {
        evt.preventDefault();
    }

    switch (evt.key) {
        case 'ArrowLeft':
        case 'a':
            // ... (no change needed for left movement) ...
             if (!isMovingLeft) {
                isMovingLeft = true;
                isMovingRight = false;
                clearDasArrSdrTimers();
                if (attemptMove(-1, 0)) {
                    dasTimerId = setTimeout(() => {
                        if(isMovingLeft) startARR('left');
                    }, currentDas);
                } else {
                    isMovingLeft = false; // Reset if initial move failed
                }
            }
            break;
        case 'ArrowRight':
        case 'd':
            // ... (no change needed for right movement) ...
             if (!isMovingRight) {
                isMovingRight = true;
                isMovingLeft = false;
                clearDasArrSdrTimers();
                if (attemptMove(1, 0)) {
                    dasTimerId = setTimeout(() => {
                         if(isMovingRight) startARR('right');
                    }, currentDas);
                } else {
                     isMovingRight = false; // Reset if initial move failed
                }
            }
            break;
        case 'ArrowDown':
        case 's':
            // ... (no change needed for soft drop) ...
            if (!isSoftDropping) { // First press for soft drop
                isSoftDropping = true;
                clearDasArrSdrTimers(); // Stop horizontal movement when soft dropping
                isMovingLeft = false;
                isMovingRight = false;

                movePieceDown(true); // Initial move
                // Start SDR interval
                sdrTimerId = setInterval(() => {
                     if (!gameRunning || isPaused || isGameOver) {
                         clearDasArrSdrTimers(); isSoftDropping = false; return;
                     }
                     movePieceDown(true);
                     // Optional: Score bonus for soft drop
                     // if (!isSprintMode) score += 1;
                }, currentSdr);
            }
            break;
        // --- MODIFICATION: Use tryRotation for both directions ---
        case 'ArrowUp':
        case 'w':
            tryRotation(rotatePiece); // Clockwise
            break;
        case 'x': // NEW CASE
            tryRotation(rotatePieceCounterClockwise); // Counter-clockwise
            break;
        // --- END MODIFICATION ---
        case ' ': // Hard drop
            hardDrop();
            break;
        case 'c':
        case 'C':
            holdPiece();
            break;
    }
}

function handleKeyUp(evt) {
    if (!gameActive) return;

   switch (evt.key) {
       case 'ArrowLeft':
       case 'a':
           isMovingLeft = false;
           if (!isMovingRight) clearDasArrSdrTimers(); // Stop timers if other key isn't held
           break;
       case 'ArrowRight':
       case 'd':
           isMovingRight = false;
            if (!isMovingLeft) clearDasArrSdrTimers(); // Stop timers if other key isn't held
           break;
       case 'ArrowDown':
       case 's':
           if(isSoftDropping) {
               isSoftDropping = false;
               if (sdrTimerId) {
                   clearInterval(sdrTimerId);
                   sdrTimerId = null;
               }
           }
           break;
   }
}

function handleTetrisWindowClick(evt) {
    if (!gameActive) return; // Don't handle clicks if not initialized

   if (isGameOver) {
       restartGame(); // Use F4 logic for consistency
   } else if (isPaused) {
       resumeGame(); // Resume if paused
   }
   // Ignore clicks during active gameplay or countdown
}

function startARR(direction) {
    clearDasArrSdrTimers(); // Clear other movement timers

    const move = () => {
        if (!gameRunning || isPaused || isGameOver) {
            clearDasArrSdrTimers(); return;
        }
        if (direction === 'left' && isMovingLeft) {
            if (!attemptMove(-1, 0)) clearDasArrSdrTimers();
        } else if (direction === 'right' && isMovingRight) {
            if (!attemptMove(1, 0)) clearDasArrSdrTimers();
        } else {
            clearDasArrSdrTimers();
        }
    };

    if ((direction === 'left' && !isMovingLeft) || (direction === 'right' && !isMovingRight)) {
        return;
    }

    // Initial move already happened on keydown, just start interval
    arrTimerId = setInterval(move, currentArr);
}

function clearDasArrSdrTimers() { // Renamed and added SDR
    if (dasTimerId) { clearTimeout(dasTimerId); dasTimerId = null; }
    if (arrTimerId) { clearInterval(arrTimerId); arrTimerId = null; }
    if (sdrTimerId) { clearInterval(sdrTimerId); sdrTimerId = null; } // Clear SDR
}

export function pauseGame() {
    // Only pause if the game is actually running (not in countdown, game over, or already paused)
    if (gameRunning && !isPaused && !isGameOver) {
        // isPaused = true; // Set paused flag FIRST
        // gameRunning = false; // Stop game logic *after* setting pause flag
        const wasRunning = gameRunning;
        gameRunning = false; // Stop game logic updates
        isPaused = true;    // Set paused state

        console.log("Tetris Pausing. Was running:", wasRunning);


        clearTimers(); // Clear ALL timers on pause

        if (isSprintMode) {
            pauseStartTime = Date.now(); // Record when pause started
        }

        if (canvas) canvas.classList.add('tetris-paused-blur');
        // Draw immediately to show paused state
        // Draw function will check isPaused flag
        // if(animationFrameId) drawGame(); // Draw if loop was running
        console.log("Tetris Paused.");
    } else if (countdownValue > 0) {
        // If pausing during countdown
        isPaused = true; // Set paused flag
        if (countdownTimerId) clearTimeout(countdownTimerId); // Stop countdown timer
        countdownTimerId = null;
        if (canvas) canvas.classList.add('tetris-paused-blur');
         // if(animationFrameId) drawGame(); // Draw paused state over countdown
        console.log("Tetris Paused during countdown.");
    }
}

export function resumeGame() {
    if (isPaused) { // Only resume if paused
        isPaused = false; // Unset pause flag FIRST

        if (canvas) canvas.classList.remove('tetris-paused-blur');

        if (countdownValue >= 0) { // If paused during countdown or "GO!"
            console.log("Tetris Resuming countdown from", countdownValue);
            // Restart the countdown process from where it left off
            startCountdown(true); // Pass flag to indicate it's a resume

        } else if (!isGameOver) { // If paused during active gameplay
             gameRunning = true; // Resume game logic updates
             console.log("Tetris Resuming gameplay.");

             if (isSprintMode && pauseStartTime > 0) {
                 const pauseDuration = Date.now() - pauseStartTime;
                 startTime += pauseDuration; // Adjust start time to account for pause
                 pauseStartTime = 0;
             }

             // Restart necessary timers
             resetDropTimer();
             if (canLock) { // If piece was mid-lock delay when paused
                 startLockDelayTimer(); // Restart lock delay
                 clearForceLockTimer(); // Reset force lock timer
             }
             // DAS/ARR will restart automatically on next key press if needed
        }
        // No need to restart animationFrameId, gameLoop should handle it
        console.log("Tetris Resumed.");
    }
}

function restartGame() {
    if (!gameActive) return; // Don't restart if not initialized
    console.log("Restarting Tetris game...");
    startGameFlow();
}

function startCountdown(isResuming = false) {
    clearTimers(); // Ensure no other game timers interfere
    gameRunning = false; // Logic not running during countdown

    if (!isResuming) {
        countdownValue = 1; // 1 for "Ready"
        console.log("Starting Tetris countdown: Ready...");
    } else if (countdownValue < 0) {
         console.log("Resuming, but countdown wasn't active. Starting logic.");
         startGameLogic(); // Go straight to game logic if resuming not during countdown
         return;
    } else {
         console.log("Resuming Tetris countdown from", countdownValue === 1 ? "Ready" : "GO!");
    }

    const countdownTick = () => {
        if (!gameActive || isPaused) {
             console.log("Countdown tick stopped (gameActive:", gameActive, "isPaused:", isPaused, ")");
             if (!isPaused) clearTimers();
             return;
        }
        // drawGame() is handled by the main gameLoop now

        if (countdownValue === 1) { // Currently showing "Ready"
            countdownValue = 0; // Move to "GO!" state
            countdownTimerId = setTimeout(countdownTick, 800); // Show "Ready" for 800ms
        } else if (countdownValue === 0) { // Currently showing "GO!"
             countdownValue = -1; // Countdown finished
             countdownTimerId = setTimeout(() => {
                 if(gameActive && !isPaused) { // Final check before starting logic
                    startGameLogic(); // Start the actual game
                 } else {
                     console.log("Countdown finished, but game not active or paused. Not starting logic.");
                 }
             }, 100); // Show "GO!" for only 100ms before starting game logic
        }
    };

    if (!isPaused) { // Only start timer if not paused
        countdownTimerId = setTimeout(countdownTick, 200); // Short delay before showing "Ready"
    }
}


function startGameLogic() {
    console.log("Tetris startGameLogic called (post-countdown)");
    if (!gameActive || isPaused || isGameOver) { // Added isPaused/isGameOver check
        console.log("startGameLogic aborted (inactive/paused/gameover)");
        return;
    }

    // --- Assign Current Piece from Next, Generate New Next ---
    currentPiece = nextPiece;
    nextPiece = getRandomPiece();

    // --- Reset flags needed JUST before gameplay ---
    canLock = false;
    lockDelayResets = 0;
    countdownValue = -1; // Explicitly mark countdown as done

    // --- Set Start Time for Sprint ---
    if (isSprintMode) {
        startTime = Date.now(); // <<< Set actual start time *here*
        elapsedTime = 0; // Ensure elapsed time starts at 0
    }


    // Validate the piece we just assigned
    if (!currentPiece || !isValidMove(currentPiece, board)) {
        isGameOver = true; gameRunning = false; currentPiece = null;
        console.error("Tetris immediate game over on start (piece validation failed)!");
    } else {
        gameRunning = true; // ****** Set gameRunning to true ******
    }

    // Clear only movement/lock timers that might linger from previous states if needed
    // clearTimers(); // Probably not needed here as startGameFlow clears them

    if (gameRunning) {
        resetDropTimer(); // Start the piece dropping
    } else {
        // gameLoop handles drawing game over state
    }
    console.log("Tetris Game Logic Started.");
}

function gameLoop() {
    if (!gameActive) { // Check if stopped
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log("gameLoop stopping because !gameActive");
        return;
    }

   if (!isPaused) { // Only update timer if not paused
       if (gameRunning && !isGameOver && isSprintMode) {
           elapsedTime = Date.now() - startTime; // Update sprint timer
       }
   }

   // Always draw the current state (including paused, game over, countdown)
   drawGame();

   // Only request next frame if the game hasn't been stopped
   animationFrameId = requestAnimationFrame(gameLoop);
}

export function initTetris(mainCanvasElement, _ignored_, windowDivElement, modeKey = 'medium', context) { // context already passed here
    if (!mainCanvasElement || !windowDivElement) { console.error("Tetris Init Error: Canvas or Window element missing."); return; }
    if (!context) { console.error("Tetris Init Error: Context object not provided."); return; } // Check context
    tetrisContext = context; // Store context
    if (!GAME_MODES[modeKey]) { console.warn(`Tetris Init Warning: Invalid modeKey '${modeKey}', defaulting to 'medium'.`); modeKey = 'medium'; }

    // Stop previous instance if active
    if (gameActive) { stopTetris(); }

    // --- Setup Instance Variables ---
    canvas = mainCanvasElement;
    tetrisWindowElement = windowDivElement;
    currentGameModeKey = modeKey;
    gameActive = true; // Mark as active *now*

    ctx = canvas.getContext('2d');
    if (!ctx) { console.error("Tetris Init Error: Failed to get 2D context."); gameActive = false; tetrisContext = null; return; }

    canvas.width = (COLS * BLOCK_SIZE) + UI_AREA_WIDTH;
    canvas.height = ROWS * BLOCK_SIZE;

    // --- Add Event Listeners ---
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    if (tetrisWindowElement) tetrisWindowElement.addEventListener('mousedown', handleTetrisWindowClick);

    // --- Initiate Game Flow (Countdown -> Start) ---
    startGameFlow(); // Starts the "Ready, GO!" sequence

    // --- Handle Initial Pause State ---
    if (!tetrisWindowElement || !tetrisWindowElement.classList.contains('active-window')) {
        setTimeout(() => {
            if (gameActive && (!tetrisWindowElement || !tetrisWindowElement.classList.contains('active-window'))) {
                pauseGame();
            }
        }, 50);
    }

    // --- Start Render Loop ---
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    gameLoop(); // Start rendering

    console.log(`Tetris Initialized (Mode: ${currentGameModeKey})`);
}


function startGameFlow() {
    if (!gameActive) return;
    console.log("Initiating startGameFlow (clear board, setup mode, setup pieces, countdown)");

    // --- Reset Core State Immediately ---
    isGameOver = false;
    isPaused = false;
    gameRunning = false;
    countdownValue = -1;
    clearTimers(); // Clear any previous timers
    if(canvas) canvas.classList.remove('tetris-paused-blur');

    // --- Clear Board & Common Stats ---
    board = createBoard(); // <<< Clear the board data structure
    linesCleared = 0;
    score = 0;
    level = 1;
    heldPieceIndex = null; // Reset hold
    canHold = true;
    isMovingLeft = false; isMovingRight = false; isSoftDropping = false; // Reset movement

    // *** SETUP MODE-SPECIFIC VARS HERE ***
    const settings = GAME_MODES[currentGameModeKey];
    console.log(`[startGameFlow] ModeKey: ${currentGameModeKey}, Settings:`, settings); // Debug log

    if (!settings) {
        console.error(`[startGameFlow] ERROR: Could not find settings for modeKey: ${currentGameModeKey}. Defaulting to medium.`);
        currentGameModeKey = 'medium'; // Fallback safely
        const fallbackSettings = GAME_MODES['medium'];
        isSprintMode = false;
        dropInterval = fallbackSettings.levelSpeed;
        sprintLineGoal = 0; startTime = 0; elapsedTime = 0; pauseStartTime = 0; finalTime = 0;
    } else {
        isSprintMode = settings.type === 'sprint';
        dropInterval = settings.levelSpeed; // Set correct initial speed
        console.log(`[startGameFlow] isSprintMode: ${isSprintMode}, dropInterval: ${dropInterval}`); // Debug log

        if (isSprintMode) {
            sprintLineGoal = settings.lineGoal;
            // Reset sprint timer variables, but startTime is set in startGameLogic
            startTime = 0; elapsedTime = 0; pauseStartTime = 0; finalTime = 0;
        } else {
            sprintLineGoal = 0; startTime = 0; elapsedTime = 0; pauseStartTime = 0; finalTime = 0;
            // Level/Score already reset above
        }
    }
    // *** END MODE-SPECIFIC SETUP ***


    // --- Setup Initial Pieces ---
    fillBag(); // Ensure bag is ready
    currentPiece = null; // No current piece initially
    nextPiece = getRandomPiece(); // Generate the first piece into "Next"


    // --- Draw the Initial Cleared State ---
    // drawUI will now use the correct isSprintMode flag set above
    drawGame(); // Draw immediately before countdown starts


    startCountdown(); // Start the "Ready, GO!" sequence
}



export function stopTetris() {
    // ... (Same as previous 'stopTetris' - ensuring gameActive=false, clearTimers, cancelAnimationFrame, remove listeners, reset state, nullify refs) ...
    console.log("Stopping Tetris game...");
    const wasActive = gameActive;
    gameRunning = false; isPaused = false; isGameOver = false; gameActive = false; // Mark as stopped

    clearTimers(); // Clear ALL timers

    if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }

    if (canvas) canvas.classList.remove('tetris-paused-blur');

    if (wasActive) { // Only remove listeners if they were added
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        if (tetrisWindowElement) {
            tetrisWindowElement.removeEventListener('mousedown', handleTetrisWindowClick);
        }
    }

    // Reset state variables
    board = []; currentPiece = null; nextPiece = null; heldPieceIndex = null;
    score = 0; level = 1; linesCleared = 0;
    isSprintMode = false; sprintLineGoal = 0; startTime = 0; elapsedTime = 0; pauseStartTime = 0; finalTime = 0;
    currentBag = []; bagIndex = 0;
    isMovingLeft = false; isMovingRight = false; isSoftDropping = false;
    countdownValue = -1; // Ensure countdown state is invalid

    tetrisContext = null;
    if (ctx) { ctx.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0); }
    canvas = null; ctx = null; tetrisWindowElement = null;

    console.log("Tetris Stopped and Cleaned Up");
}

function startForceLockTimer() {
    clearForceLockTimer();
    if (!canLock || isGameOver || isPaused || !gameRunning) return;

    if (forceLockStartTime === 0) {
        forceLockStartTime = Date.now();
    }

    forceLockTimerId = setTimeout(() => {
        console.log(`Force lock timer triggered after ${FORCE_LOCK_DELAY_MS}ms!`);
        if (currentPiece && gameRunning && !isPaused && !isGameOver) {
             const checkStillStuck = { ...currentPiece, y: currentPiece.y + 1 };
             if (!isValidMove(checkStillStuck, board)) {
                 forceLockPiece();
             } else {
                 canLock = false;
                 clearLockDelayTimer();
                 clearForceLockTimer();
             }
        } else {
             clearForceLockTimer();
        }
    }, FORCE_LOCK_DELAY_MS);
}

function clearForceLockTimer() {
    if (forceLockTimerId) {
        clearTimeout(forceLockTimerId);
        forceLockTimerId = null;
    }
    forceLockStartTime = 0;
}

function clearTimers() {
    if (dropTimer) clearInterval(dropTimer); dropTimer = null;
    clearLockDelayTimer();
    clearForceLockTimer();
    clearDasArrSdrTimers();
    if (countdownTimerId) clearTimeout(countdownTimerId); countdownTimerId = null;
     // Don't clear animationFrameId here, gameLoop handles it
     // if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
}