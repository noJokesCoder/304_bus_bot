const runSeleniumScript = require('./seleniumScript.js');
const { WEEKDAYS } = require('../dict/seleniumTexts.js');
const i18n = require('../i18n');
const { normalizeBusStop } = require('./normalizeBusStop.js');
/**
 * @typedef {Object} SearchParams
 * @property {string} stop - Bus stop name to search from
 * @property {number} date - Unix timestamp in seconds
 * @property {string} direction - Bus direction 'zwolle' | 'apeldoorn'
 * @property {string} lang - supported locales: en | nl | uk
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

const getSearchResults = async ({ stop: busStop, date, direction, lang = 'en' }) => {
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
        outputMessage = i18n.__({ phrase: 'no_buses_between', locale: lang });

        return outputMessage;
    }

    const results = await runSeleniumScript({ time: { hours, minutes, day }, direction, busStop });

    outputMessage =
        results.busesForCurrentHour.length || results.busesForNextHour.length
            ? i18n.__(
                  { phrase: 'buses_departing_from', locale: lang },
                  {
                      // i18n can't handle / properly, replace it
                      stop: normalizeBusStop(busStop),
                      hours: `${hours}`,
                      minutes: minutes <= 9 ? `0${minutes}` : `${minutes}`,
                  }
              ) +
              '\n\n' +
              (results.busesForCurrentHour.length
                  ? i18n.__(
                        { phrase: 'departing_soon', locale: lang },
                        { buses: results.busesForCurrentHour.join(' | ') }
                    ) + '\n'
                  : '') +
              (results.busesForNextHour.length
                  ? i18n.__(
                        { phrase: 'departing_later', locale: lang },
                        { buses: results.busesForNextHour.join(' | ') }
                    ) + '\n'
                  : '')
            : i18n.__(
                  { phrase: 'no_buses_departing', locale: lang },
                  { stop: normalizeBusStop(busStop), hours: `${hours}`, minutes: `${minutes}` }
              ) + '\n\n';

    return outputMessage;
};

module.exports = { getSearchResults };
