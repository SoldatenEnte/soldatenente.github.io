const canvas = document.getElementById('textWallCanvas');
const ctx = canvas.getContext('2d');

// Configuration
const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam sodales hendrerit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam sodales hendrerit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam sodales hendrerit.`;

const inputText = LOREM_IPSUM;
const words = inputText.split(/\s+/);

const MIN_CHUNK_SIZE = 2;
const MAX_CHUNK_SIZE = 5;
const FONT_SIZE = 24;
const LINE_HEIGHT = FONT_SIZE * 1.5;
const CANVAS_PADDING = 50; // Padding on left/right for text lines

// Animation Randomness
const MIN_FALL_SPEED = 0.4;
const MAX_FALL_SPEED = 1.2;
const MIN_SINE_AMPLITUDE = 15;
const MAX_SINE_AMPLITUDE = 60;
const MIN_SINE_FREQUENCY = 0.005;
const MAX_SINE_FREQUENCY = 0.02;

// Timing Control
// Frames between the *target landing* of consecutive chunks on the same line.
const CHUNK_LANDING_INTERVAL_FRAMES = 5;
// Delay before the first chunk of a *new line* starts falling (relative to previous line's end).
const LINE_START_DELAY_FRAMES = 30;
// How many frames the smooth landing interpolation takes.
const LANDING_DURATION_FRAMES = 20;

// State Variables
let wrappedLines = []; // Pre-wrapped lines of text based on canvas width
let preparedChunks = []; // Holds ALL chunk objects with pre-calculated properties and timing
let fallingChunks = []; // Chunks currently animating (falling or landing)
let landedChunks = []; // Chunks that have finished animating and are stationary
let frameCount = 0;
let nextChunkIndexToSpawn = 0; // Tracks which chunk from preparedChunks is next

// Helper Functions
function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomChunkSize() {
    return Math.floor(Math.random() * (MAX_CHUNK_SIZE - MIN_CHUNK_SIZE + 1)) + MIN_CHUNK_SIZE;
}

function lerp(start, end, t) {
    // Clamp t between 0 and 1
    t = Math.max(0, Math.min(1, t));
    return start * (1 - t) + end * t;
}

// Text Processing
function wrapText(textWords, maxWidth) {
    const lines = [];
    let currentLine = '';
    // Need the font set to measure text accurately
    ctx.font = `${FONT_SIZE}px Arial`;

    textWords.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth <= maxWidth) {
            // Word fits, add it to the current line
            currentLine = testLine;
        } else {
            // Word doesn't fit, push the previous line
            if (currentLine) {
                lines.push(currentLine);
            }
            // Start a new line with the current word
            currentLine = word;
            // Handle the edge case where a single word is wider than the max width
            if (ctx.measureText(currentLine).width > maxWidth && lines.length > 0) {
                 console.warn("Word longer than line width:", currentLine);
                 // It will just overflow for now
            }
        }
    });

    // Add the very last line
    if (currentLine) {
        lines.push(currentLine);
    }
    console.log(`Wrapped text into ${lines.length} lines.`);
    return lines;
}

// Pre-calculates all chunk properties, including animation timings.
// This is the core logic for the staggered falling effect.
function prepareAllChunks() {
    preparedChunks = [];
    let globalChunkIndex = 0; // Simple ID for debugging/ordering

    const actualLines = wrappedLines.filter(line => line.trim());
    const totalLines = actualLines.length;
    if (totalLines === 0) {
        console.warn("No lines to display after wrapping.");
        return;
    }

    // Text is drawn from bottom up, so calculate Y positions relative to canvas bottom
    const bottomPadding = CANVAS_PADDING; // Use padding for bottom too
    const firstLineY = canvas.height - bottomPadding; // Y position of the *baseline* of the last line

    // --- Calculate Initial Time Buffer ---
    // We need to schedule chunks based on when they *land*. To avoid chunks
    // needing to spawn in the past (negative spawnFrame), we calculate a buffer
    // based on the maximum possible fall time and add it to the schedule.
    const estimatedMaxFallDistance = canvas.height; // From top to bottom
    const safeMinFallSpeed = Math.max(0.01, MIN_FALL_SPEED); // Avoid division by zero
    const estimatedMaxFallDuration = estimatedMaxFallDistance / safeMinFallSpeed;

    // Buffer = estimated slowest fall + landing time + initial delay between lines
    const initialTimeBuffer = Math.ceil(estimatedMaxFallDuration) + LANDING_DURATION_FRAMES + LINE_START_DELAY_FRAMES;
    //console.log(`Initial Time Buffer added: ${initialTimeBuffer} frames`);

    // This is the target frame number when the *very first* chunk (index 0) should finish landing.
    let currentChunkTargetSettleTime = frameCount + initialTimeBuffer;

    ctx.font = `${FONT_SIZE}px Arial`; // Ensure font is set for measurements

    // Iterate through lines (bottom line of text is lineIndex 0 visually)
    actualLines.forEach((lineText, lineIndex) => {
        // Calculate Y position for this specific line (moving upwards from firstLineY)
        const currentLineTargetY = firstLineY - lineIndex * LINE_HEIGHT;
        let currentX = CANVAS_PADDING; // Start X for the first chunk on this line
        const lineChunkData = []; // Temporary array for chunks on this line

        // Split the line into random-sized chunks
        let i = 0;
        while (i < lineText.length) {
            const chunkSize = getRandomChunkSize();
            const chunkText = lineText.substring(i, Math.min(i + chunkSize, lineText.length));
            // Ignore chunks that are only whitespace
            if (chunkText.trim()) {
                lineChunkData.push({ text: chunkText });
            }
            i += chunkText.length;
        }

        // Apply delay *before* processing this line's chunks if it's not the first line.
        // This ensures a pause between the last chunk of the previous line landing
        // and the first chunk of this line landing.
        if (lineIndex > 0 && preparedChunks.length > 0) {
            const lastChunkSettleTime = preparedChunks[preparedChunks.length - 1].targetSettleTime;
            // This line's first chunk should settle *at least* LINE_START_DELAY_FRAMES
            // after the previous line's last chunk settled.
            currentChunkTargetSettleTime = Math.max(currentChunkTargetSettleTime, lastChunkSettleTime + LINE_START_DELAY_FRAMES);
        }

        // Calculate properties for each chunk on this line
        for (let c_idx = 0; c_idx < lineChunkData.length; c_idx++) {
            const chunkInfo = lineChunkData[c_idx];
            const text = chunkInfo.text;
            const textWidth = ctx.measureText(text).width;
            const targetX = currentX; // Final X position when landed
            const targetY = currentLineTargetY; // Final Y position when landed

            // Randomize animation properties
            const speed = getRandom(MIN_FALL_SPEED, MAX_FALL_SPEED);
            const amplitude = getRandom(MIN_SINE_AMPLITUDE, MAX_SINE_AMPLITUDE);
            const frequency = getRandom(MIN_SINE_FREQUENCY, MAX_SINE_FREQUENCY);
            const sineOffset = Math.random() * Math.PI * 2; // Random start phase for sine wave

            // Calculate timing based on landing sequence
            const startY = -FONT_SIZE; // Start position above the canvas
            const fallDistance = targetY - startY;
            const fallDurationFrames = fallDistance / speed;

            // Calculate *this specific chunk's* target settle time based on its sequence in the line.
            // The base `currentChunkTargetSettleTime` already includes the initial buffer and inter-line delays.
            const chunkTargetSettleTime = currentChunkTargetSettleTime + c_idx * CHUNK_LANDING_INTERVAL_FRAMES;

            // When should the chunk *arrive* at targetY to start its landing interpolation?
            const targetArrivalTimeY = chunkTargetSettleTime - LANDING_DURATION_FRAMES;

            // Crucial: Calculate when the chunk needs to *spawn* to arrive at targetArrivalTimeY.
            // Ensure spawn frame isn't in the past relative to the current frameCount.
            const spawnFrame = Math.max(frameCount, Math.round(targetArrivalTimeY - fallDurationFrames));
            // The initialTimeBuffer makes it highly unlikely spawnFrame will be < frameCount initially.

            // Total duration from spawn to full settlement (for alpha fade-in)
            let totalAnimDuration = chunkTargetSettleTime - spawnFrame;
            if (totalAnimDuration <= 0) {
                 totalAnimDuration = 1; // Prevent division by zero, just appear instantly
            }

            preparedChunks.push({
                id: globalChunkIndex,
                text: text,
                targetX: targetX, targetY: targetY, width: textWidth,
                speed: speed, amplitude: amplitude, frequency: frequency, sineOffset: sineOffset,
                spawnFrame: spawnFrame,
                targetSettleTime: chunkTargetSettleTime, // When it should be fully landed
                hasSpawned: false, // Track if it's been added to fallingChunks
                // Dynamic state updated during animation:
                x: 0, y: 0, time: 0, // Current position and time for sine wave
                isLanding: false, landingProgress: 0, startXBeforeLand: 0, // State for landing interpolation
                totalAnimDuration: totalAnimDuration
            });

            currentX += textWidth; // Move X for the next chunk on this line
            globalChunkIndex++;
        }

        // Update the base time reference for the *next* line's delay calculation.
        // The next line's delay should be relative to when *this* line's *last* chunk settles.
        if (lineChunkData.length > 0) {
             currentTargetSettleTime = preparedChunks[preparedChunks.length - 1].targetSettleTime;
        }
        // The LINE_START_DELAY_FRAMES is added at the *start* of the next line's loop.

    }); // End iterating through actualLines

    // Sort all prepared chunks globally by their calculated spawn frame.
    // This ensures they appear in the correct visual order, even if lines overlap in time.
    // Use ID as a tie-breaker for stability.
    preparedChunks.sort((a, b) => a.spawnFrame - b.spawnFrame || a.id - b.id);

    console.log(`Prepared ${preparedChunks.length} total chunks.`);
    // Optional: Log first/last chunk details for debugging timing
    // if(preparedChunks.length > 0) {
    //      const firstChunk = preparedChunks.find(c => c.id === 0);
    //      const lastChunk = preparedChunks[preparedChunks.length - 1];
    //      console.log(`Chunk 0: Target Y: ${firstChunk?.targetY}, Settle: ${firstChunk?.targetSettleTime}, Spawn: ${firstChunk?.spawnFrame}`);
    //      console.log(`Chunk ${lastChunk?.id}: Target Y: ${lastChunk?.targetY}, Settle: ${lastChunk?.targetSettleTime}, Spawn: ${lastChunk?.spawnFrame}`);
    // }
}


// Animation Loop
function updateAndDraw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Default text settings
    ctx.font = `${FONT_SIZE}px Arial`;
    ctx.textBaseline = 'bottom'; // Align text baseline to the calculated Y positions
    const baseFillColor = '255, 255, 255'; // White

    // 1. Spawn new chunks if it's their time
    while (nextChunkIndexToSpawn < preparedChunks.length &&
           frameCount >= preparedChunks[nextChunkIndexToSpawn].spawnFrame)
    {
        const chunkData = preparedChunks[nextChunkIndexToSpawn];
        if (!chunkData.hasSpawned) {
            chunkData.hasSpawned = true;

            // Initialize dynamic properties for animation start
            chunkData.x = chunkData.targetX + (Math.random() - 0.5) * 50; // Start near target X with some randomness
            chunkData.y = -FONT_SIZE; // Start above the canvas
            chunkData.time = 0; // Reset time for sine wave calculation
            chunkData.isLanding = false;
            chunkData.landingProgress = 0;

            fallingChunks.push(chunkData); // Add to the list of active chunks
        }
        nextChunkIndexToSpawn++;
    }


    // 2. Update and draw currently falling/landing chunks
    const stillAnimating = []; // Build a new list of chunks that are still moving
    for (let i = 0; i < fallingChunks.length; i++) {
        const chunk = fallingChunks[i];
        let chunkHasJustLanded = false; // Flag to know if it finished landing *this frame*

        // Calculate alpha fade-in based on progress towards settlement time
        const elapsedFrames = frameCount - chunk.spawnFrame;
        const rawProgress = Math.max(0, elapsedFrames / chunk.totalAnimDuration);
        const alpha = Math.min(1, rawProgress); // Clamp alpha between 0 and 1

        if (chunk.isLanding) {
            // --- Landing Phase: Interpolate X smoothly to target ---
            chunk.landingProgress += 1 / LANDING_DURATION_FRAMES;
            chunk.x = lerp(chunk.startXBeforeLand, chunk.targetX, chunk.landingProgress);
            chunk.y = chunk.targetY; // Keep Y fixed at target

            if (chunk.landingProgress >= 1) {
                // Finished landing!
                chunk.x = chunk.targetX; // Ensure exact final position
                chunk.y = chunk.targetY;
                landedChunks.push(chunk); // Move to the landed list
                chunkHasJustLanded = true;
                // Don't draw it here; it will be drawn by the landedChunks loop below
            }

        } else {
            // --- Falling Phase: Move Y down and apply sine wave to X ---
            chunk.y += chunk.speed;
            chunk.time += 1; // Increment time for sine calculation

            // Calculate horizontal position with damping sine wave
            // Damping makes the wave smaller as it approaches the target Y
            const distanceToTargetY = Math.max(0, chunk.targetY - chunk.y);
            // Damping factor decreases rapidly as it gets closer (quadratic falloff)
            const dampingFactor = Math.min(1, distanceToTargetY / (LINE_HEIGHT * 3));
            const effectiveAmplitude = chunk.amplitude * dampingFactor * dampingFactor;
            // Calculate current X based on target + sine offset
            const currentSineX = chunk.targetX + Math.sin(chunk.time * chunk.frequency + chunk.sineOffset) * effectiveAmplitude;
            chunk.x = currentSineX;

            // Check if it has reached or passed its target Y position
            if (chunk.y >= chunk.targetY) {
                chunk.y = chunk.targetY; // Snap to target Y
                chunk.isLanding = true; // Start the landing phase
                chunk.landingProgress = 0;
                chunk.startXBeforeLand = chunk.x; // Store current X for interpolation start
                // Alpha continues increasing during the landing phase
            }
        }

        // Draw the chunk if it hasn't fully landed *in this frame*
         if (!chunkHasJustLanded) {
             // Apply the calculated alpha for fade-in effect
             ctx.fillStyle = `rgba(${baseFillColor}, ${alpha})`;
             ctx.fillText(chunk.text, chunk.x, chunk.y);
             stillAnimating.push(chunk); // Keep it in the active list for the next frame
         }
    }
    fallingChunks = stillAnimating; // Update the active list


    // 3. Draw fully landed chunks (always fully opaque)
    ctx.fillStyle = `rgba(${baseFillColor}, 1)`; // Full white
    for (let i = 0; i < landedChunks.length; i++) {
        const chunk = landedChunks[i];
        // Draw at their final, exact target position
        ctx.fillText(chunk.text, chunk.targetX, chunk.targetY);
    }

    // 4. Check if the entire animation is complete
    if (landedChunks.length === preparedChunks.length && preparedChunks.length > 0) {
         console.log("All chunks landed. Animation complete.");
         // Stop the animation loop by not requesting the next frame
         return;
    }

    frameCount++;
    requestAnimationFrame(updateAndDraw); // Continue the loop
}

// Initialization and Setup
function setup() {
    // Reset all state variables for a fresh start (e.g., on resize)
    frameCount = 0;
    nextChunkIndexToSpawn = 0;
    fallingChunks = [];
    landedChunks = [];
    preparedChunks = [];

    // Match canvas dimensions to the window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Determine the maximum width available for text lines
    const maxLineWidth = canvas.width - (CANVAS_PADDING * 2);
    if (maxLineWidth <= 0) {
         console.error("Canvas too narrow for padding. Cannot display text.");
         return; // Stop if canvas is impossibly small
    }

    // 1. Wrap the input text into lines based on the available width
    wrappedLines = wrapText(words, maxLineWidth);

    // 2. Pre-calculate all chunk data, including animation timing
    prepareAllChunks();

    if (preparedChunks.length === 0) {
        // This might happen if the input text is empty or wrapping fails
        console.warn("No chunks were prepared. Check input text or wrapping logic.");
        return;
    }

    // 3. Start the animation loop
    requestAnimationFrame(updateAndDraw);
}

// Initial Start
setup();

// Handle window resizing
let resizeTimeout;
window.addEventListener('resize', () => {
    // Use debouncing to avoid restarting the animation excessively during resize
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log("Resizing... Restarting animation.");
        // A simple way to restart is to call setup() again.
        // This will reset state and recalculate everything based on the new size.
        // Note: This cancels the *current* animation and starts a completely new one.
        setup();
    }, 250); // Wait 250ms after the user stops resizing
});