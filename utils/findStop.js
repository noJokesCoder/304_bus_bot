const { BUS_STOPS } = require('../dict/seleniumTexts.js');

// fuzzy match: allow up to 2 character differences (Levenshtein distance)
const levenshtein = (a, b) => {
    const matrix = Array.from({ length: a.length + 1 }, () => []);

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            matrix[i][j] =
                a[i - 1] === b[j - 1]
                    ? matrix[i - 1][j - 1]
                    : Math.min(
                          matrix[i - 1][j - 1] + 1,
                          matrix[i][j - 1] + 1,
                          matrix[i - 1][j] + 1
                      );
        }
    }
    return matrix[a.length][b.length];
};

/**
 * @typedef {Object} FindStopResponse
 * @property {boolean} [isExact] - Whether the search matches user input exactly. Only present for matches
 * @property {string | null} result - The matched bus stop name or null if no match found

/**
 * Searches for a bus stop by name, supporting exact, partial, and fuzzy matches
 * @param {string} searchStop - bus stop to look for
 * @returns {FindStopResponse}
 * @example
 * findStop("Station") // => { isExact: false, result: "Station Noord" }
 * findStop("Station Noord") // => { isExact: true, result: "Station Noord" }
 * findStop("xyz") // => { result: null }
 */

const findStop = searchStop => {
    if (!searchStop || searchStop.length < 4) {
        return { result: null };
    }
    if (BUS_STOPS.includes(searchStop)) {
        return { isExact: true, result: searchStop };
    }
    if (BUS_STOPS.find(stop => stop.match(new RegExp(searchStop, 'gi')))) {
        return {
            isExact: false,
            result: BUS_STOPS.find(stop => stop.match(new RegExp(searchStop, 'gi'))),
        };
    } else {
        let suggestion = null;
        let minDistance = Infinity;

        BUS_STOPS.forEach(stop => {
            const dist = levenshtein(searchStop.toLowerCase(), stop.toLowerCase());
            if (dist < minDistance && dist <= 2) {
                minDistance = dist;
                suggestion = stop;
            }
        });

        return suggestion ? { isExact: false, result: suggestion } : { result: null };
    }
};

module.exports = findStop;
