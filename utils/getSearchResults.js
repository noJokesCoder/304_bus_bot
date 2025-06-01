const runSeleniumScript = require('./seleniumScript.js');

const getSearchResults = async ({ stop: busStop, date, direction }) => {
    const hours = new Date(date * 1000).getHours();
    const minutes = new Date(date * 1000).getMinutes();
    const day = new Date(date * 1000).getDay();

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
