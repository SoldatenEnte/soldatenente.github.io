// js/windows.js - Draggable window management (Refactored for Generalization)
import { escapeHTML, generateGibberish } from './utils.js';
// Import game init/stop/pause/resume functions as before
import { initPong, stopPong, pauseGame as pausePongGame, resumeGame as resumePongGame } from './pong.js';
import { initTetris, stopTetris, pauseGame as pauseTetrisGame, resumeGame as resumeTetrisGame } from './tetris.js';
import { initSnake, stopSnake, pauseGame as pauseSnakeGame, resumeGame as resumeSnakeGame } from './snake.js';

let openWindows = {};
let highestZ = 100; // Initial value, will be read from CSS later
let windowIdCounter = 0;
let context = null; // The shared context from main.js

// Maps for game lifecycle functions, keyed by 'gameType' string
const gameInitFunctions = {
    'pong': initPong,
    'tetris': initTetris,
    'snake': initSnake,
};
const gameCleanupFunctions = {
    'pong': stopPong,
    'tetris': stopTetris,
    'snake': stopSnake,
};
const gamePauseFunctions = {
    'pong': pausePongGame,
    'tetris': pauseTetrisGame,
    'snake': pauseSnakeGame,
};
const gameResumeFunctions = {
    'pong': resumePongGame,
    'tetris': resumeTetrisGame,
    'snake': resumeSnakeGame,
};

export function setupWindows(ctx) {
    context = ctx;
    openWindows = {};
    // Read base z-index from CSS after DOM is ready
    highestZ = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--window-base-z') || '100');
    windowIdCounter = 0;
    console.log("Windows module setup. Initial highestZ:", highestZ);
}

/**
 * Creates and manages a new draggable window.
 *
 * @param {string} title - The title displayed in the window's title bar.
 * @param {object} contentOptions - Defines the content of the window.
 *   @param {'html'|'canvas'|'image'|'component'} contentOptions.type - The type of content.
 *   @param {string} [contentOptions.html] - (Required if type='html') Raw HTML string.
 *   @param {string} [contentOptions.canvasId] - (Required if type='canvas' or type='component' needing canvas) The ID for the canvas element.
 *   @param {string} [contentOptions.imageUrl] - (Required if type='image') The URL of the image.
 *   @param {string} [contentOptions.imageAlt] - (Optional if type='image') Alt text for the image.
 *   @param {Function} [contentOptions.componentInit] - (Required if type='component') A function `(contentDiv, windowElement, context)` called after the window is created and appended, responsible for setting up the component (e.g., initializing a game).
 *   @param {string} [contentOptions.canvasClass] - (Optional if type='canvas' or 'component') Additional classes for the canvas element.
 *   @param {object} [contentOptions.canvasStyles] - (Optional if type='canvas' or 'component') Inline styles for the canvas element.
 * @param {object} [options={}] - Optional configuration for the window itself.
 *   @param {number} [options.width=400] - Initial width.
 *   @param {number} [options.height=300] - Initial height.
 *   @param {number} [options.startX] - Initial X position (centered if omitted).
 *   @param {number} [options.startY] - Initial Y position (centered if omitted).
 *   @param {boolean} [options.resizable=false] - Whether the window can be resized.
 *   @param {string} [options.className=''] - Additional CSS classes for the window div.
 *   @param {string} [options.gameType] - Identifier ('pong', 'tetris', 'snake', etc.) for game windows to link pause/resume/cleanup.
 *   @param {Function} [options.onClose] - Callback function executed just before the window is removed.
 * @returns {HTMLElement|null} The created window element or null on failure.
 */
