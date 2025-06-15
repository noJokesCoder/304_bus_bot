/**
 * Normalizes a bus stop name by replacing a single forward slash ('/') with ' - '.
 *
 * Example:
 *   fixBusStop('Zwolle/Apeldoorn') // => 'Zwolle - Apeldoorn'
 *   fixBusStop('Zwolle')           // => 'Zwolle'
 *
 * @param {string} busStop
 * @returns {string}
 */
const normalizeBusStop = busStop => (/\//.test(busStop) ? busStop.replace('/', ' - ') : busStop);

module.exports = { normalizeBusStop };
