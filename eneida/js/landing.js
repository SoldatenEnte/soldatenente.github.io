// js/landing.js - Handles boot sequence, particles, and login (Refactored Boot Monitor)

import { CORRECT_PASSWORD, asciiFrames, bootMessages } from './config.js';
import { escapeHTML } from './utils.js';

// --- State ---
let asciiInterval;
let particles = [];
let canvasCtx, particleCanvasElement;
let canvasWidth, canvasHeight;
let context = null; // To store the context passed from main.js
let bootMonitorWindowId = null; // To track the monitor window

// --- DOM Element References (passed from main.js) ---
let bootScreenElement, bootSequenceContainer, asciiLogoElement, bootLoaderText, bootLoaderBar;
let loginScreenElement, passwordInputElement, loginErrorElement, loginBoxElement;
let terminalElement; // Needed to hide/show
// --- REMOVED: statusMonitorElement, statusMonitorTitleBar, statusMonitorCloseBtn ---

// --- Particle System --- (Keep functions: Particle class, initParticles, animateParticles, resizeCanvas, setupParticles)
// ... (Particle system code remains the same) ...
class Particle {
    constructor() {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() * 0.5 - 0.25) * 0.5; // Slow drift
        this.speedY = (Math.random() * 0.6 + 0.1) * 0.5; // Slow fall
        const colors = [
            getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#00ffcc',
            getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#ff00ff',
            getComputedStyle(document.documentElement).getPropertyValue('--prompt-color').trim() || '#a0a0ff'
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.opacity = Math.random() * 0.5 + 0.2;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        // Wrap around edges
        if (this.y > canvasHeight + this.size) { this.y = -this.size; this.x = Math.random() * canvasWidth; }
        else if (this.y < -this.size) { this.y = canvasHeight + this.size; this.x = Math.random() * canvasHeight; }
        if (this.x > canvasWidth + this.size) { this.x = -this.size; this.y = Math.random() * canvasHeight; }
        else if (this.x < -this.size) { this.x = canvasWidth + this.size; this.y = Math.random() * canvasHeight; }
    }
    draw() {
        if (!canvasCtx) return; // Safety check inside draw
        canvasCtx.fillStyle = this.color;
        canvasCtx.globalAlpha = this.opacity; // Use particle opacity
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        canvasCtx.fill();
    }
}

function initParticles() {
    particles = [];
    if (!particleCanvasElement) return;
    canvasWidth = particleCanvasElement.width;
    canvasHeight = particleCanvasElement.height;
    const particleCount = Math.floor(canvasWidth * canvasHeight / 12000);
    for (let i = 0; i < Math.min(particleCount, 120); i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    if (!canvasCtx || !particleCanvasElement) {
        console.warn("Canvas context not ready for particle animation.");
        return;
    }
    canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    canvasCtx.globalAlpha = 1;
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });
    requestAnimationFrame(animateParticles);
}

export function resizeCanvas() {
    if (!particleCanvasElement) return;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    particleCanvasElement.width = canvasWidth;
    particleCanvasElement.height = canvasHeight;
    if (canvasCtx) {
        initParticles();
    }
}

export function setupParticles(canvasElement) {
    particleCanvasElement = canvasElement;
    if (!particleCanvasElement) {
        console.error("Particle canvas element not found!");
        return;
    }
    canvasCtx = particleCanvasElement.getContext('2d');
    if (!canvasCtx) {
        console.error("Failed to get 2D context for particle canvas!");
        return;
    }
    resizeCanvas();
    animateParticles();
}
// --- Boot Sequence --- (Keep functions: animateAscii, stopAsciiAnimation, updateLoaderBar)
function animateAscii() {
    let frameIndex = 0;
    if (asciiLogoElement && asciiFrames.length > 0) {
        if (asciiInterval) clearInterval(asciiInterval);
        asciiInterval = setInterval(() => {
            frameIndex = (frameIndex + 1) % asciiFrames.length;
            if (asciiLogoElement) {
                 asciiLogoElement.textContent = asciiFrames[frameIndex];
            } else {
                 clearInterval(asciiInterval);
            }
        }, 200);
    }
}