export function createWindow(title = "Window", contentOptions, options = {}) {
    if (!context) {
        console.error("[createWindow] Error: Window context not set up.");
        return null;
    }
    if (!document.body) {
        console.error("[createWindow] Error: document.body is not available!");
        return null;
    }
    if (!contentOptions || !contentOptions.type) {
        console.error("[createWindow] Error: Invalid or missing 'contentOptions'. Must include 'type'.");
        return null;
    }

    console.log(`[createWindow] Attempting to create window. Title: ${title}, Content Type: ${contentOptions.type}`);

    windowIdCounter++;
    const windowId = `window-${windowIdCounter}`;
    highestZ++;

    // --- Create Window Element ---
    const win = document.createElement('div');
    win.id = windowId;
    win.className = `draggable-window ${options.className || ''}`.trim(); // Add optional class
    win.style.zIndex = highestZ;

    // --- Set Size and Position ---
    const defaultWidth = 400, defaultHeight = 300;
    const winWidth = options.width || defaultWidth;
    const winHeight = options.height || defaultHeight;
    // Improved centering logic
    const startX = options.startX ?? Math.max(10, (window.innerWidth / 2 - winWidth / 2));
    const startY = options.startY ?? Math.max(10, (window.innerHeight / 2 - winHeight / 2));

    win.style.width = `${winWidth}px`;
    win.style.height = `${winHeight}px`;
    win.style.left = `${Math.min(Math.max(0, startX), window.innerWidth - winWidth - 10)}px`;
    win.style.top = `${Math.min(Math.max(0, startY), window.innerHeight - winHeight - 10)}px`;
    win.style.resize = options.resizable ? 'both' : 'none';
    // Overflow is handled by window-content now

    // --- Store Game Type and OnClose ---
    if (options.gameType) {
        win.dataset.gameType = options.gameType;
        console.log(`[createWindow] Marked as game type: ${options.gameType}`);
    }
    if (typeof options.onClose === 'function') {
        win._onCloseCallback = options.onClose;
    }

    // --- Set Inner Structure (Title Bar and Content Area) ---
    win.innerHTML = `
        <div class="window-title-bar">
            <span class="window-title">${escapeHTML(title)}</span>
            <button class="window-close-btn" title="Close Window">X</button>
        </div>
        <div class="window-content">
            <!-- Content will be added here based on type -->
        </div>
    `;

    const windowContent = win.querySelector('.window-content');
    if (!windowContent) {
        console.error(`[createWindow] Critical error: Could not find .window-content in #${windowId}`);
        return null; // Should not happen
    }

    // --- Generate and Inject Content ---
    let contentElement = null; // To store reference to canvas if created
    try {
        switch (contentOptions.type) {
            case 'html':
                if (typeof contentOptions.html !== 'string') throw new Error("Missing 'html' string for type 'html'.");
                windowContent.innerHTML = contentOptions.html;
                break;

            case 'image':
                if (typeof contentOptions.imageUrl !== 'string') throw new Error("Missing 'imageUrl' string for type 'image'.");
                const altText = escapeHTML(contentOptions.imageAlt || title);
                windowContent.innerHTML = `<img src="${escapeHTML(contentOptions.imageUrl)}" alt="${altText}" style="display: block; margin: auto; max-width: 100%; max-height: 100%; object-fit: contain; background-color: rgba(0,0,0,0.2);" onerror="this.outerHTML='<div style=\\'padding: 10px; color: var(--error-color);\\'>Error loading image.</div>';">`;
                windowContent.style.overflow = 'hidden'; // Prevent scrollbars for images usually
                break;

            case 'canvas':
            case 'component': // Both might need a canvas
                if (typeof contentOptions.canvasId !== 'string') throw new Error("Missing 'canvasId' for type 'canvas' or 'component'.");
                const canvas = document.createElement('canvas');
                canvas.id = contentOptions.canvasId;
                canvas.className = contentOptions.canvasClass || '';
                // Apply default styles for canvas, often centered for games
                canvas.style.display = 'block';
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.backgroundColor = 'rgba(5, 8, 10, 0.5)'; // Default dark background
                // Apply custom styles if provided
                if(contentOptions.canvasStyles && typeof contentOptions.canvasStyles === 'object') {
                    Object.assign(canvas.style, contentOptions.canvasStyles);
                }
                windowContent.appendChild(canvas);
                // Style parent for centering if it's a game/component
                windowContent.style.display = 'flex';
                windowContent.style.alignItems = 'center';
                windowContent.style.justifyContent = 'center';
                windowContent.style.padding = '0'; // Remove padding for full canvas
                windowContent.style.overflow = 'hidden';
                contentElement = canvas; // Store reference
                break;

            default:
                throw new Error(`Unsupported content type: ${contentOptions.type}`);
        }
        console.log(`[createWindow] Content injected for type: ${contentOptions.type}`);
    } catch (error) {
        console.error(`[createWindow] Error setting content for #${windowId}:`, error);
        // Optionally remove the partially created win element from DOM if appended?
        return null; // Abort creation
    }

    // --- Append to DOM ---
    try {
        document.body.appendChild(win);
        console.log(`[createWindow] Appended #${windowId} to document.body.`);
    } catch (appendError) {
        console.error(`[createWindow] FAILED to append #${windowId} to document.body:`, appendError);
        return null; // Return null if append failed
    }

    // --- Add Event Listeners (Drag, Close, Focus) ---
    try {
        const titleBar = win.querySelector('.window-title-bar');
        const closeBtn = win.querySelector('.window-close-btn');

        if (titleBar) {
            makeDraggable(win, titleBar); // Use the standard draggable function
        } else { console.warn(`[createWindow] Title bar not found for #${windowId}`); }

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeWindow(windowId);
            });
        } else { console.warn(`[createWindow] Close button not found for #${windowId}`); }

        // Focus listener (mousedown brings to front)
        win.addEventListener('mousedown', (e) => {
            // Bring to front if clicking window itself, title bar, or non-interactive content
            const isInteractiveContent = e.target.closest('button, input, select, textarea, a') || e.target.closest('canvas'); // Add canvas check
             const isDirectContentClick = e.target === windowContent || windowContent.contains(e.target);

            if (e.target === win || titleBar?.contains(e.target) || (isDirectContentClick && !isInteractiveContent)) {
                bringToFront(win);
            }
             // If clicking interactive content (like game canvas), don't necessarily steal focus from internal game logic immediately,
             // but DO bring the window to the front visually. The game's own click handler should manage its state.
             else if (isInteractiveContent) {
                  bringToFront(win);
             }

        }, true); // Use capture phase to ensure it happens early

        console.log(`[createWindow] Listeners added for #${windowId}`);

    } catch (listenerError) {
        console.error(`[createWindow] Error adding listeners for #${windowId}:`, listenerError);
        // Allow window to exist partially functional?
    }

    // --- Execute Component Initializer (if provided) ---
    if (contentOptions.type === 'component' && typeof contentOptions.componentInit === 'function') {
        console.log(`[createWindow] Calling componentInit for #${windowId}`);
        try {
            // Pass the specific canvas if created, otherwise the content div
            const initTarget = contentElement || windowContent;
            contentOptions.componentInit(initTarget, win, context);
            console.log(`[createWindow] componentInit completed for #${windowId}`);
        } catch (initError) {
            console.error(`[createWindow] Error during componentInit for #${windowId}:`, initError);
            // Consider closing the window automatically on init failure
             closeWindow(windowId);
             context.displayOutput(`Error initializing component in window '${title}': ${initError.message}`, 'response-error');
             return null;
        }
    }

    // --- Final Steps ---
    openWindows[windowId] = win; // Add to tracking
    bringToFront(win);         // Make active
    context.logTrace('create_window', `ID: ${windowId}, Title: ${title}, Type: ${contentOptions.type}`);
    console.log(`[createWindow] Successfully created window #${windowId}`);
    return win; // Return the element
}

