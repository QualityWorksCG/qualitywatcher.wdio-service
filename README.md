# QualityWatcher Webdriverio Service

### Description
This `@qualitywatcher/wdio-service` works in conjunction with the `@qualitywatcher/wdio-reporter`

### How to Install
`npm install @qualitywatcher/wdio-service -d`

### Import @qualitywatcher/wdio-service
`import QualityWatcherService from '@qualitywatcher/wdio-service'`

### Configure Service & Options

```services: [[QualityWatcherService, {
        email: 'user@domain.com',
        qwApiKey: 'QualityWatcher_API_KEY',
        testRunName: "Sample Automation results",
        description: 'This is a sample test run from our sample test automation.',
        projectId: '100',
        include_all_cases: true,
    }]],```