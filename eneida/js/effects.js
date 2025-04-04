// js/effects.js - Manages "hacking" effects and related commands

import { generateGibberish, escapeHTML } from './utils.js';
// Window functions are now accessed via context

// --- State (Managed via context) ---
// let isSystemCompromised = false; // Now access via context.getState/setState
let annoyingPopupInterval = null;
let forcedTypingInterval = null;
let fullscreenLockActive = false; // Keep local track of lock state

// --- DOM Elements (Accessed via context) ---
// let commandInput, annoyingPopup, popupCloseBtn;

// --- Context (Passed from main.js/terminal.js) ---
let context = null; // Holds { logTrace, displayOutput, typewriterResponse, focusCommandInput, getState, setState, createWindow, spawnRandomWindow, commandInputElement, annoyingPopupElement, popupCloseBtnElement }

export function setupEffects(ctx) {
    context = ctx;
    // Attach listeners specific to effects
    if (context.popupCloseBtnElement) {
        context.popupCloseBtnElement.removeEventListener('click', handlePopupClose); // Remove previous if any
        context.popupCloseBtnElement.addEventListener('click', handlePopupClose);
    }
}

// --- Effect Commands (Exported for processCommand) ---

export function compromise() {
    if (!context) return;
    if (context.getState('isSystemCompromised')) {
        context.displayOutput("System integrity already compromised. Chaos level maximum.", "response-info");
        return;
    }
    context.setState('isSystemCompromised', true);
    context.logTrace('compromise', 'ACTIVATED');
    context.displayOutput("WARNING: External entity detected in system memory.", "hacked-message glitch");
    context.typewriterResponse("System integrity compromised. Security protocols bypassed. Expect anomalies...", () => {
        context.displayOutput("Random destabilization effects are now active. Good luck, Operator.", "response-error");
        triggerRandomHackEffect(); // Trigger one immediately
        context.focusCommandInput();
    });
}

export function stop_chaos() {
    deactivateCompromise(true); // Call internal function with message enabled
}

export function locate_me() {
    fetchIpInfo();
}

export function sys_info() {
    displayDeviceInfo();
}

export function download_payload() {
    startFakeDownload();
}

export function lock_screen() {
    activateFullscreenLock();
}

export function panic() {
    triggerPanic();
}

export function glitch() { // Manual trigger command
    triggerGlitch();
}


// --- Internal Effect Logic & Triggers ---

function deactivateCompromise(showMessage = true) {
    if (!context) return;
    const wasCompromised = context.getState('isSystemCompromised');
    if (!wasCompromised && showMessage) {
        context.displayOutput("System appears stable. No chaos countermeasures needed.", "response-success");
        return;
    }

    context.setState('isSystemCompromised', false);
    stopAnnoyingPopup(); // Use internal function
    stopForcedTyping(); // Use internal function
    context.closeAllWindows(); // Call via context

    // Note: We cannot reliably exit fullscreen programmatically
    if (fullscreenLockActive && showMessage) {
        context.displayOutput("Warning: Cannot automatically disable fullscreen lock. Please exit manually (usually ESC key).", "response-warning");
    }
    // Deactivate lock state variable regardless of user action
    if (fullscreenLockActive) {
         deactivateFullscreenLockStateOnly(); // Update internal state
    }


    if (wasCompromised && showMessage) {
        context.logTrace('stop_chaos', 'ATTEMPTED');
        context.displayOutput("Attempting to purge external entities and stabilize system...", "response-info");
        context.typewriterResponse("Chaos countermeasures engaged. System integrity restored (hopefully).", () => {
            context.logTrace('stop_chaos', 'SUCCESS');
            context.focusCommandInput();
        });
    }
}
// Export for use in handleExit command
export { deactivateCompromise };


