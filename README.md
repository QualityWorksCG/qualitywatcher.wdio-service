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
    }]],
```

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

#### `email`
Type: `String`

Email address associated with the account

#### `apiKey`
Type: `String`

Get API Key from QualityWatcher
- Go to your QualityWatcher account
- Hover over your profile avatar and click "Profile Settings"
- Select the "API Key" menu item
- Click the "Generate API Key" button
- Copy your API Key, we will use this for posting the results


#### `testRunName`
Type: `String`

Title for the test run

#### `description`
Type: `String`

Description for the test run

#### `projectId`
Type: `Number`

The id for the project that include the tests

#### `includeAllCases`
Type: `Boolean`
(optional) `[Default:true]`

whether or not to include all test cases from each test suite used