function stopAsciiAnimation() {
    clearInterval(asciiInterval);
    asciiInterval = null;
}

function updateLoaderBar(progress) {
    const barLength = 10;
    const filledLength = Math.round(progress * barLength);
    const emptyLength = barLength - filledLength;
    if (bootLoaderBar) {
        bootLoaderBar.textContent = `[${'#'.repeat(filledLength)}${'-'.repeat(emptyLength)}]`;
    }
}

function getBootMonitorHTML() {
    // Return the static inner HTML structure of the monitor
    return `
         <div class="monitor-grid">
             <!-- Graph Section -->
             <div class="monitor-section graph-section">
                 <div class="section-title">QX-7 Core Load</div>
                 <div class="graph-container">
                     <div class="graph-line"></div>
                     <div class="graph-grid"></div>
                     <div class="graph-glow"></div>
                 </div>
             </div>
             <!-- Bars Section -->
             <div class="monitor-section bar-section">
                 <div class="section-title">Mem/Temp</div>
                 <div class="bar-container">
                     <div class="bar-wrapper"><div class="bar-label">MEM</div><div class="bar mem-bar"><div class="bar-fill"></div></div></div>
                     <div class="bar-wrapper"><div class="bar-label">TMP</div><div class="bar temp-bar"><div class="bar-fill"></div></div></div>
                     <div class="bar-wrapper"><div class="bar-label">AUX</div><div class="bar aux-bar"><div class="bar-fill"></div></div></div>
                 </div>
             </div>
             <!-- Text Readout Section -->
             <div class="monitor-section text-section">
                 <div class="section-title">Network I/O</div>
                 <div class="text-readout"><span class="readout-label">Uplink:</span> <span class="readout-value status-ok">SECURE</span></div>
                 <div class="text-readout"><span class="readout-label">RX Rate:</span> <span class="readout-value data-rate-rx">--- MB/s</span></div>
                 <div class="text-readout"><span class="readout-label">TX Rate:</span> <span class="readout-value data-rate-tx">--- MB/s</span></div>
                 <div class="text-readout"><span class="readout-label">Sig Int:</span> <span class="readout-value signal-int">98.7%</span></div>
                 <div class="text-readout"><span class="readout-label">Locker:</span> <span class="readout-value hex-code">0x8A3F</span></div>
             </div>
             <!-- Lower Status -->
             <div class="monitor-section lower-status-section">
                 <span class="status-light red"></span>
                 <span class="status-light amber active"></span>
                 <span class="status-light green flicker"></span>
                 <span class="status-text">// STANDBY //</span>
             </div>
         </div>
         <div class="monitor-scanline"></div>
    `;
}

/**
 * Runs the boot sequence animation. (Modified to create window)
 * @returns {Promise<void>} Resolves when the boot sequence finishes and login is displayed.
 */
