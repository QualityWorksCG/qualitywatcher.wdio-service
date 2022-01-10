import fs from 'fs'
const fetch = require('node-fetch')
const { SevereServiceError } = require('webdriverio')

interface userOptions {
    email: string,
    apiKey: string,
    testRunName: string,
    description: string,
    projectId: Number,
    includeAllCases: boolean,
}

interface QWWDIOReporterInterface {
    options: userOptions;
}

export default class QWWDIOService implements QWWDIOReporterInterface {
    private results = []
    private dir = './QualityWatcher'

    options: {
        email: '',
        apiKey: '',
        testRunName: '',
        description: '',
        projectId: 10,
        includeAllCases: false,
    }

    constructor(serviceOptions, capabilities, config) {
        this.options = serviceOptions
        validateOptions(serviceOptions)
    }

    async onPrepare() {
        if (fs.existsSync(this.dir)) {
            try {
                await fs.rmSync(this.dir, { recursive: true })
            } catch (err) {
                console.error(err)
            }
        }
    }

    async onComplete() {
        let files = fs.readdirSync(this.dir)
        let suites = []

        await files.forEach(async (fileName) => {

            suites.push(getSuiteId(fileName))
            try {
                const data = JSON.parse(await fs.readFileSync(this.dir + '/' + fileName, 'utf8'))

                data.forEach(async (test) => {
                    await this.results.push(test)
                })
            } catch (err) {
                console.error(err)
            }
        })

        try {
            fs.writeFileSync(this.dir + '/results.json', JSON.stringify(this.results))

            let requestBody = {
                "testRunName": this.options.testRunName,
                "description": this.options.description,
                "include_all_cases": this.options.includeAllCases,
                "projectId": parseInt(this.options.projectId),
                "suites": suites,
                "results": this.results
            }

            await postData('https://d6qp7e7hkb.execute-api.us-east-1.amazonaws.com/dev/nimble/v1/test-runner/add-automated-test-execution', requestBody, this.options.apiKey)
                .then(data => {
                    console.log('QualityWatcher Results')
                    console.log(data)
                })

        } catch (err) {
            console.error(err)
        }
    }
}

function getSuiteId(fileName) {
    let suiteRegex = /\d+/ig
    return parseInt(fileName.match(suiteRegex)[0])
}

function validateOptions(options) {
    if (!options?.email) { throw new SevereServiceError("Missing property for QualityWatcherService: 'email' [string]") }
    if (!options?.apiKey) { throw new SevereServiceError("Missing property for QualityWatcherService: 'apiKey' [string]") }
    if (!options?.testRunName) { throw new SevereServiceError("Missing property for QualityWatcherService: 'testRunName' [string]") }
    if (!options?.description) { throw new SevereServiceError("Missing property for QualityWatcherService: 'description' [string]") }
    if (!options?.projectId) { throw new SevereServiceError("Missing property for QualityWatcherService: 'projectId' [number]") }
    if (!options?.includeAllCases) { throw new SevereServiceError("Missing property for QualityWatcherService: 'includeAllCases' [boolean]") }
}

async function postData(url, data, apiKey) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data)
    })
    return response.json()
}