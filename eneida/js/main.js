// js/main.js - Main application entry point and orchestrator

import * as Config from './config.js';
// Remove portfolioData import
import { escapeHTML, scrollToBottom, moveCursorToEnd } from './utils.js';
import { setupLanding, runBootSequence, resizeCanvas } from './landing.js';
// Import setupTerminal FIRST
import { setupTerminal, clearCommandHistory, displayOutput, typewriterResponse } from './terminal.js';
import { setupEffects, deactivateCompromise } from './effects.js';
import { setupWindows, createWindow, closeWindow, closeAllWindows, spawnRandomWindow } from './windows.js';
import { initializeFileSystem, getFileSystem, getFileEntry, fetchFileContent } from './filesystem.js';
// *** NEW: Import leaderboard functions ***
import { saveGameScore, fetchLeaderboardData } from './leaderboard.js';

// --- Global State ---
const appState = {
    isSystemCompromised: false,
    fileSystemReady: false,
    username: "GUEST_OPERATOR",
    leaderboardData: null, // *** NEW: Initialize leaderboard data state ***
};

let fullTraceLog = [];
let fileSystem = null;

// --- DOM Element References ---
let particleCanvas, bootScreen, bootSequenceContainer, asciiLogo, bootLoaderText, bootLoaderBar;
let loginScreen, passwordInput, loginError, loginBox;
let terminal, output, commandInput, promptElement;
let annoyingPopup, popupCloseBtn;
let accessGrantedOverlay;

/**
 * Retrieves all necessary DOM elements.
 */
function getDOMElements() {
    // --- Boot Screen Elements ---
    bootScreen = document.getElementById('boot-screen');
    bootSequenceContainer = document.getElementById('boot-sequence');
    asciiLogo = document.getElementById('ascii-logo');
    bootLoaderText = document.querySelector('#boot-loader .loader-text');
    bootLoaderBar = document.querySelector('#boot-loader .loader-bar');
    // Status monitor is handled within landing.js setup

    // --- Login Screen Elements ---
    loginScreen = document.getElementById('login-screen');
    passwordInput = document.getElementById('password'); // CRITICAL for Login
    loginError = document.getElementById('login-error');
    loginBox = document.getElementById('auth-module');

    // --- Terminal Elements ---
    terminal = document.getElementById('terminal');
    output = document.getElementById('output');         // CRITICAL for Terminal
    commandInput = document.getElementById('command-input'); // CRITICAL for Terminal
    promptElement = document.querySelector('#input-line .prompt');

    // --- Effect Elements ---
    particleCanvas = document.getElementById('particle-canvas'); // Needed by Landing/Particles
    annoyingPopup = document.getElementById('annoying-popup');
    popupCloseBtn = document.getElementById('popup-close-btn');
    accessGrantedOverlay = document.getElementById('access-granted-overlay');

    // Basic check if core elements exist
    if (!loginScreen || !terminal || !commandInput || !output) {
        console.error("FATAL: Core UI elements not found! Cannot initialize application.");
        document.body.innerHTML = '<h1 style="color: red; font-family: monospace; text-align: center; padding-top: 20vh;">FATAL ERROR: CORE UI COMPONENTS MISSING.</h1>';
        return false;
    }
    return true;
}

// --- Logging ---
function logTrace(command, status = 'OK') {
    const timestamp = new Date().toLocaleTimeString();
    const isCorrupted = Math.random() < (appState.isSystemCompromised ? 0.25 : 0.05);
    fullTraceLog.push({
        timestamp,
        command: String(command).substring(0, 100),
        status: isCorrupted ? 'CORRUPTED' : String(status).substring(0, 50)
    });
    if (fullTraceLog.length > Config.MAX_TRACE_LOG) {
        fullTraceLog.shift();
    }
}

// --- State Management Accessors for Context ---
function getState(key) {
    // *** Load username from localStorage on first request if available ***
    if (key === 'username' && appState.username === "GUEST_OPERATOR") {
         try {
              const storedName = localStorage.getItem('terminalUsername');
              if (storedName) {
                   appState.username = storedName;
                   console.log(`Loaded username from localStorage: ${appState.username}`);
              }
         } catch(e) { console.error("Error reading username from localStorage:", e); }
    }
    return appState[key];
}

