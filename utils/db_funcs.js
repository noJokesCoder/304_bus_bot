const fs = require('fs').promises;
const path = require('path');
const DATA_FILE = path.join(__dirname, '../user_db.json');

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
