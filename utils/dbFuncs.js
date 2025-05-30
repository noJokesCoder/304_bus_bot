const fs = require('fs').promises;
const path = require('path');
const DATA_FILE = path.join(__dirname, '../user_db.json');

/**
 * @typedef {Object} UserData
 * @property {string} [first_name] - User's first name
 * @property {'en'|'nl'|'ua'} [language_code] - User's preferred language
 * @property {'zwolle'|'apeldoorn'} [direction] - Selected bus direction
 * @property {string[]} [favorite_stops] - Array of user's favorite bus stops
 */

/**
 * Saves or updates user data in the JSON database
 * @param {string} userId - Telegram user ID
 * @param {UserData} userData - User data to save
 * @returns {Promise<void>}
 */
async function saveUserData(userId, userData) {
    let allData = {};
    try {
        const file = await fs.readFile(DATA_FILE, 'utf8');
        allData = JSON.parse(file);
    } catch (e) {
        // File does not exist or is invalid, start fresh
        console.error('Failed to save user data:', e);
    }

    allData[userId] = allData.hasOwnProperty(userId)
        ? { ...allData[userId], ...userData }
        : userData;
    await fs.writeFile(DATA_FILE, JSON.stringify(allData, null, 2));
}

/**
 * Retrieves user data from the JSON database
 * @param {string} [userId] - Telegram user ID. If omitted, returns data for all users
 * @returns {Promise<UserData|{[key: string]: UserData}|undefined>} User data object or undefined if not found
 */
async function loadUserData(userId) {
    try {
        const file = await fs.readFile(DATA_FILE, 'utf8');
        const allData = JSON.parse(file);
        return userId ? allData[userId] : allData;
    } catch (e) {
        return userId ? undefined : {};
    }
}

module.exports = { saveUserData, loadUserData };
