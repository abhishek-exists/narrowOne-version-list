/** A Project to scrape narrow one version and save it in JSON File **/
import { JSDOM } from "jsdom";
import fs from "fs";
import cron from "node-cron";

/**
 * Method to parse index-js file and retrive version information
 * @param {String} src
 * @returns {String}
 */
const extractVersion = (src) => {
  const versionPattern = "\\?v=";
  const UNIX_FORMAT_TIME_LENGTH = Math.floor(Math.log10(Date.now() / 1000)) + 1;
  const initialMatchIndex = src.search(versionPattern);
  const version = src.slice(
    initialMatchIndex + 3,
    initialMatchIndex + 3 + UNIX_FORMAT_TIME_LENGTH
  );
  return version;
};

/**
 * Method to perform post-processing after extracting version information
 * @param {String} currentVersion The current version to check and append
 */
const postProcessVersion = (currentVersion) => {
  const versionFilePath = "versionList.txt";

  // Check if the versionList.txt file exists
  fs.access(versionFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        // File does not exist, create a new file and append the current version
        fs.writeFile(versionFilePath, currentVersion + "\n", "utf8", (err) => {
          if (err) {
            console.error("Error creating version file:", err);
            return;
          }
          console.log(
            "New version file created with the initial version:",
            currentVersion
          );
        });
      } else {
        console.error("Error accessing version file:", err);
      }
      return;
    }

    // Read the contents of the versionList.txt file
    fs.readFile(versionFilePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading version file:", err);
        return;
      }

      // Split the file contents into an array of versions
      const versions = data.trim().split("\n");

      // Check if the current version is already present
      if (versions.includes(currentVersion)) {
        console.log("Current version is already present:", currentVersion);
        return;
      }

      // Append the new version to the file
      fs.appendFile(versionFilePath, currentVersion + "\n", "utf8", (err) => {
        if (err) {
          console.error("Error appending version:", err);
          return;
        }
        console.log("New version appended:", currentVersion);
      });
    });
  });
};

/**
 * Method to fetch Index-js file, takes filename as argument and calls post processing
 * @param {String} fileName
 */
const fetchINDEXcontent = async (fileName) => {
  try {
    const res = await fetch(`https://narrow.one/${fileName}`);
    const content = await res.text();
    const currentVersion = extractVersion(content);
    postProcessVersion(currentVersion);
  } catch (error) {
    console.error("Error fetching index-js content:", error);
  }
};

/**
 * Initial method used to get html content and extract current index-js file name
 * calls next chained methods to extract version
 */
const fetchHTMLcontent = async () => {
  try {
    const res = await fetch("https://narrow.one");
    const resp = await res.text();
    // parse resp into html content
    const dom = new JSDOM(resp);
    const { document } = dom.window;
    const scriptTags = document.querySelectorAll('script[type="module"]');
    const indexFile = scriptTags[2].src;
    await fetchINDEXcontent(indexFile);
  } catch (error) {
    console.error("Error fetching HTML content:", error);
  }
};

// Cron job running at every 12 hours
cron.schedule("0 */12 * * *", async () => {
  console.log(`Running Cron Job at ${new Date()}`);
  await fetchHTMLcontent();
});
