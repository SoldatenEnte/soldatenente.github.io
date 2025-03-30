const canvas = document.getElementById('textWallCanvas');
const ctx = canvas.getContext('2d');

// --- Configuration ---
const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam sodales hendrerit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam sodales hendrerit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam sodales hendrerit.`;

const inputText = LOREM_IPSUM;
const words = inputText.split(/\s+/); // Split into words

const MIN_CHUNK_SIZE = 2;
const MAX_CHUNK_SIZE = 5; // Allow slightly larger chunks
const FONT_SIZE = 24;
const LINE_HEIGHT = FONT_SIZE * 1.5;
const CANVAS_PADDING = 50; // Left/Right padding for text lines

// --- Animation Randomness ---
const MIN_FALL_SPEED = 0.4;
const MAX_FALL_SPEED = 1.2; // Wider speed range
const MIN_SINE_AMPLITUDE = 15;
const MAX_SINE_AMPLITUDE = 60; // Wider amplitude range
const MIN_SINE_FREQUENCY = 0.005;
const MAX_SINE_FREQUENCY = 0.02; // Wider frequency range

// --- Timing Control ---
// Controls how many frames between the *target landing time* of consecutive chunks.
// Lower value = faster text appearance. Higher value = slower.
const CHUNK_LANDING_INTERVAL_FRAMES = 5; // Make text appear reasonably fast
const LINE_START_DELAY_FRAMES = 30; // Delay before the first chunk of a new line starts falling

const LANDING_DURATION_FRAMES = 20; // How long the smooth landing interpolation takes

// --- State Variables ---
let wrappedLines = []; // Array of strings, where each string is a pre-wrapped line
let preparedChunks = []; // Holds ALL chunks for ALL lines, pre-calculated
let fallingChunks = []; // Chunks currently animating (falling or landing)
let landedChunks = []; // Chunks that have fully landed
let currentLineY = LINE_HEIGHT; // Starting Y for the first line
let frameCount = 0;
let nextChunkIndexToSpawn = 0; // Index into the preparedChunks array

// --- Helper Functions ---

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomChunkSize() {
    return Math.floor(Math.random() * (MAX_CHUNK_SIZE - MIN_CHUNK_SIZE + 1)) + MIN_CHUNK_SIZE;
}

function lerp(start, end, t) {
    t = Math.max(0, Math.min(1, t));
    return start * (1 - t) + end * t;
}

// --- Text Processing ---

function wrapText(textWords, maxWidth) {
    const lines = [];
    let currentLine = '';
    ctx.font = `${FONT_SIZE}px Arial`; // Set font for measurement

    textWords.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            // Word doesn't fit, finalize the previous line (if any)
            if (currentLine) {
                lines.push(currentLine);
            }
            // Start new line with the current word
            currentLine = word;
             // Handle case where a single word is longer than the line - it will overflow
             // A more complex solution would break the word, but let's keep it simple
            if (ctx.measureText(currentLine).width > maxWidth && lines.length > 0) {
                 console.warn("Word longer than line width:", currentLine);
            }
        }
    });

    // Add the last line
    if (currentLine) {
        lines.push(currentLine);
    }
    console.log("Wrapped Lines:", lines);
    return lines;
}

function prepareAllChunks() {
    preparedChunks = []; // Reset
    currentLineY = LINE_HEIGHT;
    let globalChunkIndex = 0;
    // Target time for the *first chunk of the first line* to be fully settled
    let targetSettleTimeBase = frameCount + LINE_START_DELAY_FRAMES + LANDING_DURATION_FRAMES; // Allow time for fall + landing

    ctx.font = `${FONT_SIZE}px Arial`; // Ensure font is set for measurements

    wrappedLines.forEach((lineText, lineIndex) => {
        if (!lineText.trim()) return; // Skip empty lines

        let currentX = CANVAS_PADDING;
        let lineChunkIndex = 0;
        const lineChunksTemp = []; // Temporary array to calculate line timing

        // 1. Split the wrapped line into smaller chunks (same as before)
        let i = 0;
        while (i < lineText.length) {
            const chunkSize = getRandomChunkSize();
            const chunkText = lineText.substring(i, Math.min(i + chunkSize, lineText.length));
             if (chunkText.trim()) {
                 lineChunksTemp.push(chunkText);
             }
            i += chunkText.length;
        }

        // 2. Pre-calculate properties and spawn times for each chunk in the line
        lineChunksTemp.forEach((text) => {
            const textWidth = ctx.measureText(text).width;
            const targetX = currentX;
            const targetY = currentLineY;

            // --- Calculate Animation Parameters (Random) ---
            const speed = getRandom(MIN_FALL_SPEED, MAX_FALL_SPEED);
            const amplitude = getRandom(MIN_SINE_AMPLITUDE, MAX_SINE_AMPLITUDE);
            const frequency = getRandom(MIN_SINE_FREQUENCY, MAX_SINE_FREQUENCY);
            const sineOffset = Math.random() * Math.PI * 2;
            const startY = -FONT_SIZE; // Start above canvas

            // --- Calculate Timing (Revised) ---
            const fallDistance = targetY - startY;
            // Time needed just to fall from startY to targetY
            const fallDurationFrames = fallDistance / speed;

            // Calculate the target frame number when this chunk should be *fully settled*
            // This is sequenced based on its position in the line.
            const targetSettleTime = targetSettleTimeBase + lineChunkIndex * CHUNK_LANDING_INTERVAL_FRAMES;

            // To settle at targetSettleTime, it must *arrive* at targetY at:
            const targetArrivalTimeY = targetSettleTime - LANDING_DURATION_FRAMES;

            // To arrive at targetY at targetArrivalTimeY, it must *spawn* at:
            const spawnFrame = Math.max(frameCount, Math.round(targetArrivalTimeY - fallDurationFrames));
             // Ensure spawnFrame isn't in the past relative to the *current* frameCount when preparing.
             // If calculation results in a past frame, spawn immediately (or very soon).


            preparedChunks.push({
                id: globalChunkIndex, // Unique ID
                text: text,
                targetX: targetX,
                targetY: targetY,
                width: textWidth,
                speed: speed,
                amplitude: amplitude,
                frequency: frequency,
                sineOffset: sineOffset,
                spawnFrame: spawnFrame, // Use the newly calculated spawn frame
                targetSettleTime: targetSettleTime, // Store this for potential debugging/verification
                hasSpawned: false,

                // Initial state when spawned (will be set later)
                x: 0, y: 0, time: 0,
                isLanding: false, landingProgress: 0, startXBeforeLand: 0
            });

            currentX += textWidth;
            lineChunkIndex++;
            globalChunkIndex++;
        });

        currentLineY += LINE_HEIGHT;
        // Update the base settle time for the *next* line.
        // It should start after the last chunk of *this* line has settled, plus a delay.
        if (lineChunksTemp.length > 0) {
             const lastChunkSettleTime = targetSettleTimeBase + (lineChunksTemp.length - 1) * CHUNK_LANDING_INTERVAL_FRAMES;
             // Add the inter-line delay. The next chunk also needs its landing duration accounted for.
             targetSettleTimeBase = lastChunkSettleTime + LINE_START_DELAY_FRAMES;
        } else {
             // If line was empty, just add a small time step before next line potentially starts
             targetSettleTimeBase += CHUNK_LANDING_INTERVAL_FRAMES;
        }
    });
    console.log(`Prepared ${preparedChunks.length} total chunks.`);
    // Sort prepared chunks strictly by spawnFrame to handle any minor calculation overlaps
    // This ensures that if two chunks calculate to the same frame, the one intended earlier appears first.
    preparedChunks.sort((a, b) => a.spawnFrame - b.spawnFrame || a.id - b.id); // Primary sort by spawn, secondary by original order
     console.log('Chunk 0 Target Settle:', preparedChunks[0]?.targetSettleTime, 'Spawn:', preparedChunks[0]?.spawnFrame);
     console.log('Chunk 1 Target Settle:', preparedChunks[1]?.targetSettleTime, 'Spawn:', preparedChunks[1]?.spawnFrame);

}


// --- Animation Logic ---

function updateAndDraw() {
    // Clear canvas
    ctx.fillStyle = '#000'; // Background color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Default text settings (can be overridden per chunk)
    ctx.font = `${FONT_SIZE}px Arial`;
    ctx.textBaseline = 'bottom';
    const baseFillColor = '255, 255, 255'; // Base color (white) as RGB components

    // 1. Spawn new chunks (same as before)
    while (nextChunkIndexToSpawn < preparedChunks.length &&
           frameCount >= preparedChunks[nextChunkIndexToSpawn].spawnFrame)
    {
        const chunkData = preparedChunks[nextChunkIndexToSpawn];
        if (!chunkData.hasSpawned) {
            chunkData.hasSpawned = true;

            // Set initial position and state for animation
             // Use a calculated startX based on where the sine *would* be at spawn, or just random? Let's stick to random offset near target for now.
            chunkData.x = chunkData.targetX + (Math.random() - 0.5) * 50; // Initial random X near target
            chunkData.y = -FONT_SIZE; // Start above screen
            chunkData.time = 0; // Reset animation time counter for sine wave
            chunkData.isLanding = false;
            chunkData.landingProgress = 0;

            // Calculate total animation duration for alpha calculation later
            chunkData.totalAnimDuration = chunkData.targetSettleTime - chunkData.spawnFrame;
            if (chunkData.totalAnimDuration <= 0) {
                 chunkData.totalAnimDuration = 1; // Avoid division by zero, make it instantly opaque
            }


            fallingChunks.push(chunkData);
        }
        nextChunkIndexToSpawn++;
    }


    // 2. Update and draw falling/landing chunks
    const stillAnimating = []; // Chunks still falling or landing
    for (let i = 0; i < fallingChunks.length; i++) {
        const chunk = fallingChunks[i];
        let chunkHasLanded = false;

        // Calculate alpha based on progress towards settlement
        const elapsedFrames = frameCount - chunk.spawnFrame;
        // Ensure progress doesn't exceed 1, especially important before it starts landing
        const rawProgress = Math.max(0, elapsedFrames / chunk.totalAnimDuration);
        const alpha = Math.min(1, rawProgress); // Clamp alpha between 0 and 1

        if (chunk.isLanding) {
            // --- Landing Phase ---
            chunk.landingProgress += 1 / LANDING_DURATION_FRAMES;
            chunk.x = lerp(chunk.startXBeforeLand, chunk.targetX, chunk.landingProgress);
            chunk.y = chunk.targetY; // Lock Y

            if (chunk.landingProgress >= 1) {
                chunk.x = chunk.targetX; // Ensure final position
                chunk.y = chunk.targetY;
                landedChunks.push(chunk); // Move to landed
                chunkHasLanded = true;
                // Don't draw here, let landed section handle it with full alpha
            }

        } else {
            // --- Falling Phase ---
            chunk.y += chunk.speed;
            chunk.time += 1;

            // Calculate sine wave (same as before)
            const distanceToTargetY = Math.max(0, chunk.targetY - chunk.y);
            const dampingFactor = Math.min(1, distanceToTargetY / (LINE_HEIGHT * 3));
            const effectiveAmplitude = chunk.amplitude * dampingFactor * dampingFactor;
            const currentSineX = chunk.targetX + Math.sin(chunk.time * chunk.frequency + chunk.sineOffset) * effectiveAmplitude;
            chunk.x = currentSineX;

            // Check if crossed the landing threshold
            if (chunk.y >= chunk.targetY) {
                chunk.y = chunk.targetY;
                chunk.isLanding = true;
                chunk.landingProgress = 0;
                chunk.startXBeforeLand = chunk.x;
                 // Don't reset alpha here, let it continue increasing during landing
            }
        }

        // Draw the chunk if it hasn't fully landed yet in *this frame*
         if (!chunkHasLanded) {
             // Set the fill style with calculated alpha
             ctx.fillStyle = `rgba(${baseFillColor}, ${alpha})`;
             ctx.fillText(chunk.text, chunk.x, chunk.y);
             stillAnimating.push(chunk); // Keep animating it
         }
    }
    fallingChunks = stillAnimating; // Update the list of animating chunks


    // 3. Draw fully landed chunks (ensure they are fully opaque)
    ctx.fillStyle = `rgba(${baseFillColor}, 1)`; // Set to full alpha for landed chunks
    for (let i = 0; i < landedChunks.length; i++) {
        const chunk = landedChunks[i];
        // Draw at final target position
        ctx.fillText(chunk.text, chunk.targetX, chunk.targetY);
    }

    // 4. Check if animation is complete (same as before)
    if (landedChunks.length === preparedChunks.length && preparedChunks.length > 0) {
         console.log("All chunks landed. Animation complete.");
         return; // Stop the animation loop
    }


    frameCount++;
    requestAnimationFrame(updateAndDraw); // Loop the animation
}

// --- Initialization ---

function setup() {
    // Reset state completely
    frameCount = 0;
    nextChunkIndexToSpawn = 0;
    fallingChunks = [];
    landedChunks = [];
    preparedChunks = [];

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Calculate available width for text
    const maxLineWidth = canvas.width - (CANVAS_PADDING * 2);
    if (maxLineWidth <= 0) {
         console.error("Canvas too narrow for padding.");
         return; // Avoid errors if canvas is extremely small
    }


    // 1. Wrap text based on canvas width
    wrappedLines = wrapText(words, maxLineWidth);

    // 2. Pre-calculate all chunk data, including spawn times
    prepareAllChunks();

     if (preparedChunks.length === 0) {
         console.warn("No chunks were prepared. Check input text or wrapping logic.");
         return;
     }

    // 3. Start the animation loop
    requestAnimationFrame(updateAndDraw);
}

// --- Start ---
setup();

// --- Resize Handling ---
let resizeTimeout;
window.addEventListener('resize', () => {
    // Debounce resize event
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log("Resizing... Restarting animation.");
        // Stop the current animation loop before restarting
        // How to reliably stop requestAnimationFrame? We can't directly.
        // The best way is to prevent the *next* call within the loop,
        // but since setup() starts a new one, we just reset state.
        setup(); // Re-calculate everything and restart
    }, 250); // Wait 250ms after resize stops
});