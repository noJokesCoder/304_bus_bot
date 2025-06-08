const runSeleniumScript = require('./seleniumScript.js');
const { WEEKDAYS } = require('../dict/seleniumTexts.js');

/**
 * @typedef {Object} SearchParams
 * @property {string} stop - Bus stop name to search from
 * @property {number} date - Unix timestamp in seconds
 * @property {string} direction - Bus direction (either 'zwolle' or 'apeldoorn')
 */

/**
 * Fetches bus departure times for a given stop, time and direction
 * @param {SearchParams} params - Search parameters
 * @returns {Promise<string>} Formatted message with bus times or error message
 * @example
 * const result = await getSearchResults({
 *   stop: "Station Noord",
 *   date: 1684847400, // May 23, 2023 14:30:00 UTC
 *   direction: "zwolle"
 * });
 * // => "Buses departing from *Station Noord* at 14:30 or later:
 * //     *Departing soon:* [ 14:45 | 15:00 ]
 * //     *Departing later:* [ 15:15 | 15:30 ]"
 */

const getSearchResults = async ({ stop: busStop, date, direction }) => {
    // get time & day specific to the location
    const dateTimeParts = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
        timeZone: 'Europe/Amsterdam',
    }).formatToParts(date * 1000);

    const lookup = dateTimeParts.reduce(
        (acc, part) => {
            acc[part.type] =
                part.type === 'weekday' ? WEEKDAYS[part.value.toUpperCase()] : Number(part.value);
            return acc;
        },
        { weekday: 0, hour: 0, minute: 0 }
    );
    const { weekday: day, hour: hours, minute: minutes } = lookup;
    let outputMessage = '';

    // No buses in between: 01:00 and 04:00
    if (hours >= 1 && hours < 5) {
        outputMessage =
            'Now is too late for buses.' +
            'The Bot looks for buses at current and next hour,' +
            'e.g. if it is 7:00 AM the Bot would provide results for buses at 7 AM and 8 AM.';

        return outputMessage;
    }

    const results = await runSeleniumScript({ time: { hours, minutes, day }, direction, busStop });

    outputMessage =
        results.busesForCurrentHour.length || results.busesForNextHour.length
            ? `Buses departing from *${busStop}* at ${hours}:${minutes} or later:\n\n` +
              (results.busesForCurrentHour.length
                  ? `*Departing soon:* \[ ${results.busesForCurrentHour.join(' \| ')} \] \n`
                  : '') +
              (results.busesForNextHour.length
                  ? `*Departing later:* \[ ${results.busesForNextHour.join(' \| ')} \] \n`
                  : '')
            : `No buses departing from *${busStop}* at ${hours}:${minutes}.\n\n`;

    return outputMessage;
};

module.exports = { getSearchResults };