function triggerRandomHackEffect() {
    if (!context || !context.getState('isSystemCompromised') || Math.random() > 0.35) {
        return;
    }
    const effects = [
        triggerRandomTab,
        triggerAnnoyingPopup,
        triggerForcedTyping,
        triggerGlitch,
        context.spawnRandomWindow, // Use function from context (originates in windows.js)
        () => context.displayOutput("SYSTEM WARNING: Unexpected kernel panic averted. Residual data corruption possible.", "hacked-message"),
        () => { // Remove random old line
            const outputElement = document.getElementById('output'); // Needs direct access or via context
            if (outputElement && outputElement.children.length > 10) {
                 try { // Add try-catch for safety
                    outputElement.removeChild(outputElement.children[Math.floor(Math.random() * 5)]);
                 } catch (e) { console.warn("Failed to remove random line:", e); }
            }
        },
        flickerScreen
    ];
    const randomEffect = effects[Math.floor(Math.random() * effects.length)];
    const effectName = randomEffect.name || 'inline function';
    console.log("Triggering random effect:", effectName);
    context.logTrace('random_effect', effectName);
    setTimeout(() => randomEffect(), Math.random() * 600);
}
// Export for manual testing or other triggers if needed
export { triggerRandomHackEffect };


function flickerScreen() {
    if (!context || !context.getState('isSystemCompromised')) return;
    context.logTrace('flicker_screen', 'TRIGGERED');
    const overlay = document.createElement('div');
    // ... (styling as before) ...
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '1001'; // Above everything
    overlay.style.pointerEvents = 'none';
    overlay.style.backgroundColor = `var(--text-color)`; // Flash color
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.05s ease-in-out';
    document.body.appendChild(overlay);
    // Flash sequence
    setTimeout(() => { overlay.style.opacity = '0.1'; }, 0);
    setTimeout(() => { overlay.style.opacity = '0'; }, 60);
    setTimeout(() => { overlay.style.opacity = '0.05'; }, 100);
    setTimeout(() => { overlay.style.opacity = '0'; }, 160);
    setTimeout(() => { if (overlay) overlay.remove(); }, 250);
}


function triggerGlitch() { // Can be called manually or randomly
    if (!context) return;
    context.logTrace('trigger_glitch', 'MANUAL/RANDOM');
    context.typewriterResponse("Warning: System instability detected!", () => {
        const terminalElement = document.getElementById('terminal'); // Needs access
        if (terminalElement) {
            terminalElement.classList.add('glitch');
            context.displayOutput("...!@#$... CRITICAL ERROR ...%$#@!...", "response-error glitch");
            setTimeout(() => {
                terminalElement.classList.remove('glitch');
                context.typewriterResponse("System momentarily stabilized... proceed with caution.", () => context.focusCommandInput());
            }, 1000 + Math.random() * 800);
        } else {
            context.focusCommandInput();
        }
    });
}


function triggerRandomTab() {
    if (!context || !context.getState('isSystemCompromised')) return;
    const randomUrls = [
        'https://www.google.com/search?q=how+to+remove+malware+from+secure+terminal',
        'https://longdogechallenge.com/', 
        'https://pointerpointer.com/', 
        'https://www.hackertyper.net/',
        'https://geekprank.com/hacker/', 
        'https://www.nyan.cat/', 
        'https://trypap.com/',
        'https://hackertyper.net/', 
        'about:blank'
    ];
    const urlToOpen = randomUrls[Math.floor(Math.random() * randomUrls.length)];
    try {
        const newTab = window.open(urlToOpen, '_blank', 'noopener');
        if (newTab) {
            context.displayOutput("ALERT: Uncontrolled process opened a new browser tab!", "hacked-message");
            context.logTrace('random_tab_spawn', urlToOpen);
        } else {
            context.displayOutput("Attempted to open a random tab, but it was blocked.", "response-warning");
            context.logTrace('random_tab_spawn', 'BLOCKED');
        }
    } catch (e) {
        console.warn("Could not open random tab:", e);
        context.displayOutput("Error opening random tab (likely blocked).", "response-error");
        context.logTrace('random_tab_spawn', 'ERROR');
    }
    context.focusCommandInput();
}

