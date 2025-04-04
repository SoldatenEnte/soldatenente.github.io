// js/utils.js - Utility functions (Refined scrollToBottom)

/**
 * Escapes HTML special characters in a string.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHTML(str) {
    // ... (keep existing escapeHTML function) ...
    if (typeof str !== 'string') return String(str); // Convert non-strings
    return str.replace(/&/g, '&')
              .replace(/</g, '<')
              .replace(/>/g, '>')
              .replace(/"/g, '"')
              .replace(/'/g, "'");
}

/**
 * Moves the cursor to the end of an input element.
 * @param {HTMLInputElement} inputElement The input element.
 */
export function moveCursorToEnd(inputElement) {
    // ... (keep existing moveCursorToEnd function) ...
    setTimeout(() => {
        if (inputElement && typeof inputElement.selectionStart === 'number') {
            inputElement.selectionStart = inputElement.selectionEnd = inputElement.value.length;
            inputElement.scrollLeft = inputElement.scrollWidth; // Ensure end is visible horizontally
        }
    }, 0);
}

/**
 * Scrolls an element to its bottom.
 * @param {HTMLElement} element The element to scroll.
 * @param {boolean} [force=false] If true, scrolls even if user might have scrolled up.
 * @param {boolean} [smooth=false] Use smooth scrolling if true.
 */
export function scrollToBottom(element, force = false, smooth = false) { // Added force parameter
    if (!element) return;

    const behavior = smooth ? 'smooth' : 'auto';

    // Only check isScrolledUp if NOT forcing the scroll
    if (!force) {
        // Check if user has scrolled up significantly (increased buffer slightly)
        // Or if the element is not currently focused (less likely user interaction)
        const isScrolledUp = element.scrollHeight - element.scrollTop - element.clientHeight > 150;
        const hasFocus = document.activeElement === element || element.contains(document.activeElement);

        // Don't auto-scroll if user has scrolled up and the element (or child) has focus
        if (isScrolledUp && hasFocus) {
             // console.log("Scroll prevented - user scrolled up."); // Optional debug log
             return;
        }
    }

    // Perform the scroll
    if ('scrollBehavior' in document.documentElement.style) {
        element.scrollTo({ top: element.scrollHeight, behavior: behavior });
    } else {
        element.scrollTop = element.scrollHeight; // Fallback
    }
}


/**
 * Generates a string of random characters (gibberish).
 * @param {number} length The desired length of the string.
 * @returns {string} The generated gibberish string.
 */
export function generateGibberish(length) {
    // ... (keep existing generateGibberish function) ...
    const chars = '!@#$%^&*()_+=-`~[]{};:"|,./<>?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789        '; // More spaces for visual variety
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Add some random line breaks for visual interest in longer strings
    if (length > 30) {
        result = result.replace(/(.{20,50}?)\s/g, '$1\n'); // Add newline after space roughly every 20-50 chars
    }
    return result;
}