// testListProjectContents.js
import AWS from "aws-sdk";
import { listProjectContents } from "../GeoVisionAI.js";

async function runTests() {
  // Configure AWS (will pick up credentials from env or ~/.aws)
  AWS.config.update({ region: "us-east-1" });
  const awsCredentials = AWS.config.credentials;

  const today = new Date().toISOString().split("T")[0];
  const userId = `test-${today}`;
  const projectId = "unit-test-project";

  console.log("\n=== listProjectContents(userId, projectId) ===");
  try {
    const allData = await listProjectContents(
      userId,
      projectId,
      awsCredentials,
    );
    console.log(JSON.stringify(allData, null, 2));
  } catch (err) {
    console.error("Error fetching all dates:", err);
  }

  console.log(`\n=== listProjectContents(userId, projectId, '${today}') ===`);
  try {
    const todayData = await listProjectContents(
      userId,
      projectId,
      awsCredentials,
      today,
    );
    console.log(JSON.stringify(todayData, null, 2));
  } catch (err) {
    console.error(`Error fetching data for ${today}:`, err);
  }
}

runTests().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
