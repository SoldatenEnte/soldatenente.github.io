// js/filesystem.js - Handles loading and accessing the simulated file system

let fileSystemData = null;
const MANIFEST_URL = './filesystem.json'; // Path to your manifest

/**
 * Fetches and initializes the file system data from the manifest.
 * Should be called once during application startup.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function initializeFileSystem() {
    try {
        const response = await fetch(MANIFEST_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        fileSystemData = await response.json();
        console.log("File system initialized successfully.");
        return true;
    } catch (error) {
        console.error("FATAL: Could not initialize file system:", error);
        fileSystemData = {}; // Set to empty object on failure
        // Display error to user? Maybe in main.js after this promise fails
        document.body.innerHTML = '<h1 style="color: red; font-family: monospace; text-align: center; padding-top: 20vh;">FATAL ERROR: COULD NOT LOAD filesystem.json</h1>';
        return false;
    }
}

/**
 * Returns the entire loaded file system data.
 * Ensure initializeFileSystem() has completed successfully before calling.
 * @returns {object | null} The file system object or null if not loaded.
 */
export function getFileSystem() {
    return fileSystemData;
}

/**
 * Finds a file system entry by name (case-insensitive).
 * @param {string} name The filename to search for.
 * @returns {object | null} The file entry object or null if not found.
 */
export function getFileEntry(name) {
    if (!fileSystemData) return null;
    const lowerName = name.toLowerCase();
    // Find the key in the file system data that matches case-insensitively
    const foundKey = Object.keys(fileSystemData).find(key => key.toLowerCase() === lowerName);
    return foundKey ? fileSystemData[foundKey] : null;
}

/**
 * Fetches the content of a file specified by its path.
 * Handles JSON parsing automatically.
 * @param {string} path The path to the file (from the manifest).
 * @param {boolean} [expectJson=false] Set to true if the content should be parsed as JSON.
 * @returns {Promise<string | object>} The file content (string or parsed JSON object).
 * @throws {Error} If the fetch fails or JSON parsing fails when expected.
 */
export async function fetchFileContent(path, expectJson = false) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`File not found or inaccessible (${response.status}): ${path}`);
        }
        if (expectJson) {
            const jsonData = await response.json();
            return jsonData; // Return parsed JSON object
        } else {
            const textData = await response.text();
            return textData; // Return text content
        }
    } catch (error) {
        console.error(`Error fetching file content from ${path}:`, error);
        throw error; // Re-throw the error to be handled by the command
    }
}