function activateFullscreenLock() {
    if (!context || fullscreenLockActive) return; // Prevent re-entry
    context.displayOutput("Attempting to engage emergency fullscreen lockdown...", "hacked-message");
    context.logTrace('lock_screen', 'INITIATED');

    const lockElement = document.documentElement;
    const requestFS = lockElement.requestFullscreen || lockElement.mozRequestFullScreen || lockElement.webkitRequestFullscreen || lockElement.msRequestFullscreen;

    if (requestFS) {
        requestFS.call(lockElement, { navigationUI: "hide" }).then(() => {
            console.log("Fullscreen activated.");
            context.displayOutput("Fullscreen engaged. Terminal input locked.", "response-error");
            context.logTrace('lock_screen', 'SUCCESS');
            fullscreenLockActive = true; // Set internal state
            if (context.commandInputElement) context.commandInputElement.disabled = true;

            let lockOverlay = document.getElementById('fullscreen-lock');
            if (!lockOverlay) {
                lockOverlay = document.createElement('div');
                lockOverlay.id = 'fullscreen-lock';
                lockOverlay.innerHTML = `
                    <p class="glitch">SYSTEM LOCKDOWN INITIATED</p>
                    <p>Unauthorized Access Detected!</p> <p>Vital Systems Offline.</p>
                    <p class="small-text">(Terminal input disabled. Manual override required.)</p>
                    <p class="small-text">(Try pressing ESC to regain control?)</p>`;
                document.body.appendChild(lockOverlay);
            }
            lockOverlay.classList.remove('hidden'); // Ensure visible

            // Add listeners for exit
            document.addEventListener('fullscreenchange', handleFullscreenChange, { once: true });
            document.addEventListener('webkitfullscreenchange', handleFullscreenChange, { once: true });
            document.addEventListener('mozfullscreenchange', handleFullscreenChange, { once: true });
            document.addEventListener('MSFullscreenChange', handleFullscreenChange, { once: true });

        }).catch(err => {
            console.error("Fullscreen request failed:", err);
            context.displayOutput(`Fullscreen lock failed: ${err.message}. Browser restrictions likely apply.`, "response-error");
            context.logTrace('lock_screen', 'FAILED');
            context.focusCommandInput(); // Give focus back if failed
        });
    } else {
        context.displayOutput("Fullscreen API not supported. Lockdown ineffective.", "response-error");
        context.logTrace('lock_screen', 'NOT_SUPPORTED');
        context.focusCommandInput();
    }
}

function handleFullscreenChange() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (!isFullscreen && fullscreenLockActive) { // Check internal state too
        console.log("Exited fullscreen.");
        context.logTrace('lock_screen', 'EXITED_MANUALLY');
        deactivateFullscreenLockCleanup(); // Run cleanup logic
    }
}

// Only changes state, doesn't require context
function deactivateFullscreenLockStateOnly() {
     fullscreenLockActive = false;
     // Remove listeners safely
     document.removeEventListener('fullscreenchange', handleFullscreenChange);
     document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
     document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
     document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
}

// Handles UI cleanup and state update after exiting fullscreen
function deactivateFullscreenLockCleanup() {
    if (!fullscreenLockActive) return; // Only run if lock was active

    deactivateFullscreenLockStateOnly(); // Update state and remove listeners

    const lockOverlay = document.getElementById('fullscreen-lock');
    if (lockOverlay) {
        lockOverlay.classList.add('hidden');
    }
    if (context.commandInputElement) context.commandInputElement.disabled = false; // Re-enable input
    context.displayOutput("Fullscreen lock disengaged. Terminal input restored.", "response-success");
    context.focusCommandInput();
}


