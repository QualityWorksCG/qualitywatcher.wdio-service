# QualityWatcher Webdriverio Service

### Description
This `@qualitywatcher/wdio-service` works in conjunction with the [`@qualitywatcher/wdio-reporter`](https://www.npmjs.com/package/@qualitywatcher/wdio-reporter)

## How to Install
```shell
$ npm install @qualitywatcher/wdio-service --save-dev
```

## Usage

#### 1. Import `@qualitywatcher/wdio-service`
```javascript
import QualityWatcherService from "@qualitywatcher/wdio-service";
```

#### 2. Configure Options

```Javascript
services: [[QualityWatcherService, {
        email: 'user@domain.com',
        apiKey: process.env.QUALITYWATCHER_API_KEY,
        testRunName: "Sample Automation results",
        description: 'This is a sample test run from our sample test automation.',
        projectId: 100,
        includeAllCases: true,
        // use more optional options
        report: true,
        includeCaseWithoutId: true,
        complete: false,
        ignoreSkipped: true,
        generateShareableLink: true,
        parentSuiteTitle: "Smoke suite",
        screenshotFolder: "./screenshots",
        uploadScreenshot: true,
    }]],
```
Full reporter options

| Option                | Required | Description                                           |
|-----------------------|----------|-------------------------------------------------------|
| projectId             | Yes      | The ID of the project.                                |
| testRunName           | Yes      | The name of the test run.                             |
| description           | Yes      | A description of the test run.                        |
| includeAllCases       | Yes      | Whether to include all test cases from any suite that at least one automated result belongs to in the created run.                     |
| complete              | No       | If true, marks the test run as complete.              |
| includeCaseWithoutId  | No       | Include test cases even if they don't have Suite and Case IDs mapping, this will create new test case/s in QualityWatcher from results.    |
| report                | No       | If true, send results to QualityWatcher.              |
| ignoreSkipped         | No       | If true, skipped tests will be ignored.               |
| generateShareableLink | No       | If true, generates a shareable link for the report.   |
| parentSuiteTitle      | No       | The suite where test cases without IDs will be added. |
| screenshotFolder      | No       | The folder where screenshots are stored.              |
| uploadScreenshot      | No       | If true, uploads screenshots with the report.         |


#### 3. Get API Key from QualityWatcher
   - Go to your QualityWatcher account
   - Hover over your profile avatar and click "Profile Settings"
   - Select the "API Key" menu item
   - Click the "Generate API Key" button
   - Copy your API Key, we will use this for posting the results

#### 4. Create a `.env` file in the root of your project and add your `API KEY`, or update an existing `.env`

```shell
touch .env
echo "QUALITYWATCHER_API_KEY=[API Key]" >> .env

# For windows:
# type NUL > .env
# echo QUALITYWATCHER_API_KEY=[API Key]  > .env
```

#### 5. Install [dotenv](https://www.npmjs.com/package/dotenv) and require it in your config file

> wdio.conf.{ts|js}

```js
require("dotenv").config();
```

#### 6. Additional Notes

##### 1. Both mapped and unmapped results can be sent to QualityWatcher

> If you don't have any tests in QualityWatcher you can still push your results and create new tests by enabling `includeCaseWithoutId` in the service options.

OR

> If you have existing test cases ensure that your WebdriverIO tests includes the ID of your QualityWatcher test case and suite that it belongs to. Make sure the suite and test case IDs are distinct from your test titles:

```Javascript
// Good:
it("[S12C1234] Can authenticate a valid user", ...
it("Can authenticate a valid user [S12C1234]", ...

// Bad:
it("S12C123Can authenticate a valid user", ...
it("Can authenticate a valid userS5C123", ...
```

##### 2. Screenshot name requirement when uploading

> When saving screenshots, ensure that whitespace/s in the name are replaced with "_", without this QualityWatcher will not be able to find screenshots for uploading. See example below:

```js
afterEach(async function () {
        // Take a screenshot after each test/assertion
        const testName = this.currentTest?.fullTitle().replace(/\s/g, '_');
        const screenshotPath = `./screenshots/${testName}.png`;
        await browser.saveScreenshot(screenshotPath);
    });
```


#### `email`
Type: `String`
(optional)

Email address associated with the account

#### `apiKey`
Type: `String`
(required)

Get API Key from QualityWatcher
- Go to your QualityWatcher account
- Hover over your profile avatar and click "Profile Settings"
- Select the "API Key" menu item
- Click the "Generate API Key" button
- Copy your API Key, we will use this for posting the results


#### `testRunName`
Type: `String`
(required)

Title for the test run

#### `description`
Type: `String`
(required)

Description for the test run

#### `projectId`
Type: `Number`
(required)

The id for the project that include the tests

#### `includeAllCases`
Type: `Boolean`
(required)

whether or not to include all test cases from each test suite used