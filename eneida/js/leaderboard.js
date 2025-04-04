// js/leaderboard.js (Firebase Compat Version - v8 Syntax CORRECTED)

// NO imports or top-level destructuring needed for functions like collection, query etc.

const MAX_ENTRIES_PER_MODE = 10;

// Helper to get Firestore DB instance (remains the same)
function getDb() {
    if (typeof db === 'undefined') {
        console.error("Firestore DB instance (db) is not defined globally!");
        alert("Error: Leaderboard database connection failed. Please reload.");
        return null;
    }
    return db;
}

// --- Helper functions (escapeHTML, formatTime) remain the same ---
function escapeHTML(str) {
    const inputStr = String(str ?? '');
    return inputStr.replace(/&/g, '&')
                   .replace(/</g, '<')
                   .replace(/>/g, '>')
                   .replace(/"/g, '"')
                   .replace(/'/g, "'");
}

export function formatTime(milliseconds) {
    if (typeof milliseconds !== 'number' || isNaN(milliseconds)) return 'N/A';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

/**
 * Saves a new score to Firestore using v8 compat syntax.
 * @returns {Promise<boolean>} True on success, false on failure.
 */
export async function saveTetrisScore(mode, username, value, isTimeValue) {
    const firestoreDb = getDb();
    if (!firestoreDb || !mode || !username || typeof value !== 'number') {
        console.error("Invalid data or DB connection for saveTetrisScore:", { mode, username, value, isTimeValue, firestoreDb });
        return false;
    }
    try {
        const leaderboardColRef = firestoreDb.collection(`leaderboards/${mode}/scores`);
        const entryData = {
            username: username.substring(0, 14),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (isTimeValue) {
            entryData.time = value;
        } else {
            entryData.score = value;
        }
        await leaderboardColRef.add(entryData);
        console.log(`Score submitted to Firestore for mode ${mode} (v8 compat):`, entryData);
        return true;
    } catch (error) {
        console.error(`Error saving score to Firestore for mode ${mode} (v8 compat):`, error.message, error.stack);
        return false;
    }
}

/**
 * Fetches and formats the leaderboard using v8 compat syntax.
 * @returns {Promise<string>} HTML string representation of the leaderboard.
 */
export async function fetchLeaderboardData(mode, gameModesInfo) {
    const firestoreDb = getDb(); // Get the db instance
    if (!firestoreDb) {
        throw new Error("Leaderboard database connection failed.");
    }

    // Resolve GAME_MODES carefully
    const resolvedGameModes = (typeof GAME_MODES !== 'undefined' ? GAME_MODES : (gameModesInfo || {}));
    const modeInfo = resolvedGameModes[mode] || { name: mode.toUpperCase(), type: 'unknown' }; // Basic fallback
    const isTimeBased = modeInfo.type === 'sprint';

    try {
        // --- Use v8 syntax ---
        const leaderboardColRef = firestoreDb.collection(`leaderboards/${mode}/scores`);
        let queryRef;

        if (isTimeBased) {
            queryRef = leaderboardColRef.orderBy("time", "asc").limit(MAX_ENTRIES_PER_MODE);
        } else {
            queryRef = leaderboardColRef.orderBy("score", "desc").limit(MAX_ENTRIES_PER_MODE);
        }

        const querySnapshot = await queryRef.get();
        // --- End v8 syntax changes ---

        const scores = [];
        querySnapshot.forEach((doc) => {
            // Add rank later during formatting if needed, just return raw data
            scores.push(doc.data());
        });

        // Return the raw scores and the mode info for formatting later
        return { scores, modeInfo };

    } catch (error) {
        console.error(`Error fetching leaderboard from Firestore for mode ${mode} (v8 compat):`, error.message, error.stack);
        throw new Error(`Failed to fetch scores: ${error.message}`); // Re-throw for the command handler
    }
}