/**
 * Makes an element draggable by its handle. (No changes needed)
 * @param {HTMLElement} element The element to make draggable.
 * @param {HTMLElement} handle The element that acts as the drag handle.
 */
function makeDraggable(element, handle) {
    let isDragging = false;
    let offsetX, offsetY;
    handle.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        isDragging = true;
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        bringToFront(element); // Bring to front on drag start
        element.style.cursor = 'grabbing';
        handle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        const bodyRect = document.body.getBoundingClientRect();
        // Improved clamping to keep title bar visible
        newX = Math.max(-element.offsetWidth + 50, Math.min(bodyRect.width - 50, newX)); // Allow some overlap
        newY = Math.max(0, Math.min(bodyRect.height - 30, newY)); // Prevent title bar going off top/bottom much

        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
    }

    function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        element.style.cursor = 'default';
        handle.style.cursor = 'move';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}


/**
 * Brings a window element visually to the front and handles game pause/resume. (Modified to use maps)
 * @param {HTMLElement} winElement The window element.
 */
function bringToFront(winElement) {
    if (!winElement || !openWindows[winElement.id]) return; // Ensure window exists and is tracked

    const windowId = winElement.id;
    const gameType = winElement.dataset.gameType; // e.g., 'pong', 'tetris', or undefined
    const currentZ = parseInt(winElement.style.zIndex || '0');
    const isHighest = currentZ >= highestZ;
    const isActive = winElement.classList.contains('active-window');

    // --- Deactivate Others and Pause Games ---
    Object.values(openWindows).forEach(otherWin => {
        if (otherWin.id !== windowId && otherWin.classList.contains('active-window')) {
            otherWin.classList.remove('active-window');
            const otherGameType = otherWin.dataset.gameType;
            if (otherGameType && typeof gamePauseFunctions[otherGameType] === 'function') {
                try {
                    console.log(`Pausing game '${otherGameType}' in #${otherWin.id} (Focus to #${windowId})`);
                    gamePauseFunctions[otherGameType]();
                } catch (e) { console.error(`Error pausing ${otherGameType}:`, e); }
            }
        }
    });

    // --- Activate Target and Resume Game ---
    if (!isActive) {
        winElement.classList.add('active-window');
        if (gameType && typeof gameResumeFunctions[gameType] === 'function') {
            try {
                console.log(`Resuming game '${gameType}' in #${windowId}`);
                gameResumeFunctions[gameType]();
            } catch (e) { console.error(`Error resuming ${gameType}:`, e); }
        }
    }

    // --- Adjust Z-Index ---
    // Only increment if the window wasn't already the topmost *and* active
    // This prevents unnecessary z-index inflation on clicks within the active window
    if (!isHighest || !isActive) {
        highestZ++;
        winElement.style.zIndex = highestZ;
        // console.log(`Bringing #${windowId} to front. New highestZ: ${highestZ}`);
    } else {
         // console.log(`#${windowId} already highest and active. Z-index not changed.`);
    }
}

