const { By, Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const { DIRECTIONS } = require('./dict/selenium_texts.js');
const { text } = require('stream/consumers');

const browserOptions = new chrome.Options('');
browserOptions.addArguments('--headless'); // Run in headless mode
// browserOptions.addArguments('--disable-gpu'); // Optional: Disable GPU for better compatibility
// browserOptions.addArguments('--no-sandbox'); // Optional: Disable sandboxing for better compatibility
browserOptions.addArguments('--incognito'); // Optional: Disable sandboxing for better compatibility

async function runSeleniumScript({ time, direction, busStop }) {
  const hour = new Date(time).getHours() + 7;
  const minutes = new Date(time).getMinutes();

  // Can't be time in between: 01:00 and 04:00
  if (time === 1 || time < 5) {
    console.log('That is too late. Buses dont run!');
    // TODO: add send a reply to a bot!
    return;
  }

  // Initialize the WebDriver
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(browserOptions)
    .build();

  try {
    // Navigate to the URL
    await driver.get(
      'https://reisinfo.rrreis.nl/nl/rrreis/lijnen/4304/dienstregeling/heen'
    );
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

    // Find the element by its ID
    let direction_select = await driver.findElement(
      By.className('reisplanner-select')
    );

    const busStopTrElements = await driver.findElements(
      // By.xpath(`//tr[th/a[contains(text(), "${busStop}")]]`)
      By.xpath(`//tr[th/a[contains(@title, '${busStop}')]]`)
      // By.linkText(busStop)
    );

    // TODO: add send a reply if nothing found
    if (busStopTrElements.length === 0) {
      console.log('No bus stop found');
      return;
    }

    console.log('busStopTrElements:', busStopTrElements.length);

    let timeCellsExactHour = [];
    let timeCellsNextHour = [];
    const searchHour = hour < 10 ? `0${hour}` : `${hour}`;
    const searchHourNext = hour + 1 < 10 ? `0${hour + 1}` : `${hour + 1}`;

    console.log('searchHour:', searchHour);
    console.log('searchHourNext:', searchHourNext);

    for (const busStopTrElement of busStopTrElements) {
      const [exactHourCells, nextHourCells] = await Promise.allSettled([
        busStopTrElement.findElements(
          By.xpath(`.//td[contains(normalize-space(text()), "${searchHour}:")]`)
        ),
        busStopTrElement.findElements(
          By.xpath(
            `.//td[contains(normalize-space(text()), "${searchHourNext}:")]`
          )
        ),
      ]).then(results =>
        results.map(result =>
          result.status === 'fulfilled' ? result.value : []
        )
      );

      console.log('Exact Hour Cells:', exactHourCells.length);
      console.log('Next Hour Cells:', nextHourCells.length);

      timeCellsExactHour.push(...exactHourCells);
      timeCellsNextHour.push(...nextHourCells);
    }

    console.log('time:', hour);

    console.log('number of cells EXACT:', timeCellsExactHour.length);
    console.log('number of cells NEXT:', timeCellsNextHour.length);
    // console.log('Cell:', await timeCells[0].getText());

    if (direction !== DIRECTIONS.APELDOORN) {
      // Perform actions on the element
      await direction_select.click();
      // Wait for the options to be visible
      await driver.sleep(200); // Adjust the sleep time as needed
      // Select the option with the text 'Heen'
      let option = await direction_select.findElement(
        By.css('option[value="Away"]')
      );
      // Click the option to select it
      await option.click();
      option.getAttribute('value').then(value => {
        console.log('Selected value:', value);
      });
      // Wait for the selection to be processed
      await driver.sleep(1000); // Adjust the sleep time as needed
    }
    // Find the button by its ID
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
  await runSeleniumScript({
    time: 1746309877957,
    direction: 'Apeldoorn',
    busStop: 'Nachtegaalweg',
  }); // Await the function call to measure the actual execution time
  console.timeEnd('runSeleniumScript');
})();

