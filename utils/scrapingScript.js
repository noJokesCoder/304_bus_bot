const { DIRECTIONS, WEEKDAYS } = require('../dict/scrapingTexts.js');
const { chromium } = require('playwright');

const { SELENIUM, NODE_ENV } = process.env;

async function runPlaywrightScript({ time: { hours, minutes, day }, direction, busStop }) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    // Use the fixed size to make sure we have the elements in the viewport:
    await page.setViewportSize({ width: 768, height: 700 });

    let busesForCurrentHour = [];
    let busesForNextHour = [];

    try {
        await page.goto(SELENIUM, { waitUntil: 'domcontentloaded' });

        // Remove cookies banner if present
        const cookiesButton = await page.$(
            '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection'
        );
        if (cookiesButton) {
            await cookiesButton.click();
        }

        // Set the direction
        const isWeekend = day === WEEKDAYS.SUNDAY || day === WEEKDAYS.SATURDAY;
        await page.click('.reisplanner-select');
        await page.selectOption(
            '.reisplanner-select',
            direction === DIRECTIONS.ZWOLLE ? 'Return' : 'Away'
        );

        // Set the day of the week
        await page.click('.filters > .row > .filter:nth-child(3) .reisplanner-select');
        const dayText = isWeekend
            ? day === WEEKDAYS.SATURDAY
                ? 'zaterdag'
                : 'zon- en feestdagen'
            : 'maandag t/m vrijdag';
        await page.selectOption('.filters > .row > .filter:nth-child(3) .reisplanner-select', {
            label: dayText,
        });

        // Find bus stop row
        const busStopRows = await page.$$('tr:has(th a[title*="' + busStop + '"])');
        if (busStopRows.length === 0) {
            await browser.close();
            return { busesForCurrentHour, busesForNextHour };
        }

        const searchHour = hours < 10 ? `0${hours}` : `${hours}`;
        const searchHourNext = hours + 1 < 10 ? `0${hours + 1}` : `${hours + 1}`;

        for (const row of busStopRows) {
            // Current hour
            const exactHourCells = await row.$$(`td:has-text("${searchHour}:")`);
            // Next hour
            const nextHourCells = await row.$$(`td:has-text("${searchHourNext}:")`);

            busesForCurrentHour.push(
                ...(await Promise.all(
                    exactHourCells.map(async cell => {
                        const cellText = (await cell.textContent()).trim();
                        const match = cellText.match(/^(\d{2}):(\d{2})/);
                        if (match) {
                            const cellHour = parseInt(match[1]);
                            const cellMinute = parseInt(match[2]);
                            if (cellHour === hours && cellMinute >= minutes) {
                                return cellText;
                            }
                        }
                    })
                ).then(results => results.filter(Boolean)))
            );

            busesForNextHour.push(
                ...(await Promise.all(
                    nextHourCells.map(async cell => {
                        const cellText = (await cell.textContent()).trim();
                        if (cellText.match(/^\d{2}:\d{2}/)) {
                            return cellText;
                        }
                    })
                ).then(results => results.filter(Boolean)))
            );
        }
    } catch (error) {
        console.error('Playwright error:', error);
    } finally {
        await browser.close();
    }

    if (NODE_ENV && NODE_ENV === 'development') {
        console.log('Results for now:');
        console.table(busesForCurrentHour);
        console.log('Results for later:');
        console.table(busesForNextHour);
    }

    return { busesForCurrentHour, busesForNextHour };
}

module.exports = runPlaywrightScript;