function setState(key, value) {
    console.log(`Setting state: ${key} = ${value}`);
    appState[key] = value;
    // *** Save username to localStorage when set ***
    if (key === 'username') {
         try {
             localStorage.setItem('terminalUsername', value);
         } catch(e) { console.error("Error saving username to localStorage:", e); }
    }
    // *** NOTE: We are NOT saving leaderboardData back to a file here ***
}

// --- Focus Input ---
function focusCommandInput() {
    if (commandInput && !commandInput.disabled) {
        const fsActive = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
        // Check annoying popup state directly via DOM element visibility
        const popupVisible = annoyingPopup && annoyingPopup.classList.contains('visible');
        if (popupVisible || fsActive) {
            return;
        }
        setTimeout(() => {
            commandInput.focus();
            moveCursorToEnd(commandInput);
        }, 0);
    }
}


// --- Initialization ---
async function initialize() {
    console.log("SECURE_TERMINAL initializing (Modular)...");

    if (!getDOMElements()) return;
    getState('username'); // Load username

    const fsInitialized = await initializeFileSystem();
    if (!fsInitialized) return;
    fileSystem = getFileSystem();
    appState.fileSystemReady = true;

    try {
        const leaderboardFileEntry = getFileEntry('leaderboards.json');
        if (leaderboardFileEntry) {
            const loadedData = await fetchFileContent(leaderboardFileEntry.path, true);
            if (typeof loadedData === 'object' && loadedData !== null) {
                 appState.leaderboardData = loadedData;
                 console.log("Initial leaderboard data loaded into memory:", appState.leaderboardData);
            } else {
                 console.warn("Loaded leaderboard data is not a valid object. Using default empty object.");
                 appState.leaderboardData = {};
            }
        } else {
            console.error("FATAL: leaderboards.json not found in filesystem manifest! Leaderboards will not work correctly.");
            appState.leaderboardData = {};
        }
    } catch (error) {
        console.error("Error loading initial leaderboard data:", error);
        appState.leaderboardData = {};
    }

    // --- Prepare BASE Context Object ---
    const baseContext = {
        // State Access
        getState,
        setState,
        // Logging
        logTrace,
        getTraceLog: () => fullTraceLog,
        // Filesystem Access
        fileSystem: fileSystem,
        getFileEntry: getFileEntry,
        fetchFileContent: fetchFileContent,
        // UI Transition Function
        transitionToLogin,
        // Utility functions
        escapeHTML,
        moveCursorToEnd,
        focusCommandInput,
        // *** UPDATE Leaderboard functions HERE ***
        saveGameScore, // Use the new generalized function name
        fetchLeaderboardData, // Already generalized in previous steps, ensure it's here
    };

    // --- Step 1: Setup Terminal FIRST ---
    // Pass baseContext (which now includes the generalized saveGameScore)
    const terminalContext = setupTerminal(
        { output, commandInput, promptElement, terminal },
        baseContext
    );
    // terminalContext will contain everything from baseContext + terminal additions

    // --- Step 2: Setup other modules using the COMPLETED terminalContext ---
    const fullContext = {
        ...terminalContext,
        // Add functions/refs needed specifically by windows/effects
        createWindow,
        closeWindow,
        closeAllWindows,
        spawnRandomWindow,
        deactivateCompromise,
        clearCommandHistory,
        // Pass necessary DOM elements for effects/windows
        commandInputElement: commandInput,
        promptElement: promptElement,
        annoyingPopupElement: annoyingPopup,
        popupCloseBtnElement: popupCloseBtn,
        scrollToBottom: (force = false, smooth = false) => scrollToBottom(output, force, smooth),
    };

    setupWindows(fullContext);
    setupEffects(fullContext);

    // --- Step 3: Setup Landing Page ---
    setupLanding(
         { particleCanvas, bootScreen, bootSequenceContainer, asciiLogo, bootLoaderText, bootLoaderBar, loginScreen, passwordInput, loginError, loginBox, terminal },
        handleLoginSuccess,
        fullContext // Pass the comprehensive context
    );
    
    // ... (rest of initialize) ...
    window.addEventListener('resize', resizeCanvas);
     runBootSequence().then(() => {
        console.log("Boot sequence promise resolved. Login active.");
    });
    console.log("Modular initialization sequence completed.");
}

