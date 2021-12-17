import fs from 'fs'
const fetch = require('node-fetch')

interface userOptions {
    email: string,
    qwApiKey: string,
    testRunName: string,
    description: string,
    projectId: string,
    include_all_cases: boolean,
}

interface QWWDIOReporterInterface {
    options: userOptions;
}

export default class QWWDIOService implements QWWDIOReporterInterface {
    private results = []
    private dir = './QualityWatcher'

    options: {
        email: '',
        qwApiKey: '',
        testRunName: '',
        description: '',
        projectId: '',
        include_all_cases: false,
    }

    constructor(serviceOptions, capabilities, config) {
        this.options = serviceOptions
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

        await files.forEach(async (fileName) => {
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
                "include_all_cases": this.options.include_all_cases,
                "projectId": this.options.projectId,
                "results": this.results
            }
            console.log(requestBody)

            /* Commented until Qualitywatcher API is created
            await postData('https://qualitywatcher.com/results', requestBody)
                .then(data => {
                    console.log(data)
                })
            */

        } catch (err) {
            console.error(err)
        }
    }
}

async function postData(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data)
    })
    return response.json()
}