// js/commands.js - Implementations for user commands

import { escapeHTML, generateGibberish } from './utils.js';
import { formatTime } from './leaderboard.js';
import { setTypewriterSpeed, TYPEWRITER_BASE_DELAY, TYPEWRITER_RANDOM_FACTOR } from './config.js';
import { initPong } from './pong.js';
import { initTetris, GAME_MODES, COLS, ROWS, BLOCK_SIZE } from './tetris.js';
import { initSnake } from './snake.js';

// --- Context (Passed from terminal.js) ---
// Holds { displayOutput, typewriterResponse, logTrace, portfolioData, getState, setState, createWindow, closeAllWindows, focusCommandInput, deactivateCompromise, ... }

// --- Helper for Basic Markdown to HTML ---
// (Place this near the top of commands.js or move to utils.js)
function simpleMarkdownToHtml(text) {
    if (!text) return '';

    // 1. Escape initial HTML (important!)
    let html = escapeHTML(text);

    // 2. Handle Block Elements FIRST, adding <br> explicitly
    // Headers (h4-h6) - Add <br> after the closing tag
    html = html.replace(/^(#)\s+(.*?)\s*$/gm, '<h4 style="color: var(--accent-color); margin-top: 0.8em; margin-bottom: 0.4em; font-weight: bold;">$2</h4><br>');
    html = html.replace(/^(##)\s+(.*?)\s*$/gm, '<h5 style="color: var(--accent-color); margin-top: 0.6em; margin-bottom: 0.3em; font-weight: bold;">$2</h5><br>');
    html = html.replace(/^(###)\s+(.*?)\s*$/gm, '<h6 style="color: var(--accent-color); margin-top: 0.5em; margin-bottom: 0.2em; font-weight: bold;">$2</h6><br>');

    // Lists - Add <br> after each list item line
    html = html.replace(/^[\*\-]\s+(.*)\s*$/gm, '  • $1<br>');

    // 3. Handle Paragraph breaks: Replace double (or more) newlines with double <br>
    html = html.replace(/\n\n+/g, '<br><br>');

    // 4. Handle Inline Elements (Bold, Italic, Code) - These shouldn't affect newlines
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(\s|^|>)\*(.*?)\*(\s|$|<)/g, '$1<em>$2</em>$3'); // Italic *
    html = html.replace(/(\s|^|>)_(.*?)_(\s|$|<)/g, '$1<em>$2</em>$3'); // Italic _
    html = html.replace(/`(.*?)`/g, '<code style="color: var(--accent-color); background-color: rgba(0, 255, 204, 0.1); padding: 0.1em 0.3em; border-radius: 3px; font-weight: bold;">$1</code>');

    // 5. CRITICAL: Treat remaining single newlines (intra-paragraph) as spaces
    html = html.replace(/\n/g, '');

    // 6. Cleanup excessive breaks (optional but good practice)
    // Collapse 3 or more <br> tags into just 2
    html = html.replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>');
    // Remove leading/trailing <br> tags
    html = html.replace(/^(\s*<br\s*\/?>)+|(<br\s*\/?>\s*)+$/g, '');

    return html;
}


// --- NEW HELPER: Format Node Data for Window ---
function formatNodeDataToHtml(nodeData, displayName) {
    let html = `<div class="node-info-content">`;
    const nodeName = escapeHTML(nodeData.name || displayName);
    const nodeType = escapeHTML(nodeData.type || 'Node');

    // Header
    html += `<h2 class="node-name">${nodeName}</h2>`;
    html += `<p class="node-type">[ Type: ${nodeType} ]</p>`;
    html += `<div class="node-divider"></div>`;

    // Description / Details
    if (nodeData.description) {
        html += `<div class="node-section"><h4>Description</h4><p>${simpleMarkdownToHtml(nodeData.description)}</p></div>`;
    }
    if (nodeData.details) {
         html += `<div class="node-section"><h4>Details</h4><p>${simpleMarkdownToHtml(nodeData.details)}</p></div>`;
    }
    if (nodeData.level) { // For skills
         html += `<div class="node-section"><h4>Proficiency</h4><p><span class="node-level">${escapeHTML(nodeData.level)}</span></p></div>`;
    }

    // Technologies (for Projects)
    if (nodeData.tech && Array.isArray(nodeData.tech) && nodeData.tech.length > 0) {
        html += `<div class="node-section"><h4>Technologies</h4><ul class="tech-list">`;
        nodeData.tech.forEach(tech => {
            html += `<li>${escapeHTML(tech)}</li>`;
        });
        html += `</ul></div>`;
    }

    // Links (for Projects)
    let linksHtml = '';
    if (nodeData.link) {
        linksHtml += `<p><span class="node-label">Live URL:</span> <a href="${escapeHTML(nodeData.link)}" target="_blank" rel="noopener noreferrer" class="node-link">${escapeHTML(nodeData.link)}</a></p>`;
    }
    if (nodeData.repo) {
        linksHtml += `<p><span class="node-label">Repository:</span> <a href="${escapeHTML(nodeData.repo)}" target="_blank" rel="noopener noreferrer" class="node-link">${escapeHTML(nodeData.repo)}</a></p>`;
    }
    if (linksHtml) {
        html += `<div class="node-section"><h4>Links</h4>${linksHtml}</div>`;
    }

    // Placeholder for potential image
    // if (nodeData.image) {
    //    html += `<div class="node-section"><img src="${escapeHTML(nodeData.image)}" alt="${nodeName} Preview" class="node-image"></div>`;
    // }

    html += `</div>`; // Close node-info-content
    return html;
}

// --- Command Implementations (Updated) ---

export async function help(args, context) { // Now async
    context.logTrace('help', 'INITIATED');
    const fileName = 'readme.md';
    const fileEntry = context.getFileEntry(fileName);

    if (!fileEntry || fileEntry.type !== 'markdown') {
        context.typewriterResponse(`Help file (${fileName}) not found or invalid type.`, 'response-error');
        context.logTrace('help', 'FILE_NOT_FOUND');
        return;
    }

    try {
        if (context.commandInputElement) context.commandInputElement.disabled = true;
        context.displayOutput(`Fetching help content from ${fileName}...`, 'response-info'); // Use displayOutput for instant feedback
        const content = await context.fetchFileContent(fileEntry.path);
        const formattedHelp = simpleMarkdownToHtml(content);
        // Add explicit <br> tags for spacing if needed, instead of relying on \n
        const response = `<strong style='color: var(--accent-color);'>Help Information:</strong><br><br>${formattedHelp}<br><br><span style='color: var(--prompt-color);'>--- End of Help ---</span>`;

        // Disable input re-enable inside typewriter callback
        context.typewriterResponse(response, () => {
             context.logTrace('help', 'DISPLAYED');
             if (context.commandInputElement) context.commandInputElement.disabled = false;
             context.focusCommandInput();
        });
    } catch (error) {
        context.typewriterResponse(`Error loading help file: ${escapeHTML(error.message)}`, 'response-error');
        context.logTrace('help', `ERROR: ${error.message}`);
        if (context.commandInputElement) context.commandInputElement.disabled = false;
        context.focusCommandInput();
    }
}

export function clear(args, context) {
    const outputElement = document.getElementById('output');
    if (outputElement) outputElement.innerHTML = '';
    context.logTrace('clear', 'OK');
    context.focusCommandInput();
}
export const cls = clear; // Alias

export function whoami(args, context) {
    context.logTrace('whoami', 'OK');
    // *** NEW: Get username from context state ***
    const username = context.getState('username') || 'GUEST_OPERATOR';
    // Use typewriter for consistency
    context.typewriterResponse(`Current User: <span style="color: var(--warning-color);">${escapeHTML(username)}</span>`);
}

export function setname(args, context) {
    const newName = args.join(' ').trim();

    if (!newName) {
        const currentName = context.getState('username') || 'GUEST_OPERATOR';
        context.typewriterResponse(simpleMarkdownToHtml(`Usage: \`setname [new_username]\`\nCurrent username: <span style="color:var(--warning-color);">${escapeHTML(currentName)}</span>`), "response-info");
        context.logTrace('setname', 'USAGE_SHOWN');
        return;
    }

    // Basic validation (e.g., length)
    if (newName.length > 20) {
         context.typewriterResponse(`Error: Username too long (max 20 characters).`, "response-error");
         context.logTrace('setname', 'NAME_TOO_LONG');
         return;
    }
    if (newName.toLowerCase() === 'guest_operator') {
         context.typewriterResponse(`Error: Cannot set username to default 'GUEST_OPERATOR'.`, "response-error");
         context.logTrace('setname', 'INVALID_NAME (Default)');
         return;
    }
    // Add more validation if needed (e.g., allowed characters)


    context.setState('username', newName); // Use context to set state (will also save to localStorage)
    context.typewriterResponse(`Username updated to: <span style="color:var(--warning-color);">${escapeHTML(newName)}</span>`, "response-success");
    context.logTrace('setname', `SUCCESS (${newName})`);
}

function formatLeaderboardDataToHtmlTable(data, modeInfo) {
    const { scores } = data;
    const modeDisplayName = escapeHTML(modeInfo.name || 'Leaderboard');
    const isTimeBased = modeInfo.type === 'sprint';
    const headerValue = isTimeBased ? 'Time' : 'Score';

    let html = `<div class="leaderboard-content">`;
    html += `<h2 class="leaderboard-title">🏆 ${modeDisplayName} 🏆</h2>`;

    if (scores.length === 0) {
        html += `<p class="no-scores-message">( No scores recorded yet for this mode )</p>`;
    } else {
        html += `<table class="leaderboard-table">`;
        html += `<thead><tr>
                    <th class="rank-col">Rank</th>
                    <th class="user-col">Operator</th>
                    <th class="score-col">${headerValue}</th>
                 </tr></thead>`;
        html += `<tbody>`;

        scores.forEach((entry, index) => {
            const rank = index + 1;
            const username = escapeHTML(entry.username || '???');
            let valueStr;

            if (isTimeBased) {
                valueStr = formatTime(entry.time); // Use formatTime directly
            } else {
                valueStr = entry.score?.toLocaleString() || 'N/A'; // Format score with commas
            }

            // Add alternating row class
            const rowClass = index % 2 === 0 ? 'even-row' : 'odd-row';
            html += `<tr class="${rowClass}">
                        <td class="rank-col">${rank}</td>
                        <td class="user-col">${username}</td>
                        <td class="score-col">${valueStr}</td>
                     </tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div>`; // Close leaderboard-content
    return html;
}


export async function leaderboard(args, context) {
    const modeArg = args[0]?.toLowerCase();
    const validModes = Object.keys(GAME_MODES);

    if (!modeArg) {
        const modesString = validModes.map(m => `\`${m}\``).join(', ');
        const usageMsg = context.simpleMarkdownToHtml ? context.simpleMarkdownToHtml(`Usage: \`leaderboard [mode]\`\nAvailable modes: ${modesString}`) : `Usage: leaderboard [mode]. Available: ${modesString}`;
        context.typewriterResponse(usageMsg, "response-info");
        context.logTrace('leaderboard', 'USAGE_SHOWN');
        return;
    }

    if (!validModes.includes(modeArg)) {
         context.typewriterResponse(`Error: Invalid leaderboard mode '<span style="color:var(--error-color);">${escapeHTML(modeArg)}</span>'. Use 'leaderboard' to see available modes.`, "response-error");
         context.logTrace('leaderboard', `INVALID_MODE (${modeArg})`);
         return;
    }

    context.logTrace('leaderboard', `VIEWING (${modeArg})`);
    context.displayOutput(`Fetching leaderboard data for mode: ${modeArg}...`, 'response-info');
    if (context.commandInputElement) context.commandInputElement.disabled = true; // Disable input

    try {
        // Use the new function from context to fetch RAW data
        const leaderboardData = await context.fetchLeaderboardData(modeArg, GAME_MODES);

        // Format the raw data into an HTML table string
        const leaderboardHTML = formatLeaderboardDataToHtmlTable(leaderboardData, leaderboardData.modeInfo);

        // Determine window size (adjust as needed)
        const windowWidth = Math.max(400, Math.min(window.innerWidth * 0.4, 500));
        const windowHeight = Math.max(350, Math.min(window.innerHeight * 0.6, 600));

        // Create the window using the generated HTML
        const win = context.createWindow(
            `Leaderboard: ${leaderboardData.modeInfo.name || modeArg.toUpperCase()}`,
            { type: 'html', html: leaderboardHTML },
            {
                width: windowWidth,
                height: windowHeight,
                resizable: true,
                className: 'leaderboard-window' // Add specific class for styling
            }
        );

        if (win) {
            // Optional: Add a success message to the terminal (or remove if window is enough)
            context.displayOutput(`Leaderboard for <span style="color:var(--text-color);">${modeArg}</span> opened in a new window.`, "response-success");
        } else {
            // Error handled by createWindow logging, but add terminal feedback
            context.displayOutput(`Failed to open leaderboard window for <span style="color:var(--text-color);">${modeArg}</span>.`, "response-error");
        }

    } catch (error) {
        console.error("Error fetching/displaying leaderboard:", error);
        // Display error in the terminal since the window won't open
        context.typewriterResponse(`Error fetching leaderboard: ${escapeHTML(error.message)}`, "response-error");
        if (error.message.includes('network') || error.message.includes('database connection')) {
             context.displayOutput(`<span style='color: var(--warning-color);'>(Tip: Check ad blockers, network connection, or Firebase setup)</span>`, "response-warning");
        }
    } finally {
        // Always re-enable and refocus input
        if (context.commandInputElement) context.commandInputElement.disabled = false;
        context.focusCommandInput();
    }
}

export function date(args, context) {
    context.logTrace('date', 'OK');
    const now = new Date();
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const formattedDate = now.toLocaleString(undefined, options);
    context.typewriterResponse(`System Timestamp: <span style="color: var(--prompt-color);">${formattedDate}</span>`);
}

export function list(args, context) {
    const fileSystem = context.fileSystem;
    if (!fileSystem) {
        context.typewriterResponse(`File system not available.`, 'response-error');
        context.logTrace('list', 'FS_UNAVAILABLE');
        return;
    }

    context.logTrace(`list`, `Scanning filesystem`);
    context.typewriterResponse(`Scanning filesystem...`, () => {
        // --- Progress Bar Animation (remains the same) ---
        let progress = 0;
        const progressLine = document.createElement('div');
        progressLine.style.whiteSpace = 'pre'; progressLine.style.marginTop = '5px';
        context.displayOutput('', ''); // Add an empty div to append to
        const outputElement = document.getElementById('output');
        if (!outputElement) return;
        outputElement.appendChild(progressLine);
        context.scrollToBottom(true, false);

        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 10) + 15;
            progress = Math.min(100, progress);
            const progressBarLength = 20; const filledLength = Math.round((progress / 100) * progressBarLength); const emptyLength = progressBarLength - filledLength;
            // Check if progressLine is still in DOM
            if (outputElement.contains(progressLine)) {
                progressLine.innerHTML = `<span style="color:var(--prompt-color);">[</span><span style="color:var(--text-color);">${'#'.repeat(filledLength)}</span><span style="color:var(--prompt-color); opacity: 0.5;">${'.'.repeat(emptyLength)}</span><span style="color:var(--prompt-color);">]</span> ${progress}%`;
                context.scrollToBottom(true, false);
            } else {
                 clearInterval(interval); // Stop if line removed
            }

            if (progress >= 100) {
                clearInterval(interval);
                if (outputElement.contains(progressLine)) { // Remove only if still there
                    progressLine.remove();
                }

                // --- Categorize and Format Output ---
                const visibleEntries = Object.entries(fileSystem)
                    .filter(([key, entry]) => !entry.isHidden)
                    .sort(([keyA, entryA], [keyB, entryB]) => {
                        const nameA = entryA.displayName || keyA;
                        const nameB = entryB.displayName || keyB;
                        return nameA.localeCompare(nameB);
                    });

                const readableFiles = visibleEntries.filter(([, entry]) => entry.type === 'markdown');
                const connectableNodes = visibleEntries.filter(([, entry]) => entry.type === 'project' || entry.type === 'skill');
                const encryptedFiles = visibleEntries.filter(([, entry]) => entry.type === 'encrypted');

                let listResult = "";
                // Define the code style to reuse
                const codeStyle = `style="color: var(--accent-color); background-color: rgba(0, 255, 204, 0.1); padding: 0.1em 0.3em; border-radius: 3px; font-weight: bold;"`;

                if (readableFiles.length > 0) {
                    // --- MODIFICATION: Use explicit <code> tag ---
                    listResult += `<strong style='color: var(--accent-color);'>Readable Files (<code ${codeStyle}>cat [file]</code>):</strong><br>`;
                    readableFiles.forEach(([key, entry]) => {
                        listResult += `  • <span style="color: var(--text-color);">${escapeHTML(entry.displayName || key)}</span><br>`;
                    });
                    listResult += `<br>`;
                }

                if (connectableNodes.length > 0) {
                     // --- MODIFICATION: Use explicit <code> tag ---
                    listResult += `<strong style='color: var(--accent-color);'>Connectable Nodes (<code ${codeStyle}>connect [node]</code>):</strong><br>`;
                    connectableNodes.forEach(([key, entry]) => {
                        const typeHint = entry.type === 'project' ? 'Project' : 'Skill';
                        listResult += `  • <span style="color: var(--text-color);">${escapeHTML(entry.displayName || key)}</span> <span style="color: var(--prompt-color); opacity: 0.7;">(${typeHint})</span><br>`;
                    });
                    listResult += `<br>`;
                }

                if (encryptedFiles.length > 0) {
                     // --- MODIFICATION: Use explicit <code> tag ---
                    listResult += `<strong style='color: var(--accent-color);'>Encrypted Files (<code ${codeStyle}>decrypt [file.enc]</code>):</strong><br>`;
                    encryptedFiles.forEach(([key, entry]) => {
                        listResult += `  • <span style="color: var(--text-color);">${escapeHTML(entry.displayName || key)}</span><br>`;
                    });
                    listResult += `<br>`;
                }

                if (listResult === "") {
                    listResult = "No accessible items found.";
                } else {
                    listResult = listResult.trimEnd() + `<br><br><span style='color: var(--prompt-color);'>--- End of List ---</span>`;
                }

                // --- MODIFICATION: Removed call to simpleMarkdownToHtml ---
                // listResult = simpleMarkdownToHtml(listResult); // No longer needed for this output
                context.typewriterResponse(listResult); // Pass the raw HTML string

            } else {
                 // Scroll handled inside interval now
            }
        }, 100 + Math.random() * 80); // Keep animation timing
        // --- End Progress Bar Animation ---
    });
}

export async function connect(args, context) {
    const nodeName = args.join(' ').toLowerCase();
    if (!nodeName) {
        context.typewriterResponse(simpleMarkdownToHtml("Usage: `connect [node_name]`"), "response-info");
        return;
    }

    // 1. Find connectable node (as before)
    const nodeEntry = Object.values(context.fileSystem || {}).find(entry =>
        !entry.isHidden &&
        (entry.type === 'project' || entry.type === 'skill') &&
        entry.displayName?.toLowerCase() === nodeName
    );

    if (nodeEntry) {
        // --- Node Found - New Window Flow ---
        context.logTrace(`connect ${nodeName}`, `Connecting to ${nodeEntry.displayName}`);
        const displayName = escapeHTML(nodeEntry.displayName || nodeName);
        const MIN_ANIMATION_DURATION = 1200; // <<< Set minimum visible time in milliseconds

        // --- Terminal Feedback: Connecting Animation ---
        let progress = 0;
        let animationInterval = null; // Keep track of the interval ID
        const progressLine = document.createElement('div');
        progressLine.style.whiteSpace = 'pre';
        progressLine.style.marginTop = '5px';
        context.displayOutput(`Establishing connection to node: <span style="color:var(--text-color);">${displayName}</span>...`);
        const outputElement = document.getElementById('output');
        if (outputElement) outputElement.appendChild(progressLine);
        context.scrollToBottom(true, false);

        // --- Promise for minimum animation delay ---
        const minDelayPromise = new Promise(resolve => setTimeout(resolve, MIN_ANIMATION_DURATION));

        // --- Start the visual animation ---
        const animationPromise = new Promise(resolveAnimation => {
            animationInterval = setInterval(() => {
                // Slightly faster increments to likely finish *within* the min duration
                progress += Math.floor(Math.random() * 15) + 20;
                progress = Math.min(100, progress);
                const progressBarLength = 15;
                const filledLength = Math.round((progress / 100) * progressBarLength);
                const emptyLength = progressBarLength - filledLength;

                if (outputElement && outputElement.contains(progressLine)) {
                    progressLine.innerHTML = `<span style="color:var(--prompt-color);">Connecting: [</span><span style="color:var(--text-color);">${'#'.repeat(filledLength)}</span><span style="color:var(--prompt-color); opacity: 0.5;">${'.'.repeat(emptyLength)}</span><span style="color:var(--prompt-color);">]</span> ${progress}%`;
                    context.scrollToBottom(true, false); // Ensure scroll during animation
                } else {
                     // If line removed, stop trying to update visually but let the overall logic continue
                     if(animationInterval) clearInterval(animationInterval);
                     animationInterval = null;
                }

                if (progress >= 100) {
                    // Animation reached 100%, resolve its promise
                    if(animationInterval) clearInterval(animationInterval);
                    animationInterval = null;
                    resolveAnimation(); // Signal animation completion
                }
            }, 80 + Math.random() * 40); // Faster interval than previous attempt
        });
        // --- End Animation Start ---

        try {
            if (context.commandInputElement) context.commandInputElement.disabled = true;

            // --- Fetch data (as a promise) ---
            const fetchDataPromise = context.fetchFileContent(nodeEntry.path, true);

            // --- Wait for BOTH minimum delay AND data fetch ---
            const [_, nodeData] = await Promise.all([minDelayPromise, fetchDataPromise]); // We only need nodeData result

            // --- Ensure animation is stopped and shows final state ---
            if (animationInterval) { // If animation didn't naturally finish
                clearInterval(animationInterval);
                animationInterval = null;
            }
            if (outputElement && outputElement.contains(progressLine)) {
                progressLine.innerHTML = `<span style="color:var(--prompt-color);">Connecting: [</span><span style="color:var(--success-color);">${'#'.repeat(15)}</span><span style="color:var(--prompt-color);">]</span> 100% - <span style="color:var(--success-color);">[CONNECTED]</span>`;
                context.scrollToBottom(true, false); // Final scroll
            }

            // --- Create Window (now that data and delay are done) ---
            const windowTitle = `${nodeData.type || 'Node'}: ${nodeData.name || nodeEntry.displayName}`;
            const windowHTML = formatNodeDataToHtml(nodeData, nodeEntry.displayName);
            const windowWidth = Math.max(400, Math.min(window.innerWidth * 0.6, 650));
            const windowHeight = Math.max(300, Math.min(window.innerHeight * 0.7, 550));

            const win = context.createWindow(
                windowTitle,
                { type: 'html', html: windowHTML },
                {
                    width: windowWidth,
                    height: windowHeight,
                    resizable: true,
                    className: 'node-info-window'
                }
            );

            if (win) {
                context.typewriterResponse(`Connection established. Details for <span style="color:var(--text-color);">${displayName}</span> opened in a new window.`, "response-success", () => {
                    if (context.commandInputElement) context.commandInputElement.disabled = false;
                    context.focusCommandInput();
                });
            } else {
                context.typewriterResponse(`Connection established, but failed to open details window for <span style="color:var(--text-color);">${displayName}</span>.`, "response-error", () => {
                    if (context.commandInputElement) context.commandInputElement.disabled = false;
                    context.focusCommandInput();
                });
            }

        } catch (error) {
             // --- Error Handling ---
             // Ensure animation is stopped on error
            if (animationInterval) {
                clearInterval(animationInterval);
                animationInterval = null;
            }
             if (outputElement && outputElement.contains(progressLine)) {
                 progressLine.innerHTML = `<span style="color:var(--prompt-color);">Connecting: [</span><span style="color:var(--error-color);">${'x'.repeat(15)}</span><span style="color:var(--prompt-color);">]</span> --- <span style="color:var(--error-color);">[FAILED]</span>`;
                 context.scrollToBottom(true, false);
             }

            context.typewriterResponse(`Error during connection to '${displayName}': ${escapeHTML(error.message)}`, 'response-error');
            context.logTrace(`connect ${nodeName}`, `ERROR: ${error.message}`);
            if (context.commandInputElement) context.commandInputElement.disabled = false;
            context.focusCommandInput();
        }
        return; // Exit after handling connectable node
    }

    // --- Node NOT Found or Wrong Type - Suggestion Logic (Remains the same) ---
    let fileEntry = context.getFileEntry(nodeName);
    let encryptedEntry = null;
    if (!fileEntry) {
         encryptedEntry = Object.values(context.fileSystem || {}).find(entry =>
            entry.type === 'encrypted' &&
            entry.displayName?.toLowerCase() === nodeName &&
            !entry.isHidden
        );
    }
     let secretEntry = null;
     if (!fileEntry && !encryptedEntry) {
         const secretFileName = `${nodeName.toUpperCase()}.secret.json`;
         secretEntry = context.getFileEntry(secretFileName);
         if (secretEntry && (secretEntry.type !== 'secret' || !secretEntry.isHidden)) {
              secretEntry = null;
         }
     }

    let suggestion = "";
    const targetName = escapeHTML(nodeName);

    if (fileEntry && fileEntry.type === 'markdown' && !fileEntry.isHidden) {
        suggestion = `Cannot \`connect\` to a markdown file. Did you mean to use \`cat ${targetName}\`?`;
        context.logTrace(`connect ${nodeName}`, 'IS_MARKDOWN');
    } else if (encryptedEntry) {
        suggestion = `Cannot \`connect\` to an encrypted file. Did you mean to use \`decrypt ${escapeHTML(encryptedEntry.displayName || nodeName)}\`?`;
        context.logTrace(`connect ${nodeName}`, 'IS_ENCRYPTED');
    } else if (secretEntry) {
        suggestion = `Cannot \`connect\` to a secret code. Did you mean to use \`unlock ${escapeHTML(nodeName.toUpperCase())}\`?`;
        context.logTrace(`connect ${nodeName}`, 'IS_SECRET');
    } else if (fileEntry && fileEntry.type === 'contact') {
         suggestion = `Cannot \`connect\` to contact data. Did you mean to use \`contact\`?`;
         context.logTrace(`connect ${nodeName}`, 'IS_CONTACT');
    }
     else if (fileEntry) {
        suggestion = `Cannot \`connect\` to file type '${fileEntry.type}'. Use \`list\`.`;
        context.logTrace(`connect ${nodeName}`, `WRONG_TYPE (${fileEntry.type})`);
    } else {
        suggestion = `Node or File '<span style="color: var(--error-color);">${targetName}</span>' not found. Use \`list\`.`;
        context.logTrace(`connect ${nodeName}`, 'NOT_FOUND');
    }

    context.typewriterResponse(simpleMarkdownToHtml(suggestion), 'response-error');
}

export async function cat(args, context) { // Async
    const fileName = args.join(' ');
    if (!fileName) {
        context.typewriterResponse(simpleMarkdownToHtml("Usage: `cat [filename]`"), "response-info");
        return;
    }

    // --- REVISED: Check multiple possibilities for file existence ---
    // 1. Check for exact filename (likely markdown)
    let fileEntry = context.getFileEntry(fileName);
    // 2. If not found, check if user might have typed an encrypted file's display name
    let encryptedEntry = null;
    if (!fileEntry) {
         encryptedEntry = Object.values(context.fileSystem || {}).find(entry =>
            entry.type === 'encrypted' &&
            entry.displayName?.toLowerCase() === fileName.toLowerCase() &&
            !entry.isHidden
        );
    }
    // 3. If still not found, check for a node's display name
    let nodeEntry = null;
    if (!fileEntry && !encryptedEntry) {
        nodeEntry = Object.values(context.fileSystem || {}).find(entry =>
            (entry.type === 'project' || entry.type === 'skill') &&
            entry.displayName?.toLowerCase() === fileName.toLowerCase() &&
            !entry.isHidden
        );
    }
    // 4. If still not found, check for a secret file's code name
    let secretEntry = null;
    if (!fileEntry && !encryptedEntry && !nodeEntry) {
        const secretFileName = `${fileName.toUpperCase()}.secret.json`; // Secrets use uppercase codes
        secretEntry = context.getFileEntry(secretFileName);
        if (secretEntry && (secretEntry.type !== 'secret' || !secretEntry.isHidden)) {
             secretEntry = null; // Ignore if not a valid hidden secret
        }
    }


    // --- Determine Action based on Findings ---
    if (fileEntry && fileEntry.type === 'markdown' && !fileEntry.isHidden) {
        // --- Correct Type: Proceed with cat logic ---
        context.logTrace(`cat ${fileName}`, `Displaying ${fileName}`);
        context.displayOutput(`Fetching content for ${fileName}...`, 'response-info');
        try {
            if (context.commandInputElement) context.commandInputElement.disabled = true;
            const content = await context.fetchFileContent(fileEntry.path);
            const processedContent = simpleMarkdownToHtml(content);
            if (context.commandInputElement) context.commandInputElement.disabled = false;
            const response = `<span style="color:var(--prompt-color);">--- Start of File: ${escapeHTML(fileName)} ---</span><br><br>${processedContent}<br><br><span style="color:var(--prompt-color);">--- End of File: ${escapeHTML(fileName)} ---</span>`;
            context.typewriterResponse(response, () => context.focusCommandInput());
        } catch (error) {
            context.typewriterResponse(`Error reading file: ${escapeHTML(error.message)}`, 'response-error');
            context.logTrace(`cat ${fileName}`, `ERROR: ${error.message}`);
            if (context.commandInputElement) context.commandInputElement.disabled = false;
            context.focusCommandInput();
        }
        // --- End cat logic ---

    } else {
        // --- Wrong Type or Not Found - Generate Suggestion ---
        let suggestion = "";
        const targetName = escapeHTML(fileName); // Use user input for message consistency

        if (encryptedEntry) {
            suggestion = `This is an encrypted file. Did you mean to use \`decrypt ${escapeHTML(encryptedEntry.displayName || fileName)}\`?`;
            context.logTrace(`cat ${fileName}`, 'IS_ENCRYPTED');
        } else if (nodeEntry) {
            suggestion = `This is a node. Did you mean to use \`connect ${escapeHTML(nodeEntry.displayName || fileName)}\`?`;
            context.logTrace(`cat ${fileName}`, 'IS_NODE');
        } else if (secretEntry) {
            suggestion = `This is a secret code. Did you mean to use \`unlock ${escapeHTML(fileName.toUpperCase())}\`?`;
            context.logTrace(`cat ${fileName}`, 'IS_SECRET');
        } else if (fileEntry && fileEntry.type === 'contact') { // Check original fileEntry if it was found but wrong type
             suggestion = `This is contact data. Did you mean to use \`contact\`?`;
             context.logTrace(`cat ${fileName}`, 'IS_CONTACT');
        } else if (fileEntry) { // Exists but unsupported type for cat
            suggestion = `Cannot display file type: ${fileEntry.type}. Use \`list\`.`;
            context.logTrace(`cat ${fileName}`, `UNSUPPORTED_TYPE (${fileEntry.type})`);
        }
        else {
            // Truly not found
            suggestion = `File or Node '<span style="color: var(--error-color);">${targetName}</span>' not found. Use \`list\`.`;
            context.logTrace(`cat ${fileName}`, 'NOT_FOUND');
        }

        const formattedError = simpleMarkdownToHtml(suggestion);
        context.typewriterResponse(formattedError, 'response-error');
    }
}

export async function decrypt(args, context) { // Async
    const fileName = args.join(' '); // User input, likely ends in .enc
    if (!fileName) { context.typewriterResponse(simpleMarkdownToHtml("Usage: `decrypt [filename.enc]`"), "response-info"); return; }

    // Find the correct encrypted entry
    const fileEntry = Object.values(context.fileSystem || {}).find(entry =>
        entry.type === 'encrypted' &&
        entry.displayName?.toLowerCase() === fileName.toLowerCase() &&
        !entry.isHidden
    );

    // Error handling if not found or wrong type (as refined before)
    if (!fileEntry) {
        const otherEntry = context.getFileEntry(fileName);
        let suggestion = "";
        if (otherEntry && !otherEntry.isHidden) {
            let safeTargetName = fileName;
            if (otherEntry.displayName) { safeTargetName = otherEntry.displayName; }
            else if (otherEntry.key && typeof otherEntry.key === 'string') { safeTargetName = otherEntry.key.split('.')[0]; }
            safeTargetName = escapeHTML(safeTargetName);

            if (otherEntry.type === 'markdown') { suggestion = `This file is not encrypted. Did you mean to use \`cat ${safeTargetName}\`?`; context.logTrace(`decrypt ${fileName}`, 'IS_MARKDOWN'); }
            else if (otherEntry.type === 'project' || otherEntry.type === 'skill') { suggestion = `This is a node, not an encrypted file. Did you mean to use \`connect ${safeTargetName}\`?`; context.logTrace(`decrypt ${fileName}`, 'IS_NODE'); }
            else if (otherEntry.type === 'secret') { let codeName = fileName.toUpperCase(); if (otherEntry.key && typeof otherEntry.key === 'string') { codeName = otherEntry.key.replace('.secret.json',''); } suggestion = `This is a secret file. Did you mean to use \`unlock ${escapeHTML(codeName)}\`?`; context.logTrace(`decrypt ${fileName}`, 'IS_SECRET'); }
            else if (otherEntry.type === 'contact') { suggestion = `This is contact data. Did you mean to use \`contact\`?`; context.logTrace(`decrypt ${fileName}`, 'IS_CONTACT'); }
            else { suggestion = `File found, but it's not an encrypted type (${otherEntry.type}). Use \`list\`.`; context.logTrace(`decrypt ${fileName}`, `WRONG_TYPE (${otherEntry.type})`); }
            context.typewriterResponse(simpleMarkdownToHtml(suggestion), "response-error");
        } else {
            context.typewriterResponse(`Error: Encrypted file not found: <span style="color: var(--error-color);">${escapeHTML(fileName)}</span>. Use \`list\`.`, "response-error");
            context.logTrace(`decrypt ${fileName}`, 'NOT_FOUND');
        }
        return;
    }

    // Proceed with decrypt logic
    context.logTrace(`decrypt ${fileName}`, `Attempting ${fileName}`);
    context.displayOutput(`Requesting decryption key for ${fileName}...`, 'response-info');
    try {
        if (context.commandInputElement) context.commandInputElement.disabled = true;
        const encData = await context.fetchFileContent(fileEntry.path, true);
        if (!encData || typeof encData.placeholder !== 'string' || typeof encData.decrypted !== 'string') {
             throw new Error("Invalid encrypted file data format.");
        }
        if (context.commandInputElement) context.commandInputElement.disabled = false;

        let initialResponse = `<span style="color:var(--prompt-color);">--- Encrypted Data Stream: ${escapeHTML(fileName)} ---</span><br>`;
        initialResponse += `<div style="word-break: break-all; color: var(--error-color); opacity: 0.7; font-size: 0.8em; max-height: 5em; overflow:hidden; border: 1px dashed var(--error-color); padding: 5px; margin-top: 5px; margin-bottom: 5px;">${escapeHTML(encData.placeholder)}</div>`;
        initialResponse += `Attempting decryption using available keys...<br>`;

        context.typewriterResponse(initialResponse, () => {
            let progress = 0;
            const progressLine = document.createElement('div');
            // ... (progress bar animation) ...
            progressLine.style.whiteSpace = 'pre'; progressLine.style.marginTop = '5px';
            context.displayOutput('', ''); const outputElement = document.getElementById('output'); outputElement.appendChild(progressLine); context.scrollToBottom(true, false);
            const interval = setInterval(() => {
                progress += Math.floor(Math.random() * 15) + 10;
                progress = Math.min(100, progress);
                const progressBarLength = 20; const filledLength = Math.round((progress / 100) * progressBarLength); const emptyLength = progressBarLength - filledLength;
                progressLine.innerHTML = `<span style="color:var(--prompt-color);">Decrypting: [</span><span style="color:var(--text-color);">${'#'.repeat(filledLength)}</span><span style="color:var(--prompt-color); opacity: 0.5;">${'.'.repeat(emptyLength)}</span><span style="color:var(--prompt-color);">]</span> ${progress}%`;
                if (progress >= 100) {
                    clearInterval(interval);
                    progressLine.remove();
                    context.logTrace(`decrypt ${fileName}`, 'SUCCESS');

                    // --- FIX: Process decrypted content ---
                    let finalDecryptedContent = encData.decrypted;
                    // Basic check: If it doesn't look like markdown (no #, *, - at line start, no **)
                    // then treat single newlines as <br>. Otherwise, let simpleMarkdownToHtml handle it.
                    const likelyMarkdown = /^(#|\*|- |> )/m.test(finalDecryptedContent) || /\*\*|`/.test(finalDecryptedContent);

                    if (!likelyMarkdown) {
                        // Assume plain text: Escape HTML and convert \n to <br>
                        finalDecryptedContent = escapeHTML(finalDecryptedContent).replace(/\n/g, '<br>');
                    } else {
                        // Process as markdown (which now handles line breaks correctly for markdown)
                        finalDecryptedContent = simpleMarkdownToHtml(finalDecryptedContent);
                    }
                    // --- END FIX ---

                    let decryptedResponse = `<span style="color: var(--success-color);">Decryption successful! Quantum key matched.</span><br>`;
                    decryptedResponse += `<span style="color:var(--prompt-color);">--- Decrypted Content: ${escapeHTML(fileName)} ---</span><br><br>`;
                    decryptedResponse += finalDecryptedContent; // Add the processed content
                    decryptedResponse += `<br><br><span style="color:var(--prompt-color);">--- End of Decrypted File ---</span>`;
                    context.typewriterResponse(decryptedResponse, () => context.focusCommandInput());
                } else { context.scrollToBottom(true, false); }
            }, 150 + Math.random() * 100);
        });

    } catch (error) {
        context.typewriterResponse(`Error decrypting file: ${escapeHTML(error.message)}`, 'response-error');
        context.logTrace(`decrypt ${fileName}`, `ERROR: ${error.message}`);
        if (context.commandInputElement) context.commandInputElement.disabled = false;
        context.focusCommandInput();
    }
}

export function profile(args, context) {
    // Updated alias
    cat(['profile.md'], context); // Assumes profile.md exists
}

export async function contact(args, context) { // Async
    context.logTrace('contact', 'INITIATED');
    const fileName = 'contact.json';
    const fileEntry = context.getFileEntry(fileName);

    if (!fileEntry || fileEntry.type !== 'contact') {
        context.typewriterResponse(`Contact information file (${fileName}) not found or invalid.`, 'response-error');
        context.logTrace('contact', 'FILE_NOT_FOUND');
        return;
    }
    context.displayOutput('Retrieving contact channels...', 'response-info');

    try {
        if (context.commandInputElement) context.commandInputElement.disabled = true;
        const contactData = await context.fetchFileContent(fileEntry.path, true);
        if (context.commandInputElement) context.commandInputElement.disabled = false;

        let responseHeader = "<strong style='color: var(--accent-color);'>Contact Channels:</strong><br><br>"; // Use <br>
        let linksHTML = "";
        const labelStyle = "color: var(--prompt-color); display: inline-block; width: 90px;";

        if (contactData.email) linksHTML += `  <span style="${labelStyle}">Email:</span> <a href="mailto:${escapeHTML(contactData.email)}">${escapeHTML(contactData.email)}</a><br>`; // Use <br>
        if (contactData.linkedin) linksHTML += `  <span style="${labelStyle}">LinkedIn:</span> <a href="${escapeHTML(contactData.linkedin)}" target="_blank" rel="noopener noreferrer">${escapeHTML(contactData.linkedin)}</a><br>`;
        if (contactData.github) linksHTML += `  <span style="${labelStyle}">GitHub:</span> <a href="${escapeHTML(contactData.github)}" target="_blank" rel="noopener noreferrer">${escapeHTML(contactData.github)}</a><br>`;
        if (contactData.website) linksHTML += `  <span style="${labelStyle}">Website:</span> <a href="${escapeHTML(contactData.website)}" target="_blank" rel="noopener noreferrer">${escapeHTML(contactData.website)}</a><br>`;

        context.typewriterResponse(responseHeader, () => {
            if (linksHTML) {
                 context.displayOutput(linksHTML.replace(/\n/g,'<br>')); // Ensure <br>
                 context.logTrace('contact', 'DISPLAYED');
            } else {
                context.displayOutput("  (No contact information configured)");
                 context.logTrace('contact', 'EMPTY');
            }
            context.focusCommandInput();
        });

    } catch (error) {
        context.typewriterResponse(`Error loading contact info: ${escapeHTML(error.message)}`, 'response-error');
        context.logTrace('contact', `ERROR: ${error.message}`);
        if (context.commandInputElement) context.commandInputElement.disabled = false;
        context.focusCommandInput();
    }
}

export function config(args, context) {
    // --- MODIFICATION START ---
    // Access the CURRENT speed values directly from the imported config variables
    const currentBaseDelay = TYPEWRITER_BASE_DELAY;
    const currentRandomFactor = TYPEWRITER_RANDOM_FACTOR;

    const currentSpeedName = Object.entries({ 0: 'instant', 2: 'fast', 15: 'medium', 50: 'slow' })
        .find(([delay]) => parseInt(delay) === currentBaseDelay)?.[1] || `custom (${currentBaseDelay}ms)`;
    // --- MODIFICATION END ---

    let usageMessage = `Usage: \`config speed [slow | medium | fast | instant | &lt;delay_ms&gt;]\`\n Current speed: <span style="color:var(--text-color);">${currentSpeedName}</span>`;

    usageMessage = simpleMarkdownToHtml(usageMessage); // Format backticks

    if (args.length < 2 || args[0]?.toLowerCase() !== 'speed') {
        context.typewriterResponse(usageMessage, "response-info");
        context.logTrace('config', 'USAGE_SHOWN');
        return;
    }

    const speedSetting = args[1].toLowerCase();
    let feedback = "";
    let success = true;
    // --- MODIFICATION START ---
    // Use local variables to determine the NEW settings
    let newBase = currentBaseDelay;
    let newRandom = currentRandomFactor;
    // --- MODIFICATION END ---

    switch (speedSetting) {
        case 'slow': newBase = 50; newRandom = 40; feedback = "Typing speed set to: slow"; break;
        case 'medium': newBase = 15; newRandom = 20; feedback = "Typing speed set to: medium"; break;
        case 'fast': newBase = 2; newRandom = 5; feedback = "Typing speed set to: fast"; break;
        case 'instant': newBase = 0; newRandom = 0; feedback = "Typing speed set to: instant"; break;
        default:
            const customDelay = parseInt(speedSetting, 10);
            if (!isNaN(customDelay) && customDelay >= 0 && customDelay < 1000) {
                newBase = customDelay;
                newRandom = (customDelay === 0) ? 0 : Math.max(1, Math.round(customDelay * 0.4));
                feedback = `Typing speed base delay set to: ${customDelay}ms`;
            } else {
                feedback = `Invalid speed setting: <span style="color:var(--error-color);">${escapeHTML(speedSetting)}</span>. Use slow, medium, fast, instant, or 0-999 (ms).`;
                success = false;
            }
    }

    if (success) {
         // Update speed settings via imported function from config.js
         // This function updates the actual values in config.js
         setTypewriterSpeed(newBase, newRandom);
    }

    context.typewriterResponse(feedback, success ? "response-success" : "response-error");
    context.logTrace(`config speed ${speedSetting}`, success ? 'OK' : 'INVALID');
}

export function exit(args, context) {
    context.logTrace('exit', 'INITIATED');
    context.typewriterResponse("<span style='color:var(--warning-color);'>Disconnecting session... Closing secure channel...</span>", () => {
        setTimeout(() => {
            context.deactivateCompromise(false);
            context.closeAllWindows();
            const outputElement = document.getElementById('output');
            if (outputElement) outputElement.innerHTML = '';
            context.clearCommandHistory();
            const terminalElement = document.getElementById('terminal');
            if (terminalElement) {
                terminalElement.classList.remove('visible');
                terminalElement.classList.add('hidden');
            }
            context.transitionToLogin();
            console.log("Session exited. Returning to login.");
        }, 600);
    });
}

export async function unlock(args, context) { // Async
    const code = args.join(' ').toUpperCase();
    if (!code) {
        context.typewriterResponse(simpleMarkdownToHtml("Usage: `unlock [access_code]`"), "response-info");
        return;
    }

    const fileName = `${code}.secret.json`; // Construct expected filename
    const fileEntry = context.getFileEntry(fileName); // Look for the secret file

    // Check if the entry exists, is a secret, and is hidden
    if (!fileEntry || fileEntry.type !== 'secret' || !fileEntry.isHidden) {
        context.logTrace(`unlock ${code}`, 'INVALID_CODE');
        // Standard rejection sequence
        context.typewriterResponse(`Analyzing code [<span style="color:var(--error-color);">${escapeHTML(code)}</span>]...`, () => {
            setTimeout(() => {
                context.typewriterResponse(`Access Code Rejected or Invalid.`, "response-error");
                context.focusCommandInput();
            }, 300 + Math.random() * 300);
        });
        return;
    }

    context.logTrace(`unlock ${code}`, 'ATTEMPTING');
    context.displayOutput(`Access Code [<span style="color:var(--warning-color);">${escapeHTML(code)}</span>] recognized. Verifying credentials...`, 'response-info'); // Instant feedback

    try {
        if (context.commandInputElement) context.commandInputElement.disabled = true;
        const secretData = await context.fetchFileContent(fileEntry.path, true); // Fetch the JSON content
        if (context.commandInputElement) context.commandInputElement.disabled = false;

        // --- Format the response using <br> ---
        let response = `Credentials accepted. Unlocking secure data fragment...<br><br>`;
        response += `<strong style="color: var(--accent-color);">Unlocked Data: ${escapeHTML(secretData.name || code)}</strong><br>`;
        const labelStyle = "color: var(--prompt-color); display: inline-block; width: 110px;";
        response += `  <span style="${labelStyle}">Type:</span> <span style="color: var(--text-color);">${escapeHTML(secretData.type)}</span><br>`;
        // Use simpleMarkdownToHtml for potentially multi-line fields
        if (secretData.description) response += `  <span style="${labelStyle}">Description:</span> <span style="color: var(--text-color);">${simpleMarkdownToHtml(secretData.description)}</span><br>`;
        if (secretData.message) response += `  <span style="${labelStyle}">Message:</span> <span style="color: var(--text-color); font-style: italic;">"${simpleMarkdownToHtml(secretData.message)}"</span><br>`;
        if (secretData.status) response += `  <span style="${labelStyle}">Status:</span> <span style="color: var(--warning-color);">${escapeHTML(secretData.status)}</span><br>`;
        response += "<br><span style='color: var(--success-color);'>Data unlocked successfully.</span>";
        // --- End Formatting ---

        context.typewriterResponse(response, () => {
            context.logTrace(`unlock ${code}`, 'SUCCESS');
            context.focusCommandInput();
        });

    } catch (error) {
        context.typewriterResponse(`Error unlocking secret: ${escapeHTML(error.message)}`, 'response-error');
        context.logTrace(`unlock ${code}`, `ERROR: ${error.message}`);
        if (context.commandInputElement) context.commandInputElement.disabled = false;
        context.focusCommandInput();
    }
}

export function trace(args, context) {
    const fullTraceLog = context.getTraceLog();
    context.logTrace('trace', 'DISPLAYED');
    if (fullTraceLog.length === 0) {
        context.typewriterResponse("System trace log is empty.");
        return;
    }
     let traceOutput = "<strong style='color: var(--accent-color);'>System Trace Log:</strong><br><br>"; // Use <br>
     fullTraceLog.forEach((entry, index) => {
         const isCorrupted = entry.status === 'CORRUPTED';
         const entryClass = `trace-entry ${isCorrupted ? 'corrupted' : ''}`;
         const statusColor = entry.status === 'OK' || entry.status === 'SUCCESS' ? 'var(--success-color)' : (entry.status === 'NOT_FOUND' || entry.status === 'INVALID' || entry.status.startsWith('FAILED') || isCorrupted || entry.status.includes('ERROR') || entry.status.includes('DENIED') ? 'var(--error-color)' : 'var(--warning-color)');
         traceOutput += `<span class="trace-index" style="color: var(--accent-color); opacity: 0.7;">[${index.toString().padStart(3, '0')}]</span> `;
         traceOutput += `<span class="trace-time" style="color: var(--text-color); opacity: 0.6; margin: 0 8px;">${entry.timestamp}</span> `;
         traceOutput += `<span style="color: var(--prompt-color);">></span> ${escapeHTML(entry.command)} `;
         traceOutput += `<span class="trace-status" style="color:${statusColor};">[${escapeHTML(entry.status)}]</span>`;
         if (isCorrupted) traceOutput += ` <span style="color: var(--error-color); font-style: italic; opacity: 0.7;">[CORRUPTED_DATA]</span>`;
         traceOutput += "<br>"; // Use <br>
     });
     traceOutput += "<br><span style='color: var(--prompt-color);'>--- End of Trace Log ---</span>";
     context.typewriterResponse(traceOutput);
}

export function view(args, context) {
    if (args.length === 0) {
        context.typewriterResponse(simpleMarkdownToHtml("Usage: `view <image_url> [optional_window_title]`"), "response-info");
        context.logTrace('view', 'USAGE_SHOWN'); return;
    }
    const url = args[0];
    let isValidUrl = false;
    try { const parsedUrl = new URL(url); isValidUrl = ['http:', 'https:', 'data:'].includes(parsedUrl.protocol); }
    catch (_) { isValidUrl = url.startsWith('data:image'); } // Basic check for data URIs

    if (!isValidUrl) {
        context.typewriterResponse(`Invalid URL format: <span style="color: var(--error-color);">${escapeHTML(url)}</span>. Requires http(s):// or data:image URI.`, "response-error");
        context.logTrace('view', `INVALID_URL: ${url}`); return;
    }
    const title = args.slice(1).join(' ') || url.split('/').pop().split('?')[0] || "Image Viewer";
    context.logTrace('view', `Opening: ${url}`);
    const sanitizedUrl = escapeHTML(url);
    const sanitizedTitle = escapeHTML(title);

    // Use the new createWindow function with type 'image'
    const win = context.createWindow(
        sanitizedTitle,
        {
            type: 'image',
            imageUrl: sanitizedUrl,
            imageAlt: sanitizedTitle // Optional alt text
        },
        {
            width: 450,
            height: 350,
            resizable: true
        }
    );

    if (win) {
         context.typewriterResponse(`Opening image viewer for: <a href="${sanitizedUrl}" target="_blank">${sanitizedUrl}</a>`, "response-info");
    } else {
        // Error handled by createWindow
        context.displayOutput(`Error creating image viewer window for: ${sanitizedUrl}`, "response-error");
    }
}

export function hack(args, context) {
    let target = args.join(' '); if (!target) target = "system";
    const targetLower = target.toLowerCase();
    let response = ""; context.logTrace(`hack ${target}`, 'INITIATED');
    let initialMessage = `Initiating penetration sequence on target: <span style="color:var(--warning-color);">${escapeHTML(target)}</span>...<br>`; // Use <br>
    if (targetLower.includes("mainframe")) { response = "... Access Denied. Mainframe requires Quantum Entanglement Key (QEK)."; }
    else if (targetLower.includes("firewall")) { response = "... Analyzing ruleset... Found exception for port 22 (SSH)... Connection timed out. Honeypot detected?"; }
    else if (targetLower.includes("database") || targetLower.includes("db")) { response = "... Attempting SQL Injection `'; DROP TABLE users; --` ... Command failed. WAF blocked query."; }
    else if (targetLower.includes("network")) { response = "... Sniffing packets... Encrypted traffic detected (AES-1024-Q). Unbreakable."; }
    else if (targetLower.includes("coffee")) { response = "... API endpoint `/brew` found... Sending POST... Response: `418 I'm a teapot`."; }
    else if (targetLower.includes("toaster")) { response = "... Reverse engineering firmware... Found vulnerability: buffer overflow in `toast_level` setting! ... Oh wait, it just burns the toast."; }
    else if (targetLower === "system" || targetLower === "kernel" || targetLower === "root") { response = "... Escalating privileges... Kernel module injection... <span style='color: var(--error-color);'>KERNEL PANIC!</span> ... System unstable. Reboot recommended."; }
    else { response = `Analyzing target '${escapeHTML(target)}'... Target is either heavily shielded, non-existent, or simply uninteresting. Aborting hack attempt.`; }
    response = simpleMarkdownToHtml(response);
    context.typewriterResponse(initialMessage + response, () => {
        context.logTrace(`hack ${target}`, 'SIMULATED');
        context.focusCommandInput();
    });
}

export function reboot(args, context) {
    context.logTrace('reboot', 'INITIATED');
    const outputElement = document.getElementById('output');
    if (!outputElement) return;

    // --- SAFETY CHECK ADDED ---
    if (!context || !context.commandInputElement) {
        console.error("Reboot error: Command input element not found in context!");
        // Optionally display an error message if possible, though output might clear anyway
        // context.displayOutput?.("FATAL REBOOT ERROR: CONTEXT INVALID", "response-error");
        return; // Stop the reboot if context is broken
    }
    // --- END SAFETY CHECK ---

    // Use displayOutput for the immediate message
    context.displayOutput("<span class='reboot-message'>Initiating system reboot sequence...</span>");

    // --- Disable input using the verified context reference ---
    context.commandInputElement.disabled = true;

    context.deactivateCompromise(false); // Call via context
    context.closeAllWindows(); // Call via context

    const rebootSteps = [ // (Keep the steps array as is)
        { text: "Unmounting filesystems [/dev/portfolio, /tmp] ...", delay: 800 },
        { text: "Sending SIGTERM to all user processes...", delay: 600 },
        { text: "Sending SIGKILL to non-responsive processes [PID " + Math.floor(1000 + Math.random() * 9000) + "]...", delay: 1000, style: "warning"},
        { text: "Syncing virtual disks...", delay: 500 },
        { text: "Performing memory integrity check (Quantum Scan)...", delay: 1200 },
        { text: " [OK]", delay: 300, instant: true, style: "success" },
        { text: "\nRe-initializing core kernel modules [quantum_net, crypto_hash_v3]...", delay: 1200 },
        { text: "Loading essential drivers [V_GFX, V_INPUT, Q_NET]...", delay: 900 },
        { text: "Verifying BIOS signature (Fallback Mode)...", delay: 700 },
        { text: " [WARN: Signature mismatch! Proceeding.]", delay: 500, instant: true, style: "warning" },
        { text: "Mounting virtual filesystem /dev/portfolio...", delay: 400 },
        { text: "Bringing network interface q_eth0 up...", delay: 700 },
        { text: "\nSystem restart complete. Welcome back, Operator.", delay: 500, style: "important" }
    ];

    let currentTimeout = 300;

    function runStep(index) {
        // --- SAFETY CHECK inside callback ---
        if (!context || !context.commandInputElement) {
             console.error("Reboot callback error: Command input element not found in context!");
             return;
        }
        // --- END SAFETY CHECK ---

        if (index >= rebootSteps.length) {
            // --- Re-enable input using verified context reference ---
            context.commandInputElement.disabled = false;
            context.focusCommandInput();
            context.logTrace('reboot', 'COMPLETED');
            // Add an empty prompt line for aesthetics after reboot
            context.displayOutput(`<span class="prompt">${context.promptElement?.textContent || 'user@portfolio:~$'}</span>`, 'command-echo');
            context.focusCommandInput(); // Focus again after adding prompt
            return;
        }

        const step = rebootSteps[index];
        setTimeout(() => {
            const messageClass = `reboot-message ${step.style || ''}`;
            const stepElement = document.createElement('span');
            stepElement.className = messageClass;
            stepElement.innerHTML = escapeHTML(step.text);

            if (step.instant) {
                const lastOutput = outputElement.lastElementChild;
                 if (lastOutput && !lastOutput.innerHTML.includes('<br>') && lastOutput.tagName !== 'DIV' && lastOutput.tagName !== 'P') {
                    lastOutput.appendChild(stepElement);
                 } else {
                    context.displayOutput(stepElement.outerHTML, messageClass.replace('reboot-message', '').trim());
                 }
            } else {
                 context.displayOutput(stepElement.outerHTML, messageClass.replace('reboot-message', '').trim());
            }
             // Use context's scrollToBottom
             context.scrollToBottom?.(true, false); // Add optional chaining for safety
            runStep(index + 1);
        }, step.delay);
    }

    // Start the sequence after clearing the screen
    setTimeout(() => {
        if (outputElement) outputElement.innerHTML = '';
        context.displayOutput("<span class='reboot-message'>Initiating system reboot sequence...</span>");
        runStep(0);
    }, currentTimeout);
}

export function pong(args, context) {
    const allowedDifficulties = ['easy', 'medium', 'hard'];
    let requestedDifficulty = args[0]?.toLowerCase();
    let selectedDifficulty = 'medium';
    let feedbackMessage = "";

    // Determine difficulty and feedback message (same logic as before)
    if (requestedDifficulty && allowedDifficulties.includes(requestedDifficulty)) {
        selectedDifficulty = requestedDifficulty;
        feedbackMessage = `Selected difficulty: <span style="color:var(--text-color);">${selectedDifficulty.toUpperCase()}</span>. Launching PONG module...`;
        context.logTrace('pong', `LAUNCHING (${selectedDifficulty})`);
    } else {
        // Handle invalid or no difficulty (same logic as before)
         if (requestedDifficulty) {
             feedbackMessage = `Invalid difficulty '<span style="color:var(--error-color);">${escapeHTML(requestedDifficulty)}</span>'. Defaulting to 'medium'. Launching PONG module...`;
             context.logTrace('pong', `INVALID_DIFFICULTY (${requestedDifficulty}), LAUNCHING (medium)`);
         } else {
             feedbackMessage = `No difficulty specified. Defaulting to 'medium'. Launching PONG module...`;
             context.logTrace('pong', `LAUNCHING (medium)`);
         }
         selectedDifficulty = 'medium';
    }


    context.typewriterResponse(feedbackMessage, "response-info", () => {
        const canvasId = "pong-canvas-" + Date.now(); // Unique ID

        // Define the component initializer function
        const initPongComponent = (canvasElement, windowElement, ctx) => {
            if (canvasElement && canvasElement.tagName === 'CANVAS') {
                 console.log(`[initPongComponent] Initializing Pong on canvas #${canvasElement.id}`);
                 initPong(canvasElement, windowElement, selectedDifficulty); // Pass difficulty
            } else {
                console.error("Pong init failed: Invalid canvas element provided to componentInit.");
                 ctx.displayOutput("Error launching PONG: Canvas setup failed.", "response-error");
                 ctx.closeWindow?.(windowElement.id); // Use context's closeWindow
            }
        };

        // Call the generalized createWindow
        const win = context.createWindow(
            `PONG [${selectedDifficulty.toUpperCase()}]`,
            {
                type: 'component',
                canvasId: canvasId,
                componentInit: initPongComponent,
                 canvasStyles: { cursor: 'none' } // Optional: Apply styles directly
            },
            {
                width: 600,
                height: 400,
                resizable: false,
                gameType: 'pong' // Explicitly set game type
            }
        );

        if (!win) {
            // Error handling if window creation itself failed (logged in createWindow)
            context.displayOutput("Error launching PONG: Could not create window.", "response-error");
        }
        // No need for further messages here, init errors handled in componentInit
    });
}

export function tetris(args, context) {
    // Determine mode and feedback message (same logic as before)
     const levelModes = ['easy', 'medium', 'hard'];
     const sprintModeKeys = ['20l', '40l', '100l', '1000l'];
     const allAllowedModes = [...levelModes, ...sprintModeKeys];
     let requestedModeArg = args[0]?.toLowerCase();
     let selectedModeKey = 'medium';
     let feedbackMessage = "";

     // ... (Mode selection logic remains the same) ...
     if (requestedModeArg) {
        if (levelModes.includes(requestedModeArg)) { selectedModeKey = requestedModeArg; feedbackMessage = `Selected difficulty: <span style="color:var(--text-color);">${selectedModeKey.toUpperCase()}</span>. Launching TETЯIS module...`; context.logTrace('tetris', `LAUNCHING (${selectedModeKey})`); }
        else if (sprintModeKeys.includes(requestedModeArg)) { selectedModeKey = requestedModeArg; const goal = selectedModeKey.replace('l', ''); feedbackMessage = `Selected mode: <span style="color:var(--text-color);">SPRINT ${goal}L</span>. Launching TETЯIS module...`; context.logTrace('tetris', `LAUNCHING (${selectedModeKey})`); }
        else { const allowedModesString = allAllowedModes.join(', '); feedbackMessage = `Invalid mode '<span style="color:var(--error-color);">${escapeHTML(requestedModeArg)}</span>'. Allowed: ${allowedModesString}. Defaulting to 'medium'. Launching TETЯIS module...`; context.logTrace('tetris', `INVALID_MODE (${requestedModeArg}), LAUNCHING (medium)`); selectedModeKey = 'medium'; }
    } else { feedbackMessage = `No mode specified. Defaulting to 'medium'. Launching TETЯIS module...`; context.logTrace('tetris', `LAUNCHING (medium)`); selectedModeKey = 'medium'; }


    context.typewriterResponse(feedbackMessage, "response-info", () => {
        const canvasId = "tetris-canvas-" + Date.now();
        const UI_AREA_WIDTH_FOR_CALC = 100; // Match tetris.js or import
        const boardPixelWidth = COLS * BLOCK_SIZE;
        const boardPixelHeight = ROWS * BLOCK_SIZE;
        const totalCanvasWidth = boardPixelWidth + UI_AREA_WIDTH_FOR_CALC;
        const windowPaddingWidth = 20;
        const titleBarHeightEstimate = 30;
        const windowPaddingHeight = titleBarHeightEstimate + 10;
        const windowWidth = totalCanvasWidth + windowPaddingWidth;
        const windowHeight = boardPixelHeight + windowPaddingHeight;

        // This componentInit function calls the modified initTetris
        const initTetrisComponent = (canvasElement, windowElement, ctx) => {
            if (canvasElement && canvasElement.tagName === 'CANVAS') {
                console.log(`[initTetrisComponent] Initializing Tetris on canvas #${canvasElement.id}`);
                 // Pass context to Tetris for leaderboard access
                 // initTetris will now handle the countdown internally
                 initTetris(canvasElement, null, windowElement, selectedModeKey, context);
            } else {
                 console.error("Tetris init failed: Invalid canvas element provided.");
                 ctx.displayOutput("Error launching TETЯIS: Canvas setup failed.", "response-error");
                 ctx.closeWindow?.(windowElement.id);
            }
        };

        // Create window (no change here)
        const win = context.createWindow(
            `TETЯIS [${selectedModeKey.toUpperCase()}]`,
            {
                type: 'component',
                canvasId: canvasId,
                componentInit: initTetrisComponent,
                 canvasStyles: { cursor: 'none', width: `${totalCanvasWidth}px`, height: `${boardPixelHeight}px` }
            },
            {
                width: windowWidth,
                height: windowHeight,
                resizable: false,
                gameType: 'tetris'
            }
        );
         if (!win) {
             context.displayOutput("Error launching TETЯIS: Could not create window.", "response-error");
         }
         // No further action needed here, initTetris takes over including countdown
    });
}

export function snake(args, context) {
    context.logTrace('snake', `LAUNCHING`);
    const feedbackMessage = `Launching SNAKE module...`;

    context.typewriterResponse(feedbackMessage, "response-info", () => {
        const canvasId = "snake-canvas-" + Date.now();
        const SNAKE_GRID_SIZE = 20; // Match snake.js
        const SNAKE_BLOCK_SIZE = 18; // Match snake.js
        const canvasWidth = SNAKE_GRID_SIZE * SNAKE_BLOCK_SIZE;
        const canvasHeight = SNAKE_GRID_SIZE * SNAKE_BLOCK_SIZE;
        const windowPaddingWidth = 20; // Reduced padding
        const titleBarHeightEstimate = 30;
        const windowPaddingHeight = titleBarHeightEstimate + 10;
        const windowWidth = canvasWidth + windowPaddingWidth;
        const windowHeight = canvasHeight + windowPaddingHeight;

        const initSnakeComponent = (canvasElement, windowElement, ctx) => {
             if (canvasElement && canvasElement.tagName === 'CANVAS') {
                 console.log(`[initSnakeComponent] Initializing Snake on canvas #${canvasElement.id}`);
                 initSnake(canvasElement, windowElement);
             } else {
                 console.error("Snake init failed: Invalid canvas element provided.");
                 ctx.displayOutput("Error launching SNAKE: Canvas setup failed.", "response-error");
                 ctx.closeWindow?.(windowElement.id);
             }
        };

        const win = context.createWindow(
             `SNAKE`,
             {
                 type: 'component',
                 canvasId: canvasId,
                 componentInit: initSnakeComponent,
                 canvasStyles: { cursor: 'none', width: `${canvasWidth}px`, height: `${canvasHeight}px` }
             },
             {
                 width: windowWidth,
                 height: windowHeight,
                 resizable: false,
                 gameType: 'snake'
             }
        );
         if (!win) {
             context.displayOutput("Error launching SNAKE: Could not create window.", "response-error");
         }
    });
}