// --- UI Transition Logic ---
// --- UI Transition Logic ---
function handleLoginSuccess() {
    console.log("Login successful, starting access granted animation...");

    // Ensure login input stays disabled during animation
    if (passwordInput) passwordInput.disabled = true;

    // Hide the login error message immediately if it was shown
    if (loginError) loginError.textContent = '';

    // Prepare terminal (ensure it's hidden but ready)
    if (terminal) {
        terminal.classList.remove('visible'); // Ensure it's hidden
        terminal.classList.add('hidden');
        terminal.style.opacity = '0'; // Start transparent for fade-in later
    }

    // Make sure login screen is technically still 'visible' behind the overlay
    if (loginScreen) {
        loginScreen.classList.add('visible'); // Make sure it's there
        loginScreen.classList.remove('hidden');
        // Optional: Slightly fade login screen behind overlay
        // loginScreen.style.transition = 'opacity 0.5s ease-out';
        // loginScreen.style.opacity = '0.3';
    }

    if (accessGrantedOverlay) {
        accessGrantedOverlay.classList.remove('hidden');
        accessGrantedOverlay.classList.add('visible');

        // Add slight delay before triggering CSS animations via class
        setTimeout(() => {
            if (accessGrantedOverlay) accessGrantedOverlay.classList.add('animate');
        }, 50); // 50ms delay to ensure transition applies

        const animationDuration = 2500; // ms - Should match the LONGEST animation duration + delay (ringExpand 1.5s + 0.3s delay = 1.8s, add buffer)

        // Set timeout to hide overlay and show terminal AFTER animation completes
        setTimeout(() => {
            // Clean up animation classes and hide overlay
            if (accessGrantedOverlay) {
                accessGrantedOverlay.classList.remove('visible', 'animate');
                accessGrantedOverlay.classList.add('hidden');
            }

            // Hide login screen permanently now
            if (loginScreen) {
                loginScreen.classList.remove('visible');
                loginScreen.classList.add('hidden');
                // loginScreen.style.opacity = ''; // Reset opacity if changed
                // loginScreen.style.transition = '';
            }

            // Clear the password field AFTER successful login and animation
            if (passwordInput) passwordInput.value = '';

            // Show and fade in the terminal
            if (terminal) {
                terminal.classList.remove('hidden');
                terminal.classList.add('visible');
                // Force reflow before adding transition class/style
                void terminal.offsetWidth;
                terminal.style.transition = 'opacity 0.5s ease-in';
                terminal.style.opacity = '1';
                // Focus is handled by the welcome message typewriter callback in terminal.js
                // Can add a failsafe focus here
                setTimeout(() => {
                    terminal.style.transition = ''; // Remove transition after fade
                     focusCommandInput();
                 }, 500); // Match fade duration
            }
             // Reset trace log on successful login? Optional.
             // fullTraceLog = [];

        }, animationDuration);

    } else {
        // --- Fallback if overlay element is missing ---
        console.warn("Access granted overlay not found, skipping animation.");
        // Perform original (instant) transition immediately
        if (loginScreen) {
            loginScreen.classList.remove('visible');
            loginScreen.classList.add('hidden');
        }
         if (passwordInput) passwordInput.value = ''; // Clear password

        if (terminal) {
            terminal.classList.remove('hidden');
            terminal.classList.add('visible');
            terminal.style.opacity = '1'; // Ensure visible
            setTimeout(focusCommandInput, 100);
        }
    }
}

function transitionToLogin() {
    console.log("Transitioning back to login screen...");
    setState('isSystemCompromised', false);
    // fullscreen state managed internally by effects

    if (terminal) {
        terminal.classList.remove('visible');
        terminal.classList.add('hidden');
        terminal.style.opacity = ''; // Reset opacity potentially set by transitions
    }
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('visible');
        if(passwordInput) passwordInput.value = '';
        if(loginError) loginError.textContent = '';
         passwordInput.disabled = false; // Ensure login input is enabled
        setTimeout(() => { if(passwordInput) passwordInput.focus(); }, 100);
    }
     // Clear windows and history when logging out
     closeAllWindows();
     clearCommandHistory();
     // Clear trace log on logout?
     // fullTraceLog = [];
}


// --- Start the application ---
document.addEventListener('DOMContentLoaded', initialize);