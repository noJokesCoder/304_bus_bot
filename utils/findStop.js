const { BUS_STOPS } = require('../dict/selenium_texts.js');

// fuzzy match: allow up to 2 character differences (Levenshtein distance)
const levenshtein = (a, b) => {
    const matrix = Array.from({ length: a.length + 1 }, () => []);

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            matrix[i][j] =
                a[i - 1] === b[j - 1] ?
                    matrix[i - 1][j - 1]
                :   Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }
    return matrix[a.length][b.length];
};

const findStop = searchStop => {
    if (!searchStop) {
        return null;
    }
    if (BUS_STOPS.includes(searchStop) || BUS_STOPS.find(stop => stop.toLowerCase() === searchStop.toLowerCase())) {
        return { isExact: true, result: searchStop };
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

        return suggestion ? { isExact: false, result: suggestion } : null;
    }
};

module.exports = findStop;