function startFakeDownload() {
    if (!context) return;
    context.displayOutput("WARNING: Suspicious background download initiated...", "hacked-message");
    context.logTrace('download_payload', 'INITIATED');
    const fakeContent = `// EXECUTION LOG - MARKED FOR DELETION - DO NOT DISTRIBUTE ... (content as before) ...`; // Keep full content
    // ... (rest of fake download logic using Blob, URL.createObjectURL, link.click) ...
    const blob = new Blob([fakeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sys_backup_${Math.floor(Date.now()/1000)}.dat`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    context.displayOutput(`Payload '${escapeHTML(link.download)}' dispatched to local storage. File integrity questionable.`, "response-error");
    context.focusCommandInput();
}


function triggerAnnoyingPopup() {
    if (!context || !context.getState('isSystemCompromised') || !context.annoyingPopupElement || context.annoyingPopupElement.classList.contains('visible')) return;

    context.logTrace('annoying_popup', 'TRIGGERED');
    context.displayOutput("SYSTEM ALERT: Unhandled Exception! Critical Warning Popup Activated!", "hacked-message");
    context.annoyingPopupElement.classList.remove('hidden');
    context.annoyingPopupElement.classList.add('visible');

    if (annoyingPopupInterval) clearInterval(annoyingPopupInterval);
    annoyingPopupInterval = setTimeout(() => {
        if (context.getState('isSystemCompromised') && context.annoyingPopupElement && context.annoyingPopupElement.classList.contains('hidden')) {
            console.log("Annoying popup interval: Reappearing...");
            context.logTrace('annoying_popup', 'REAPPEARED');
            triggerAnnoyingPopup();
        }
    }, 6000 + Math.random() * 6000);
}

function handlePopupClose(e) { // This IS the event handler
    if (!context || !context.annoyingPopupElement) return;
    e.stopPropagation();

    context.annoyingPopupElement.style.transition = 'opacity 0.2s ease-out';
    context.annoyingPopupElement.style.opacity = '0';
    setTimeout(() => {
        context.annoyingPopupElement.classList.remove('visible');
        context.annoyingPopupElement.classList.add('hidden');
        context.annoyingPopupElement.style.opacity = '';
        context.annoyingPopupElement.style.transition = '';
    }, 200);

    context.displayOutput("Popup temporarily dismissed... System instability persists.", "response-warning");
    context.logTrace('annoying_popup', 'CLOSED_MANUALLY');
    context.focusCommandInput();
}

function stopAnnoyingPopup() {
    if (annoyingPopupInterval) {
        clearInterval(annoyingPopupInterval);
        annoyingPopupInterval = null;
    }
    if (context && context.annoyingPopupElement) {
        context.annoyingPopupElement.classList.remove('visible');
        context.annoyingPopupElement.classList.add('hidden');
        context.annoyingPopupElement.style.opacity = '';
    }
}


function triggerForcedTyping() {
    if (!context || !context.getState('isSystemCompromised') || forcedTypingInterval || context.commandInputElement.disabled) return;

    const messages = [ "HELP ME...", "they are watching everything", /* ... more messages ... */]; // Keep your messages
    const messageToType = messages[Math.floor(Math.random() * messages.length)];
    let charIndex = 0;

    context.logTrace('forced_typing', 'STARTED');
    context.displayOutput("WARNING: Input signal interference detected! Keystrokes rerouted!", "hacked-message");
    context.commandInputElement.disabled = true;
    context.commandInputElement.value = '';
    context.commandInputElement.classList.add('forced-input');

    forcedTypingInterval = setInterval(() => {
        if (charIndex < messageToType.length) {
            context.commandInputElement.value += messageToType[charIndex];
            charIndex++;
            context.moveCursorToEnd(context.commandInputElement); // Use context utility
        } else {
            clearInterval(forcedTypingInterval);
            forcedTypingInterval = null;

            setTimeout(() => {
                if (context.commandInputElement.classList.contains('forced-input') && context.commandInputElement.disabled) {
                    const commandText = context.commandInputElement.value;
                    const currentPrompt = context.promptElement?.textContent || '>';
                    context.displayOutput(`<span class="prompt">${escapeHTML(currentPrompt)}</span><span class="command-echo-text forced-input">${escapeHTML(commandText)}</span>`, 'command-echo');
                    context.logTrace(`FORCED_CMD: ${commandText}`, 'SYSTEM_OVERRIDE');
                    context.displayOutput(`Command "${escapeHTML(commandText)}" intercepted. Execution blocked.`, 'response-error');

                    context.commandInputElement.value = '';
                    context.commandInputElement.classList.remove('forced-input');
                    if (!fullscreenLockActive) context.commandInputElement.disabled = false; // Re-enable if not locked
                    context.focusCommandInput();
                } else {
                    // Cleanup if interrupted
                    if (context.commandInputElement.classList.contains('forced-input')) context.commandInputElement.classList.remove('forced-input');
                     if (!fullscreenLockActive) context.commandInputElement.disabled = false;
                     context.focusCommandInput();
                }
            }, 500 + Math.random() * 500);
        }
    }, 80 + Math.random() * 100);
}

function stopForcedTyping() {
    if (forcedTypingInterval) {
        clearInterval(forcedTypingInterval);
        forcedTypingInterval = null;
        if (context && context.commandInputElement) {
            context.commandInputElement.classList.remove('forced-input');
            context.commandInputElement.value = '';
            if (!fullscreenLockActive) { // Only re-enable if not fullscreen locked
                context.commandInputElement.disabled = false;
            }
        }
    }
}


async function fetchIpInfo() {
    if (!context) return;
    context.displayOutput("Attempting to trace connection origin via external resolver...", "response-info");
    context.logTrace('locate_me', 'INITIATED');
    // Disable input using the context's reference
    if (context.commandInputElement) context.commandInputElement.disabled = true;

    try {
        // Consider adding a cache-buster or checking referrer policy if issues persist
        const response = await fetch('https://ip-api.com/json/?fields=status,message,country,regionName,city,lat,lon,isp,org,query');

        if (!response.ok) {
            // Provide more specific feedback for common errors like 403
            if (response.status === 403) {
                throw new Error(`API Error ${response.status}: Forbidden. Possible rate limiting or network block.`);
            } else if (response.status === 429) {
                 throw new Error(`API Error ${response.status}: Too Many Requests. Please wait before trying again.`);
            }
            throw new Error(`API Error: ${response.status} ${response.statusText || ''}`);
        }
        const data = await response.json();

        if (data.status === 'success') {
            context.logTrace('locate_me', `SUCCESS (${data.query})`);
            let info = `<strong style='color: var(--accent-color);'>Connection Trace Results:</strong>\n\n`; // Add title
            // Use consistent label styling
            const labelStyle = "color: var(--prompt-color); display: inline-block; width: 120px;";
            info += `  <span style="${labelStyle}">Public IP:</span> <span style="color:var(--warning-color);">${escapeHTML(data.query || 'N/A')}</span>\n`;
            info += `  <span style="${labelStyle}">ISP:</span> ${escapeHTML(data.isp || 'N/A')}\n`;
            info += `  <span style="${labelStyle}">Organization:</span> ${escapeHTML(data.org || 'N/A')}\n`; // Added Org
            const lat = data.lat !== undefined ? parseFloat(data.lat).toFixed(4) : 'N/A';
            const lon = data.lon !== undefined ? parseFloat(data.lon).toFixed(4) : 'N/A';
            info += `  <span style="${labelStyle}">Est. Location:</span> ${escapeHTML(data.city || 'N/A')}, ${escapeHTML(data.regionName || 'N/A')}, ${escapeHTML(data.country || 'N/A')}\n`;
            info += `  <span style="${labelStyle}">Coordinates:</span> Lat ${escapeHTML(lat)}, Lon ${escapeHTML(lon)}\n`;


            if (context.getState('isSystemCompromised')) {
                info += `\n<span class="hacked-message glitch">WARNING: Geo-location data potentially compromised. Position logged by unknown entity.</span>`;
            }
            // Use typewriter for the results block
            context.typewriterResponse(info, () => {
                context.displayOutput(context.getState('isSystemCompromised') ? "Trace logged remotely." : "<span style='color: var(--success-color);'>Trace complete.</span>", context.getState('isSystemCompromised') ? "hacked-message" : "");
                 // Re-enable input via context reference only if NOT fullscreen locked
                 const fsLockActive = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
                 if (context.commandInputElement && !fsLockActive) context.commandInputElement.disabled = false;
                 context.focusCommandInput();
            });
        } else {
            // Handle API-level failure reported in the JSON
            throw new Error(data.message || 'API reported failure');
        }
    } catch (error) {
        console.error("Error fetching IP info:", error);
        context.logTrace('locate_me', `ERROR (${error.message})`);
        context.displayOutput(`Error tracing connection: ${escapeHTML(error.message)}`, "response-error");
         // Re-enable input via context reference only if NOT fullscreen locked
         const fsLockActive = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
         if (context.commandInputElement && !fsLockActive) context.commandInputElement.disabled = false;
         context.focusCommandInput();
    }
}

function displayDeviceInfo() {
    if (!context) return;
    context.displayOutput("Querying local system parameters via browser APIs...", "response-info");
    context.logTrace('sys_info', 'INITIATED');
    let deviceInfo = "<strong style='color: var(--accent-color);'>System Information Fingerprint:</strong>\n";
    try {
        deviceInfo += `  User Agent: ${escapeHTML(navigator.userAgent || 'N/A')}\n`;
        // ... (rest of device info gathering using navigator) ...
         deviceInfo += `  Platform:   ${escapeHTML(navigator.platform || 'N/A')}\n`;
         deviceInfo += `  Language:   ${escapeHTML(navigator.language || 'N/A')}\n`;
         deviceInfo += `  Vendor:     ${escapeHTML(navigator.vendor || 'N/A')}\n`;
         deviceInfo += `  Cookies:    ${navigator.cookieEnabled ? 'Enabled' : 'Disabled'}\n`;
         if (window.screen) { deviceInfo += `  Screen Res: ${window.screen.width}x${window.screen.height} @ ${window.screen.colorDepth}-bit\n`; }
         deviceInfo += `  CPU Cores:  ${escapeHTML(navigator.hardwareConcurrency?.toString() || 'N/A (Estimate)')}\n`;
         deviceInfo += `  Device Mem: ${escapeHTML(navigator.deviceMemory?.toString() ? navigator.deviceMemory + ' GiB' : 'N/A (Estimate)')}\n`;
         deviceInfo += `  Connection: ${navigator.onLine ? 'Online' : 'Offline'}\n`;
         deviceInfo += `  Touch Points:${navigator.maxTouchPoints > 0 ? navigator.maxTouchPoints : '0 (Mouse/Trackpad)'}\n`;


        if (context.getState('isSystemCompromised')) {
            deviceInfo += `\n<span class="hacked-message">WARNING: System fingerprint acquired. Profile transmitted to unauthorized listener.</span>`;
        }
        context.typewriterResponse(deviceInfo, () => {
            context.logTrace('sys_info', `SUCCESS${context.getState('isSystemCompromised') ? ' (Compromised)' : ''}`);
            context.displayOutput(context.getState('isSystemCompromised') ? "System query transmitted." : "System query complete.", context.getState('isSystemCompromised') ? "hacked-message" : "response-success");
            context.focusCommandInput();
        });
    } catch (error) {
        console.error("Error getting device info:", error);
        context.logTrace('sys_info', `ERROR (${error.message})`);
        context.displayOutput(`Error querying system parameters: ${escapeHTML(error.message)}`, "response-error");
        context.focusCommandInput();
    }
}

function triggerPanic() {
    if (!context) return;
    context.logTrace('panic', 'TRIGGERED');
    context.displayOutput("PANIC MODE ENGAGED! MULTIPLE SYSTEM FAILURES DETECTED!", "hacked-message glitch");
    if (!context.getState('isSystemCompromised')) {
        compromise(); // Activate compromise first
        setTimeout(doPanicActions, 1500); // Delay panic actions slightly
    } else {
        doPanicActions(); // Trigger immediately if already compromised
    }
}

function doPanicActions() {
    if (!context) return;
    const delay = () => Math.random() * 500;
    setTimeout(triggerGlitch, delay());
    setTimeout(flickerScreen, delay() + 100);
    setTimeout(triggerRandomTab, delay() + 300);
    setTimeout(triggerAnnoyingPopup, delay() + 600);
    setTimeout(startFakeDownload, delay() + 900);
    setTimeout(triggerForcedTyping, delay() + 1200);
    setTimeout(context.spawnRandomWindow, delay() + 1500); // Use context
    setTimeout(context.spawnRandomWindow, delay() + 1800);
    setTimeout(activateFullscreenLock, delay() + 2500);
}