const { By, Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const { DIRECTIONS, WEEKDAYS } = require('../dict/seleniumTexts.js');
const SELENIUM = process.env.SELENIUM;

const browserOptions = new chrome.Options();
browserOptions.addArguments('--headless'); // Prevents from opening a browser window
browserOptions.addArguments('--incognito');

async function runSeleniumScript({ time: { hours, minutes, day }, direction, busStop }) {
    // Initialize the WebDriver
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(browserOptions).build();

    let busesForCurrentHour = [];
    let busesForNextHour = [];

    try {
        // Navigate to the URL
        await driver.get(SELENIUM);
        // Use the fixed size to make sure we have the elements in the viewport:
        await driver.manage().window().setSize(700, 778);
        await driver.sleep(1000);

        // Remove cookies banner:
        let accept_cookies_button = await driver.findElement(
            By.id('CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection')
        );

        if (accept_cookies_button) {
            await accept_cookies_button.click();
        }
        await driver.sleep(1000);

        // Set the direction:
        const isWeekend = day === WEEKDAYS.SUNDAY || day === WEEKDAYS.SATURDAY;
        const directionSelect = await driver.findElement(By.className('reisplanner-select'));
        await directionSelect.click();
        await driver.sleep(200);
        const directionOption = await directionSelect.findElement(
            By.css(`option[value="${direction === DIRECTIONS.ZWOLLE ? 'Return' : 'Away'}"]`)
        );
        await directionOption.click();
        await driver.sleep(1000);

        // Set the day of a week:
        const daySelect = await driver.findElement(
            By.css('.filters > .row > .filter:nth-child(3) .reisplanner-select')
        );
        daySelect.click();
        await driver.sleep(200);
        const dayOption = await daySelect.findElement(
            By.xpath(
                `.//option[contains(text(), '${
                    isWeekend
                        ? day === WEEKDAYS.SATURDAY
                            ? 'zaterdag'
                            : 'zon- en feestdagen'
                        : 'maandag t/m vrijdag'
                }')]`
            )
        );
        dayOption.click();
        await driver.sleep(1000);

        const busStopTrElements = await driver.findElements(
            By.xpath(`//tr[th/a[contains(@title, '${busStop}')]]`)
        );

        if (busStopTrElements.length === 0) {
            return { busesForCurrentHour, busesForNextHour };
        }

        let timeCellsExactHour = [];
        let timeCellsNextHour = [];
        const searchHour = hours < 10 ? `0${hours}` : `${hours}`;
        const searchHourNext = hours + 1 < 10 ? `0${hours + 1}` : `${hours + 1}`;

        for (const busStopTrElement of busStopTrElements) {
            const [exactHourCells, nextHourCells] = await Promise.allSettled([
                busStopTrElement.findElements(
                    By.xpath(`.//td[contains(normalize-space(text()), "${searchHour}:")]`)
                ),
                busStopTrElement.findElements(
                    By.xpath(`.//td[contains(normalize-space(text()), "${searchHourNext}:")]`)
                ),
            ]).then(results =>
                results.map(result => (result.status === 'fulfilled' ? result.value : []))
            );

            timeCellsExactHour.push(...exactHourCells);
            timeCellsNextHour.push(...nextHourCells);
        }

        busesForCurrentHour = await Promise.all(
            timeCellsExactHour.map(async cell => {
                const cellText = await cell.getText();

                if (cellText && cellText.trim().match(/^\d{2}:\d{2}/)) {
                    const [_, cellMinutes] = cellText.split(':');

                    if (parseInt(cellMinutes) >= minutes) {
                        return cellText;
                    }
                }
            })
        ).then(results => results.filter(Boolean));

        busesForNextHour = await Promise.all(
            timeCellsNextHour.map(async cell => {
                const cellText = await cell.getText();

                if (cellText && cellText.trim().match(/^\d{2}:\d{2}/)) {
                    return cellText;
                }
            })
        ).then(results => results.filter(Boolean));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await driver.quit();
    }

    return { busesForCurrentHour, busesForNextHour };
}

module.exports = runSeleniumScript;
