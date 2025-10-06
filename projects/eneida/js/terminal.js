// js/terminal.js - Core terminal input, output, and command dispatch (Stabilized Context)

import * as Config from './config.js';
import { escapeHTML, scrollToBottom, moveCursorToEnd } from './utils.js';
import * as Commands from './commands.js';
import * as Effects from './effects.js';
import { createWindow, closeAllWindows, spawnRandomWindow } from './windows.js';
import { deactivateCompromise } from './effects.js';

import { pauseGame as pausePongGame } from './pong.js'; 
import { pauseGame as pauseTetrisGame } from './tetris.js';
import { pauseGame as pauseSnakeGame } from './snake.js';

// --- State ---
let commandHistory = [];
let historyIndex = -1;

// --- DOM Elements ---
let outputElement, commandInputElement, promptElement, terminalElement;

// --- Module-level Context ---
// This will be populated by setupTerminal and used by handlers/commands
let commandContext = null;

// --- Output Functions ---
export function displayOutput(htmlContent, classNames = 'response') {
    if (!outputElement) { console.error("'output' element not found!"); return; }
    const line = document.createElement('div');
    line.innerHTML = htmlContent; // Allow HTML
    classNames.split(' ').filter(cls => cls).forEach(cls => line.classList.add(cls));
    outputElement.appendChild(line);
    setTimeout(() => scrollToBottom(outputElement, true, false), 0);
}

