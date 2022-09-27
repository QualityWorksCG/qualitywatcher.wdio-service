import fs from "fs";
const fetch = require("node-fetch");
const { SevereServiceError } = require("webdriverio");
const colors = require("ansi-colors");

interface userOptions {
  email: string;
  apiKey: string;
  testRunName: string;
  description: string;
  projectId: Number;
  includeAllCases: boolean;
}

interface QWWDIOReporterInterface {
  options: userOptions;
}

export default class QWWDIOService implements QWWDIOReporterInterface {
  private results = [];
  private dir = "./QualityWatcher";

  options: {
    email: "";
    apiKey: "";
    testRunName: "";
    description: "";
    projectId: Number;
    includeAllCases: false;
  };

  constructor(serviceOptions) {
    this.options = serviceOptions;
    validateOptions(serviceOptions);
  }

  async onPrepare() {
    await removeReportFolder(this.dir);
  }

  async onComplete() {
    let files = fs.readdirSync(this.dir);
    let suites = [];

    await files.forEach(async (fileName) => {
      let suiteId = getSuiteId(fileName);
      if(!suites.includes(suiteId)){suites.push(suiteId);}

      try {
        const data = JSON.parse(
          await fs.readFileSync(this.dir + "/" + fileName, "utf8")
        );

        data.forEach(async (test) => {
          await this.results.push(test);
        });
      } catch (err) {
        console.error(err);
      }
    });

    try {
      fs.writeFileSync(
        this.dir + "/results.json",
        JSON.stringify(this.results)
      );

      console.log(colors.bold.green(`\n"${"QualityWatcher"}" Reporter`));
      console.log(
        "------------------------------------------------------------------"
      );

      if (this.results.length === 0) {
        console.log(
          "[QualityWatcher] ",
          colors.red(
            "No tests were run. Please check your test files and ensure that you have suite and test case IDs."
          )
        );
        return;
      }

      let requestBody = {
        testRunName: this.options.testRunName,
        description: this.options.description,
        include_all_cases: this.options.includeAllCases,
        projectId: parseInt(`${this.options.projectId}`),
        suites: suites,
        results: this.results,
      };

      await postData(
        "https://1k0og4tfve.execute-api.us-east-1.amazonaws.com/prod/nimble/v1/test-runner/add-automated-test-execution",
        requestBody,
        this.options.apiKey
      )
        .then(async (response) => {
          const data = await response.json();
          if (response.status === 200) {
            return data;
          }
          throw { response, data };
        })
        .then((responseData) => {
          console.log(
            `[QualityWatcher] Test run "${responseData.title}" has been added to QualityWatcher`,
            `\n[QualityWatcher] Results published: `,
            colors.green(
              `https://app.qualitywatcher.com/${responseData.projectId}/test-runner/${responseData.id}`
            )
          );
        })
        .catch(({ response, data }) => {
          colors.red(`[QualityWatcher] There was an error publishing results.`);
          if (response.status === 500) {
            console.log(
              `[QualityWatcher] ${colors.red(
                `Ensure that your API key is correct.`
              )}`
            );
          } else {
            console.log(
              "[QualityWatcher] ",
              colors.red(
                `Bad Request(${data.error.code}): ${data.error.message}`
              )
            );
          }
        });

      await removeReportFolder(this.dir);
    } catch (error) {
      console.log(
        colors.red(
          `[QualityWatcher] There was an error publishing results: ${error}`
        )
      );
    }
  }
}

function getSuiteId(fileName) {
  let suiteRegex = /\d+/gi;
  return parseInt(fileName.match(suiteRegex)[0]);
}

function validateOptions(options) {
  if (!options?.apiKey) {
    throw new SevereServiceError(
      "Missing property for QualityWatcherService: 'apiKey' [string]"
    );
  }
  if (!options?.testRunName) {
    throw new SevereServiceError(
      "Missing property for QualityWatcherService: 'testRunName' [string]"
    );
  }
  if (!options?.description) {
    throw new SevereServiceError(
      "Missing property for QualityWatcherService: 'description' [string]"
    );
  }
  if (!options?.projectId) {
    throw new SevereServiceError(
      "Missing property for QualityWatcherService: 'projectId' [number]"
    );
  }
  if (!options?.includeAllCases) {
    throw new SevereServiceError(
      "Missing property for QualityWatcherService: 'includeAllCases' [boolean]"
    );
  }
}

async function postData(url, data, apiKey) {
  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(data),
  });
}

async function removeReportFolder(directory) {
  if (fs.existsSync(directory)) {
    try {
      await fs.rmSync(directory, { recursive: true });
    } catch (err) {
      console.error(err);
    }
  }
}
