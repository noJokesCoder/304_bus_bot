const fs = require('fs').promises;
const path = require('path');
const DATA_FILE = path.join(__dirname, '../user_db.json');

/**
 * @typedef {Object} UserData
 * @property {string} [first_name] - User's first name
 * @property {string} [language_code] - User's preferred language: 'en'|'nl'|'uk'
 * @property {string} [direction] - Selected bus direction: 'zwolle'|'apeldoorn'
 * @property {string[]} [favorite_stops] - Array of user's favorite bus stops
 */

/**
 * Saves or updates user data in the JSON database
 * @param {string | number} userId - Telegram user ID
 * @param {UserData} userData - User data to save
 * @returns {Promise<void>}
 */
async function saveUserData(userId, userData) {
    let allData = {};
    try {
        try {
            const file = await fs.readFile(DATA_FILE, 'utf8');
            // Only parse if file is not empty
            if (file.trim()) {
                allData = JSON.parse(file);
            }
        } catch (readError) {
            if (readError.code !== 'ENOENT') {
                console.error('Error reading user data file:', readError);
            }
            // File doesn't exist or is empty, continue with empty object
        }

        allData[userId] = allData.hasOwnProperty(userId)
            ? { ...allData[userId], ...userData }
            : userData;

        await fs.writeFile(DATA_FILE, JSON.stringify(allData, null, 2));
    } catch (e) {
        console.error('Failed to save user data:', e);
        throw e; // Re-throw to handle it in the calling code
    }
}

/**
 * Retrieves user data from the JSON database
 * @param {string | number} [userId] - Telegram user ID. If omitted, returns data for all users
 * @returns {Promise<UserData|undefined>} User data object or undefined if not found
 */
async function loadUserData(userId) {
    let allData;

    try {
        const file = await fs.readFile(DATA_FILE, 'utf8');
        if (file.trim()) {
            allData = JSON.parse(file);
        }

        return allData[userId] || {};
    } catch (e) {
        console.error('Failed to load user data: ' + e);
        return {};
    }
}

module.exports = { saveUserData, loadUserData };