/**
 * Closes and removes a window by its ID. (Modified to use maps and callback)
 * @param {string} windowId The ID of the window to close.
 */
export function closeWindow(windowId) {
    if (!context) { console.error("Context not available for closeWindow"); return; }

    const win = openWindows[windowId];
    if (win) {
        console.log(`Closing window #${windowId}`);

        // 1. Call game cleanup function if applicable
        const gameType = win.dataset.gameType;
        if (gameType && typeof gameCleanupFunctions[gameType] === 'function') {
            try {
                console.log(`Running cleanup for game '${gameType}' in window ${windowId}`);
                gameCleanupFunctions[gameType]();
            } catch (e) { console.error(`Error during game cleanup for ${windowId}:`, e); }
        }

        // 2. Call onClose callback if defined
        if (typeof win._onCloseCallback === 'function') {
             try {
                 console.log(`Calling onClose callback for window ${windowId}`);
                 win._onCloseCallback(win);
             } catch(e) { console.error(`Error during onClose callback for ${windowId}:`, e); }
        }

        // 3. Animate out and remove from DOM/tracking
        win.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
        win.style.opacity = '0';
        win.style.transform = 'scale(0.9)';

        setTimeout(() => {
            win.remove();
            delete openWindows[windowId];
            context.logTrace('close_window', `ID: ${windowId}`);
            console.log(`Window #${windowId} removed.`);

            // Optional: Re-calculate highestZ if needed, though less critical now
             if (Object.keys(openWindows).length === 0) {
                 highestZ = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--window-base-z') || '100');
                 console.log("All windows closed, reset highestZ to:", highestZ);
             } else {
                 // Find max zIndex of remaining windows? Or just let it grow? Let it grow for simplicity.
             }

        }, 200); // Match transition duration
    } else {
        console.warn(`Attempted to close non-existent or already closing window: ${windowId}`);
    }
}

/**
 * Closes all currently open windows. (Modified slightly)
 */
export function closeAllWindows() {
    console.log("Closing all windows...");
    const windowIds = Object.keys(openWindows); // Get IDs before iterating
    if (windowIds.length === 0) {
        console.log("No windows to close.");
        return;
    }
    windowIds.forEach(id => closeWindow(id)); // Call the refactored closeWindow

    // Resetting highestZ is handled by closeWindow when the last one closes.
}

/**
 * Spawns a random "hacked" window (effect). (Uses new createWindow)
 */
export function spawnRandomWindow() {
    if (!context || !context.getState('isSystemCompromised')) return;

    const titles = ["SYSTEM ALERT", "WARNING", "DATA CORRUPTION", "ENTITY DETECTED", "ACCESS DENIED?", "HELP", "KERNEL PANIC", "!!!", "Anomaly", "Signal Lost"];
    const messages = [
        "Your files are being examined by unauthorized entities.\nPrivacy compromised. Recommend immediate disconnect.",
        "Unauthorized kernel module loaded: `rootkit.ko`\nSystem stability critical. Reboot advised.",
        "Segmentation fault (core dumped)\nMemory address: 0xDEADBEEFCAFE\nAttempting to write core dump... FAILED (Disk Full?)",
        "👁️‍🗨️ I see you... your keystrokes are logged. Every command, every mistake.",
        "The digital ghost hums...\nIt whispers your password hint again: 1 9 8 2",
        "CRITICAL ERROR: Unable to display error message.\nError code: [REDACTED]\nSomething is fundamentally broken.",
        `<span class="glitch" style="font-size: 1.5em; color: var(--error-color);">${generateGibberish(70)}</span>`,
        "Security alert: Unusual network traffic detected originating from 127.0.0.1. Loopback compromised?",
        "Your firewall has been disabled remotely. Active connections exposed.",
        "Memory integrity check failed. Data corruption likely. Proceed with extreme caution.",
        "WARNING: Session hijack attempt detected. Authenticity compromised.",
    ];

    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const contentHTML = `<p class="hacked-window-text">${randomMessage.replace(/\n/g, '<br>')}</p>`; // Ensure line breaks work
    const addGlitchClass = Math.random() < 0.4 ? 'glitch' : '';

    const winOptions = {
        width: 350 + Math.random() * 150,
        height: 180 + Math.random() * 120,
        resizable: Math.random() < 0.3,
        className: `hacked-window ${addGlitchClass}`.trim(),
    };

    // Use the new createWindow function
    const win = createWindow(
        randomTitle,
        { type: 'html', html: contentHTML }, // Specify content type and data
        winOptions
    );

    if (win && addGlitchClass) {
        const titleBar = win.querySelector('.window-title-bar');
        if (titleBar) titleBar.classList.add('glitch');
    }
    // Logging happens inside createWindow now
}