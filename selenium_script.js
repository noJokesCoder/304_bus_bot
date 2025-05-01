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
  const hour = new Date(time).getHours();
  const minutes = new Date(time).getMinutes();

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



    console.log('busStopTrElements:', busStopTrElements.length);
    console.log('busStopTrElements:', busStopTrElements);

    let timeCells = await driver.findElements(
      // By.css('.line-timetable-trips table tbody tr td')
      By.xpath(`//td[contains(text(), "${hour}:")]`)
    );

    console.log('time:', hour);

    console.log('number of cells:', timeCells.length);
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
    time: 1745840488132,
    direction: 'Apeldoorn',
    busStop: 'Nachtegaalweg',
  }); // Await the function call to measure the actual execution time
  console.timeEnd('runSeleniumScript');
})();

