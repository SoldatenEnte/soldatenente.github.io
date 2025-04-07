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

export async function saveGameScore(gameName, modeName, username, value, isTimeValue) {
    const firestoreDb = getDb();
    if (!firestoreDb || !gameName || !modeName || !username || typeof value !== 'number') {
        console.error("Invalid data or DB connection for saveGameScore:", { gameName, modeName, username, value, isTimeValue, firestoreDb });
        return false;
    }

    const safeGameName = gameName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const safeModeName = modeName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!safeGameName || !safeModeName) {
         console.error("Invalid gameName or modeName after sanitization.");
         return false;
    }

    try {
        // --- CORRECTED PATH ---
        const leaderboardColRef = firestoreDb.collection(`leaderboards/${safeGameName}/modes/${safeModeName}/scores`);
        // --- END CORRECTION ---

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
        // Log the corrected path being used
        console.log(`Score submitted to Firestore path: leaderboards/${safeGameName}/modes/${safeModeName}/scores`, entryData);
        return true;
    } catch (error) {
        console.error(`Error saving score to Firestore for game ${safeGameName}, mode ${safeModeName}:`, error.message, error.stack);
        return false;
    }
}


export async function fetchLeaderboardData(gameName, modeName, gameModesInfo) {
    const firestoreDb = getDb();
    if (!firestoreDb) {
        throw new Error("Leaderboard database connection failed.");
    }

    const safeGameName = gameName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const safeModeName = modeName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
     if (!safeGameName || !safeModeName) {
         throw new Error("Invalid gameName or modeName provided.");
     }

    const modeInfo = gameModesInfo[safeModeName] || { name: safeModeName.toUpperCase(), type: 'score' };
    const isTimeBased = modeInfo.type === 'sprint';

    try {
        // --- CORRECTED PATH ---
        const leaderboardColRef = firestoreDb.collection(`leaderboards/${safeGameName}/modes/${safeModeName}/scores`);
        // --- END CORRECTION ---

        let queryRef;
        if (isTimeBased) {
            queryRef = leaderboardColRef.orderBy("time", "asc").limit(MAX_ENTRIES_PER_MODE);
        } else {
            queryRef = leaderboardColRef.orderBy("score", "desc").limit(MAX_ENTRIES_PER_MODE);
        }

        const querySnapshot = await queryRef.get();
        const scores = [];
        querySnapshot.forEach((doc) => {
            scores.push(doc.data());
        });

        // Log the corrected path being used
        console.log(`Fetched ${scores.length} scores from path: leaderboards/${safeGameName}/modes/${safeModeName}/scores`);
        return { scores, modeInfo };

    } catch (error) {
        console.error(`Error fetching leaderboard from Firestore for ${safeGameName}/${safeModeName}:`, error.message, error.stack);
        // Add the incorrect path structure to the error message for clarity
        throw new Error(`Failed to fetch scores from leaderboards/${safeGameName}/modes/${safeModeName}/scores: ${error.message}`);
    }
}