export async function runBootSequence() {
    return new Promise(async (resolveSequence) => {
        if (!bootSequenceContainer || !asciiLogoElement || !bootLoaderText || !bootScreenElement || !loginScreenElement || !context?.createWindow) {
             console.error("Boot sequence elements or context missing!");
             if (bootScreenElement) bootScreenElement.classList.add('hidden');
             if (loginScreenElement) {
                 loginScreenElement.classList.remove('hidden');
                 loginScreenElement.classList.add('visible');
                 if (passwordInputElement) passwordInputElement.focus();
             }
             resolveSequence();
             return;
        }

        // --- Show Boot Screen, Hide Others ---
        bootScreenElement.classList.remove('hidden');
        bootScreenElement.classList.add('visible');
        loginScreenElement.classList.add('hidden');
        loginScreenElement.classList.remove('visible');
        if (terminalElement) {
             terminalElement.classList.add('hidden');
             terminalElement.classList.remove('visible');
        }
        // Ensure any previously created boot monitor is closed
        if (bootMonitorWindowId && context.closeWindow) {
             context.closeWindow(bootMonitorWindowId);
             bootMonitorWindowId = null;
        }


        // --- Create Boot Monitor Window ---
        const monitorWidth = Math.min(650, window.innerWidth * 0.6);
        const monitorHeight = Math.min(500, window.innerHeight * 0.7);
        const monitorWin = context.createWindow(
             "// SYS_DIAGNOSTICS_v4.7 //",
             { type: 'html', html: getBootMonitorHTML() },
             {
                 width: monitorWidth,
                 height: monitorHeight,
                 startX: window.innerWidth - monitorWidth - 20,
                 startY: 20,
                 resizable: true,
                 className: 'boot-monitor-window no-fade-initial', // Add class for styling, prevent initial fade if desired
                 // onClose: () => { return false; } // Optional: Prevent closing during boot? Risky.
             }
        );
        if (monitorWin) {
            bootMonitorWindowId = monitorWin.id; // Track its ID
             // Force initial styles for animation
             monitorWin.style.opacity = '0';
             monitorWin.style.transform = 'translateX(20px)';
             // Trigger fade/slide in animation shortly after boot screen is visible
             setTimeout(() => {
                 monitorWin.style.transition = 'opacity 0.6s 0.5s ease-out, transform 0.6s 0.5s ease-out';
                 monitorWin.style.opacity = '0.9'; // Match old style
                 monitorWin.style.transform = 'translateX(0)';
             }, 50); // Small delay
        } else {
             console.warn("Failed to create boot monitor window.");
        }


        // --- Run Boot Message Sequence ---
        bootSequenceContainer.innerHTML = '';
        animateAscii();
        if (asciiLogoElement) asciiLogoElement.style.opacity = '1';

        let totalDelay = 0;
        for (let i = 0; i < bootMessages.length; i++) {
            // ... (rest of the message display loop remains the same) ...
             const msg = bootMessages[i];
             totalDelay += msg.delay;
             await new Promise(resolve => setTimeout(resolve, msg.delay));

             if (!bootScreenElement || bootScreenElement.classList.contains('hidden')) {
                 console.warn("Boot sequence aborted (screen hidden).");
                 stopAsciiAnimation();
                 if (bootMonitorWindowId && context.closeWindow) context.closeWindow(bootMonitorWindowId); // Close monitor if aborted
                 bootMonitorWindowId = null;
                 resolveSequence();
                 return;
             }

             const p = document.createElement('p');
             p.className = 'boot-message';
             if (msg.style) p.classList.add(msg.style);
             if (msg.indent) p.style.paddingLeft = '2em';
             p.textContent = msg.text;
             bootSequenceContainer.appendChild(p);
             bootSequenceContainer.scrollTop = bootSequenceContainer.scrollHeight;

             const progress = (i + 1) / bootMessages.length;
             updateLoaderBar(progress);
             if (msg.wait) {
                 await new Promise(resolve => setTimeout(resolve, 200));
             }
        }

        // --- Finalize Boot Sequence ---
        await new Promise(resolve => setTimeout(resolve, 400));
        if (bootLoaderText) bootLoaderText.textContent = "BOOT COMPLETE";
        updateLoaderBar(1);
        stopAsciiAnimation();

        await new Promise(resolve => setTimeout(resolve, 1000));

        // --- Transition to Login ---
        if (!bootScreenElement || bootScreenElement.classList.contains('hidden')) {
             console.warn("Boot sequence finished, but screen already hidden. Skipping transition.");
             if (bootMonitorWindowId && context.closeWindow) context.closeWindow(bootMonitorWindowId); // Ensure monitor closes
             bootMonitorWindowId = null;
             resolveSequence();
             return;
        }

        // Fade out boot screen AND the monitor window simultaneously
        bootScreenElement.style.transition = 'opacity 0.6s ease-out';
        bootScreenElement.style.opacity = '0';
        const monitorToFade = document.getElementById(bootMonitorWindowId);
        if (monitorToFade) {
            monitorToFade.style.transition = 'opacity 0.6s ease-out'; // Adjust timing if needed
            monitorToFade.style.opacity = '0';
        }


        setTimeout(() => {
            // Hide boot screen elements
            bootScreenElement.classList.remove('visible');
            bootScreenElement.classList.add('hidden');
            bootScreenElement.style.opacity = ''; // Reset opacity
            bootScreenElement.style.transition = '';

            // Close the boot monitor window properly using the system
            if (bootMonitorWindowId && context.closeWindow) {
                 context.closeWindow(bootMonitorWindowId);
                 bootMonitorWindowId = null;
            }

            // Show login screen
            loginScreenElement.classList.remove('hidden');
            loginScreenElement.classList.add('visible');

            setTimeout(() => {
                 if (passwordInputElement) passwordInputElement.focus();
            }, 100);

            console.log("Boot sequence finished. Login screen active.");
            resolveSequence();
        }, 600); // Wait for fade out
    });
}

