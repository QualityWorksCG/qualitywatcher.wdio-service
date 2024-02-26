import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
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
  uploadScreenshot?: boolean;
  screenshotFolder?: string;
  includeCaseWithoutId?: boolean;
  parentSuiteTitle?: string;
  ignoreSkipped?: boolean;
  generateShareableLink?: boolean;
  complete?: boolean;
  report?: boolean;
}

interface QWWDIOReporterInterface {
  options: userOptions;
}

export default class QWWDIOService implements QWWDIOReporterInterface {
  private results = [];
  private dir = "./QualityWatcher";
  private signedUrl: string;
  private screenshots: string[];

  options: {
    email: "";
    apiKey: "";
    testRunName: "";
    description: "";
    projectId: Number;
    includeAllCases: false;
  } & userOptions;

  constructor(serviceOptions) {
    const signedEndpoint = process.env.QUALITYWATCHER_SIGNED_URL_ENDPOINT || "https://api.qualitywatcher.com/nimble/v1/import-management/getSignedUrl-public";
    this.options = serviceOptions;
    this.signedUrl = signedEndpoint;
    validateOptions(serviceOptions);
  }

  private async uploadAttachment(result: any, attachmentPath: string) {
    console.log(colors.grey("-  Uploading attachment..."));
    const attachmentUrl = await this.processAttachments(result, attachmentPath);
    console.log(colors.grey("-  Attachment uploaded!"));
    return attachmentUrl;
  }

  async onPrepare() {
    await removeReportFolder(this.dir);
  }

  async onComplete() {
    if (shouldNotRun(this.options?.report)) {
      console.log(colors.yellow("[QualityWatcher] Skipping sending results because 'QualityWatcherService.report' option is set to false or not provided."));
      return;
    }

    let files = fs.readdirSync(this.dir);

    await files.forEach(async (fileName) => {
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

      // remove skip from results
      if (this.options?.ignoreSkipped) {
        this.results = this.results.filter((result) => result.status !== "skipped");
      }

      // remove tests without suite_id and test_id
      if (!this.options?.includeCaseWithoutId) {
        this.results = this.results.filter((result) => result.suite_id && result.test_id);
      }

      // if parentSuiteTitle is provided, add it to the suite title
      if (this.options?.parentSuiteTitle) {
        // check if result have case and add parentSuiteTitle to suiteTitle
        this.results = this.results.map((result) => {
          if (result?.case) {
            result.case.suiteTitle = this.options?.parentSuiteTitle;
          }
          return result;
        });
      }



      if (this.options?.uploadScreenshot) {
        this.screenshots = findScreenshotsInDirectory(this.options?.screenshotFolder || "./screenshots");

        for (const result of this.results) {
          result.attachments = this.screenshots.filter((screenshot) => {
            return result.suite_id && result.test_id
              ? screenshot.includes(`[S${result.suite_id}C${result.test_id}]`)
              : screenshot.includes(`${result?.case?.testCaseTitle.replace(/\s/g, '_') || "NO_SCREENSHOT_FOUND"}.png`)
          })

          if (result.attachments && result.attachments.length > 0) {
            const attachmentUrls = await Promise.all(result.attachments.map(attachment => this.uploadAttachment(result, attachment)));
            result.attachments = attachmentUrls;
          }
        }
      }


      let requestBody = {
        testRunName: this.options.testRunName,
        description: this.options.description,
        include_all_cases: this.options.includeAllCases,
        projectId: parseInt(`${this.options.projectId}`),
        suites: Array.from(new Set(this.results.map(result => result?.suite_id).filter(Boolean))),
        results: this.results,
        complete: this.options.complete || false,
        shareableReport: this.options.generateShareableLink || false,
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
            colors.green(responseData.link)
          );

          if (responseData?.shareableReportLink) {
            console.log(
              `[QualityWatcher] Shareable report: `,
              colors.green(responseData.shareableReportLink || "See QualityWatcher for details")
            );
          }
        })
        .catch(async ({ response, data }) => {
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
                `Bad Request(${data.code}): ${data.error}`
              )
            );
          }