// Using the previously working typewriterResponse function
export function typewriterResponse(htmlContent, callback, defaultClass = 'response') {
    console.log("[typewriterResponse] Called. Content length:", htmlContent?.length); // Log entry

    if (!outputElement || !commandInputElement) {
        console.error("[typewriterResponse] ERROR: Missing outputElement or commandInputElement!");
        // Attempt to call callback even on error, if it exists
        if (typeof callback === 'function') {
            console.log("[typewriterResponse] Calling callback due to missing elements.");
            try {
                callback();
            } catch (e) {
                console.error("[typewriterResponse] Error executing callback after element check failure:", e);
            }
        } else if (typeof defaultClass === 'function') { // Check if callback was passed in second arg slot
             console.log("[typewriterResponse] Calling callback (passed as 2nd arg) due to missing elements.");
             try {
                 defaultClass(); // Call the function that was in the defaultClass slot
             } catch (e) {
                 console.error("[typewriterResponse] Error executing callback (2nd arg) after element check failure:", e);
             }
        }
        return;
    }

    let className = defaultClass;
    let finalCallback = null;

    // Correctly handle arguments: callback can be 2nd or 3rd argument
    if (typeof callback === 'function') {
        finalCallback = callback;
        // className remains defaultClass ('response') unless overridden later
    } else if (typeof callback === 'string' && callback.length > 0) {
        className = callback; // If 2nd arg is string, it's the class
        // Check if 3rd arg is the function
        if (typeof defaultClass === 'function') {
             finalCallback = defaultClass; // Callback was 3rd arg
        }
    } else if (typeof defaultClass === 'function') {
         // If 2nd arg wasn't function or string, but 3rd is function
         finalCallback = defaultClass;
    }
    // Ensure className is a string if it came from defaultClass originally
    if (typeof className !== 'string') {
         className = 'response';
    }


    console.log(`[typewriterResponse] Class: '${className}', Has Callback: ${!!finalCallback}`);

    const wasInputDisabled = commandInputElement.disabled;
    if (!wasInputDisabled) {
        commandInputElement.disabled = true;
    }

    // --- Instant Typing Mode ---
    if (Config.TYPEWRITER_BASE_DELAY === 0 && Config.TYPEWRITER_RANDOM_FACTOR === 0) {
        console.log("[typewriterResponse] Instant mode detected.");
        const container = document.createElement('div');
        className.split(' ').filter(cls => cls).forEach(cls => container.classList.add(cls));
        container.classList.add('typewriter-container'); // Add container class
        container.innerHTML = htmlContent; // Directly set content
        outputElement.appendChild(container);

        // Use setTimeout to ensure DOM update and scroll happen after append
        setTimeout(() => {
            console.log("[typewriterResponse] Instant mode: Scrolling and finalizing.");
            scrollToBottom(outputElement, true, false); // Ensure scroll works
            if (!wasInputDisabled) {
                 // console.log("[typewriterResponse] Re-enabling command input (instant mode).");
                 commandInputElement.disabled = false;
            }
            // --- Execute Callback (Instant Mode) ---
            if (finalCallback) {
                console.log("[typewriterResponse] Executing finalCallback (instant mode).");
                try {
                    finalCallback();
                } catch (e) {
                    console.error("[typewriterResponse] Error executing callback (instant mode):", e);
                }
            } else if (!wasInputDisabled && commandContext?.focusCommandInput) {
                // console.log("[typewriterResponse] Focusing command input (instant mode, no callback).");
                commandContext.focusCommandInput();
            }
            console.log("[typewriterResponse] Instant mode finished.");
        }, 0); // Minimal delay
        return; // Exit function for instant mode
    }

    // --- Regular Typewriter Mode ---
    const container = document.createElement('div');
    className.split(' ').filter(cls => cls).forEach(cls => container.classList.add(cls));
    container.classList.add('typewriter-container');
    outputElement.appendChild(container);

    let charIndex = 0;
    let currentHTML = '';
    let cancelled = false;

    function finalizeTyping() {
        if (cancelled) return; // Prevent running multiple times
        cancelled = true;
        console.log("[typewriterResponse] Finalizing typing.");

        // Ensure final content is displayed correctly
        if (outputElement.contains(container)) { // Check if container still exists
             container.innerHTML = htmlContent;
             setTimeout(() => scrollToBottom(outputElement, false, true), 50); // Smooth scroll final view
        } else {
             console.warn("[typewriterResponse] Finalize: Container was removed before completion.");
        }


        if (!wasInputDisabled) {
             // console.log("[typewriterResponse] Re-enabling command input (regular mode).");
             commandInputElement.disabled = false;
        }

        // --- Execute Callback (Regular Mode) ---
        if (finalCallback) {
            console.log("[typewriterResponse] Executing finalCallback (regular mode).");
            try {
                finalCallback();
            } catch (e) {
                console.error("[typewriterResponse] Error executing callback (regular mode):", e);
            }
        } else if (!wasInputDisabled && commandContext?.focusCommandInput) {
            // console.log("[typewriterResponse] Focusing command input (regular mode, no callback).");
            commandContext.focusCommandInput();
        }
        console.log("[typewriterResponse] Regular typing finished.");
    }


    function typeChar() {
        if (cancelled) return;
        if (!outputElement.contains(container)) {
            console.warn("[typewriterResponse] TypeChar: Container removed.");
            finalizeTyping(); return;
        }
        if (charIndex >= htmlContent.length) {
            // console.log("[typewriterResponse] Typing complete.");
            finalizeTyping(); return;
        }

        // --- Character Processing Logic ---
        let char = htmlContent[charIndex];
        let delay = Config.TYPEWRITER_BASE_DELAY + Math.random() * Config.TYPEWRITER_RANDOM_FACTOR;
        let segmentToAdd = '';

        if (char === '<') {
            const tagMatch = htmlContent.substring(charIndex).match(/^<[^>]+>/);
            if (tagMatch) {
                segmentToAdd = tagMatch[0];
                charIndex += segmentToAdd.length;
                delay = 0; // Add tags instantly
                // --- !!! NEW: Check if segment is <br> for scroll !!! ---
                const isBr = segmentToAdd.toLowerCase().startsWith('<br');
                if (isBr) scrollToBottom(outputElement, false, false); // Scroll immediately on <br>
                // --- End New ---

            } else {
                segmentToAdd = '<'; // Escape literal '<'
                charIndex++;
            }
        } else if (char === '&') {
            const entityMatch = htmlContent.substring(charIndex).match(/^&[#a-zA-Z0-9]+;/);
             if (entityMatch) {
                  segmentToAdd = entityMatch[0];
                  charIndex += segmentToAdd.length;
                  delay = 0;
             } else {
                  segmentToAdd = '&'; // Escape literal '&'
                  charIndex++;
             }
        // --- !!! REMOVED: Typewriter no longer converts \n to <br> !!! ---
        // } else if (char === '\n') {
        //      segmentToAdd = '<br>';
        //      charIndex++;
        //      delay = Math.max(1, Math.min(delay, 10));
        // --- End Removal ---
        } else {
            // Regular character - no need to escape here if using innerHTML
            segmentToAdd = char;
            charIndex++;
        }

        currentHTML += segmentToAdd;
        container.innerHTML = currentHTML;

        // Scroll logic (simplified - scrolls mainly on <br> now)
        if (charIndex % 15 === 0) { // Scroll less frequently for text blocks
             scrollToBottom(outputElement, false, false);
        }

        setTimeout(typeChar, delay);
    }

    // Start the typing process
    typeChar();
}


// --- Command Processing ---
function processCommand(command) {
    // Uses the module-level commandContext
    if (!commandContext) {
        console.error("FATAL: processCommand called before context initialization!");
        displayOutput("SYSTEM ERROR: Command processor context invalid. Please reload.", "response-error");
        return;
    }

    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const cleanedParts = parts.map(part => part.startsWith('"') && part.endsWith('"') ? part.slice(1, -1) : part);
    const baseCommand = cleanedParts[0]?.toLowerCase() || '';
    const args = cleanedParts.slice(1);

    console.log(`Processing command: ${baseCommand}`, args);

    try {
        // Check commands first, passing the module-level context
        if (Commands[baseCommand] && typeof Commands[baseCommand] === 'function') {
            // --- CORRECT ---
            // JUST CALL the function. Its return value (Promise for async) is ignored here.
            // The command function itself is responsible for displaying output via context.displayOutput/typewriterResponse.
            Commands[baseCommand](args, commandContext);
            // --- END CORRECT ---

        }
        // Then check effects commands, passing the module-level context
        else if (Effects[baseCommand] && typeof Effects[baseCommand] === 'function') {
            // --- CORRECT ---
            // JUST CALL the function.
            Effects[baseCommand](args, commandContext);
            // --- END CORRECT ---

        }
        // Handle unknown command
        else if (baseCommand !== '') {
            commandContext.logTrace(command, 'NOT_FOUND');
            // Use typewriterResponse for unknown command feedback
            commandContext.typewriterResponse(`Command not found: <span style="color:var(--error-color);">${escapeHTML(baseCommand)}</span>. Type 'help' for assistance.`, 'response-error');
        }
        // If baseCommand is empty (user just pressed Enter), do nothing further here.

    } catch (error) {
        // Catch errors originating *synchronously* from the command function call itself
        // (Errors inside async operations are usually handled within the command function)
        console.error(`Error during command execution setup "${baseCommand}":`, error);
        commandContext.logTrace(command, `EXECUTION_SETUP_ERROR: ${error.message}`);
        // Use displayOutput for immediate critical errors
        displayOutput(`Command Error: ${escapeHTML(error.message)}`, 'response-error');

        // Ensure input is usable after an error during setup
        if (commandInputElement && commandContext?.focusCommandInput) {
            if (commandInputElement.disabled) {
                 // Cautiously re-enable if it was disabled. Consider if fullscreen/popups are active.
                 const fsLockActive = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
                 const popupVisible = commandContext.annoyingPopupElement?.classList.contains('visible'); // Need access to popup element via context
                 if (!fsLockActive && !popupVisible) {
                     commandInputElement.disabled = false;
                 }
            }
            setTimeout(commandContext.focusCommandInput, 0);
        }
    }
    // --- IMPORTANT: NO code here should try to display the result of the command call ---
}

// --- Event Handlers ---
function handleCommandInput(event) {
    // Uses the module-level commandContext implicitly via processCommand and focusCommandInput calls
     if (!commandContext) return; // Don't process if context isn't ready

    const fsLockActive = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (fsLockActive || commandInputElement.disabled) {
        event.preventDefault(); return;
    }
    const key = event.key;

    if (key === 'ArrowUp' || key === 'ArrowDown') {
        event.preventDefault();
        if (commandHistory.length === 0) return;
        if (key === 'ArrowUp') {
            if (historyIndex <= 0) historyIndex = commandHistory.length;
            historyIndex--;
        } else {
            if (historyIndex >= commandHistory.length - 1) historyIndex = -1;
            historyIndex++;
        }
        commandInputElement.value = (historyIndex >= 0 && historyIndex < commandHistory.length) ? commandHistory[historyIndex] : '';
        moveCursorToEnd(commandInputElement);
    } else if (key === 'Enter') {
        event.preventDefault();
        const commandText = commandInputElement.value.trim();
        const currentPrompt = promptElement?.textContent || 'user@portfolio:~$';

        if (commandText && (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== commandText)) {
            commandHistory.push(commandText);
            if (commandHistory.length > Config.MAX_HISTORY) commandHistory.shift();
        }
        historyIndex = -1;

        // Display echo immediately using module function
        displayOutput(`<span class="prompt">${escapeHTML(currentPrompt)}</span><span class="command-echo-text">${escapeHTML(commandText || '')}</span>`, 'command-echo');

        if (commandText) {
             commandContext.logTrace(commandText); // Use context for logging
             processCommand(commandText); // Process the command
            if (Effects && typeof Effects.triggerRandomHackEffect === 'function') {
                Effects.triggerRandomHackEffect(); // Trigger random effect
            }
        }
        // else { // No need for else block, already displayed echo }

        commandInputElement.value = '';
        setTimeout(commandContext.focusCommandInput, 0); // Use context for focus

    } else {
        historyIndex = -1;
    }
}

function pauseAllGames() {
    try { if (typeof pausePongGame === 'function') pausePongGame(); }
    catch(e) { console.error("Error pausing pong:", e); }
    try { if (typeof pauseTetrisGame === 'function') pauseTetrisGame(); }
    catch(e) { console.error("Error pausing tetris:", e); }
    try { if (typeof pauseSnakeGame === 'function') pauseSnakeGame(); }
    catch(e) { console.error("Error pausing snake:", e); }
}

function handleTerminalClick(event) {
    if (!commandContext) return;
    if (event.target.tagName === 'A' || window.getSelection().toString() !== '') return;
    const fsLockActive = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (!commandInputElement || commandInputElement.disabled || fsLockActive) return;

    
    pauseAllGames();

    commandContext.focusCommandInput(); // Focus terminal input
}


function handleOutputClick(event) {
    const codeElement = event.target.closest('code');
    const linkElement = event.target.closest('a');

    if (codeElement && !linkElement && commandInputElement && !commandInputElement.disabled) {
        event.preventDefault();
        event.stopPropagation();

        const commandText = codeElement.textContent.trim();

        if (commandText) {
            commandInputElement.value = commandText;
            // Focus and move cursor (use functions directly or via context if preferred)
            commandInputElement.focus();
            moveCursorToEnd(commandInputElement); // Use the imported utility

            // Optional: Provide subtle feedback (could be a quick flash/style change)
            codeElement.style.transition = 'background-color 0.1s ease-out';
            codeElement.style.backgroundColor = 'rgba(0, 255, 204, 0.3)'; // Temporary brighter background
            setTimeout(() => {
                codeElement.style.backgroundColor = ''; // Reset background
                codeElement.style.transition = '';
            }, 150);
        }
    } else if (!linkElement && commandInputElement && !commandInputElement.disabled) {
        pauseAllGames();
        //commandContext?.focusCommandInput();
   }
    // If it was a linkElement, do nothing and let the browser handle it.
}


// --- Setup Terminal ---
/**
 * Sets up the terminal, including input listeners and context.
 * @param {object} elements DOM element references.
 * @param {object} sharedContext Context object from main.js.
 * @returns {object} The fully populated commandContext.
 */
export function setupTerminal(elements, sharedContext) {
    // Assign module-level element variables
    outputElement = elements.output;
    commandInputElement = elements.commandInput;
    promptElement = elements.promptElement;
    terminalElement = elements.terminal;

    // --- Populate the module-level commandContext ---
    commandContext = {
        ...sharedContext, // Inherit state, logging, utils, etc.
        // Add terminal specific functions
        displayOutput,
        typewriterResponse,
        // Add functions/refs needed by commands/effects
        createWindow,
        closeAllWindows,
        spawnRandomWindow,
        deactivateCompromise,
        getCommandHistory: () => commandHistory,
        clearCommandHistory: clearCommandHistory,
        scrollToBottom: (force = false, smooth = false) => scrollToBottom(outputElement, force, smooth),
        // *** Crucially, add the DOM element reference ***
        commandInputElement: commandInputElement,
        promptElement: promptElement,
    };

    // --- Attach Event Listeners ---
    // Remove potentially existing listeners first
    commandInputElement.removeEventListener('keydown', handleCommandInput);
    terminalElement.removeEventListener('click', handleTerminalClick);
    // Add them
    terminalElement.addEventListener('click', handleTerminalClick);

    // --- Reset state ---
    commandHistory = [];
    historyIndex = -1;
    if(outputElement) outputElement.innerHTML = '';

    if (outputElement) {
        outputElement.addEventListener('click', handleOutputClick);
        console.log('[setupTerminal] Attached click listener to outputElement.');
    } else {
        console.error('[setupTerminal] Cannot attach listener, outputElement is missing!');
    }
    commandInputElement.addEventListener('keydown', handleCommandInput);

    console.log("Terminal setup complete.");
    // --- Display Welcome Message using the now populated context ---
    displayWelcomeMessage(); // Call the display function

    // --- Return the populated context ---
    return commandContext;
}

// --- Display Welcome Message ---
function displayWelcomeMessage() {
    if (!commandContext) { // Check if context is ready
        console.error("Cannot display welcome message - context not initialized.");
        return;
    }
    const welcomeString = Config.WELCOME_MESSAGE.join('\n');
    // Use the context's typewriterResponse
    commandContext.typewriterResponse(welcomeString, () => {
        if(commandContext.focusCommandInput) commandContext.focusCommandInput();
    });
}

// --- Clear History Function ---
export function clearCommandHistory() {
     commandHistory = [];
     historyIndex = -1;
     console.log("Command history cleared.");
}