// --- Login Logic --- (Keep functions: checkPassword)
export function checkPassword() {
    return new Promise((resolve) => {
        if (!passwordInputElement || !loginScreenElement || !loginErrorElement || !loginBoxElement) {
            console.error("Login elements missing during password check!");
            resolve(false);
            return;
        }
        const enteredPassword = passwordInputElement.value;
        if (enteredPassword === CORRECT_PASSWORD) {
           resolve(true); // Success handled by onLoginSuccess callback
        } else { // Incorrect password
            console.log("Password incorrect.");
            if (loginErrorElement) loginErrorElement.textContent = 'ACCESS DENIED. Incorrect Credentials.';
            passwordInputElement.value = '';
            if (loginBoxElement) { // Glitch effect
                loginBoxElement.classList.remove('glitch');
                void loginBoxElement.offsetWidth;
                loginBoxElement.classList.add('glitch');
                setTimeout(() => { if(loginBoxElement) loginBoxElement.classList.remove('glitch'); }, 400);
            }
            passwordInputElement.focus();
            resolve(false); // Signal failed login
        }
    });
}
// --- REMOVED: makeBootMonitorDraggable --- (Standard makeDraggable used now)

/**
 * Sets up the landing page elements and login listeners.
 * @param {object} elements Object containing DOM element references.
 * @param {Function} onLoginSuccess Callback function to execute on successful login.
 * @param {object} sharedContext The shared application context from main.js.
 */
export function setupLanding(elements, onLoginSuccess, sharedContext) { // Added context parameter
    // Store context
    context = sharedContext; // Store the context for use in runBootSequence

    // Store DOM references
    bootScreenElement = elements.bootScreen;
    bootSequenceContainer = elements.bootSequenceContainer;
    asciiLogoElement = elements.asciiLogo;
    bootLoaderText = elements.bootLoaderText;
    bootLoaderBar = elements.bootLoaderBar;
    loginScreenElement = elements.loginScreen;
    passwordInputElement = elements.passwordInput;
    loginErrorElement = elements.loginError;
    loginBoxElement = elements.loginBox;
    terminalElement = elements.terminal;

    // Setup particle canvas
    setupParticles(elements.particleCanvas);

    // --- REMOVED: Boot Monitor setup (handled in runBootSequence now) ---

    // Setup login listener
    if (passwordInputElement) {
        passwordInputElement.addEventListener('keydown', async (event) => {
            if (loginErrorElement) loginErrorElement.textContent = '';
            if (event.key === 'Enter') {
                event.preventDefault();
                passwordInputElement.disabled = true;
                const success = await checkPassword();
                if (success) {
                    onLoginSuccess(); // Callback from main.js handles transition
                } else {
                    passwordInputElement.disabled = false; // Re-enable on failure
                    passwordInputElement.focus();
                }
            }
        });
    } else {
        console.error("Password input element not found during landing setup!");
    }
    console.log("Landing setup complete.");
}