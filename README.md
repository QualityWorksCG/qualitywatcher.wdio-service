# QualityWatcher Webdriverio Service

### Description
This `@qualitywatcher/wdio-service` works in conjunction with the `@qualitywatcher/wdio-reporter`

### How to Install
```shell
$ npm install @qualitywatcher/wdio-service --save-dev
```

### Import @qualitywatcher/wdio-service
```javascript
import QualityWatcherService from "@qualitywatcher/wdio-service";
```

### Configure Service & Options

```Javascript
services: [[QualityWatcherService, {
        email: 'user@domain.com',
        apiKey: 'QualityWatcher_API_KEY',
        testRunName: "Sample Automation results",
        description: 'This is a sample test run from our sample test automation.',
        projectId: 100,
        includeAllCases: true,
    }]],
```