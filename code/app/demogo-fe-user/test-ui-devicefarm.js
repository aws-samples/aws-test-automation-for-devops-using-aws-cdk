// const { WebDriver } = require('selenium-webdriver');
// const {Builder, By, Key, until} = require('selenium-webdriver');
// const firefox = require('selenium-webdriver/firefox');
const {Builder, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
var webdriver = require('selenium-webdriver');
var AWS = require("aws-sdk");

var PROJECT_ARN = "[[DEVICE_FARM_ARN]]"
var TEST_URL = "[[TEST_URL]]/index.html"
var devicefarm = new AWS.DeviceFarm({region: "us-west-2"});

var assert = require('assert');

var profile = new firefox.Options();
profile.setPreference('security.mixed_content.block_active_content', false);
profile.setPreference('security.mixed_content.block_display_content', true);

var runExample = async(urlString) => {
    console.log("Starting WebDriverJS remote driver");
    driver = await new webdriver.Builder()
            .usingServer(urlString)
            .forBrowser('firefox')
            .setFirefoxOptions(profile)
            .build();
            //.withCapabilities({browserName: 'chrome'})
            //.build();
    console.log("New session created:", driver.getSession());

    await driver.get(TEST_URL);
    await driver.wait(until.elementLocated(By.className('li')),5000);

    let count_origin = await (await driver.findElements(By.className("li"))).length;
    await driver.findElement(By.id('name')).sendKeys("Hannah");
    await driver.findElement(By.id('id')).sendKeys("hannah");
    await driver.findElement(By.id('submit')).click();
    await driver.findElement(By.id('refresh')).click();
    await driver.wait(await until.elementLocated(By.className('li')),7000);

    let count = await (await driver.findElements(By.className("li"))).length;

    await assert.equal(count_origin+1, count);
    console.log(count);

    const title = await driver.getTitle();
    console.log('Title was: ' + title);

    console.log("Deleting session...");
    await driver.quit();

}
(async () => {
    console.log("Start");
    const testGridUrlResult = await devicefarm.createTestGridUrl({
        projectArn: PROJECT_ARN,
        expiresInSeconds: 600
    }).promise();

    console.log("Create url result : ", testGridUrlResult);
    runExample(testGridUrlResult.url);

})().catch((e) => 
    {
        console.error(e);
        throw new Error("Test Failed");
    });