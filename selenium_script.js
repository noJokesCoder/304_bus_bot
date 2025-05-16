const { By, Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const { DIRECTIONS } = require('./dict/selenium_texts.js');

const browserOptions = new chrome.Options();
browserOptions.addArguments('--headless'); // Prevents from opening a browser window
browserOptions.addArguments('--incognito');

async function runSeleniumScript({ time, direction, busStop }) {
    // TODO: remove '+7' later!
    const hour = new Date(time).getHours() + 7;
    const minutes = new Date(time).getMinutes();

    // No buses in between: 01:00 and 04:00
    if (hour === 1 || hour < 5) {
        console.log('That is too late. Buses dont run!');
        // TODO: add send a reply to a bot!
        return;
    }

    // Initialize the WebDriver
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(browserOptions).build();

    try {
        // Navigate to the URL
        await driver.get('https://reisinfo.rrreis.nl/nl/rrreis/lijnen/4304/dienstregeling/heen');
        // Use the fixed size to make sure we have the elements in the viewport:
        await driver.manage().window().setSize(700, 778);
        await driver.sleep(1000);

        // Remove cookies banner:
        let accept_cookies_button = await driver.findElement(
            By.id('CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection')
        );

        if (accept_cookies_button) {
            await accept_cookies_button.click();
            console.log('Clicked on Accept Cookies, now its OK');
        }
        await driver.sleep(1000);

        if (direction === DIRECTIONS.APELDOORN) {
            // Find the select:
            let direction_select = await driver.findElement(By.className('reisplanner-select'));
            await direction_select.click();
            await driver.sleep(200);

            let option = await direction_select.findElement(By.css('option[value="Return"]'));
            // Click the option to select it
            await option.click();
            // Wait for the selection to be processed
            await driver.sleep(1000); // Adjust the sleep time as needed
        }

        const busStopTrElements = await driver.findElements(
            // By.linkText(busStop)
            By.xpath(`//tr[th/a[contains(@title, '${busStop}')]]`)
        );

        // TODO: add send a reply if nothing found
        if (busStopTrElements.length === 0) {
            return;
        }

        // console.log('busStopTrElements:', busStopTrElements.length);

        let timeCellsExactHour = [];
        let timeCellsNextHour = [];
        const searchHour = hour < 10 ? `0${hour}` : `${hour}`;
        const searchHourNext = hour + 1 < 10 ? `0${hour + 1}` : `${hour + 1}`;

        // console.log('searchHour:', searchHour);
        // console.log('searchHourNext:', searchHourNext);

        for (const busStopTrElement of busStopTrElements) {
            const [exactHourCells, nextHourCells] = await Promise.allSettled([
                busStopTrElement.findElements(By.xpath(`.//td[contains(normalize-space(text()), "${searchHour}:")]`)),
                busStopTrElement.findElements(
                    By.xpath(`.//td[contains(normalize-space(text()), "${searchHourNext}:")]`)
                ),
            ]).then(results => results.map(result => (result.status === 'fulfilled' ? result.value : [])));

            timeCellsExactHour.push(...exactHourCells);
            timeCellsNextHour.push(...nextHourCells);
        }

        // console.log('time:', hour);

        // console.log('number of cells EXACT:', timeCellsExactHour.length);
        // console.log('number of cells NEXT:', timeCellsNextHour.length);

        // TODO: check minutes!
        const busesForCurrentHour = await Promise.all(
            timeCellsExactHour.map(async cell => {
                const cellText = await cell.getText();

                if (cellText && cellText.trim().match(/^\d{2}:\d{2}/)) {
                    const [_, cellMinutes] = cellText.split(':');

                    if (parseInt(cellMinutes) >= minutes) {
                        // console.log('Exact Hour Cell Text:', cellText);
                        return cellText;
                    }
                }
            })
        );

        const busesForNextHour = await Promise.all(
            timeCellsNextHour.map(async cell => {
                const cellText = await cell.getText();

                if (cellText && cellText.trim().match(/^\d{2}:\d{2}/)) {
                    return cellText;
                }
            })
        );

        // console.log(busesForCurrentHour);
        // console.log(busesForNextHour);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Quit the driver
        await driver.quit();
    }
}
// Run the Selenium script
// runSeleniumScript();

// TODO: remove later!
console.time('runSeleniumScript');
(async () => {
    await runSeleniumScript({ time: Date.now(), direction: 'Zwolle', busStop: 'Nachtegaalweg' }); // Await the function call to measure the actual execution time
    console.timeEnd('runSeleniumScript');
})();