          await writeFailedRequestToFile(requestBody);
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

  private async upload(signedUrl: string, filePath: string) {
    try {
      const file = await fs.promises.readFile(filePath);
      const fileType = getMimeType(filePath);

      const response = await axios.put(signedUrl, file, {
        headers: {
          'Content-Type': fileType,
        },
      });

      if (response.status !== 200) {
        throw new Error(`Failed to upload with status ${response.status}`);
      }

      return {
        data: signedUrl.split('?')[0],
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error.message,
      };
    }
  }

  private async processAttachments(result: any, attachmentPath: string) {
    const attachmentId = result?.suite_id && result?.test_id ? `${result.suite_id}-${result.test_id}` : "";
    const uploadName = `attachment-${attachmentId}-${uuidv4()}`;
    const fileType = getMimeType(attachmentPath);

    if (attachmentPath) {
      try {
        const response = await axios.post(this.signedUrl, {
          fileName: uploadName,
          contentType: fileType,
        }, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.options.apiKey}`,
          },
        });

        const data = response.data;
        if (data.signedUrl) {
          const fullAttachmentPath = path.resolve(attachmentPath);
          const response = await this.upload(data.signedUrl, fullAttachmentPath);

          if (response.data) {
            return response.data;
          }
        }
      } catch (error) {
        console.log({ error });
        return null;
      }
    }
  }
}

function validateOptions(options) {
  if (options.apiKey == null || typeof (options.apiKey) != "string") {
    throw new SevereServiceError("QualityWatcherService: 'apiKey' is required and must be a [string]");
  }
  if (options.testRunName == null || typeof (options.testRunName) != "string") {
    throw new SevereServiceError("QualityWatcherService: 'testRunName' is required and must be a [string]");
  }
  if (options.description == null || typeof (options.description) != "string") {
    throw new SevereServiceError("QualityWatcherService: 'description' is required and must be a [string]");
  }
  if (options.projectId == null || typeof (options.projectId) != "number") {
    throw new SevereServiceError("QualityWatcherService: 'projectId' is required and must be a [number]");
  }
  if (options.includeAllCases == null || typeof (options.includeAllCases) != "boolean") {
    throw new SevereServiceError("QualityWatcherService: 'includeAllCases' is required and must be a [boolean]");
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

async function writeFailedRequestToFile(payload) {
  const filePath = './QualityWatcher-Results/failed_requests.json';
  // Create the directory if it doesn't exist
  if (!fs.existsSync('./QualityWatcher-Results')) {
    fs.mkdirSync('./QualityWatcher-Results');
  }

  try {
    // Read existing file content, if the file exists
    let existingContent = [];
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      existingContent = content ? JSON.parse(content) : [];
    }

    // Add the new payload to the existing content
    existingContent.push(payload);

    // Write the updated content back to the file
    fs.writeFileSync(filePath, JSON.stringify(existingContent, null, 2));
    console.log(colors.yellow(`[QualityWatcher] Request payload saved to "${filePath}" due to a failure.`));
  } catch (error) {
    console.error(colors.red(`[QualityWatcher] Failed to save request payload: ${error}`));
  }
}

const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    // ... add other file types as needed
    default:
      return 'application/octet-stream'; // Generic byte stream
  }
}

const findScreenshotsInDirectory = (directory) => {
  let screenshots = [];
  const files = fs.readdirSync(directory, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(directory, file.name);
    if (file.isDirectory()) {
      screenshots = screenshots.concat(findScreenshotsInDirectory(fullPath));
    } else if (file.isFile() && file.name.endsWith('.png')) {
      screenshots.push(fullPath);
    }
  }
  return screenshots;
}

const shouldNotRun = (report: boolean | undefined) => {
  return typeof report !== 'boolean' || report === false || report == null
}
