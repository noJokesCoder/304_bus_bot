const { BUS_STOPS } = require('../dict/seleniumTexts');

/**
 * Splits an array into smaller chunks of specified size
 * @template T
 * @param {T[]} arr - The array to be sliced into chunks
 * @param {number} [slice=2] - The size of each chunk (default: 2)
 * @returns {T[][]} An array of arrays, where each inner array has at most 'slice' elements
 * @example
 * arraySlicer([1, 2, 3, 4, 5], 2) // => [[1, 2], [3, 4], [5]]
 */
const arraySlicer = (arr, slice = 2) => {
    const result = [];

    for (let i = 0; i < arr.length; i += slice) {
        result.push(arr.slice(i, i + slice));
    }

    return result;
};

const getAllStopsBtnList = () => {
    const btnList = BUS_STOPS.map(stop => ({ text: `${stop}`, callback_data: `#${stop}#` }));
    const chunks = arraySlicer(btnList, 3);

    return chunks;
};

const getFavoritesBtnList = stops => {
    if (stops.length === 0) return [];

    const chunkSize = stops.length >= 3 ? 3 : 2;
    const preparedArr = stops.map(stop => ({ text: stop, callback_data: `##${stop}##` }));
    const chunks = arraySlicer(preparedArr, chunkSize);

    return chunks;
};

module.exports = { getAllStopsBtnList, getFavoritesBtnList };
